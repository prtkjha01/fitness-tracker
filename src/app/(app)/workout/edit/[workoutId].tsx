import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useProfile } from '@/features/profile/hooks';
import { useEditWorkout } from '@/features/workouts/active-workout-store';
import { WorkoutEditor } from '@/features/workouts/components/workout-editor';
import { dropIncomplete, edit } from '@/features/workouts/draft';
import { useSaveEditedWorkout, useWorkout } from '@/features/workouts/hooks';

export default function EditWorkoutScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const server = useWorkout(workoutId);
  const profile = useProfile();
  const draft = useEditWorkout((s) => s.draft);
  const { load, update, clear } = useEditWorkout.getState();
  const saveEdited = useSaveEditedWorkout();

  // Start editing from the server copy (once per visit).
  useEffect(() => {
    if (server.data && useEditWorkout.getState().draft?.id !== server.data.id) {
      load(server.data);
    }
  }, [server.data, load]);
  useEffect(() => clear, [clear]);

  if (!server.data || !profile.data || draft?.id !== workoutId) {
    return (
      <View className="flex-1 bg-background p-4">
        {server.isError ? (
          <ErrorState error={server.error} onRetry={() => server.refetch()} />
        ) : server.isPaused ? (
          <EmptyState
            title="You're offline"
            description="Editing needs the workout loaded first."
          />
        ) : (
          <LoadingState />
        )}
      </View>
    );
  }

  const cleaned = dropIncomplete(draft);
  const save = () => {
    saveEdited(cleaned, server.data.revision);
    router.back();
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: 'Edit workout',
          headerRight: () => (
            <Button size="sm" onPress={save} disabled={cleaned.exercises.length === 0}>
              <Text>Save</Text>
            </Button>
          ),
        }}
      />
      <ScrollView
        contentContainerClassName="gap-4 p-4 pb-12"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View className="gap-1.5">
          <Label nativeID="edit-name-label">Name</Label>
          <Input
            value={draft.name}
            onChangeText={(name) => update((d) => edit.rename(d, name))}
            maxLength={80}
            aria-labelledby="edit-name-label"
          />
        </View>
        <Text variant="muted">
          Unticked sets are removed when you save. To remove every set, delete the workout instead.
        </Text>
        <WorkoutEditor draft={draft} update={update} target="edit" units={profile.data.units} />
        <View className="gap-1.5">
          <Label nativeID="edit-notes-label">Notes</Label>
          <Input
            value={draft.notes ?? ''}
            onChangeText={(notes) => update((d) => edit.setNotes(d, notes))}
            multiline
            maxLength={2000}
            aria-labelledby="edit-notes-label"
            className="h-auto min-h-20 py-2"
          />
        </View>
      </ScrollView>
    </View>
  );
}
