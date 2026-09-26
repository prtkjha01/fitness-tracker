import { format, parseISO } from 'date-fns';
import { router } from 'expo-router';
import { Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { DayNavigator } from '@/components/day-navigator';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FormError } from '@/components/form-field';
import { LoadingState } from '@/components/loading-state';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { useProfile, useToday } from '@/features/profile/hooks';
import { useBodyWeights, useDeleteBodyWeight, useSaveBodyWeight } from '@/features/progress/hooks';
import {
  displayWeightToKg,
  formatWeight,
  kgToDisplayWeight,
  weightUnitLabel,
  type UnitSystem,
} from '@/lib/units';

// Mirrors the body_weights.weight_kg check constraint.
const MIN_KG = 20;
const MAX_KG = 400;

export default function BodyWeightScreen() {
  const profile = useProfile();
  const today = useToday();
  const weights = useBodyWeights();

  if (!profile.data || !today) {
    return (
      <Screen edges={[]}>
        <LoadingState />
      </Screen>
    );
  }
  // Offline with nothing cached: still allow logging; the list fills in later.
  const entries = weights.data ?? (weights.isPaused ? [] : undefined);

  return (
    <Screen edges={[]}>
      {entries ? (
        <WeightLog entries={entries} today={today} units={profile.data.units} />
      ) : weights.isError ? (
        <ErrorState error={weights.error} onRetry={() => weights.refetch()} />
      ) : (
        <LoadingState />
      )}
    </Screen>
  );
}

function WeightLog({
  entries,
  today,
  units,
}: {
  entries: NonNullable<ReturnType<typeof useBodyWeights>['data']>;
  today: string;
  units: UnitSystem;
}) {
  const saveWeight = useSaveBodyWeight();
  const deleteWeight = useDeleteBodyWeight();
  const [day, setDay] = useState(today);
  const existing = entries.find((e) => e.measured_on === day) ?? null;
  // Start from that day's entry, else the latest weight (most days are close to it).
  const seed = existing ?? entries.at(-1);
  const [text, setText] = useState(seed ? String(kgToDisplayWeight(seed.weight_kg, units)) : '');
  const [error, setError] = useState<string | null>(null);
  const unit = weightUnitLabel(units);

  const pickDay = (next: string) => {
    setDay(next);
    const entry = entries.find((e) => e.measured_on === next);
    if (entry) setText(String(kgToDisplayWeight(entry.weight_kg, units)));
    setError(null);
  };

  const save = () => {
    const value = Number(text.trim().replace(',', '.'));
    const kg = displayWeightToKg(value, units);
    if (!text.trim() || !Number.isFinite(value) || kg < MIN_KG || kg > MAX_KG) {
      setError(
        `Enter a weight between ${kgToDisplayWeight(MIN_KG, units)} and ${kgToDisplayWeight(MAX_KG, units)} ${unit}`,
      );
      return;
    }
    saveWeight.save(day, kg, existing);
    router.back();
  };

  return (
    <>
      <DayNavigator date={day} today={today} onChange={pickDay} />
      <View className="gap-1.5">
        <Label nativeID="weight-label">Weight ({unit})</Label>
        <Input
          value={text}
          onChangeText={(t) => {
            setText(t);
            setError(null);
          }}
          keyboardType="decimal-pad"
          selectTextOnFocus
          autoFocus
          aria-labelledby="weight-label"
          aria-invalid={!!error}
          className="h-14 text-2xl"
          returnKeyType="done"
          onSubmitEditing={save}
        />
        {error ? (
          <Text className="text-sm text-destructive" role="alert">
            {error}
          </Text>
        ) : existing ? (
          <Text variant="muted">
            Replaces {formatWeight(existing.weight_kg, units)} logged that day.
          </Text>
        ) : null}
      </View>
      <Button size="lg" onPress={save}>
        <Text>Save</Text>
      </Button>

      <FormError
        message={
          saveWeight.error || deleteWeight.error
            ? "Couldn't save that change, so it was undone. Try again."
            : null
        }
      />

      <Text className="pt-2 text-lg font-semibold">History</Text>
      {entries.length === 0 ? (
        <EmptyState title="No entries yet" />
      ) : (
        <View>
          {[...entries].reverse().map((e, i) => (
            <View key={e.measured_on}>
              {i > 0 ? <Separator /> : null}
              <View className="min-h-12 flex-row items-center">
                <Text className="flex-1">
                  {format(parseISO(e.measured_on), 'EEE, MMM d, yyyy')}
                </Text>
                <Text className="font-medium tabular-nums">{formatWeight(e.weight_kg, units)}</Text>
                <Button
                  variant="ghost"
                  size="icon"
                  onPress={() => deleteWeight.remove(e)}
                  aria-label={`Delete ${formatWeight(e.weight_kg, units)} on ${format(parseISO(e.measured_on), 'MMMM d')}`}
                >
                  <Icon as={Trash2} size={18} className="text-muted-foreground" />
                </Button>
              </View>
            </View>
          ))}
        </View>
      )}
    </>
  );
}
