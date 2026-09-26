// The offline pattern end to end, minus the network: queued writes survive a restart
// (dehydrate → hydrate into a fresh client), replay in order, and roll back on failure.
import { dehydrate, hydrate, onlineManager, QueryClient } from '@tanstack/react-query';

import { registerWaterMutations } from '@/features/water/mutations';
import { registerWorkoutMutations } from '@/features/workouts/mutations';
import { pruneQueuedSaves, queueSave } from '@/features/workouts/sync-queue';
import { enqueue } from '@/lib/optimistic';
import { mk, qk } from '@/lib/query-keys';

const mockCalls: string[] = [];
let mockFailAdds = false;

jest.mock('@/features/water/api', () => ({
  addWaterLog: async (v: { id: string }) => {
    mockCalls.push(`add:${v.id}`);
    if (mockFailAdds) {
      await new Promise((r) => setTimeout(r, 20));
      throw new Error('server said no');
    }
  },
  deleteWaterLog: async ({ log }: { log: { id: string } }) => void mockCalls.push(`del:${log.id}`),
}));
jest.mock('@/features/workouts/api', () => ({
  saveWorkout: async ({ draft }: any) =>
    void mockCalls.push(`save:${draft.id}:r${draft.revision}${draft.ended_at ? ':done' : ''}`),
  deleteWorkout: async ({ workoutId }: any) => void mockCalls.push(`delete:${workoutId}`),
  createExercise: async ({ exercise }: any) => void mockCalls.push(`exercise:${exercise.id}`),
  archiveExercise: async () => {},
  saveTemplate: async () => {},
  deleteTemplate: async () => {},
}));

const USER = 'u1';
const DAY = '2026-09-26';
const flush = () => new Promise((r) => setTimeout(r, 30));
const water = (id: string, at: string) => ({ id, user_id: USER, amount_ml: 250, logged_at: at, logged_on: DAY });
const dayIds = (qc: QueryClient) =>
  (qc.getQueryData<{ id: string }[]>(qk.water.day(USER, DAY)) ?? []).map((l) => l.id);

function client() {
  // Infinity: no garbage-collection timers left running after the test, so Jest can exit.
  const qc = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity }, mutations: { gcTime: Infinity } },
  });
  registerWaterMutations(qc);
  registerWorkoutMutations(qc);
  return qc;
}

/** "Kill the app": persist what the persister would, restore into a brand-new client. */
function restart(qc: QueryClient) {
  const next = client();
  hydrate(next, JSON.parse(JSON.stringify(dehydrate(qc))));
  return next;
}

beforeEach(() => {
  mockCalls.length = 0;
  mockFailAdds = false;
  onlineManager.setOnline(true);
});

it('water: offline adds and an undo show instantly, survive a restart, and replay in order', async () => {
  onlineManager.setOnline(false);
  const qc = client();
  qc.setQueryData(qk.water.day(USER, DAY), []);
  enqueue(qc, mk.water.add, water('a', '2026-09-26T08:00:00Z'));
  enqueue(qc, mk.water.add, water('b', '2026-09-26T09:00:00Z'));
  await flush();
  expect(dayIds(qc)).toEqual(['b', 'a']);
  enqueue(qc, mk.water.delete, { log: { ...water('b', '2026-09-26T09:00:00Z'), created_at: '' } });
  await flush();
  expect(dayIds(qc)).toEqual(['a']);
  expect(mockCalls).toEqual([]);

  const restored = restart(qc);
  expect(dayIds(restored)).toEqual(['a']);
  onlineManager.setOnline(true);
  await restored.resumePausedMutations();
  await flush();
  expect(mockCalls).toEqual(['add:a', 'add:b', 'del:b']);
});

it('water: an add the server rejects is rolled back', async () => {
  mockFailAdds = true;
  const qc = client();
  qc.setQueryData(qk.water.day(USER, DAY), []);
  // Per-call options layer over the registered defaults; skip the 1+2+4 s retry backoff.
  qc.getMutationCache()
    .build(qc, { mutationKey: mk.water.add, retry: 0 })
    .execute(water('c', '2026-09-26T10:00:00Z'))
    .catch(() => {});
  await new Promise((r) => setTimeout(r, 5));
  expect(dayIds(qc)).toEqual(['c']);
  await flush();
  expect(dayIds(qc)).toEqual([]);
});

const draft = (id: string, revision: number, ended = false) => ({
  id, user_id: USER, name: 'W', started_at: '2026-09-26T10:00:00Z',
  ended_at: ended ? '2026-09-26T11:00:00Z' : null, notes: null, template_id: null, revision, exercises: [],
});

it('workouts: only the newest unsent snapshot is kept, after the exercise it depends on', async () => {
  onlineManager.setOnline(false);
  const qc = client();
  enqueue(qc, mk.workouts.createExercise, { exercise: { id: 'custom', user_id: USER, name: 'X' } });
  for (let rev = 1; rev <= 5; rev++) queueSave(qc, draft('w1', rev));
  queueSave(qc, draft('w1', 6, true));
  await flush();

  const restored = restart(qc);
  onlineManager.setOnline(true);
  await restored.resumePausedMutations();
  await flush();
  expect(mockCalls).toEqual(['exercise:custom', 'save:w1:r6:done']);
});

it('workouts: discarding an unsynced workout never sends it', async () => {
  onlineManager.setOnline(false);
  const qc = client();
  queueSave(qc, draft('w2', 1));
  queueSave(qc, draft('w2', 2));
  pruneQueuedSaves(qc, 'w2');
  enqueue(qc, mk.workouts.delete, { userId: USER, workoutId: 'w2' });
  await flush();
  onlineManager.setOnline(true);
  await qc.resumePausedMutations();
  await flush();
  expect(mockCalls).toEqual(['delete:w2']);
});
