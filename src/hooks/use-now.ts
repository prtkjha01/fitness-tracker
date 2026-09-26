import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * The current time, re-rendering every `intervalMs` (for timers, elapsed clocks and "today").
 * Also refreshes the moment the app returns to the foreground, since timers pause in the
 * background.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(Date.now());
    });
    return () => {
      clearInterval(id);
      subscription.remove();
    };
  }, [intervalMs]);
  return now;
}
