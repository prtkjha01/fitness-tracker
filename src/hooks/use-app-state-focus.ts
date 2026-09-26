import { focusManager } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
}

/** Refetch stale queries when the app returns to the foreground. */
export function useAppStateFocus() {
  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);
}
