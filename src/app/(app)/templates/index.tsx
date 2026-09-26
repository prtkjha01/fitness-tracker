import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { Screen } from '@/components/screen';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { useExerciseMap, useTemplates } from '@/features/workouts/hooks';

export default function TemplatesScreen() {
  const templates = useTemplates();
  const exercises = useExerciseMap();

  if (!templates.data) {
    return (
      <Screen edges={[]}>
        {templates.isError ? (
          <ErrorState error={templates.error} onRetry={() => templates.refetch()} />
        ) : templates.isPaused ? (
          <EmptyState title="You're offline" description="Templates load once you reconnect." />
        ) : (
          <LoadingState />
        )}
      </Screen>
    );
  }

  if (templates.data.length === 0) {
    return (
      <Screen edges={[]}>
        <EmptyState
          title="No templates yet"
          description="Finish a workout (or open one from History) and tap “Save as template”."
        />
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <View>
        {templates.data.map((t, index) => (
          <View key={t.id}>
            {index > 0 ? <Separator /> : null}
            <Pressable
              className="min-h-16 justify-center py-3 active:opacity-60"
              onPress={() => router.push(`/templates/${t.id}`)}
            >
              <Text className="font-semibold">{t.name}</Text>
              <Text className="text-sm text-muted-foreground" numberOfLines={2}>
                {t.template_exercises
                  .map((te) => exercises.get(te.exercise_id)?.name ?? 'Exercise')
                  .join(', ')}
              </Text>
            </Pressable>
          </View>
        ))}
      </View>
    </Screen>
  );
}
