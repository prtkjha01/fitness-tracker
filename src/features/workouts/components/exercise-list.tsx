import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

import type { Exercise, MuscleGroup } from '../api';
import { EQUIPMENT_LABELS, MUSCLE_LABELS } from '../format';
import { useExercises } from '../hooks';

type ExerciseListProps = {
  /** Multi-select mode (picker); otherwise rows call onPress (library). */
  selected?: Set<string>;
  onPress: (exercise: Exercise) => void;
  showArchived?: boolean;
};

export function ExerciseList({ selected, onPress, showArchived = false }: ExerciseListProps) {
  const exercises = useExercises();
  const [search, setSearch] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);

  if (!exercises.data) {
    return exercises.isError ? (
      <ErrorState error={exercises.error} onRetry={() => exercises.refetch()} />
    ) : exercises.isPaused ? (
      <EmptyState
        title="You're offline"
        description="The exercise list loads once you reconnect."
      />
    ) : (
      <LoadingState />
    );
  }

  const visible = exercises.data.filter((e) => showArchived || !e.is_archived);
  const muscles = [...new Set(visible.map((e) => e.muscle_group))].sort();
  const term = search.trim().toLowerCase();
  const matches = visible.filter(
    (e) => (!muscle || e.muscle_group === muscle) && e.name.toLowerCase().includes(term),
  );

  return (
    <View className="gap-3">
      <Input
        value={search}
        onChangeText={setSearch}
        placeholder="Search exercises"
        aria-label="Search exercises"
        autoCorrect={false}
        returnKeyType="search"
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2"
      >
        {[null, ...muscles].map((m) => (
          <Button
            key={m ?? 'all'}
            size="sm"
            variant={muscle === m ? 'default' : 'secondary'}
            onPress={() => setMuscle(m)}
            aria-label={`Filter: ${m ? MUSCLE_LABELS[m] : 'All muscles'}`}
          >
            <Text>{m ? MUSCLE_LABELS[m] : 'All'}</Text>
          </Button>
        ))}
      </ScrollView>

      {matches.length === 0 ? (
        <EmptyState title="No exercises found" description="Try another search, or create it." />
      ) : (
        <View>
          {matches.map((e, index) => {
            const isSelected = selected?.has(e.id) ?? false;
            return (
              <View key={e.id}>
                {index > 0 ? <Separator /> : null}
                <Pressable
                  onPress={() => onPress(e)}
                  className={cn(
                    'min-h-14 flex-row items-center gap-3 px-1 py-2 active:bg-accent',
                    isSelected && 'bg-sky-500/10',
                  )}
                  role={selected ? 'checkbox' : 'button'}
                  aria-checked={selected ? isSelected : undefined}
                  aria-label={e.name}
                >
                  <View className="flex-1">
                    <Text className="font-medium">
                      {e.name}
                      {e.user_id ? <Text className="text-muted-foreground"> · custom</Text> : null}
                      {e.is_archived ? (
                        <Text className="text-muted-foreground"> · archived</Text>
                      ) : null}
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                      {MUSCLE_LABELS[e.muscle_group]} · {EQUIPMENT_LABELS[e.equipment]}
                    </Text>
                  </View>
                  {selected ? (
                    <View
                      className={cn(
                        'size-6 items-center justify-center rounded-full border border-border',
                        isSelected && 'border-sky-500 bg-sky-500',
                      )}
                    >
                      {isSelected ? <Icon as={Check} size={14} className="text-white" /> : null}
                    </View>
                  ) : null}
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
