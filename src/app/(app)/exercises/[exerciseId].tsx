import { formatInTimeZone } from 'date-fns-tz';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Trophy } from 'lucide-react-native';
import { View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { useProfile } from '@/features/profile/hooks';
import type { ExerciseSession } from '@/features/workouts/api';
import { ExerciseProgressChart } from '@/features/workouts/components/exercise-progress-chart';
import type { TrackingType } from '@/features/workouts/draft';
import {
  EQUIPMENT_LABELS,
  formatPrValue,
  MUSCLE_LABELS,
  PR_LABELS,
  TRACKING_LABELS,
} from '@/features/workouts/format';
import {
  useArchiveExercise,
  useExerciseHistory,
  useExerciseMap,
  useExercisePrs,
  useExercises,
} from '@/features/workouts/hooks';
import { formatDuration } from '@/lib/duration';
import { formatDistance, formatWeight, type UnitSystem } from '@/lib/units';

// Chart, records, then every session (the chart's table view).
export default function ExerciseDetailScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const exercises = useExercises();
  const exercise = useExerciseMap().get(exerciseId);
  const history = useExerciseHistory(exerciseId);
  const prs = useExercisePrs(exerciseId);
  const profile = useProfile();
  const archive = useArchiveExercise();

  if (!exercise || !profile.data) {
    return (
      <Screen edges={[]}>
        {exercises.data && profile.data ? (
          <EmptyState title="Exercise not found" description="It may have been removed." />
        ) : exercises.isError ? (
          <ErrorState error={exercises.error} onRetry={() => exercises.refetch()} />
        ) : exercises.isPaused ? (
          <EmptyState
            title="You're offline"
            description="This exercise loads once you reconnect."
          />
        ) : (
          <LoadingState />
        )}
      </Screen>
    );
  }
  const { units, timezone } = profile.data;

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: exercise.name }} />
      <Text className="text-muted-foreground">
        {MUSCLE_LABELS[exercise.muscle_group]} · {EQUIPMENT_LABELS[exercise.equipment]} ·{' '}
        {TRACKING_LABELS[exercise.tracking_type]}
        {exercise.user_id ? ' · custom' : ''}
      </Text>

      {history.data ? (
        <ExerciseProgressChart
          sessions={history.data}
          tracking={exercise.tracking_type}
          units={units}
          timezone={timezone}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Personal records</CardTitle>
        </CardHeader>
        <CardContent className="gap-2">
          {prs.data && prs.data.length > 0 ? (
            prs.data.map((pr) => (
              <View key={pr.kind} className="flex-row items-center gap-3">
                <Icon as={Trophy} size={18} className="text-amber-500" />
                <Text className="flex-1">{PR_LABELS[pr.kind] ?? pr.kind}</Text>
                <View className="items-end">
                  <Text className="font-semibold">{formatPrValue(pr.kind, pr.value, units)}</Text>
                  <Text variant="muted">
                    {formatInTimeZone(pr.achieved_at, timezone, 'MMM d, yyyy')}
                  </Text>
                </View>
              </View>
            ))
          ) : prs.isError ? (
            <ErrorState error={prs.error} onRetry={() => prs.refetch()} />
          ) : (
            <Text className="text-muted-foreground">
              {prs.isPending && !prs.isPaused ? 'Loading…' : 'No records yet.'}
            </Text>
          )}
        </CardContent>
      </Card>

      <Text className="text-lg font-semibold">Sessions</Text>
      {history.data ? (
        history.data.length === 0 ? (
          <EmptyState
            title="Not logged yet"
            description="Finished workouts with this exercise show up here."
          />
        ) : (
          <View>
            {[...history.data].reverse().map((session, index) => (
              <View key={session.workout_id}>
                {index > 0 ? <Separator /> : null}
                <Button
                  variant="ghost"
                  className="h-auto justify-between px-0 py-3"
                  onPress={() => router.push(`/workout/${session.workout_id}`)}
                >
                  <Text className="font-medium">
                    {formatInTimeZone(session.performed_at, timezone, 'EEE, MMM d, yyyy')}
                  </Text>
                  <Text className="text-muted-foreground">
                    {sessionLine(session, exercise.tracking_type, units)}
                  </Text>
                </Button>
              </View>
            ))}
          </View>
        )
      ) : history.isError ? (
        <ErrorState error={history.error} onRetry={() => history.refetch()} />
      ) : (
        <LoadingState />
      )}

      {exercise.user_id ? (
        <Button
          variant="outline"
          onPress={() => archive.setArchived(exercise, !exercise.is_archived)}
        >
          <Text>{exercise.is_archived ? 'Restore to exercise list' : 'Archive exercise'}</Text>
        </Button>
      ) : null}
      {exercise.user_id && !exercise.is_archived ? (
        <Text variant="muted" className="text-center">
          Archiving hides it from the exercise picker. Its history stays.
        </Text>
      ) : null}
    </Screen>
  );
}

function sessionLine(s: ExerciseSession, tracking: TrackingType, units: UnitSystem): string {
  const sets = `${s.set_count} ${s.set_count === 1 ? 'set' : 'sets'}`;
  switch (tracking) {
    case 'weight_reps':
      return [
        s.top_weight_kg !== null ? `top ${formatWeight(s.top_weight_kg, units)}` : null,
        s.best_e1rm !== null ? `e1RM ${formatWeight(s.best_e1rm, units)}` : null,
        sets,
      ]
        .filter(Boolean)
        .join(' · ');
    case 'reps':
      return `${s.total_reps} reps · ${sets}`;
    case 'duration':
      return `${s.max_duration_seconds !== null ? formatDuration(s.max_duration_seconds) : '—'} · ${sets}`;
    case 'distance_duration':
      return `${s.max_distance_m !== null ? formatDistance(s.max_distance_m, units) : '—'} · ${sets}`;
  }
}
