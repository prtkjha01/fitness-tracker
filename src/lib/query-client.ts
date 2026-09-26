import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { onlineManager, QueryClient } from '@tanstack/react-query';
import type { PersistQueryClientProviderProps } from '@tanstack/react-query-persist-client';

import { registerMutationDefaults } from '@/lib/mutation-defaults';

const ONE_DAY = 1000 * 60 * 60 * 24;
const CACHE_MAX_AGE = 7 * ONE_DAY;

// Bump when a cached data shape changes incompatibly; old caches are discarded on launch.
const CACHE_BUSTER = 'v1';

// Paused mutations replay when NetInfo reports connectivity again.
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    setOnline(!!state.isConnected);
  }),
);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      // Must be >= persister maxAge or restored data is garbage-collected immediately.
      gcTime: CACHE_MAX_AGE,
      retry: 2,
    },
  },
});

// Must happen before the persisted cache is restored so queued mutations can resume.
registerMutationDefaults(queryClient);

export const persistOptions: PersistQueryClientProviderProps['persistOptions'] = {
  persister: createAsyncStoragePersister({
    storage: AsyncStorage,
    key: 'fitness-tracker-query-cache',
    throttleTime: 1000,
  }),
  maxAge: CACHE_MAX_AGE,
  buster: CACHE_BUSTER,
};
