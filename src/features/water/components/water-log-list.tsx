import { Trash2 } from 'lucide-react-native';
import { View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { FormError } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { localTime } from '@/lib/dates';
import { formatVolume, type UnitSystem } from '@/lib/units';

import type { WaterLog } from '../api';
import { useDeleteWater } from '../hooks';

type WaterLogListProps = { logs: WaterLog[]; units: UnitSystem; timezone: string };

export function WaterLogList({ logs, units, timezone }: WaterLogListProps) {
  const deleteWater = useDeleteWater();

  if (logs.length === 0) {
    return (
      <EmptyState title="No water logged today" description="Tap an amount above to add some." />
    );
  }

  return (
    <View>
      <FormError
        message={deleteWater.error ? "Couldn't delete that entry, so it was put back." : null}
      />
      {logs.map((log, index) => {
        const amount = formatVolume(log.amount_ml, units);
        const time = localTime(timezone, log.logged_at);
        return (
          <View key={log.id}>
            {index > 0 ? <Separator /> : null}
            <View className="flex-row items-center justify-between py-1 pl-1">
              <Text className="font-medium">{amount}</Text>
              <View className="flex-row items-center gap-1">
                <Text className="text-muted-foreground">{time}</Text>
                <Button
                  variant="ghost"
                  size="icon"
                  onPress={() => deleteWater.remove(log)}
                  aria-label={`Delete ${amount} logged at ${time}`}
                >
                  <Icon as={Trash2} size={18} className="text-muted-foreground" />
                </Button>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
