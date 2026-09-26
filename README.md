# Fitness Tracker

A personal app for logging workouts, meals and water, and seeing progress over time.
Expo (SDK 57) + Expo Router, NativeWind, TanStack Query, and Supabase (Postgres, Auth, RLS).
Built to work at the gym on bad Wi-Fi: every log shows instantly and syncs when it can.

## Getting started

You need [Bun](https://bun.sh), Docker Desktop (for the local Supabase stack), and the
Expo Go app for SDK 57 on your phone.

```bash
bun install
bun run db:start          # local Supabase: Postgres, Auth, Studio, Mailpit
cp .env.example .env.local
```

In `.env.local`, set `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the publishable key that
`db:start` printed. For `EXPO_PUBLIC_SUPABASE_URL`, use `http://127.0.0.1:54321` in a
simulator, or `http://<your Mac's LAN IP>:54321` on a phone (`ipconfig getifaddr en0`).

```bash
bun run start             # scan the QR code with Expo Go
```

Local services:

| What                                                             | Where                  |
| ---------------------------------------------------------------- | ---------------------- |
| Studio (browse tables)                                           | http://127.0.0.1:54323 |
| Mailpit (sign-up and reset codes; no real email is sent locally) | http://127.0.0.1:54324 |

## Commands

| Command                       | Does                                                             |
| ----------------------------- | ---------------------------------------------------------------- |
| `bun run check`               | Typecheck, lint and unit tests; run before calling anything done |
| `bun run test` / `test:watch` | Jest unit tests (`__tests__/`)                                   |
| `bun run db:test`             | pgTAP database tests, including cross-user RLS isolation         |
| `bun run db:reset`            | Re-apply all migrations to a fresh local database                |
| `bun run db:types`            | Regenerate `src/types/database.types.ts` after a schema change   |
| `bun run doctor`              | expo-doctor dependency checks                                    |

Add packages with `bunx expo install <pkg>` so versions match the SDK.

## How it fits together

```
src/app/            Expo Router screens. (auth) → onboarding → (app) is gated by Stack.Protected.
src/features/<x>/   api.ts (Supabase calls) · hooks.ts (React Query) · mutations.ts · components/
src/lib/            Supabase client, query client, query keys, dates, units, shared helpers
supabase/           migrations, pgTAP tests, email templates, config
__tests__/          Jest tests
```

- **Components never call Supabase directly.** They use feature hooks; ESLint enforces it.
- **Dates:** instants are `timestamptz`. Day columns (`logged_on`, `measured_on`) are
  computed on the device in the user's timezone at logging time, never derived from UTC.
- **Units:** everything is stored metric (kg, ml, m) and converted only for display and input.

### Offline

- Each quick log (water, food, sets, body weight, settings) updates the React Query cache
  immediately and runs as a mutation registered in `src/lib/mutation-defaults.ts`.
- Offline, the mutation pauses, and the paused queue is persisted with the cache in
  AsyncStorage. It replays after a restart because every mutation key has a registered
  `mutationFn`.
- Writes carry client-generated UUIDs and are upserts, so replaying one is idempotent.
- Writes that depend on each other share a mutation `scope`, so they replay in order.
- If the server rejects a write, the cached change is rolled back and the screen says so.
- The in-progress workout lives in a persisted Zustand store (`active-workout-store.ts`).
  About 1.5 s after each change, the whole workout goes to the server as one snapshot via
  the `save_workout` RPC. Stale revisions are ignored server-side, and unsent older
  snapshots are pruned from the queue.
- The rest timer and elapsed clock are computed from timestamps, so they're exact after
  the app is killed.
- Signing out clears the cache, the queued writes and the in-progress workout.
- Queued writes older than 7 days are dropped with the persisted cache (`maxAge` in
  `src/lib/query-client.ts`).

## Production

**Supabase:** the "Fitness Tracker" project (`wzjqkcsqaoeichnswqtf`, ap-south-1), linked from this repo.

- **Schema changes:** add a migration with `bunx supabase migration new <name>` and test it
  locally (`bun run db:reset && bun run db:test`). Then run `bunx supabase db push` and
  `bunx supabase test db --linked`. The tests roll back, so they're safe on the live database.
- **Auth settings:** these come from `supabase/config.toml`, with production overrides under
  `[remotes.production]`. Run `bunx supabase config diff` to review, then
  `bunx supabase config push`.
- **Email:** sign-up and password reset need the code templates in `supabase/templates/`. The
  free tier only accepts custom templates once custom SMTP is configured (Authentication →
  Emails → SMTP settings). After that, `config push` uploads them.

**EAS:** the project is `@prateekjha01/fitness-tracker`. `EXPO_PUBLIC_SUPABASE_URL` and
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are stored as EAS environment variables for the
`preview` and `production` environments (`bunx eas-cli env:list --environment production`).
Never ship the secret key.

| Task                                   | Command                                                                                             |
| -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Android APK to install directly        | `bunx eas-cli build --platform android --profile preview`                                           |
| Store / TestFlight build               | `bunx eas-cli build --platform ios --profile production`, then `bunx eas-cli submit --platform ios` |
| Ship a JS-only fix to installed builds | `bunx eas-cli update --channel production --environment production --message "…"`                   |

Updates reach builds with the same app `version` (`runtimeVersion` uses the `appVersion`
policy). After adding a native module or changing native config, bump `version` in
`app.config.ts` and build again. `--environment production` matters: EAS's variables
override `.env.local`, so the update points at the hosted project rather than your Mac.

### iPhone without a paid Apple account

A free Apple ID can sign the app from Xcode, but the install stops opening after
**7 days** and has to be rebuilt. Two things in this repo make that work:

- `plugins/with-no-push-entitlement.js` removes the Push Notifications entitlement.
  Free accounts can't sign it, and the app only uses local notifications.
- `.env.production.local` (git-ignored) holds the hosted Supabase URL and publishable key.
  Release builds use it, while Expo Go keeps using `.env.local`.

One-time setup: accept the Xcode licence (`sudo xcodebuild -license accept`), install
CocoaPods, add your Apple ID in Xcode → Settings → Accounts, then connect the iPhone by USB
and turn on Developer Mode. After that, and again every 7 days:

```bash
bunx expo run:ios --device --configuration Release
```

This generates `ios/` (git-ignored; never edit it by hand) and installs a standalone build
that doesn't need the dev server.

## Known limitations

- Templates can be created from workouts, started and deleted, but not edited or renamed.
- Exercises are reordered with Move up/down rather than drag and drop.
- Copying meals or days needs a connection. Everything else works offline.
- History lists the most recent 100 workouts.
