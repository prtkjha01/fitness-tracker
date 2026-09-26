import { Stack } from 'expo-router';

import { useSyncTimezone } from '@/features/profile/hooks';
import { useWorkoutSync } from '@/features/workouts/hooks';

// Sheets on Android can't show a native header, so their titles are part of the content.
const sheet = {
  presentation: 'formSheet' as const,
  headerShown: false,
  sheetAllowedDetents: [0.75, 1],
  sheetGrabberVisible: true,
};

export default function AppLayout() {
  useSyncTimezone();
  // Keeps the in-progress workout flowing to the server from any screen.
  useWorkoutSync();

  return (
    <Stack screenOptions={{ headerBackTitle: 'Back' }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      <Stack.Screen name="water" options={sheet} />

      <Stack.Screen name="nutrition/entry" options={{ title: 'Log food' }} />
      <Stack.Screen name="nutrition/saved-foods" options={{ title: 'My foods' }} />
      <Stack.Screen name="nutrition/copy" options={sheet} />

      {/* No swipe-back: finishing or discarding is an explicit choice. */}
      <Stack.Screen name="workout/active" options={{ title: '', gestureEnabled: false }} />
      <Stack.Screen
        name="workout/exercise-picker"
        options={{ title: 'Add exercises', presentation: 'modal' }}
      />
      <Stack.Screen
        name="workout/summary"
        options={{ title: 'Summary', headerBackVisible: false, gestureEnabled: false }}
      />
      <Stack.Screen name="workout/history" options={{ title: 'History' }} />
      <Stack.Screen name="workout/[workoutId]" options={{ title: 'Workout' }} />
      <Stack.Screen name="workout/edit/[workoutId]" options={{ title: 'Edit workout' }} />

      <Stack.Screen name="exercises/index" options={{ title: 'Exercises' }} />
      <Stack.Screen name="exercises/new" options={{ title: 'New exercise' }} />
      <Stack.Screen name="exercises/[exerciseId]" options={{ title: 'Exercise' }} />

      <Stack.Screen name="templates/index" options={{ title: 'Templates' }} />
      <Stack.Screen name="templates/[templateId]" options={{ title: 'Template' }} />

      <Stack.Screen name="body-weight" options={{ title: 'Body weight' }} />
    </Stack>
  );
}
