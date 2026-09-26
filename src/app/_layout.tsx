import '../../global.css';

import { PortalHost } from '@rn-primitives/portal';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'nativewind';
import { useEffect } from 'react';

import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useSignOut } from '@/features/auth/hooks';
import { SessionProvider, useSession } from '@/features/auth/session-provider';
import { useProfile } from '@/features/profile/hooks';
import { useAppStateFocus } from '@/hooks/use-app-state-focus';
import { persistOptions, queryClient } from '@/lib/query-client';
import { NAV_THEME } from '@/lib/theme';

export { ErrorBoundary } from 'expo-router';

// Keep the splash up until we know whether there's a stored session.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { colorScheme = 'light' } = useColorScheme();
  useAppStateFocus();

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
      // Replay mutations that were queued offline before the app was closed.
      onSuccess={() => queryClient.resumePausedMutations()}
    >
      <SessionProvider>
        <ThemeProvider value={NAV_THEME[colorScheme]}>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <RootNavigator />
          <PortalHost />
        </ThemeProvider>
      </SessionProvider>
    </PersistQueryClientProvider>
  );
}

function RootNavigator() {
  const { session, isLoading, isRecoveringPassword } = useSession();
  const profile = useProfile();
  const signOut = useSignOut();

  const signedIn = !!session && !isRecoveringPassword;
  const waitingForProfile = signedIn && !profile.data;
  const ready = !isLoading && !(waitingForProfile && profile.isLoading);

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  if (!ready) return null;

  if (waitingForProfile) {
    // First launch after sign-in with no cached profile: offline, or the fetch failed.
    return (
      <Screen scroll={false} className="justify-center">
        {profile.isError ? (
          <ErrorState
            title="Couldn't load your profile"
            error={profile.error}
            onRetry={() => profile.refetch()}
          />
        ) : (
          <LoadingState label="Waiting for a connection to load your profile…" />
        )}
        <Button variant="ghost" onPress={() => signOut.mutate()} disabled={signOut.isPending}>
          <Text>Sign out</Text>
        </Button>
      </Screen>
    );
  }

  const onboarded = !!profile.data?.onboarded_at;

  // Exactly one group is reachable at a time; when a guard flips, Expo Router
  // redirects to the first reachable screen and drops the old history.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && onboarded}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}
