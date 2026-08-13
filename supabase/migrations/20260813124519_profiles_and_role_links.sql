-- Phase 1: harden `profiles`, add role-link columns. Strictly additive — the live
-- app (old Next.js/Capacitor, still in production) is not touched.
--
-- Live schema audited via `supabase db query --linked` before writing this (2026-08-13):
--   - profiles(id uuid, first_name, last_name, role text default 'parent') — RLS already
--     enabled but with ZERO policies, i.e. already fully locked (deny-all) via anon/authenticated
--     roles. Two existing rows (role 'driver', 'parent'), both with a matching auth.users row.
--     No PK/FK on `id` yet.
--   - vehicles / students / rides / admins — RLS is enabled on all of them too, but every one
--     has at least one permissive `qual: true` policy for the `public` role (e.g. "Allow all for
--     vehicles"). That's what keeps the live app's anon-key-only access working today. NOT
--     touched by this migration — locking those down is a later "cutover" migration, done only
--     once the old app is retired (see docs/ARCHITECTURE.md).
--   - students already has a nullable `parent_id uuid` column (no FK) — reused here instead of
--     adding a redundant `parent_user_id` column.

begin;

-- profiles: fill in the missing PK/FK (safe — both existing rows already reference a real
-- auth.users row, verified before writing this) and a role check constraint.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conrelid = 'public.profiles'::regclass and contype = 'p'
  ) then
    alter table public.profiles add primary key (id);
  end if;
  if not exists (
    select 1 from pg_constraint where conrelid = 'public.profiles'::regclass and contype = 'f'
  ) then
    alter table public.profiles
      add constraint profiles_id_fkey foreign key (id) references auth.users (id) on delete cascade;
  end if;
end $$;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role is null or role in ('admin', 'driver', 'parent'));

alter table public.profiles enable row level security; -- already on; explicit for clarity

-- security definer avoids self-referential RLS recursion when a policy needs to check role.
create or replace function public.current_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin" on public.profiles
  for select using (public.current_role() = 'admin');

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Auto-create a profile row whenever an auth user is created (Phase 2's admin-driven
-- account-creation flow sets `role` in user_metadata at creation time). No-op for the old app,
-- which never inserts into auth.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, new.raw_user_meta_data ->> 'role')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- vehicles: new nullable driver link (naming matches students.parent_id below).
alter table public.vehicles
  add column if not exists driver_id uuid references auth.users (id);

-- students: reuse the existing parent_id column, add the FK (safe — currently all null).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.students'::regclass and conname = 'students_parent_id_fkey'
  ) then
    alter table public.students
      add constraint students_parent_id_fkey foreign key (parent_id) references auth.users (id);
  end if;
end $$;

commit;
