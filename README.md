# onthemuv

Transit-tracking app for drivers, parents, and school/company admins — Expo (React Native) + Supabase.

## Getting started

```bash
npm install
npm run start
```

Requires a `.env.local` with `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_ANON_KEY` (see `.env.example`).

Background location and push notifications need a custom dev client (EAS
build) rather than Expo Go — see `docs/ARCHITECTURE.md`.

## Docs

- `docs/ARCHITECTURE.md` — stack, auth/data model, route structure, phase status.
- `docs/BEHAVIOR.md` — business-logic reference carried over from the previous
  Next.js/Capacitor version (SOS semantics, status state machine, realtime shape).
