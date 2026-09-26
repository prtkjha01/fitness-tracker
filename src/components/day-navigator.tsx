import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { formatDayLabel, shiftDate } from '@/lib/dates';

type DayNavigatorProps = {
  date: string;
  today: string;
  onChange: (date: string) => void;
};

/** ‹ Yesterday › — steps one day at a time; can't go past today. */
export function DayNavigator({ date, today, onChange }: DayNavigatorProps) {
  const label = formatDayLabel(date, today);
  const isToday = date >= today;
  return (
    <View className="flex-row items-center justify-between">
      <Button
        variant="ghost"
        size="icon"
        onPress={() => onChange(shiftDate(date, -1))}
        aria-label="Previous day"
      >
        <Icon as={ChevronLeft} size={22} className="text-foreground" />
      </Button>
      <Button
        variant="ghost"
        onPress={() => onChange(today)}
        disabled={isToday}
        aria-label={isToday ? label : `${label}. Tap to jump to today`}
        // Disabled only means "already today"; keep it fully legible.
        className="opacity-100"
      >
        <Text className="text-lg font-semibold">{label}</Text>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onPress={() => onChange(shiftDate(date, 1))}
        disabled={isToday}
        aria-label="Next day"
      >
        <Icon as={ChevronRight} size={22} className="text-foreground" />
      </Button>
    </View>
  );
}
