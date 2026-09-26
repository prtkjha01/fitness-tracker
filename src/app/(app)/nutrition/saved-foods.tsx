import { Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FormError } from '@/components/form-field';
import { LoadingState } from '@/components/loading-state';
import { Screen } from '@/components/screen';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import type { SavedFood } from '@/features/nutrition/api';
import { useDeleteFood, useSavedFoods } from '@/features/nutrition/hooks';

export default function SavedFoodsScreen() {
  const saved = useSavedFoods();
  const deleteFood = useDeleteFood();
  const [pendingDelete, setPendingDelete] = useState<SavedFood | null>(null);

  if (!saved.data) {
    return (
      <Screen edges={[]}>
        {saved.isError ? (
          <ErrorState error={saved.error} onRetry={() => saved.refetch()} />
        ) : saved.isPaused ? (
          <EmptyState
            title="You're offline"
            description="Your saved foods load once you reconnect."
          />
        ) : (
          <LoadingState />
        )}
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <Text variant="muted">
        Turn on “Save to My foods” when logging a food to add it here. Saved foods appear when you
        log food, ready to re-log in one tap.
      </Text>
      <FormError
        message={deleteFood.error ? "Couldn't delete that food, so it was put back." : null}
      />

      {saved.data.length === 0 ? (
        <EmptyState title="No saved foods yet" />
      ) : (
        <View>
          {saved.data.map((food, index) => (
            <View key={food.id}>
              {index > 0 ? <Separator /> : null}
              <View className="min-h-14 flex-row items-center py-1">
                <View className="flex-1">
                  <Text className="font-medium" numberOfLines={1}>
                    {food.name}
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    {food.default_quantity} {food.default_unit} · {food.calories} kcal
                    {food.use_count > 0 ? ` · logged ${food.use_count}×` : ''}
                  </Text>
                </View>
                <Button
                  variant="ghost"
                  size="icon"
                  onPress={() => setPendingDelete(food)}
                  aria-label={`Delete ${food.name}`}
                >
                  <Icon as={Trash2} size={18} className="text-muted-foreground" />
                </Button>
              </View>
            </View>
          ))}
        </View>
      )}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              It will no longer be offered when logging. Entries you already logged stay as they
              are.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text>Cancel</Text>
            </AlertDialogCancel>
            <AlertDialogAction
              onPress={() => {
                if (pendingDelete) deleteFood.remove(pendingDelete);
              }}
            >
              <Text>Delete</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Screen>
  );
}
