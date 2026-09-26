import { Plus, Trash2 } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';

import type { FoodEntry, MealType } from '../api';
import { MEAL_LABELS } from '../meals';

type MealSectionProps = {
  meal: MealType;
  entries: FoodEntry[];
  onAdd: () => void;
  onEdit: (entry: FoodEntry) => void;
  onDelete: (entry: FoodEntry) => void;
};

export function MealSection({ meal, entries, onAdd, onEdit, onDelete }: MealSectionProps) {
  const calories = entries.reduce((sum, e) => sum + e.calories, 0);
  const label = MEAL_LABELS[meal];

  return (
    <View className="gap-1">
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-semibold">
          {label}
          {entries.length > 0 ? (
            <Text className="text-muted-foreground"> · {calories.toLocaleString()} kcal</Text>
          ) : null}
        </Text>
        <Button variant="ghost" size="icon" onPress={onAdd} aria-label={`Add food to ${label}`}>
          <Icon as={Plus} size={22} className="text-foreground" />
        </Button>
      </View>

      {entries.length === 0 ? (
        <Text className="pb-2 text-muted-foreground">Nothing logged</Text>
      ) : (
        entries.map((entry, index) => (
          <View key={entry.id}>
            {index > 0 ? <Separator /> : null}
            <View className="flex-row items-center">
              <Pressable
                className="min-h-12 flex-1 justify-center py-2 active:opacity-60"
                onPress={() => onEdit(entry)}
                aria-label={`Edit ${entry.name}`}
              >
                <Text className="font-medium" numberOfLines={1}>
                  {entry.name}
                </Text>
                <Text className="text-sm text-muted-foreground">
                  {entry.quantity} {entry.unit} · {entry.calories} kcal
                  {macroSummary(entry)}
                </Text>
              </Pressable>
              <Button
                variant="ghost"
                size="icon"
                onPress={() => onDelete(entry)}
                aria-label={`Delete ${entry.name}`}
              >
                <Icon as={Trash2} size={18} className="text-muted-foreground" />
              </Button>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

function macroSummary(entry: FoodEntry): string {
  const parts = [
    entry.protein_g !== null ? `P ${entry.protein_g}` : null,
    entry.carbs_g !== null ? `C ${entry.carbs_g}` : null,
    entry.fat_g !== null ? `F ${entry.fat_g}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? ` · ${parts.join(' ')}` : '';
}
