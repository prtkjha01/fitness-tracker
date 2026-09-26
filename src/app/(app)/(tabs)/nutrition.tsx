import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { DayNavigator } from '@/components/day-navigator';
import { ErrorState } from '@/components/error-state';
import { FormError } from '@/components/form-field';
import { LoadingState } from '@/components/loading-state';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import type { FoodEntry, MealType } from '@/features/nutrition/api';
import { CalorieSummary } from '@/features/nutrition/components/calorie-summary';
import { MealSection } from '@/features/nutrition/components/meal-section';
import {
  useDayFoodEntries,
  useDeleteFoodEntry,
  useSaveFoodEntry,
} from '@/features/nutrition/hooks';
import { MEAL_TYPES } from '@/features/nutrition/meals';
import { sumNutrients } from '@/features/nutrition/nutrients';
import { useProfile, useToday } from '@/features/profile/hooks';
import { useOnline } from '@/hooks/use-online';

const UNDO_MS = 5000;

export default function NutritionScreen() {
  const profile = useProfile();
  const today = useToday();
  const [picked, setPicked] = useState<string | null>(null);
  const date = picked ?? today;

  if (!profile.data || !today || !date) {
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

  return (
    <Screen>
      <DayNavigator date={date} today={today} onChange={(d) => setPicked(d === today ? null : d)} />
      <DayContent date={date} goal={profile.data.daily_calorie_goal} />
    </Screen>
  );
}

function DayContent({ date, goal }: { date: string; goal: number }) {
  const { query, entries } = useDayFoodEntries(date);
  const deleteEntry = useDeleteFoodEntry();
  const saveEntry = useSaveFoodEntry();
  const online = useOnline();
  const [lastDeleted, setLastDeleted] = useState<FoodEntry | null>(null);

  useEffect(() => {
    if (!lastDeleted) return;
    const timer = setTimeout(() => setLastDeleted(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [lastDeleted]);

  if (!entries) {
    return query.isError ? (
      <ErrorState
        title="Couldn't load this day"
        error={query.error}
        onRetry={() => query.refetch()}
      />
    ) : (
      <LoadingState />
    );
  }

  const add = (meal: MealType) =>
    router.push({ pathname: '/nutrition/entry', params: { date, meal } });
  const edit = (entry: FoodEntry) =>
    router.push({ pathname: '/nutrition/entry', params: { date, id: entry.id } });
  const remove = (entry: FoodEntry) => {
    deleteEntry.remove(entry);
    setLastDeleted(entry);
  };
  const undo = () => {
    if (lastDeleted) saveEntry.restore(lastDeleted);
    setLastDeleted(null);
  };

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <CalorieSummary totals={sumNutrients(entries)} goal={goal} />
        </CardContent>
      </Card>

      {lastDeleted ? (
        <View
          className="flex-row items-center justify-between rounded-md bg-muted pl-3"
          aria-live="polite"
        >
          <Text className="shrink text-sm" numberOfLines={1}>
            Deleted {lastDeleted.name}
          </Text>
          <Button variant="ghost" size="sm" onPress={undo}>
            <Text>Undo</Text>
          </Button>
        </View>
      ) : null}
      <FormError
        message={
          deleteEntry.error || saveEntry.error
            ? "Couldn't save that change, so it was undone. Try again."
            : null
        }
      />

      <View className="gap-2">
        {MEAL_TYPES.map((meal, index) => (
          <View key={meal} className="gap-2">
            {index > 0 ? <Separator /> : null}
            <MealSection
              meal={meal}
              entries={entries.filter((e) => e.meal_type === meal)}
              onAdd={() => add(meal)}
              onEdit={edit}
              onDelete={remove}
            />
          </View>
        ))}
      </View>

      <View className="flex-row gap-2">
        <Link href="/nutrition/saved-foods" asChild>
          <Button variant="outline" className="flex-1">
            <Text>My foods</Text>
          </Button>
        </Link>
        <Link href={{ pathname: '/nutrition/copy', params: { to: date } }} asChild>
          <Button variant="outline" className="flex-1" disabled={!online}>
            <Text>{online ? 'Copy from a day' : 'Copy needs internet'}</Text>
          </Button>
        </Link>
      </View>
    </>
  );
}
