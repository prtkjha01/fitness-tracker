import type { QueryClient } from '@tanstack/react-query';

import { enqueue } from '@/lib/optimistic';
import { mk } from '@/lib/query-keys';

import type { SaveWorkoutVars } from './api';
import type { WorkoutDraft } from './draft';

/** Drops any queued-but-unsent snapshots of this workout; only the newest one matters. */
export function pruneQueuedSaves(queryClient: QueryClient, workoutId: string) {
  const cache = queryClient.getMutationCache();
  for (const mutation of cache.findAll({ mutationKey: mk.workouts.save, exact: true })) {
    const vars = mutation.state.variables as SaveWorkoutVars | undefined;
    if (mutation.state.isPaused && vars?.draft.id === workoutId && !vars.draft.ended_at) {
      cache.remove(mutation);
    }
  }
}

/** Queues a whole-workout snapshot, replacing older unsent snapshots of the same workout. */
export function queueSave(queryClient: QueryClient, draft: WorkoutDraft) {
  pruneQueuedSaves(queryClient, draft.id);
  enqueue<SaveWorkoutVars>(queryClient, mk.workouts.save, { draft });
}
