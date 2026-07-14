# BEHAVIOR.md — Parity Contract

Snapshot of `main` @ commit `133da87`, taken before the `rewrite/clean-architecture` rebuild.
This is the source of truth for feature parity — every item below must still work after
the rewrite unless a phase prompt explicitly calls out an intentional change.

Build verified: `npm install && npm run build` succeeds, produces static `out/` with routes
`/`, `/admin`, `/driver`, `/login`, `/parent`, `/privacy` (+ pages-router `/test`).

---

## Global

### `app/layout.tsx` (root layout, applies to every route)
- Wraps all pages in `<html lang="en">`, Geist Sans font, `bg-[#050505]` dark background.
- Renders `<PWAUpdater/>` before children, `<Analytics/>` (Vercel) after.
- `viewport`: theme color `#050505`, `userScalable: false`, `maximumScale: 1`.
- `metadata`: title "onthemuv | Transit", `manifest: /manifest.json`, `appleWebApp.capable: true`,
  `statusBarStyle: black-translucent`.

### `app/PWAUpdater.tsx` (client component, mounted globally)
- Hardcoded `APP_VERSION = "1.0.1"` compared against `localStorage["on_the_muv_version"]`.
- On mismatch: writes new version to localStorage, deletes **all** Cache Storage entries
  (`caches.keys()` → `caches.delete()` for each), then `window.location.reload()`.
- **No actual service worker exists in this codebase** — no `public/sw.js`, no
  `navigator.serviceWorker.register()` call anywhere. This component only clears the Cache
  API and forces a hard reload; it is not a real update-lifecycle manager. (Phase 6 must add
  the real SW — this is the thing it replaces/extends.)

### `public/manifest.json`
- `short_name: onthemuv`, `name: onthemuv Transit Tracking`, icons `icon-192.png` /
  `icon-512.png` (both `purpose: "any maskable"` on the *same* icon — not split, which is
  invalid per spec best practice), `start_url: /`, `display: standalone`,
  `orientation: portrait`, theme/background color `#050505`.

### `services/supabaseClient.js`
- Creates the Supabase client with **hardcoded URL and anon key literals in source** (not
  env vars): `https://tmkazgmbvqehihkxtcbd.supabase.co` + a hardcoded anon JWT. Imported by
  every page via `@/services/supabaseClient`.
- ⚠️ Security-relevant for Phase 6.5, not a bug to fix now — flagged so the rewrite's
  `lib/env.ts` replicates the *same effective config*, just sourced from
  `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### Dead code (not imported by any route — confirmed via repo-wide grep)
- `lib/auth-helpers.ts` — exports `getUserRole()`, reads `supabase.auth.getUser()` then
  `profiles.role`. Unused. Implies a `profiles` table with a `role` column exists in the DB
  schema even though nothing currently calls this.
- `store/useRideStore.ts` — zustand store `{ driverLocation, setLocation }`. Unused.
- `pages/test.js` — legacy Pages Router route at `/test`. Fetches `students.*` (all columns)
  unauthenticated and lists `name — status`. No auth guard at all. Must be deleted, not
  ported (Phase 5 explicitly calls this out).

---

## Screen: Landing (`app/page.tsx`, route `/`)

**Actions:**
1. Tap "Admin Portal" (top-right) → `router.push('/login')`.
2. Tap "Parent Portal" card → `router.push('/parent')`.
3. Tap "Driver Portal" card → `router.push('/driver')`.

No data fetching, no localStorage, no Supabase calls on this screen.

---

## Screen: Admin Login (`app/login/page.tsx`, route `/login`)

**Actions:**
1. Fill username + PIN, submit form (`handleLogin`):
   - Query: `admins` table, `.select('*').eq('username', username.toUpperCase().trim()).eq('pin', pin.trim()).maybeSingle()`.
   - **Plaintext PIN comparison via `.eq('pin', pin)`** — this is the exact vulnerability
     Phase 6.5 fixes. Note it here so the RPC replacement (`authenticate_admin`) is checked
     against this exact query shape.
   - On success: `localStorage.setItem('muv_admin_auth', 'true')`, `router.push('/admin')`.
   - On no match: `alert("Invalid Admin Credentials. Please check your Username and PIN.")`.
   - On Supabase error: caught, `console.error`, `alert("System Error. Please try again.")`.
   - `loading` state disables submit + changes button text to "AUTHENTICATING..." while in flight.

**localStorage keys:** `muv_admin_auth` (written here, read by `/admin`).

**Note:** `/admin` *also* has its own independent login form (see below) that does the same
`admins` lookup — there are two separate login entry points for the same role that must both
keep working, OR the rewrite may consolidate them into one `AdminLogin` component reused by
both routes (recommended, and consistent with PART A's `features/auth/AdminLogin.tsx`) — but
both `/login` and `/admin`'s built-in login must still function afterward.

---

## Screen: Fleet Command / Admin (`app/admin/page.tsx`, route `/admin`)

**Auth gate:**
- On mount, reads `localStorage.getItem('muv_admin_auth') === 'true'`. If true, calls `fetchData()`.
- If not authenticated, renders an inline login form (separate from `/login`, same query shape):
  `admins.select('*').eq('username', ...).eq('pin', ...).maybeSingle()`. On success sets
  `muv_admin_auth`, calls `fetchData()`. On failure: `alert("Unauthorized Access")`.
- "Log Out" button: clears local `isAdmin` state + `localStorage.removeItem('muv_admin_auth')`.
  Does **not** navigate away — just re-renders the login gate in place.

**Data fetch (`fetchData`, called on mount-if-authed, after every login, and after every CRUD op):**
- `students.select('*, vehicles(plate_number, status)').order('id', { ascending: false })`
- `vehicles.select('*').order('id', { ascending: false })`
- `rides.select('*, vehicles(plate_number, driver_name, status)')` (no filter — all rides)
- No realtime subscription on this screen — data is only refetched after explicit actions,
  **not** live-pushed. (This is a real gap vs. parent tracking, not a bug to silently fix —
  flag if the rewrite decides to add realtime here, since that would be a behavior change.)

**Map:**
- `react-leaflet` `MapContainer` centered `[-26.2, 28.0]` zoom 12, dark carto tile layer
  (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`).
- Marker per ride in `rides`, icon loaded from
  `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png`
  (external, unauthenticated — Phase 3 self-hosts this as `/marker-icon-green.png`).
- Marker popup shows plate number + speed (km/h).
- Overlay chip: "Active Vehicles on map: {rides.length}".

**Live Alerts panel:**
- Iterates `vehicles`; for each, finds matching `rides` entry by `vehicle_id`.
- `isSpeeding = activeRide && activeRide.speed > 80` (**80 km/h threshold — exact value
  must be preserved**).
- Visual state priority: `v.status === 'SOS'` (red, `animate-pulse`, badge "SOS Triggered") >
  `isSpeeding` (orange, badge "Speed ({speed}km/h)") > default (badge "Clear", accent color).

**Live Route panel:**
- Lists all `students`; shows name + linked `vehicles.plate_number`; status badge shows
  `s.status` or falls back to "Waiting"; highlighted style when `status === 'Picked Up'`.

**Vehicle CRUD:**
- Add (`addVehicle`): requires `vPlate`, `vDriver`, `vPin` all non-empty (else
  `alert("Please fill all vehicle fields.")`). Inserts into `vehicles`:
  `{ plate_number: vPlate.toUpperCase(), driver_name, pin: vPin, status: 'ACTIVE' }`.
  On error: `alert("Error adding vehicle: " + error.message)`. On success: clears form fields,
  refetches.
- Delete (`deleteVehicle`): `confirm("Are you sure you want to delete this vehicle? This will
  affect linked learners.")` → `vehicles.delete().eq('id', id)` → refetch.
- List: shows plate, driver name, **and the plaintext PIN** (`PIN: {v.pin}`) — visible in the
  admin UI. This is a data-exposure fact to note for Phase 6.5 (once PINs are hashed, this
  literal display of `v.pin` must be removed/changed since the plaintext column goes away).

**Student CRUD:**
- Add (`addStudent`): requires `sName`, `sPhone`, `sVehicleId` all non-empty (else
  `alert("Please fill all learner fields and select a vehicle.")`). Inserts into `students`:
  `{ name, parent_phone: sPhone, vehicle_id: sVehicleId, status: 'WAITING FOR PICKUP' }`.
  On error: `alert(...)`. On success: clears form, refetches.
- Delete (`deleteStudent`): `confirm("Are you sure you want to remove this learner?")` →
  `students.delete().eq('id', id)` → refetch.
- Vehicle picker `<select>` populated from `vehicles` (`{plate_number} - {driver_name}`).

**localStorage keys:** `muv_admin_auth` (read + write + remove).

---

## Screen: Driver Terminal (`app/driver/page.tsx`, route `/driver`)

**Init (mount effect):**
- Registers `beforeinstallprompt` listener → `preventDefault()` + stash event as
  `deferredPrompt` (used later to trigger native install prompt).
- Sets `isOffline = !navigator.onLine`; listens for `online`/`offline` events to toggle it.
- Reads `localStorage['muv_driver_reg']` + `['muv_driver_pin']` → pre-fills `reg`/`pin` state
  if both present (does **not** auto-login, just pre-fills the form — user still taps
  "Start Shift").
- Reads `localStorage['muv_theme']` → `'day'` sets `isDayMode = true` (else defaults to
  night/dark).

**Day/Night theme toggle:** button top-right (only visible pre-login) and inline (post-login)
flips `isDayMode`, persists to `localStorage['muv_theme']` as `'day'`/`'night'`. Swaps an
entire parallel Tailwind class set (`pageBg`, `cardBg`, `inputBg`, `textMuted`,
`highlightText`, `dropBtnBg`, `warningBtnBg`) across the whole screen.

**Login (`handleLogin`):**
- iOS PWA-install guard: if `iPad|iPhone|iPod` UA and not already `display-mode: standalone`,
  sets `showiOSGuide = true` and **returns early — does not attempt login on that tap**
  (user must dismiss the guide and tap again, or it silently re-triggers every tap while not
  installed — verify this exact UX is intentional and preserved, it's easy to "fix" by
  accident).
- Otherwise, if `deferredPrompt` exists, calls `.prompt()` and clears it (native install nudge
  fires alongside login attempts pre-install).
- Query: `vehicles.select('*').eq('plate_number', reg.toUpperCase().trim()).eq('pin',
  pin.trim()).maybeSingle()` — same plaintext-PIN pattern as admin login.
- On success: sets `vehicle` state, `sosActive = data.status === 'SOS'` (resumes SOS state
  across logins), persists `muv_driver_reg` + `muv_driver_pin` to localStorage (remembers
  credentials for next visit).
- On failure: `alert("Login Failed. Check Registration and PIN.")`.

**Manifest fetch (`fetchManifest`, runs whenever `vehicle` is set/changes):**
- `students.select('*').eq('vehicle_id', vehicle.id).order('status', {ascending:false}).order('name', {ascending:true})`.
- No realtime subscription — refetched explicitly after every status-changing action.

**Live location broadcast (effect keyed on `isLive`, `vehicle`):**
- When `isLive === true`: `navigator.geolocation.watchPosition` with `enableHighAccuracy: true`.
- Every position update: `rides.upsert({ vehicle_id, current_lat, current_lng, speed:
  pos.coords.speed ? Math.round(speed * 3.6) : 0, updated_at: now }, { onConflict:
  'vehicle_id' })` — **m/s → km/h conversion factor 3.6, rounded**. One row per vehicle
  (upsert on `vehicle_id` conflict, not an insert-only ride log).
- Cleanup: `navigator.geolocation.clearWatch(watchId)` when `isLive` goes false or unmount.
- "GO LIVE" / "END SHIFT" toggle button just flips `isLive`; does not itself touch the DB.

**SOS (`toggleSOS`):**
- Flips between `vehicles.status = 'SOS'` and `'ACTIVE'` via `.update().eq('id', vehicle.id)`.
- Button: "SOS / DELAY" (idle) ↔ "SOS ACTIVE" (red, `animate-pulse`) when active.

**Per-student status actions (`updateStatus(id, status, name)`):**
- `students.update({ status }).eq('id', id)`, then `fetchManifest()` on success.
- Status value `'Dropped'` → toast "Auto-SMS dispatched to {name}'s parent." (4s auto-dismiss).
  **No actual SMS is sent** — this is a UI-only toast; the phrase implies a feature that
  doesn't exist. Do not silently implement or silently drop the toast — flag as-is.
- Status value `'Arriving in 5 mins'` → toast "5 Min Warning sent to {name}'s parent." (4s).
- Other status values (e.g. the "UNDO DROP OFF" → `'WAITING FOR PICKUP'`) → no toast.
- Button visibility state machine per student card:
  - status not in `{'Picked Up','Dropped'}` → show "🔔 Send 5 Min Warning" (hidden once
    already `'Arriving in 5 mins'`) + "PICK UP PASSENGER" (→ `'Picked Up'`).
  - status `'Picked Up'` → show "DROP OFF" (→ `'Dropped'`).
  - status `'Dropped'` → show "↺ UNDO DROP OFF" (→ `'WAITING FOR PICKUP'`).

**Bulk reset (`resetManifest`):**
- `confirm("Are you starting a new shift? This will reset all passengers to 'WAITING'.")` →
  `students.update({ status: 'WAITING FOR PICKUP' }).eq('vehicle_id', vehicle.id)` (ALL
  students on this vehicle, unconditionally) → refetch + toast "Route reset for new shift."
  (4s). On error: `alert("Failed to reset route: " + error.message)`.

**Offline banner:** sticky top bar, yellow, "No Network Signal - Saving Data Locally" when
`isOffline` — note the copy implies local queueing/sync-on-reconnect, but **no such queueing
exists in the code**; geolocation writes during offline simply fail silently (Supabase call
rejects, unhandled). This is an existing gap, not a spec to implement unless asked.

**localStorage keys:** `muv_driver_reg`, `muv_driver_pin`, `muv_theme`.

---

## Screen: Parent Tracker (`app/parent/page.tsx`, route `/parent`)

Wrapped in `<Suspense>` (uses `useSearchParams`) with fallback "Loading Portal...".

**Init (mount effect):**
- Loads leaflet icon from the same external GitHub-hosted green marker URL as admin.
- Registers `beforeinstallprompt` listener (same pattern as driver).
- Reads `localStorage['onthemuv_auth']` → if present, auto-calls `handleLogin(savedPhone)`
  (parent screen **does** auto-login on saved credentials, unlike driver which only prefills).

**Login (`handleLogin(inputPhone)`):**
- Same iOS-guide early-return pattern as driver (`showiOSGuide`), same `deferredPrompt.prompt()` nudge.
- Query: `students.select('*, vehicles(plate_number, driver_name, status)').eq('parent_phone',
  inputPhone.trim()).single()` — **uses `.single()` not `.maybeSingle()`**, meaning multiple
  students sharing one parent phone number would throw/error (only one student per phone is
  currently supported — note for parity, don't silently "fix" to support multiple children
  unless asked).
- On data present: `localStorage.setItem('onthemuv_auth', inputPhone.trim())`, sets `student`,
  then fetches `rides.select('*').eq('vehicle_id', data.vehicle_id).maybeSingle()` → sets `ride`.
- No explicit failure branch — if no student found, `data` is null/undefined and the screen
  just stays on the login form with `loading` reset (no alert shown to the parent).

**Realtime subscription (effect keyed on `student`):**
- Channel `parent-sync-${student.id}`, three handlers:
  1. `postgres_changes` `*` on `rides` filtered `vehicle_id=eq.{student.vehicle_id}` →
     `setRide(payload.new)` (full replace, any INSERT/UPDATE/DELETE).
  2. `postgres_changes` `UPDATE` on `students` filtered `id=eq.{student.id}` →
     `setStudent(payload.new)` — **this replaces the whole student object, dropping the
     joined `vehicles` sub-object** (`payload.new` from a raw table UPDATE has no `vehicles`
     join), which would blank the plate/driver/status shown in the header and break the SOS
     overlay check (`student.vehicles?.status`) until the next handler fixes vehicle status.
     This looks like a latent bug/edge case, not a feature — preserve behavior but flag it;
     if fixing it, call it out explicitly as an intentional behavior change, not silent.
  3. `postgres_changes` `UPDATE` on `vehicles` filtered `id=eq.{student.vehicle_id}` →
     merges just `.vehicles.status` into existing `student` state (patches around bug #2's gap).
- Cleanup: `supabase.removeChannel(channel)` on unmount/student change.

**5-minute warning overlay:** full-screen, shown when `student.status === 'Arriving in 5
mins'`. Yellow, bouncing bell icon, "Driver Approaching" / "Arriving in 5 Minutes", body text
"Please ensure {name} is ready at the pickup point." Blocks the whole screen (z-index 2000).

**SOS overlay:** full-screen, shown when `student.vehicles?.status === 'SOS'`. Red, pulsing,
"Route Delayed" / "Driver has reported an issue", reassurance copy. Higher z-index (2001) than
the 5-min overlay — **SOS takes visual priority if both are somehow true simultaneously**
(it's later in DOM order and z-index wins).

**Map:** centered on `ride.current_lat/lng` if present else default `[-26.2, 28.0]`, zoom 16
(much tighter than admin's zoom 12 — parent view is per-child, close-up). Marker + `RecenterMap`
(`app/parent/RecenterMap.tsx`) does `map.flyTo([lat,lng], currentZoom, {animate:true,
duration:1.5})` on every lat/lng change — smooth glide, not a snap.

**Vehicle-offline overlay:** shown whenever `!ride` (no ride row yet, or `maybeSingle()`
returned null) — "Vehicle Offline" / "Awaiting driver ignition...". Distinct from the SOS
overlay; this is the default idle state before a driver has ever gone live.

**Header chip:** student name, live status dot (accent when `Picked Up`, gray otherwise) +
status text (falls back to "At Home" if no status), speed readout `{ride?.speed || 0} KM/H`,
plate number.

**localStorage keys:** `onthemuv_auth`.

---

## Screen: Privacy Policy (`app/privacy/page.tsx`, route `/privacy`)

- Static content, POPIA compliance copy, "Effective Date: March 11, 2026" (hardcoded, not
  derived from anything — preserve verbatim unless asked to update).
- "← Back to App" → `router.push('/')`.
- No data fetching, no localStorage.

---

## Supabase schema surface (inferred from all queries above)

| Table | Columns referenced | Read by | Written by |
|---|---|---|---|
| `admins` | `username`, `pin`, (`*`) | `/login`, `/admin` (both login forms) | — |
| `vehicles` | `id`, `plate_number`, `driver_name`, `pin`, `status` | `/admin`, `/driver` | `/admin` (insert/delete), `/driver` (status update for SOS) |
| `students` | `id`, `name`, `parent_phone`, `vehicle_id`, `status`, join `vehicles(plate_number, status)` / `vehicles(plate_number, driver_name, status)` | `/admin`, `/driver`, `/parent`, `pages/test.js` (dead) | `/admin` (insert/delete), `/driver` (status update, bulk reset) |
| `rides` | `vehicle_id`, `current_lat`, `current_lng`, `speed`, `updated_at`, join `vehicles(plate_number, driver_name, status)` | `/admin`, `/parent` | `/driver` (`upsert` keyed on `vehicle_id`) |
| `profiles` | `id`, `role` | `lib/auth-helpers.ts` (dead, unused) | — |

All access currently goes through the public anon key with **no RLS mentioned/observed** and
**plaintext PIN columns compared client-side** — this is exactly what Phase 6.5 must fix
(hash `pin` → `pin_hash`, move comparisons into `SECURITY DEFINER` RPCs, enable RLS).

---

## localStorage keys (all, for `lib/constants.ts` migration)

| Key | Written by | Read by | Purpose |
|---|---|---|---|
| `muv_admin_auth` | `/login`, `/admin` | `/admin` | admin session flag (`'true'` string, not a token) |
| `muv_driver_reg` | `/driver` | `/driver` | remembered vehicle registration |
| `muv_driver_pin` | `/driver` | `/driver` | remembered driver PIN (**plaintext PIN persisted in localStorage** — flag for Phase 6.5/SECURITY.md) |
| `muv_theme` | `/driver` | `/driver` | `'day'` \| `'night'` |
| `onthemuv_auth` | `/parent` | `/parent` | remembered parent phone number, also used for auto-login |
| `on_the_muv_version` | `app/PWAUpdater.tsx` | `app/PWAUpdater.tsx` | forces cache-clear + reload on version bump |

---

## Realtime subscriptions (all)

Only one exists today: `/parent` subscribes to channel `parent-sync-${student.id}` covering
`rides` (`*` events, filtered by `vehicle_id`), `students` (`UPDATE`, filtered by `id`), and
`vehicles` (`UPDATE`, filtered by `id`) — see full breakdown above, including the join-drop
edge case in handler #2. `/admin` and `/driver` do **not** subscribe to realtime; they poll via
explicit refetch after actions only.

---

## Alerts / overlays / edge cases (all)

1. **SOS** — driver-triggered (`vehicles.status = 'SOS'`), shown as: red pulsing badge in
   admin's Live Alerts panel; red "SOS ACTIVE" button state on driver; full-screen red overlay
   on parent (highest z-index, wins over 5-min overlay).
2. **5-minute warning** — driver-triggered per-student (`students.status = 'Arriving in 5
   mins'`), shown as: yellow pulsing status text on driver's own student card; full-screen
   yellow overlay on parent.
3. **Speeding** — admin-only, computed client-side as `ride.speed > 80` (km/h), orange badge
   in Live Alerts panel. No overlay, no notification to driver/parent — admin visibility only.
4. **Offline** — driver: sticky yellow "No Network Signal" banner via `navigator.onLine` +
   online/offline listeners (no actual offline queueing behind it). Parent: "Vehicle Offline"
   full-screen overlay whenever `ride` is null (distinct concept — this is "no ride row yet",
   not the parent's own device connectivity).
5. **iOS install guide (confirmed dead/broken state)** — driver + parent both set
   `showiOSGuide = true` and `return` early (skipping login) when on iOS Safari outside
   standalone mode. **`showiOSGuide` is never read anywhere in either component's JSX** —
   grepped both files, it has exactly one write site and zero render sites. Net effect: on
   iOS Safari (not installed to home screen), the first tap on "Start Shift" / "Start
   Tracking" does **nothing visible** — no guide, no login, no error, just a silent no-op.
   The user has to tap a second time (deferredPrompt path) or the flow is simply broken on
   iOS Safari. This is a genuine bug, not a subtlety to preserve — Phase 4 (parent/driver
   screens) should either implement the guide for real or remove the early-return, but call
   it out explicitly as an intentional fix, not a silent one.

---

## Pre-existing issues (tsc strict mode)

`tsconfig.json` **already has `"strict": true`**. Running `npx tsc --noEmit` on the current
`main` tree produces **zero errors** — the codebase type-checks cleanly under strict mode
already, so there is nothing to fix in Phase 1 on that front.

However, strict mode does not flag *explicit* `any` — the codebase uses `useState<any>(null)` /
`useState<any[]>([])` pervasively (`admin/page.tsx`, `driver/page.tsx`, `parent/page.tsx`) for
`vehicle`, `student`, `ride`, `students[]`, `vehicles[]`, `rides[]`, `busIcon`, `icon`,
`deferredPrompt`. PART A requires "Everything typed. No `any`." — this is the real type-safety
gap the rewrite must close using `types/database.types.ts` + `types/domain.ts`, not a compiler
error to silence.

**Other non-blocking findings surfaced during this read-through** (not build errors, just
technical debt to be aware of before Phase 1):
- Hardcoded Supabase URL + anon key in `services/supabaseClient.js` (see Global section).
- Plaintext PIN storage/comparison end-to-end: DB column → client query → localStorage
  persistence on driver. Full fix scope belongs to Phase 6.5.
- External, unauthenticated marker icon URL
  (`raw.githubusercontent.com/pointhi/leaflet-color-markers`) used in both `/admin` and
  `/parent` — Phase 3 must self-host this.
- `npm audit` currently reports 22 vulnerabilities (1 low, 6 moderate, 14 high, 1 critical) in
  transitive deps as of this snapshot — not part of the rewrite's scope per se, but worth a
  `npm audit fix` pass before shipping to a buyer.
- **`npx eslint .` (checked in Phase 1, not Phase 0)**: 14 errors / 4 warnings, all inside the
  not-yet-rewritten `admin/driver/parent/page.tsx`: `@typescript-eslint/no-explicit-any` (the
  same explicit-`any` usage noted above), `react-hooks/set-state-in-effect` (calling
  `setIsOffline`/`fetchManifest` synchronously inside `useEffect` bodies in `/driver`), and the
  confirmed-dead `showiOSGuide` unused-var warning. None of these were introduced by the Phase 1
  restructure (only import paths + one `Number()` coercion changed in these files) — they
  resolve naturally as each screen is rebuilt with real types in Phase 4, not before.
