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
| Location | expo-location + expo-task-manager for background updates (requires an EAS dev build — Expo Go can't run a custom background task) |
| Push | expo-notifications + Expo Push API, triggered by a Supabase Database Webhook / Edge Function |

## Auth & data model (target — implemented in Phase 1)

Supabase Auth replaces the plaintext-PIN `admins`/`vehicles.pin` pattern:

- `profiles(id uuid references auth.users, role text check in ('admin','driver','parent'))`
- `vehicles.driver_user_id uuid references auth.users` — replaces PIN-based driver login
- `students.parent_user_id uuid references auth.users` — replaces phone-number-only parent lookup
- RLS: drivers see/update only their own vehicle + its students; parents see only their
  linked student; admin sees all rows (checked via `profiles.role = 'admin'`)
- `admins` table and `vehicles.pin` column are dropped once the migration ships

Drivers and admin get email/password accounts (small, fixed staff list — no SMS
provider needed). Parents also start on email/password to avoid a day-one
Twilio/SMS-provider dependency; phone-OTP can be swapped in later via
Supabase Auth without a schema change.

## Route structure

`app/` uses expo-router file-based routing:

- `app/index.tsx` — landing/role-redirect entry
- `app/(auth)/login.tsx` — auth screens (the `(auth)` folder is a route group;
  it does not add a URL segment, so this still resolves to `/login`)
- `app/driver/`, `app/parent/`, `app/admin/` — one plain folder per role
  (**not** route groups — a route group folder's name is invisible in the
  URL, so three groups all containing `index.tsx` would each resolve to `/`
  and collide; plain folders give each role its own path segment)

## Phase status

- **Phase 0 (done)** — project scaffold, NativeWind theme, route skeleton
  with placeholder screens, Supabase client + domain types + session store
  stub. No real auth, data, or maps yet.
- **Phase 1** — Supabase schema migration (profiles, RLS, drop admins/pin),
  Supabase Auth screens.
- **Phase 2** — Admin: live map, vehicle/student CRUD, alerts panel.
- **Phase 3** — Driver: manifest, status actions, SOS.
- **Phase 4** — Background location wired to the `rides` upsert (EAS dev build).
- **Phase 5** — Parent: live map, realtime subscription (fixing the known
  join-drop bug from `BEHAVIOR.md`'s parent realtime handler #2 intentionally
  this time, not silently).
- **Phase 6** — Real push notifications (SOS, 5-minute warning, admin SOS alert).
- **Phase 7** — EAS build config, store metadata.

See `.claude/plans/starry-meandering-taco.md` for the full plan this was
built from.
