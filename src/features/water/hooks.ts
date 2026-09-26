import { useMutation, useQuery } from '@tanstack/react-query';

import { useSession } from '@/features/auth/session-provider';
import { useProfile, useToday } from '@/features/profile/hooks';
import { localDate } from '@/lib/dates';
import { mk, qk } from '@/lib/query-keys';
import { newId } from '@/lib/uuid';

import { fetchDayWaterLogs, type AddWaterVars, type DeleteWaterVars, type WaterLog } from './api';

export function useDayWaterLogs(date: string | undefined) {
  const userId = useSession().session?.user.id;
  return useQuery({
    queryKey: qk.water.day(userId ?? '', date ?? ''),
    queryFn: () => fetchDayWaterLogs(date!),
    enabled: !!userId && !!date,
  });
}

/** Today's logs (in the user's timezone) with the running total and goal. */
export function useTodayWater() {
  const profile = useProfile();
  const today = useToday();
  const logs = useDayWaterLogs(today);
  // Offline with nothing cached for today yet (e.g. just after midnight): start from an
  // empty day so logging still works; queued writes show up optimistically.
  const todayLogs = logs.data ?? (logs.isPaused ? [] : undefined);
  const totalMl = (todayLogs ?? []).reduce((sum, log) => sum + log.amount_ml, 0);
  return { profile, logs, todayLogs, totalMl, goalMl: profile.data?.daily_water_goal_ml ?? 0 };
}

/**
 * Logs water instantly. Offline, the write is queued (and survives a restart) while the
 * row already shows in today's list. Returns the new log's id, e.g. for undo.
 */
export function useAddWater() {
  const userId = useSession().session?.user.id;
  const timezone = useProfile().data?.timezone;
  // mutationFn, optimistic update and rollback come from registerWaterMutations.
  const mutation = useMutation<void, Error, AddWaterVars>({ mutationKey: mk.water.add });

  const add = (amountMl: number): string | null => {
    if (!userId || !timezone) return null;
    const now = new Date();
    const id = newId();
    mutation.mutate({
      id,
      user_id: userId,
      amount_ml: amountMl,
      logged_at: now.toISOString(),
      logged_on: localDate(timezone, now),
    });
    return id;
  };

  return { add, error: mutation.error, reset: mutation.reset };
}

export function useDeleteWater() {
  const mutation = useMutation<void, Error, DeleteWaterVars>({ mutationKey: mk.water.delete });
  return {
    remove: (log: WaterLog) => mutation.mutate({ log }),
    error: mutation.error,
    reset: mutation.reset,
  };
}
