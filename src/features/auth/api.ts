import {
  isAuthRetryableFetchError,
  type AuthChangeEvent,
  type Session,
} from '@supabase/supabase-js';

import { getDeviceTimezone } from '@/lib/locale';
import { supabase } from '@/lib/supabase';

export function onAuthChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange(callback);
  return () => data.subscription.unsubscribe();
}

export async function signIn({ email, password }: { email: string; password: string }) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/**
 * Returns `needsConfirmation: true` when the project requires email confirmation
 * (hosted), in which case a 6-digit code has been emailed and no session exists yet.
 */
export async function signUp({ email, password }: { email: string; password: string }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Read by the handle_new_user trigger to seed profiles.timezone.
    options: { data: { timezone: getDeviceTimezone() } },
  });
  if (error) throw error;
  return { needsConfirmation: data.session === null };
}

export async function verifySignUpCode({ email, code }: { email: string; code: string }) {
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
  if (error) throw error;
}

export async function resendSignUpCode(email: string) {
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  if (error) throw error;
}

export async function requestPasswordReset(email: string) {
  // The recovery email template contains {{ .Token }}; no redirect URL is involved.
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

/** Signs the user in and emits PASSWORD_RECOVERY, which holds them on the auth screens. */
export async function verifyRecoveryCode({ email, code }: { email: string; code: string }) {
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' });
  if (error) throw error;
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function signOut() {
  // Revoke the refresh token on the server when we can; offline, just drop the local session.
  const { error } = await supabase.auth.signOut();
  if (error && isAuthRetryableFetchError(error)) {
    const local = await supabase.auth.signOut({ scope: 'local' });
    if (local.error) throw local.error;
    return;
  }
  if (error) throw error;
}
