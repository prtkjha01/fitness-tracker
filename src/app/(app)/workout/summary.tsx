import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { LoadingState } from '@/components/loading-state';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useProfile } from '@/features/profile/hooks';
import { useActiveWorkout } from '@/features/workouts/active-workout-store';
import { PrList } from '@/features/workouts/components/pr-list';
import { SaveTemplateButton } from '@/features/workouts/components/save-template-dialog';
import { WorkoutSetsView } from '@/features/workouts/components/workout-sets-view';
import { WorkoutStatsGrid } from '@/features/workouts/components/workout-stats';
import { workoutStats } from '@/features/workouts/draft';
import { useExerciseMap, useWorkout, useWorkoutPrs } from '@/features/workouts/hooks';
import { useOnline } from '@/hooks/use-online';

export default function WorkoutSummaryScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const lastFinished = useActiveWorkout((s) => s.lastFinished);
  // The just-finished workout is local, so the summary works before (or without) syncing.
  const local = lastFinished?.id === id ? lastFinished : null;
  const remote = useWorkout(local ? undefined : id);
  const workout = local ?? remote.data;
  const prs = useWorkoutPrs(id);
  const profile = useProfile();
  const exercises = useExerciseMap();
  const online = useOnline();

  if (!workout || !profile.data) {
    return (
      <Screen edges={[]}>
        {remote.isError ? <EmptyState title="Workout not found" /> : <LoadingState />}
      </Screen>
    );
  }
  const units = profile.data.units;

  return (
    <Screen edges={[]}>
      <View className="gap-1">
        <Text variant="h3">Workout complete</Text>
        <Text className="text-muted-foreground">{workout.name}</Text>
      </View>
      <WorkoutStatsGrid stats={workoutStats(workout)} units={units} />

      <Card>
        <CardHeader>
          <CardTitle>Personal records</CardTitle>
        </CardHeader>
        <CardContent>
          {prs.data && prs.data.length > 0 ? (
            <PrList prs={prs.data} exercises={exercises} units={units} />
          ) : (
            <Text className="text-muted-foreground">
              {!online
                ? 'PRs are worked out once this workout syncs.'
                : prs.isPending
                  ? 'Checking…'
                  : 'No new records this time. The first session of an exercise sets the baseline.'}
            </Text>
          )}
        </CardContent>
      </Card>

      <WorkoutSetsView workout={workout} exercises={exercises} units={units} />
      {workout.notes ? <Text className="italic text-muted-foreground">{workout.notes}</Text> : null}

      <SaveTemplateButton workout={workout} />
      <Button size="lg" onPress={() => router.dismissTo('/workout')}>
        <Text>Done</Text>
      </Button>
    </Screen>
  );
}
