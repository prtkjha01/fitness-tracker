import type { QueryClient } from '@tanstack/react-query';

import { invalidateWhenIdle, removeById, upsertById } from '@/lib/optimistic';
import { mk, qk } from '@/lib/query-keys';

import {
  addWaterLog,
  deleteWaterLog,
  type AddWaterVars,
  type DeleteWaterVars,
  type WaterLog,
} from './api';

const newestFirst = (a: WaterLog, b: WaterLog) => b.logged_at.localeCompare(a.logged_at);

// Shared by add and delete so queued writes replay in the order they were made
// (e.g. an offline add followed by its undo).
const scope = { id: 'water' };

// Gym Wi-Fi often "has signal" but drops requests; retry before rolling back.
// While offline, retries pause instead of burning attempts.
const retry = 3;

/**
 * Registered at startup, before the persisted cache is restored. After an app restart,
 * queued offline writes only have their key and variables, and get their mutationFn
 * and callbacks from here.
 */
export function registerWaterMutations(queryClient: QueryClient) {
  const setDay = (userId: string, date: string, update: (logs: WaterLog[]) => WaterLog[]) =>
    queryClient.setQueryData<WaterLog[]>(qk.water.day(userId, date), (logs) => update(logs ?? []));

  const settle = (userId: string) =>
    invalidateWhenIdle(queryClient, ['water'], qk.water.all(userId));

  queryClient.setMutationDefaults<void, Error, AddWaterVars>(mk.water.add, {
    mutationFn: addWaterLog,
    scope,
    retry,
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: qk.water.day(vars.user_id, vars.logged_on) });
      const row: WaterLog = { ...vars, created_at: vars.logged_at };
      setDay(vars.user_id, vars.logged_on, (logs) => upsertById(logs, row, newestFirst));
    },
    onError: (_error, vars) =>
      setDay(vars.user_id, vars.logged_on, (logs) => removeById(logs, vars.id)),
    onSettled: (_data, _error, vars) => settle(vars.user_id),
  });

  queryClient.setMutationDefaults<void, Error, DeleteWaterVars>(mk.water.delete, {
    mutationFn: deleteWaterLog,
    scope,
    retry,
    onMutate: async ({ log }) => {
      await queryClient.cancelQueries({ queryKey: qk.water.day(log.user_id, log.logged_on) });
      setDay(log.user_id, log.logged_on, (logs) => removeById(logs, log.id));
    },
    onError: (_error, { log }) =>
      setDay(log.user_id, log.logged_on, (logs) => upsertById(logs, log, newestFirst)),
    onSettled: (_data, _error, { log }) => settle(log.user_id),
  });
}
