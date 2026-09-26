import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { formatDurationWords } from '@/lib/duration';
import { formatWeight, type UnitSystem } from '@/lib/units';

import type { WorkoutStats } from '../draft';

export function WorkoutStatsGrid({ stats, units }: { stats: WorkoutStats; units: UnitSystem }) {
  const tiles = [
    { label: 'Duration', value: formatDurationWords(stats.durationSeconds) },
    { label: 'Volume', value: formatWeight(stats.volumeKg, units) },
    { label: 'Sets', value: String(stats.workingSets) },
    { label: 'Exercises', value: String(stats.exerciseCount) },
  ];
  return (
    <View className="flex-row flex-wrap gap-2">
      {tiles.map((t) => (
        <View
          key={t.label}
          className="min-w-[45%] flex-1 gap-0.5 rounded-lg bg-muted p-3"
          accessible
          aria-label={`${t.label}: ${t.value}`}
        >
          <Text variant="muted">{t.label}</Text>
          <Text className="text-xl font-semibold">{t.value}</Text>
        </View>
      ))}
    </View>
  );
}
