import { useKeepAwake } from 'expo-keep-awake';
import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty-state';
import { LoadingState } from '@/components/loading-state';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Text } from '@/components/ui/text';
import { useProfile } from '@/features/profile/hooks';
import { useActiveWorkout } from '@/features/workouts/active-workout-store';
import { ElapsedTime } from '@/features/workouts/components/elapsed-time';
import { RestBar } from '@/features/workouts/components/rest-bar';
import { WorkoutEditor } from '@/features/workouts/components/workout-editor';
import { edit, workoutStats } from '@/features/workouts/draft';
import { useDiscardWorkout, useFinishWorkout } from '@/features/workouts/hooks';
import { startRest } from '@/features/workouts/rest-timer';
import { formatWeight } from '@/lib/units';

export default function ActiveWorkoutScreen() {
  useKeepAwake();
  const hydrated = useActiveWorkout((s) => s.hydrated);
  const workout = useActiveWorkout((s) => s.workout);
  const update = useActiveWorkout((s) => s.update);
  const profile = useProfile();
  const finishWorkout = useFinishWorkout();
  const discardWorkout = useDiscardWorkout();
  const [dialog, setDialog] = useState<'finish' | 'discard' | null>(null);

  if (!hydrated || !profile.data) {
    return <LoadingState />;
  }
  if (!workout) {
    return (
      <View className="flex-1 bg-background p-4">
        <EmptyState
          title="No workout in progress"
          action={
            <Button onPress={() => router.back()}>
              <Text>Back</Text>
            </Button>
          }
        />
      </View>
    );
  }

  const { units, default_rest_seconds } = profile.data;
  const stats = workoutStats(workout);
  const completedSets = workout.exercises.reduce(
    (n, e) => n + e.sets.filter((s) => s.is_completed).length,
    0,
  );

  const finish = () => {
    const finished = finishWorkout();
    if (finished) router.replace({ pathname: '/workout/summary', params: { id: finished.id } });
  };
  const discard = () => {
    discardWorkout();
    router.back();
  };

  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <Button size="sm" onPress={() => setDialog('finish')}>
              <Text>Finish</Text>
            </Button>
          ),
        }}
      />
      <ScrollView
        contentContainerClassName="gap-4 p-4 pb-12"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Input
          value={workout.name}
          onChangeText={(name) => update((d) => edit.rename(d, name))}
          maxLength={80}
          aria-label="Workout name"
          className="border-0 bg-transparent px-0 text-2xl font-semibold shadow-none dark:bg-transparent"
        />
        <View className="flex-row gap-4">
          <ElapsedTime since={workout.started_at} className="text-lg font-semibold" />
          <Text className="text-lg text-muted-foreground">
            {formatWeight(stats.volumeKg, units)} · {stats.workingSets} sets
          </Text>
        </View>

        <WorkoutEditor
          draft={workout}
          update={update}
          target="active"
          units={units}
          onSetCompleted={() => {
            if (default_rest_seconds > 0) void startRest(default_rest_seconds);
          }}
        />

        <View className="gap-1.5">
          <Label nativeID="workout-notes-label">Notes</Label>
          <Input
            value={workout.notes ?? ''}
            onChangeText={(notes) => update((d) => edit.setNotes(d, notes))}
            placeholder="How did it go?"
            multiline
            maxLength={2000}
            aria-labelledby="workout-notes-label"
            className="h-auto min-h-20 py-2"
          />
        </View>

        <Button variant="ghost" onPress={() => setDialog('discard')}>
          <Text className="text-destructive">Discard workout</Text>
        </Button>
      </ScrollView>

      <RestBar />
      <SafeAreaView edges={['bottom']} className="bg-card" />

      <AlertDialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <AlertDialogContent>
          {dialog === 'discard' ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Discard this workout?</AlertDialogTitle>
                <AlertDialogDescription>
                  All exercises and sets from this session will be deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  <Text>Keep going</Text>
                </AlertDialogCancel>
                <AlertDialogAction className="bg-destructive" onPress={discard}>
                  <Text>Discard</Text>
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : completedSets === 0 ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Nothing to save yet</AlertDialogTitle>
                <AlertDialogDescription>
                  Tick off at least one set to finish, or discard the workout.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  <Text>OK</Text>
                </AlertDialogCancel>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Finish workout?</AlertDialogTitle>
                <AlertDialogDescription>
                  {stats.incompleteSets > 0
                    ? `${stats.incompleteSets} unticked ${stats.incompleteSets === 1 ? 'set' : 'sets'} will be removed.`
                    : 'Nice work.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  <Text>Keep going</Text>
                </AlertDialogCancel>
                <AlertDialogAction onPress={finish}>
                  <Text>Finish</Text>
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}
