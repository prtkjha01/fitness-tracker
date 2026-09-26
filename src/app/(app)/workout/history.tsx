import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { Screen } from '@/components/screen';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { useProfile } from '@/features/profile/hooks';
import { useWorkoutHistory } from '@/features/workouts/hooks';
import { formatWorkoutLine, lineFromRow } from '@/features/workouts/workout-line';
import { formatInTimeZone } from 'date-fns-tz';

export default function WorkoutHistoryScreen() {
  const history = useWorkoutHistory();
  const profile = useProfile();

  if (!history.data || !profile.data) {
    return (
      <Screen edges={[]}>
        {history.isError ? (
          <ErrorState error={history.error} onRetry={() => history.refetch()} />
        ) : history.isPaused ? (
          <EmptyState title="You're offline" description="History loads once you reconnect." />
        ) : (
          <LoadingState />
        )}
      </Screen>
    );
  }

  if (history.data.length === 0) {
    return (
      <Screen edges={[]}>
        <EmptyState title="No workouts yet" description="Finished workouts show up here." />
      </Screen>
    );
  }

  const { timezone, units } = profile.data;
  return (
    <Screen edges={[]}>
      <View>
        {history.data.map((w, index) => (
          <View key={w.id}>
            {index > 0 ? <Separator /> : null}
            <Pressable
              className="min-h-16 justify-center py-3 active:opacity-60"
              onPress={() => router.push(`/workout/${w.id}`)}
            >
              <View className="flex-row items-baseline justify-between gap-2">
                <Text className="shrink font-semibold" numberOfLines={1}>
                  {w.name}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  {formatInTimeZone(w.started_at, timezone, 'EEE, MMM d')}
                </Text>
              </View>
              <Text className="text-sm text-muted-foreground">
                {formatWorkoutLine(lineFromRow(w), units)}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
      {history.data.length >= 100 ? (
        <Text variant="muted" className="text-center">
          Showing your 100 most recent workouts.
        </Text>
      ) : null}
    </Screen>
  );
}
