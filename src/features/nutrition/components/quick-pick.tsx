import { Pencil } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';

import { useRecentFoods, useSavedFoods } from '../hooks';
import type { Nutrients } from '../nutrients';

/** A food that can be re-logged: from recent entries or from My foods. */
export type PickItem = Nutrients & {
  key: string;
  name: string;
  quantity: number;
  unit: string;
  saved_food_id: string | null;
};

type QuickPickProps = {
  onLog: (item: PickItem) => void;
  onAdjust: (item: PickItem) => void;
};

export function QuickPick({ onLog, onAdjust }: QuickPickProps) {
  const recent = useRecentFoods();
  const saved = useSavedFoods();
  const [search, setSearch] = useState('');

  if (!recent.data && !saved.data) {
    const error = recent.error ?? saved.error;
    // Offline with nothing cached: fall through to manual entry.
    if (recent.isPaused || saved.isPaused) return null;
    return error ? (
      <ErrorState title="Couldn't load your foods" error={error} onRetry={() => recent.refetch()} />
    ) : (
      <LoadingState />
    );
  }

  const recentItems: PickItem[] = (recent.data ?? []).map((f) => ({
    key: `recent:${f.name.toLowerCase()}`,
    name: f.name,
    quantity: f.quantity,
    unit: f.unit,
    calories: f.calories,
    protein_g: f.protein_g,
    carbs_g: f.carbs_g,
    fat_g: f.fat_g,
    saved_food_id: f.saved_food_id,
  }));
  const recentNames = new Set(recentItems.map((i) => i.name.toLowerCase()));
  // My foods already shown under Recent aren't repeated.
  const savedItems: PickItem[] = (saved.data ?? [])
    .filter((f) => !recentNames.has(f.name.toLowerCase()))
    .map((f) => ({
      key: `saved:${f.id}`,
      name: f.name,
      quantity: f.default_quantity,
      unit: f.default_unit,
      calories: f.calories,
      protein_g: f.protein_g,
      carbs_g: f.carbs_g,
      fat_g: f.fat_g,
      saved_food_id: f.id,
    }));

  const term = search.trim().toLowerCase();
  const matches = (item: PickItem) => item.name.toLowerCase().includes(term);
  const sections = [
    { title: 'Recent', items: recentItems.filter(matches) },
    { title: 'My foods', items: savedItems.filter(matches) },
  ].filter((s) => s.items.length > 0);

  return (
    <View className="gap-3">
      <Input
        value={search}
        onChangeText={setSearch}
        placeholder="Search recent and saved foods"
        aria-label="Search foods"
        autoCorrect={false}
        returnKeyType="search"
      />
      {sections.length === 0 ? (
        <EmptyState
          title={term ? 'No matches' : 'No foods yet'}
          description={
            term ? 'Enter it as a new food below.' : 'Foods you log or save show up here.'
          }
        />
      ) : (
        sections.map((section) => (
          <View key={section.title}>
            <Text variant="muted" className="pb-1 font-semibold uppercase">
              {section.title}
            </Text>
            {section.items.map((item, index) => (
              <View key={item.key}>
                {index > 0 ? <Separator /> : null}
                <View className="flex-row items-center">
                  <Pressable
                    className="min-h-12 flex-1 justify-center py-2 active:opacity-60"
                    onPress={() => onLog(item)}
                    aria-label={`Log ${item.quantity} ${item.unit} ${item.name}, ${item.calories} calories`}
                  >
                    <Text className="font-medium" numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                      {item.quantity} {item.unit} · {item.calories} kcal
                    </Text>
                  </Pressable>
                  <Button
                    variant="ghost"
                    size="icon"
                    onPress={() => onAdjust(item)}
                    aria-label={`Adjust ${item.name} before logging`}
                  >
                    <Icon as={Pencil} size={18} className="text-muted-foreground" />
                  </Button>
                </View>
              </View>
            ))}
          </View>
        ))
      )}
    </View>
  );
}
