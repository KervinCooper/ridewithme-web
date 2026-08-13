# ARCHITECTURE.md — onthemuv native rebuild

Successor to the Next.js + Capacitor codebase (preserved on `main` and
`rewrite/clean-architecture`). `docs/BEHAVIOR.md` still documents the original
business logic (SOS semantics, 80km/h speeding threshold, status state
machine, realtime shape) and remains the reference for *what the app does*.
This file documents *how the rebuild is built*.

## Why this rebuild

The Capacitor-wrapped Next.js app is a wrapped website, not a real mobile app.
Three concrete gaps drove the decision to restart on Expo/React Native:

1. **Background location** — driver live-tracking needs to keep updating
   while the phone is locked/backgrounded. Unreliable in a Capacitor WebView.
2. **Push notifications** — the old driver screen showed a toast claiming
   "Auto-SMS dispatched to parent" when no message was ever sent. This
   rebuild wires real push notifications instead.
3. **Offline behavior** — no real offline queueing existed; geolocation
   writes during a dropped connection silently failed.

## Stack

| Concern | Choice |
|---|---|
| Framework | Expo (TypeScript template) + expo-router (file-based routing) |
| Styling | NativeWind v4, theme seeded from the old `tokens.css` "fleet command" dark palette |
| Backend | Supabase (Postgres + Realtime), same project as the old app |
| Auth | Supabase Auth (email/password), replacing the `admins`/PIN-comparison tables entirely |
| Session storage | `expo-secure-store` (see note in `lib/supabase/secureStoreAdapter.ts` re: its ~2048-byte value cap) |
| Client state | Zustand |
| Maps | react-native-maps (native Google/Apple maps), replacing Leaflet |
| Location | expo-location (foreground tracking shipped in Phase 3) + expo-task-manager for background updates, added in Phase 4 (requires an EAS dev build — Expo Go can't run a custom background task) |
| Push | expo-notifications + Expo Push API, triggered by a Supabase Database Webhook / Edge Function |

## Auth & data model

**The Supabase project (`tmkazgmbvqehihkxtcbd`) is live** — the old Next.js/Capacitor app still
runs against it in production with real drivers/parents/vehicles/students. Every migration in
this rebuild has to be additive until the old app is retired; see "Cutover (not done yet)" below
for what's deliberately deferred.

Live schema audited directly (`supabase db query --linked`) before writing the Phase 1 migration,
since `docs/BEHAVIOR.md`'s schema notes had drifted from reality:

- `profiles(id uuid, first_name, last_name, role text default 'parent')` already existed, with
  RLS enabled but **zero policies** (i.e. already fully locked/deny-all — safe to build on).
- `vehicles`, `students`, `rides`, `admins` all have RLS "enabled" too, but each has at least one
  permissive `qual: true` policy for the `public` role — that's what makes the old app's
  anon-key-only access work today. **Not touched.**
- `students.parent_id uuid` already existed (unused, no FK) — reused instead of adding a
  redundant `parent_user_id` column.
- `vehicles` had no driver-link column, so `driver_id uuid` was added (naming matches
  `students.parent_id`).

Phase 1 migration (`supabase/migrations/20260813124519_profiles_and_role_links.sql`), applied to
the live project:

- `profiles`: added PK + `references auth.users(id)` FK, a
  `role in ('admin','driver','parent')` check constraint, and three RLS policies
  (`profiles_select_own`, `profiles_select_admin` via a `security definer` `current_role()`
  helper to avoid self-referential recursion, `profiles_update_own`).
- `handle_new_user()` trigger on `auth.users` insert → auto-creates the `profiles` row from
  `raw_user_meta_data->>'role'`. No-op today since nothing creates `auth.users` rows yet
  (Phase 2's admin-driven account creation is what will start using this).
- `vehicles.driver_id` (new, nullable) and `students.parent_id` (existing, FK added) —
  both `references auth.users(id)`, both null until an admin links them via `/admin/accounts`
  (Phase 2).

Accounts are **admin-created only** — no public self-signup. Drivers/parents/admin all get
email/password accounts (avoids a day-one Twilio/SMS-provider dependency for parents; phone-OTP
can be swapped in later via Supabase Auth without a schema change). The admin types the account's
initial password directly in the form — no invite-email flow, matches the same low-tech
onboarding model as everything else admin-driven.

**New-app-only data (Phase 2 decision):** vehicles/students created through the new admin CRUD
don't populate `vehicles.pin` (left on its `'1234'` DB default, harmless) or
`students.parent_phone` (left null) — those only exist for the *old* app's login flows, and the
new app doesn't use them. This means a vehicle/student created via the new app won't be usable
through the old app's PIN/phone-lookup login. Accepted tradeoff per the user — the old app is
expected to stop being the source of new records going forward.

**Bootstrap (manual, one-time):** the first admin account isn't created by app code. Create it via
Supabase Dashboard → Authentication → Add User (email + password), then run
`update public.profiles set role = 'admin' where id = '<uuid from the dashboard>';` — the
`handle_new_user` trigger already created the empty profile row.

Two test accounts (`role = 'driver'`, `role = 'parent'`) already existed in `auth.users`/`profiles`
before this migration — created outside this rebuild, presumably while prototyping. No admin
account exists yet.

**Cutover (not done yet, deliberately deferred):** enabling RLS lockdown on `vehicles` /
`students` / `rides`, and dropping the `admins` table + `vehicles.pin` column, only happens once
the old app is fully retired. Doing it now would break the live app's anon-key access immediately.

## Edge Functions

`supabase/functions/` — deployed via `npx supabase functions deploy <name>` (works without
Docker, despite a "Docker is not running" warning — that warning is only about local `functions
serve`/bundling cache, not the actual deploy). Functions use the `@supabase/server` package's
`withSupabase(options, handler)` helper (scaffolded automatically by
`npx supabase functions new <name>`), which hands the handler a `ctx` with:

- `ctx.supabase` — RLS-scoped client for the calling user (or anon, depending on auth mode).
- `ctx.supabaseAdmin` — service-role client, bypasses RLS. `SUPABASE_SERVICE_ROLE_KEY` is
  auto-injected into every deployed function's environment — never has to be passed/stored
  manually.
- `ctx.userClaims?.id` — the calling user's id, when `auth: 'user'` mode requires a real JWT.

`create-account` (Phase 2) is the first one: `auth: 'user'`, checks the caller's own `profiles`
row via `ctx.supabase` (admin-only), then uses `ctx.supabaseAdmin.auth.admin.createUser(...)` to
create the driver/parent account and link it to a vehicle/student.

## Route structure

`app/` uses expo-router file-based routing:

- `app/index.tsx` — landing/role-redirect entry
- `app/(auth)/login.tsx` — auth screens (the `(auth)` folder is a route group;
  it does not add a URL segment, so this still resolves to `/login`)
- `app/driver/`, `app/parent/`, `app/admin/` — one plain folder per role
  (**not** route groups — a route group folder's name is invisible in the
  URL, so three groups all containing `index.tsx` would each resolve to `/`
  and collide; plain folders give each role its own path segment)
- `app/admin/index.tsx` (Fleet Command map+alerts), `app/admin/vehicles.tsx`,
  `app/admin/students.tsx`, `app/admin/accounts.tsx` — real routes rather than
  a `Tabs` navigator (avoids pulling in `@react-navigation/bottom-tabs` for a
  4-screen section), linked by `components/admin/AdminNav.tsx`.
- All role screens are wrapped in `components/RoleGuard.tsx`, which checks
  both "signed in" and "signed in as *this* role" — redirects to `/login`
  otherwise. (Phase 1's guard only checked "signed in," which was fine when
  `/admin` was a placeholder; tightened in Phase 2 once it became real CRUD +
  account creation.)

## Phase status

- **Phase 0 (done)** — project scaffold, NativeWind theme, route skeleton
  with placeholder screens, Supabase client + domain types + session store
  stub. No real auth, data, or maps yet.
- **Phase 1 (done)** — additive schema migration (`profiles` hardened + RLS,
  `vehicles.driver_id` / `students.parent_id` role links), real Supabase Auth
  sign-in screen, session store driven by `onAuthStateChange`, role-based
  redirect, per-role sign-out. See "Auth & data model" above for the live-DB
  details and what's deliberately still deferred (RLS cutover on the old
  tables, dropping `admins`/`pin`).
- **Phase 2 (done)** — Fleet Command live map (`react-native-maps`, realtime
  via `postgres_changes` on `rides`/`vehicles`/`students`, refetch-on-any-event
  rather than payload-patching — see "Auth & data model" and the Edge
  Functions section), alerts panel (SOS > speeding > clear, 80km/h threshold),
  live route panel, vehicle/student CRUD, and the `create-account` Edge
  Function + `/admin/accounts` screen. Role guards tightened
  (`components/RoleGuard.tsx`). Android map tiles need a Google Maps API key —
  deliberately not configured yet (no `app.json` `android.config.googleMaps`
  entry); add one (Google Cloud Console → enable Maps SDK for Android →
  generate key) whenever Android map testing starts. iOS uses Apple Maps, no
  key needed.
- **Phase 3 (done)** — Driver terminal (`app/driver/index.tsx`, resolves the
  driver's vehicle via `vehicles.driver_id = auth.uid()`): manifest with the
  same status-action state machine as the original (5-min warning → picked up
  → dropped → undo), bulk shift reset, SOS toggle, and **foreground** GO LIVE
  (`expo-location` `watchPositionAsync`, throttled to 3s/5m vs. the old
  unthrottled web `watchPosition`, upserts into `rides` — stops the moment the
  app backgrounds; **surviving backgrounding is Phase 4**). Day/night toggle
  ported (real driver glare concern, not just aesthetic) but re-themed to use
  the app's own `accent`/`bg`/`surface` tokens instead of the old one-off
  `#CCFF00`/`#050505` literals, so the driver screen doesn't introduce a
  second inconsistent brand color. Two intentional fixes, not silent parity:
  the old "Auto-SMS dispatched"/"5 Min Warning sent" toast copy (which lied —
  no message was ever sent, one of the three reasons for this whole rebuild)
  is now honest about being a local status change; the old offline banner
  ("...Saving Data Locally", also no such queueing existed) isn't ported at
  all, deferred to Phase 4 where real offline write-queueing actually belongs.
- **Phase 4** — Background location survival (EAS dev build) for the GO LIVE
  flow Phase 3 already built, plus real offline write-queueing.
- **Phase 5** — Parent: live map, realtime subscription (fixing the known
  join-drop bug from `BEHAVIOR.md`'s parent realtime handler #2 intentionally
  this time, not silently).
- **Phase 6** — Real push notifications (SOS, 5-minute warning, admin SOS alert).
- **Phase 7** — EAS build config, store metadata.

See `.claude/plans/starry-meandering-taco.md` for the full plan this was
built from.
