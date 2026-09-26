import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { env } from '@/lib/env';
import { LargeSecureStore } from '@/lib/large-secure-store';
import type { Database } from '@/types/database.types';

export const supabase = createClient<Database>(
  env.EXPO_PUBLIC_SUPABASE_URL,
  env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: new LargeSecureStore(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// Only refresh tokens while the app is in the foreground (Supabase RN guidance).
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
