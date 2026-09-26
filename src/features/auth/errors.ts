import { isAuthError, isAuthRetryableFetchError } from '@supabase/supabase-js';

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email or password is incorrect.',
  email_not_confirmed: 'Confirm your email first. Check your inbox for the sign-up code.',
  user_already_exists: 'An account with this email already exists. Sign in instead.',
  email_exists: 'An account with this email already exists. Sign in instead.',
  otp_expired: 'That code is wrong or has expired. Request a new one.',
  same_password: 'Choose a password different from your current one.',
  over_email_send_rate_limit: 'Too many emails sent. Wait a minute and try again.',
  over_request_rate_limit: 'Too many attempts. Wait a minute and try again.',
  signup_disabled: 'Sign-ups are currently turned off.',
};

/** Human-readable message for an auth failure. */
export function authErrorMessage(error: unknown): string | null {
  if (!error) return null;
  if (isAuthRetryableFetchError(error)) {
    return "Can't reach the server. Check your connection and try again.";
  }
  if (isAuthError(error)) {
    if (error.code === 'weak_password') return `Password is too weak. ${error.message}`;
    const message = error.code ? MESSAGES[error.code] : undefined;
    return message ?? error.message;
  }
  return error instanceof Error ? error.message : 'Something went wrong. Try again.';
}
