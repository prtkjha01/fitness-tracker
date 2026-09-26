import { formatInTimeZone } from 'date-fns-tz';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { Screen } from '@/components/screen';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useProfile } from '@/features/profile/hooks';
import { PrList } from '@/features/workouts/components/pr-list';
import { SaveTemplateButton } from '@/features/workouts/components/save-template-dialog';
import { WorkoutSetsView } from '@/features/workouts/components/workout-sets-view';
import { WorkoutStatsGrid } from '@/features/workouts/components/workout-stats';
import { workoutStats } from '@/features/workouts/draft';
import {
  useDeleteWorkout,
  useExerciseMap,
  useWorkout,
  useWorkoutPrs,
} from '@/features/workouts/hooks';

export default function WorkoutDetailScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const workout = useWorkout(workoutId);
  const prs = useWorkoutPrs(workoutId);
  const profile = useProfile();
  const exercises = useExerciseMap();
  const deleteWorkout = useDeleteWorkout();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!workout.data || !profile.data) {
    return (
      <Screen edges={[]}>
        {workout.isError ? (
          <ErrorState
            title="Couldn't load this workout"
            error={workout.error}
            onRetry={() => workout.refetch()}
          />
        ) : workout.isPaused ? (
          <EmptyState title="You're offline" description="This workout loads once you reconnect." />
        ) : (
          <LoadingState />
        )}
      </Screen>
    );
  }

  const w = workout.data;
  const { timezone, units } = profile.data;

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: w.name }} />
      <Text className="text-muted-foreground">
        {formatInTimeZone(w.started_at, timezone, "EEEE, MMM d, yyyy 'at' HH:mm")}
      </Text>
      <WorkoutStatsGrid stats={workoutStats(w)} units={units} />

      {prs.data && prs.data.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Personal records</CardTitle>
          </CardHeader>
          <CardContent>
            <PrList prs={prs.data} exercises={exercises} units={units} />
          </CardContent>
        </Card>
      ) : null}

      <WorkoutSetsView workout={w} exercises={exercises} units={units} />
      {w.notes ? <Text className="italic text-muted-foreground">{w.notes}</Text> : null}

      <View className="gap-2">
        <Button variant="outline" onPress={() => router.push(`/workout/edit/${w.id}`)}>
          <Text>Edit workout</Text>
        </Button>
        <SaveTemplateButton workout={w} />
        <Button variant="ghost" onPress={() => setConfirmDelete(true)}>
          <Text className="text-destructive">Delete workout</Text>
        </Button>
      </View>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this workout?</AlertDialogTitle>
            <AlertDialogDescription>
              Its sets are removed from your history, records and progress charts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text>Cancel</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive"
              onPress={() => {
                deleteWorkout.remove(w.id);
                router.back();
              }}
            >
              <Text>Delete</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Screen>
  );
}
