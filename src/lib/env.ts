import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.url(),
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

// Expo only inlines EXPO_PUBLIC_* vars when accessed statically, so list each one explicitly.
const result = envSchema.safeParse({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
});

if (!result.success) {
  throw new Error(
    `Invalid environment variables. Copy .env.example to .env.local and fill it in.\n${z.prettifyError(result.error)}`,
  );
}

export const env = result.data;
