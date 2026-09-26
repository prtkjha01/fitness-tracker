import { Trophy } from 'lucide-react-native';
import { View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { UnitSystem } from '@/lib/units';

import type { Exercise, WorkoutPr } from '../api';
import { formatPrValue, PR_LABELS } from '../format';

type PrListProps = { prs: WorkoutPr[]; exercises: Map<string, Exercise>; units: UnitSystem };

/** Records set in one workout, each with the previous best it beat. */
export function PrList({ prs, exercises, units }: PrListProps) {
  return (
    <View className="gap-2">
      {prs.map((pr) => (
        <View key={`${pr.exercise_id}:${pr.kind}`} className="flex-row items-center gap-3">
          <Icon as={Trophy} size={20} className="text-amber-500" />
          <View className="flex-1">
            <Text className="font-medium">
              {exercises.get(pr.exercise_id)?.name ?? 'Exercise'}: {PR_LABELS[pr.kind] ?? pr.kind}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {formatPrValue(pr.kind, pr.value, units)}
              {pr.previous_best !== null
                ? ` (was ${formatPrValue(pr.kind, pr.previous_best, units)})`
                : ''}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
