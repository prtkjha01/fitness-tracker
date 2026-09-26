import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { DayNavigator } from '@/components/day-navigator';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FormError } from '@/components/form-field';
import { LoadingState } from '@/components/loading-state';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { MealType } from '@/features/nutrition/api';
import { useCopyFoodEntries, useDayFoodEntries } from '@/features/nutrition/hooks';
import { MEAL_LABELS, MEAL_TYPES } from '@/features/nutrition/meals';
import { useProfile } from '@/features/profile/hooks';
import { useOnline } from '@/hooks/use-online';
import { formatDayLabel, isValidDate, localDate, shiftDate } from '@/lib/dates';

// Presented as a form sheet; the title is part of the content (Android sheets have no header).
export default function CopyFoodScreen() {
  const { to } = useLocalSearchParams<{ to?: string }>();
  const profile = useProfile();

  if (!isValidDate(to) || !profile.data) {
    return (
      <Screen edges={[]} className="pt-6">
        {profile.isError ? (
          <ErrorState error={profile.error} onRetry={() => profile.refetch()} />
        ) : isValidDate(to) ? (
          <LoadingState />
        ) : (
          <EmptyState title="Missing date" />
        )}
      </Screen>
    );
  }

  return <CopyFrom to={to} today={localDate(profile.data.timezone)} />;
}

function CopyFrom({ to, today }: { to: string; today: string }) {
  const [from, setFrom] = useState(shiftDate(to, -1));
  const { query, entries } = useDayFoodEntries(from);
  const copy = useCopyFoodEntries();
  const online = useOnline();
  const toLabel = formatDayLabel(to, today);

  const run = (meal: MealType | null) =>
    copy.mutate({ from, to, meal }, { onSuccess: () => router.back() });

  return (
    <Screen edges={[]} className="pt-6">
      <View className="gap-1">
        <Text variant="h4">Copy food to {toLabel}</Text>
        <Text className="text-muted-foreground">Pick the day to copy from.</Text>
      </View>
      <DayNavigator date={from} today={today} onChange={setFrom} />

      <FormError
        message={
          !online
            ? 'Copying needs an internet connection.'
            : copy.error
              ? `Couldn't copy: ${copy.error.message}`
              : null
        }
      />

      {from === to ? (
        <EmptyState title="That's the same day" description="Pick another day to copy from." />
      ) : !entries ? (
        query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : (
          <LoadingState />
        )
      ) : entries.length === 0 ? (
        <EmptyState title="Nothing logged that day" />
      ) : (
        <View className="gap-2">
          {MEAL_TYPES.map((meal) => {
            const items = entries.filter((e) => e.meal_type === meal);
            if (items.length === 0) return null;
            const kcal = items.reduce((sum, e) => sum + e.calories, 0);
            return (
              <Button
                key={meal}
                variant="outline"
                size="lg"
                className="justify-between"
                disabled={!online || copy.isPending}
                onPress={() => run(meal)}
              >
                <Text>
                  {MEAL_LABELS[meal]} ({items.length} {items.length === 1 ? 'item' : 'items'})
                </Text>
                <Text className="text-muted-foreground">{kcal.toLocaleString()} kcal</Text>
              </Button>
            );
          })}
          <Button size="lg" disabled={!online || copy.isPending} onPress={() => run(null)}>
            <Text>
              {copy.isPending
                ? 'Copying…'
                : `Copy whole day (${entries.length} ${entries.length === 1 ? 'item' : 'items'})`}
            </Text>
          </Button>
        </View>
      )}
    </Screen>
  );
}
