import { View } from 'react-native';

import { Progress } from '@/components/ui/progress';
import { Text } from '@/components/ui/text';
import { formatVolume, type UnitSystem } from '@/lib/units';

type WaterProgressProps = { totalMl: number; goalMl: number; units: UnitSystem };

export function WaterProgress({ totalMl, goalMl, units }: WaterProgressProps) {
  const percent = goalMl > 0 ? Math.round((totalMl / goalMl) * 100) : 0;
  const summary = `${formatVolume(totalMl, units)} of ${formatVolume(goalMl, units)}`;
  return (
    <View className="gap-2" accessible aria-label={`Water: ${summary}, ${percent} percent`}>
      <View className="flex-row items-baseline justify-between">
        <Text className="text-2xl font-semibold">{formatVolume(totalMl, units)}</Text>
        <Text className="text-muted-foreground">
          of {formatVolume(goalMl, units)} · {percent}%
        </Text>
      </View>
      <Progress value={Math.min(percent, 100)} className="h-3" indicatorClassName="bg-sky-500" />
    </View>
  );
}
