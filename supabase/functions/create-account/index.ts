import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

type CreateAccountBody = {
  email: string;
  password: string;
  role: "driver" | "parent";
  // vehicles.id for role 'driver', students.id for role 'parent'
  linkId: number;
};

function isValidBody(body: unknown): body is CreateAccountBody {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.email === "string" &&
    typeof b.password === "string" &&
    (b.role === "driver" || b.role === "parent") &&
    typeof b.linkId === "number"
  );
}

// Admin-only: creates a driver/parent auth account and links it to an
// existing vehicle (driver_id) or student (parent_id). RLS on vehicles/
// students is still the Phase 1 permissive policy (see docs/ARCHITECTURE.md)
// so the link update itself doesn't strictly need supabaseAdmin, but
// auth.admin.createUser always does — used consistently for both here.
export default {
  fetch: withSupabase({ auth: "user", cors: "default" }, async (req, ctx) => {
    const callerId = ctx.userClaims?.id;
    if (!callerId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ctx.supabase is RLS-scoped to the caller — profiles_select_own lets
    // them read only their own row, which is exactly the check we need.
    const { data: callerProfile, error: profileError } = await ctx.supabase
      .from("profiles")
      .select("role")
      .eq("id", callerId)
      .maybeSingle();

    if (profileError) {
      return Response.json({ error: profileError.message }, { status: 500 });
    }
    if (callerProfile?.role !== "admin") {
      return Response.json({ error: "Admin access required" }, { status: 403 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    if (!isValidBody(body)) {
      return Response.json(
        { error: "Expected { email, password, role: 'driver'|'parent', linkId }" },
        { status: 400 },
      );
    }
    const { email, password, role, linkId } = body;

    const { data: created, error: createError } = await ctx.supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role },
    });
    if (createError || !created.user) {
      return Response.json(
        { error: createError?.message ?? "Failed to create account" },
        { status: 400 },
      );
    }

    const table = role === "driver" ? "vehicles" : "students";
    const column = role === "driver" ? "driver_id" : "parent_id";
    const { error: linkError } = await ctx.supabaseAdmin
      .from(table)
      .update({ [column]: created.user.id })
      .eq("id", linkId);

    if (linkError) {
      // Account exists but the link failed — surface this distinctly so the
      // admin knows to retry the link rather than assume nothing happened.
      return Response.json(
        { error: `Account created but linking failed: ${linkError.message}`, userId: created.user.id },
        { status: 500 },
      );
    }

    return Response.json({ userId: created.user.id });
  }),
};
