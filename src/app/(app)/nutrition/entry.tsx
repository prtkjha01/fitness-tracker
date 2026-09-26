import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Switch, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FormError, FormField } from '@/components/form-field';
import { LoadingState } from '@/components/loading-state';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import type { FoodEntry, MealType } from '@/features/nutrition/api';
import { QuickPick, type PickItem } from '@/features/nutrition/components/quick-pick';
import {
  useDayFoodEntries,
  useSavedFoods,
  useSaveFood,
  useSaveFoodEntry,
  type EntryFields,
} from '@/features/nutrition/hooks';
import { isMealType, MEAL_LABELS, MEAL_TYPES, mealForHour } from '@/features/nutrition/meals';
import { scaleNutrients, type Nutrients } from '@/features/nutrition/nutrients';
import { entryFormSchema, type EntryFormInput } from '@/features/nutrition/schemas';
import { useProfile } from '@/features/profile/hooks';
import { isValidDate, localHour } from '@/lib/dates';

const MEAL_OPTIONS = MEAL_TYPES.map((value) => ({ value, label: MEAL_LABELS[value] }));
const UNIT_SUGGESTIONS = ['g', 'ml', 'serving', 'piece', 'cup'];

/** The food the form was filled from; quantity changes in the same unit rescale its nutrients. */
type Basis = Nutrients & {
  name: string;
  quantity: number;
  unit: string;
  saved_food_id: string | null;
};

export default function FoodEntryScreen() {
  const params = useLocalSearchParams<{ date?: string; meal?: string; id?: string }>();
  const profile = useProfile();
  const { query, entries } = useDayFoodEntries(isValidDate(params.date) ? params.date : undefined);

  const title = params.id ? 'Edit food' : 'Log food';
  const header = <Stack.Screen options={{ title }} />;

  if (!isValidDate(params.date)) {
    return (
      <Screen edges={[]}>
        {header}
        <EmptyState title="Missing date" description="Go back and pick a day to log food on." />
      </Screen>
    );
  }
  if (!profile.data || !entries) {
    const error = profile.error ?? query.error;
    return (
      <Screen edges={[]}>
        {header}
        {error ? <ErrorState error={error} onRetry={() => query.refetch()} /> : <LoadingState />}
      </Screen>
    );
  }

  const existing = params.id ? entries.find((e) => e.id === params.id) : undefined;
  if (params.id && !existing) {
    return (
      <Screen edges={[]}>
        {header}
        <EmptyState title="Entry not found" description="It may have been deleted." />
      </Screen>
    );
  }

  const defaultMeal: MealType =
    existing?.meal_type ??
    (isMealType(params.meal) ? params.meal : mealForHour(localHour(profile.data.timezone)));

  return (
    <Screen edges={[]}>
      {header}
      <EntryForm date={params.date} existing={existing ?? null} defaultMeal={defaultMeal} />
    </Screen>
  );
}

function toFormValues(item: Basis | FoodEntry): Omit<EntryFormInput, 'meal_type' | 'save_food'> {
  const grams = (g: number | null) => (g === null ? '' : String(g));
  return {
    name: item.name,
    quantity: String(item.quantity),
    unit: item.unit,
    calories: String(item.calories),
    protein_g: grams(item.protein_g),
    carbs_g: grams(item.carbs_g),
    fat_g: grams(item.fat_g),
  };
}

function EntryForm({
  date,
  existing,
  defaultMeal,
}: {
  date: string;
  existing: FoodEntry | null;
  defaultMeal: MealType;
}) {
  const saveEntry = useSaveFoodEntry();
  const saveFood = useSaveFood();
  const savedFoods = useSavedFoods();
  // Adding starts on the quick-pick list; editing (or "enter new food") shows the form.
  const [mode, setMode] = useState<'pick' | 'form'>(existing ? 'form' : 'pick');
  const [basis, setBasis] = useState<Basis | null>(existing);

  const form = useForm({
    resolver: zodResolver(entryFormSchema),
    defaultValues: {
      meal_type: defaultMeal,
      ...(existing
        ? toFormValues(existing)
        : {
            name: '',
            quantity: '1',
            unit: 'serving',
            calories: '',
            protein_g: '',
            carbs_g: '',
            fat_g: '',
          }),
      save_food: false,
    },
  });

  // Re-logging "100 g" of a food as 150 g scales calories and macros to match.
  const [quantity, unit] = useWatch({ control: form.control, name: ['quantity', 'unit'] });
  useEffect(() => {
    const q = Number(quantity);
    if (!basis || !(q > 0) || unit.trim().toLowerCase() !== basis.unit.toLowerCase()) return;
    const scaled = scaleNutrients(basis, basis.quantity, q);
    const grams = (g: number | null) => (g === null ? '' : String(g));
    form.setValue('calories', String(scaled.calories));
    form.setValue('protein_g', grams(scaled.protein_g));
    form.setValue('carbs_g', grams(scaled.carbs_g));
    form.setValue('fat_g', grams(scaled.fat_g));
  }, [quantity, unit, basis, form]);

  const logItem = (item: PickItem) => {
    saveEntry.log(date, {
      meal_type: form.getValues('meal_type'),
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      calories: item.calories,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      fat_g: item.fat_g,
      saved_food_id: item.saved_food_id,
    });
    router.back();
  };

  const adjustItem = (item: PickItem) => {
    setBasis(item);
    for (const [field, value] of Object.entries(toFormValues(item))) {
      form.setValue(field as keyof ReturnType<typeof toFormValues>, value);
    }
    setMode('form');
  };

  const onSubmit = form.handleSubmit(({ save_food, ...values }) => {
    const sameFoodAsBasis = basis && basis.name.toLowerCase() === values.name.toLowerCase();
    let savedFoodId = sameFoodAsBasis ? basis.saved_food_id : null;

    if (save_food) {
      // Saving under an existing name updates that food instead of failing on the unique name.
      const match =
        savedFoods.data?.find((f) => f.name.toLowerCase() === values.name.toLowerCase()) ?? null;
      savedFoodId = saveFood.save(
        {
          name: values.name,
          default_quantity: values.quantity,
          default_unit: values.unit,
          calories: values.calories,
          protein_g: values.protein_g,
          carbs_g: values.carbs_g,
          fat_g: values.fat_g,
        },
        match,
      );
    }

    const fields: EntryFields = { ...values, saved_food_id: savedFoodId };
    if (existing) saveEntry.update(existing, fields);
    else saveEntry.log(date, fields);
    router.back();
  });

  return (
    <>
      <View className="gap-1.5">
        <Label nativeID="meal-label">Meal</Label>
        <Controller
          control={form.control}
          name="meal_type"
          render={({ field }) => (
            <SegmentedControl
              accessibilityLabel="Meal"
              options={MEAL_OPTIONS}
              value={field.value}
              onChange={field.onChange}
            />
          )}
        />
      </View>

      {mode === 'pick' ? (
        <>
          <QuickPick onLog={logItem} onAdjust={adjustItem} />
          <Separator />
          <Button variant="outline" size="lg" onPress={() => setMode('form')}>
            <Text>Enter a new food</Text>
          </Button>
        </>
      ) : (
        <>
          <FormError message={saveEntry.error?.message ?? saveFood.error?.message} />
          <FormField
            control={form.control}
            name="name"
            label="Food"
            placeholder="e.g. Greek yogurt"
            autoCapitalize="sentences"
            autoFocus={!existing && !basis}
            returnKeyType="next"
            onSubmitEditing={() => form.setFocus('quantity')}
          />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <FormField
                control={form.control}
                name="quantity"
                label="Quantity"
                keyboardType="decimal-pad"
                selectTextOnFocus
              />
            </View>
            <View className="flex-1">
              <FormField control={form.control} name="unit" label="Unit" autoCapitalize="none" />
            </View>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {UNIT_SUGGESTIONS.map((u) => (
              <Button
                key={u}
                variant="secondary"
                size="sm"
                onPress={() => form.setValue('unit', u, { shouldValidate: true })}
                aria-label={`Unit: ${u}`}
              >
                <Text>{u}</Text>
              </Button>
            ))}
          </View>
          {basis ? (
            <Text variant="muted">
              Calories and macros scale with quantity while the unit stays “{basis.unit}”.
            </Text>
          ) : null}
          <FormField
            control={form.control}
            name="calories"
            label="Calories (kcal)"
            keyboardType="number-pad"
            selectTextOnFocus
          />
          <View className="flex-row gap-3">
            {(['protein_g', 'carbs_g', 'fat_g'] as const).map((field) => (
              <View key={field} className="flex-1">
                <FormField
                  control={form.control}
                  name={field}
                  label={{ protein_g: 'Protein g', carbs_g: 'Carbs g', fat_g: 'Fat g' }[field]}
                  placeholder="—"
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
              </View>
            ))}
          </View>
          <Controller
            control={form.control}
            name="save_food"
            render={({ field }) => (
              <View className="min-h-12 flex-row items-center justify-between">
                <Label nativeID="save-food-label" onPress={() => field.onChange(!field.value)}>
                  Save to My foods
                </Label>
                <Switch
                  value={field.value}
                  onValueChange={field.onChange}
                  aria-labelledby="save-food-label"
                />
              </View>
            )}
          />
          <Button size="lg" onPress={onSubmit}>
            <Text>{existing ? 'Save changes' : 'Log food'}</Text>
          </Button>
        </>
      )}
    </>
  );
}
