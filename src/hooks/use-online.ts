import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

const subscribe = (onChange: () => void) => onlineManager.subscribe(onChange);
const getSnapshot = () => onlineManager.isOnline();

/** Connectivity as React Query sees it (fed by NetInfo in lib/query-client.ts). */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot);
}
