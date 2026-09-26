import { useMutation } from '@tanstack/react-query';

import * as api from './api';
import { useSession } from './session-provider';

// Auth calls must never be paused and persisted as offline mutations (that would write the
// password to AsyncStorage and replay it later), so they run immediately and fail when offline.
const authMutation = { networkMode: 'always', retry: false } as const;

export function useSignIn() {
  return useMutation({ ...authMutation, mutationFn: api.signIn });
}

export function useSignUp() {
  return useMutation({ ...authMutation, mutationFn: api.signUp });
}

export function useVerifySignUpCode() {
  return useMutation({ ...authMutation, mutationFn: api.verifySignUpCode });
}

export function useResendSignUpCode() {
  return useMutation({ ...authMutation, mutationFn: api.resendSignUpCode });
}

export function useRequestPasswordReset() {
  return useMutation({ ...authMutation, mutationFn: api.requestPasswordReset });
}

export function useVerifyRecoveryCode() {
  return useMutation({ ...authMutation, mutationFn: api.verifyRecoveryCode });
}

export function useUpdatePassword() {
  const { finishPasswordRecovery } = useSession();
  return useMutation({
    ...authMutation,
    mutationFn: api.updatePassword,
    onSuccess: finishPasswordRecovery,
  });
}

export function useSignOut() {
  return useMutation({ ...authMutation, mutationFn: api.signOut });
}
