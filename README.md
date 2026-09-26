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

## Moving to a hosted Supabase project

1. Create the project, then `bunx supabase link --project-ref <ref>` and `bunx supabase db push`.
   The exercise library is seeded by a migration, so it arrives too.
2. Auth → Email: turn on **Confirm email**. The app asks for the emailed code.
3. Copy `supabase/templates/recovery.html` and `confirmation.html` into the dashboard's email
   templates. They send a 6-digit code (`{{ .Token }}`), not a link.
4. Set up custom SMTP (e.g. Resend or SendGrid). The built-in sender is heavily rate-limited.
5. Put the hosted URL and publishable key in your env (EAS environment variables for builds).
   Never ship the secret key.

## Known limitations

- Templates can be created from workouts, started and deleted, but not edited or renamed.
- Exercises are reordered with Move up/down rather than drag and drop.
- Copying meals or days needs a connection. Everything else works offline.
- History lists the most recent 100 workouts.
