import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { FormError } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { formatVolume, type UnitSystem } from '@/lib/units';

import type { WaterLog } from '../api';
import { useAddWater, useDeleteWater } from '../hooks';

const UNDO_MS = 5000;

type WaterQuickAddProps = {
  amountsMl: number[];
  units: UnitSystem;
  /** Today's logs, used to find the row to undo. */
  logs: WaterLog[];
};

/** One-tap buttons for the profile's quick-add amounts, with a short undo window. */
export function WaterQuickAdd({ amountsMl, units, logs }: WaterQuickAddProps) {
  const addWater = useAddWater();
  const deleteWater = useDeleteWater();
  const [lastAdded, setLastAdded] = useState<{ id: string; amountMl: number } | null>(null);

  useEffect(() => {
    if (!lastAdded) return;
    const timer = setTimeout(() => setLastAdded(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [lastAdded]);

  const add = (amountMl: number) => {
    const id = addWater.add(amountMl);
    if (id) setLastAdded({ id, amountMl });
  };

  const undo = () => {
    const log = logs.find((l) => l.id === lastAdded?.id);
    if (log) deleteWater.remove(log);
    setLastAdded(null);
  };

  return (
    <View className="gap-3">
      <View className="flex-row gap-2">
        {amountsMl.map((ml) => (
          <Button
            key={ml}
            variant="secondary"
            className="flex-1"
            onPress={() => add(ml)}
            aria-label={`Add ${formatVolume(ml, units)} of water`}
          >
            <Text>+{formatVolume(ml, units)}</Text>
          </Button>
        ))}
      </View>

      {lastAdded ? (
        <View
          className="flex-row items-center justify-between rounded-md bg-muted pl-3"
          aria-live="polite"
        >
          <Text className="text-sm">Added {formatVolume(lastAdded.amountMl, units)}</Text>
          <Button variant="ghost" size="sm" onPress={undo}>
            <Text>Undo</Text>
          </Button>
        </View>
      ) : null}

      <FormError
        message={
          addWater.error || deleteWater.error
            ? "Couldn't save that change, so it was undone. Try again."
            : null
        }
      />
    </View>
  );
}
