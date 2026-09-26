import type { QueryClient } from '@tanstack/react-query';

import { invalidateWhenIdle } from '@/lib/optimistic';
import { mk, qk } from '@/lib/query-keys';

import { updateProfile, type Profile, type ProfileUpdate } from './api';

/** `previous` is the profile before the edit, for rollback. */
export type SaveProfileVars = { userId: string; patch: ProfileUpdate; previous: Profile };

/** See registerWaterMutations for why these are registered at startup. */
export function registerProfileMutations(queryClient: QueryClient) {
  queryClient.setMutationDefaults<Profile, Error, SaveProfileVars>(mk.profile.save, {
    mutationFn: ({ userId, patch }) => updateProfile(userId, patch),
    scope: { id: 'profile' },
    retry: 3,
    onMutate: async ({ userId, patch }) => {
      await queryClient.cancelQueries({ queryKey: qk.profile(userId) });
      queryClient.setQueryData<Profile>(qk.profile(userId), (current) =>
        current ? { ...current, ...patch } : current,
      );
    },
    onError: (_error, { userId, previous }) =>
      queryClient.setQueryData<Profile>(qk.profile(userId), previous),
    onSettled: (_data, _error, { userId }) =>
      invalidateWhenIdle(queryClient, ['profile'], qk.profile(userId)),
  });
}
