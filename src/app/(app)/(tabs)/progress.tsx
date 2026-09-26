import { useQueryClient } from '@tanstack/react-query';
import { Link, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { View } from 'react-native';

import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useSession } from '@/features/auth/session-provider';
import { useProfile, useToday } from '@/features/profile/hooks';
import { BodyWeightCard } from '@/features/progress/components/body-weight-card';
import { ConsistencyTiles } from '@/features/progress/components/consistency-tiles';
import { WeeklySummary } from '@/features/progress/components/weekly-summary';
import { WorkoutCalendar } from '@/features/progress/components/workout-calendar';
import { HISTORY_DAYS, useWeeklySummaries, useWorkoutDays } from '@/features/progress/hooks';
import { consistency } from '@/features/progress/streak';
import { useOnline } from '@/hooks/use-online';
import { shiftDate } from '@/lib/dates';
import { qk } from '@/lib/query-keys';

export default function ProgressScreen() {
  const profile = useProfile();
  const today = useToday();
  const userId = useSession().session?.user.id;
  const queryClient = useQueryClient();
  const online = useOnline();
  const { query: daysQuery, days } = useWorkoutDays(today);
  const weekly = useWeeklySummaries(today);

  // These combine meals, water and workouts logged elsewhere, so refresh on every visit.
  useFocusEffect(
    useCallback(() => {
      if (userId && online)
        void queryClient.invalidateQueries({ queryKey: qk.progress.all(userId) });
    }, [userId, online, queryClient]),
  );

  if (!profile.data || !today || !userId) {
    return (
      <Screen>
        {profile.isError ? (
          <ErrorState error={profile.error} onRetry={() => profile.refetch()} />
        ) : (
          <LoadingState />
        )}
      </Screen>
    );
  }

  const units = profile.data.units;
  const refresh = async () => {
    if (online) await queryClient.invalidateQueries({ queryKey: qk.progress.all(userId) });
  };
  const offlineNote = <Text className="text-muted-foreground">Loads once you&apos;re online.</Text>;

  return (
    <Screen onRefresh={refresh}>
      <Text variant="h3">Progress</Text>

      <Card>
        <CardHeader>
          <CardTitle>Consistency</CardTitle>
        </CardHeader>
        <CardContent className="gap-4">
          {days ? (
            <>
              <ConsistencyTiles stats={consistency(days, today)} />
              <WorkoutCalendar
                days={days}
                today={today}
                earliest={shiftDate(today, -HISTORY_DAYS)}
              />
            </>
          ) : daysQuery.isError ? (
            <ErrorState error={daysQuery.error} onRetry={() => daysQuery.refetch()} />
          ) : daysQuery.isPaused ? (
            offlineNote
          ) : (
            <LoadingState />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weekly summary</CardTitle>
          <CardDescription>Workouts per week, last 8 weeks</CardDescription>
        </CardHeader>
        <CardContent>
          {weekly.data ? (
            <WeeklySummary weeks={weekly.data} units={units} />
          ) : weekly.isError ? (
            <ErrorState error={weekly.error} onRetry={() => weekly.refetch()} />
          ) : weekly.isPaused ? (
            offlineNote
          ) : (
            <LoadingState />
          )}
        </CardContent>
      </Card>

      <BodyWeightCard today={today} units={units} />

      <Card>
        <CardHeader>
          <CardTitle>Exercise progress</CardTitle>
          <CardDescription>Estimated 1RM, top sets and records for each exercise.</CardDescription>
        </CardHeader>
        <CardContent>
          <View className="flex-row gap-2">
            <Link href="/exercises" asChild>
              <Button variant="outline" className="flex-1">
                <Text>Pick an exercise</Text>
              </Button>
            </Link>
            <Link href="/workout/history" asChild>
              <Button variant="outline" className="flex-1">
                <Text>Workout history</Text>
              </Button>
            </Link>
          </View>
        </CardContent>
      </Card>
    </Screen>
  );
}
