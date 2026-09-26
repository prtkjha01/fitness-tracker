import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useActiveWorkout, useEditWorkout } from '@/features/workouts/active-workout-store';
import { cancelRestNotification } from '@/features/workouts/rest-timer';
import { queryClient } from '@/lib/query-client';

import { onAuthChange } from './api';

type SessionContextValue = {
  session: Session | null;
  /** True until the stored session has been read on launch. */
  isLoading: boolean;
  /**
   * True after a password-recovery code is verified. That signs the user in, but they
   * stay on the auth screens until they've chosen a new password.
   */
  isRecoveringPassword: boolean;
  finishPasswordRecovery: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);

  useEffect(
    () =>
      // Fires INITIAL_SESSION first with the stored session (or null), then every change.
      // Don't await Supabase calls in here: the auth client holds a lock during callbacks.
      onAuthChange((event, nextSession) => {
        setSession(nextSession);
        setIsLoading(false);
        if (event === 'PASSWORD_RECOVERY') setIsRecoveringPassword(true);
        if (event === 'SIGNED_IN') setIsRecoveringPassword(false);
        if (event === 'SIGNED_OUT') {
          setIsRecoveringPassword(false);
          // Drop the previous user's cached data and queued offline writes.
          queryClient.clear();
          // ...and their in-progress workout, which lives outside the query cache.
          cancelRestNotification();
          useActiveWorkout.getState().reset();
          useEditWorkout.getState().clear();
        }
      }),
    [],
  );

  const value = useMemo(
    () => ({
      session,
      isLoading,
      isRecoveringPassword,
      finishPasswordRecovery: () => setIsRecoveringPassword(false),
    }),
    [session, isLoading, isRecoveringPassword],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}
