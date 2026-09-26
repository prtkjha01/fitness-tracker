import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';

import { useDayFoodEntries } from '../hooks';
import { sumNutrients } from '../nutrients';
import { CalorieSummary } from './calorie-summary';

/** Today's calories and macros on the home screen; tapping opens the Nutrition tab. */
export function CaloriesCard({ today, goal }: { today: string; goal: number }) {
  const { query, entries } = useDayFoodEntries(today);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Calories</CardTitle>
        {entries ? (
          <Text variant="muted">{entries.length === 1 ? '1 item' : `${entries.length} items`}</Text>
        ) : null}
      </CardHeader>
      <CardContent>
        {entries ? (
          <Pressable
            onPress={() => router.navigate('/nutrition')}
            className="active:opacity-70"
            aria-label="Open today's meals"
          >
            <CalorieSummary totals={sumNutrients(entries)} goal={goal} />
          </Pressable>
        ) : query.isError ? (
          <ErrorState
            title="Couldn't load meals"
            error={query.error}
            onRetry={() => query.refetch()}
          />
        ) : (
          <LoadingState />
        )}
      </CardContent>
    </Card>
  );
}
