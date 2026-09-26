import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useSession } from '@/features/auth/session-provider';
import { useNow } from '@/hooks/use-now';
import { localDate } from '@/lib/dates';
import { getDeviceTimezone } from '@/lib/locale';
import { mk, qk } from '@/lib/query-keys';

import { fetchProfile, updateProfile, type Profile, type ProfileUpdate } from './api';
import type { SaveProfileVars } from './mutations';

export function useProfile() {
  const userId = useSession().session?.user.id;
  return useQuery({
    queryKey: qk.profile(userId ?? ''),
    queryFn: () => fetchProfile(userId!),
    enabled: !!userId,
  });
}

/**
 * Today's date ("yyyy-MM-dd") in the user's timezone. Re-checks every 30 s and on
 * returning to the app, so screens left open roll over at midnight.
 */
export function useToday(): string | undefined {
  const timezone = useProfile().data?.timezone;
  const now = useNow(30_000);
  return timezone ? localDate(timezone, new Date(now)) : undefined;
}

/**
 * Saves profile fields and writes the result into the cache (which is what flips the
 * onboarding guard). Needs a connection: it fails right away instead of queueing offline.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const userId = useSession().session?.user.id;
  return useMutation({
    networkMode: 'always',
    mutationFn: (patch: ProfileUpdate) => {
      if (!userId) throw new Error('Not signed in');
      return updateProfile(userId, patch);
    },
    onSuccess: (profile) => queryClient.setQueryData(qk.profile(profile.id), profile),
  });
}

/**
 * Settings edits: applied to the cached profile instantly and queued offline like any
 * other log (onboarding keeps useUpdateProfile, which reports failures right away).
 */
export function useSaveProfile() {
  const userId = useSession().session?.user.id;
  const { data: profile } = useProfile();
  const mutation = useMutation<Profile, Error, SaveProfileVars>({ mutationKey: mk.profile.save });
  return {
    save: (patch: ProfileUpdate) => {
      if (userId && profile) mutation.mutate({ userId, patch, previous: profile });
    },
    error: mutation.error,
  };
}

/** Once per launch, store the device timezone if it changed (e.g. after travelling). */
export function useSyncTimezone() {
  const { data: profile } = useProfile();
  const { mutate } = useUpdateProfile();
  const attempted = useRef(false);

  useEffect(() => {
    if (!profile || attempted.current) return;
    attempted.current = true;
    const timezone = getDeviceTimezone();
    // Failures (offline, or a zone Postgres doesn't know) are fine: the old zone stays.
    if (profile.timezone !== timezone) mutate({ timezone });
  }, [profile, mutate]);
}
