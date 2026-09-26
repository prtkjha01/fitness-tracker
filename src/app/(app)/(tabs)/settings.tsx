import { zodResolver } from '@hookform/resolvers/zod';
import Constants from 'expo-constants';
import { Plus, X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useEffect, useState } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { View } from 'react-native';

import { ErrorState } from '@/components/error-state';
import { FormError, FormField } from '@/components/form-field';
import { LoadingState } from '@/components/loading-state';
import { Screen } from '@/components/screen';
import { SegmentedControl } from '@/components/segmented-control';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { authErrorMessage } from '@/features/auth/errors';
import { useSignOut } from '@/features/auth/hooks';
import { useSession } from '@/features/auth/session-provider';
import type { Profile } from '@/features/profile/api';
import { useProfile, useSaveProfile } from '@/features/profile/hooks';
import { MAX_QUICK_ADDS, settingsSchema, type SettingsInput } from '@/features/profile/schemas';
import { formatDuration } from '@/lib/duration';
import {
  displayVolumeToMl,
  mlToDisplayVolume,
  volumeUnitLabel,
  type UnitSystem,
} from '@/lib/units';

const UNIT_OPTIONS = [
  { value: 'metric', label: 'Metric (kg, ml)' },
  { value: 'imperial', label: 'Imperial (lb, fl oz)' },
] as const;

const REST_PRESETS = [0, 60, 90, 120, 180, 240];

export default function SettingsScreen() {
  const profile = useProfile();

  return (
    <Screen>
      <Text variant="h3">Settings</Text>
      {profile.data ? (
        <SettingsForm profile={profile.data} />
      ) : profile.isError ? (
        <ErrorState error={profile.error} onRetry={() => profile.refetch()} />
      ) : (
        <LoadingState />
      )}
      <AccountSection timezone={profile.data?.timezone} />
    </Screen>
  );
}

function toFormValues(p: Profile): SettingsInput {
  return {
    display_name: p.display_name ?? '',
    units: p.units,
    daily_calorie_goal: String(p.daily_calorie_goal),
    daily_water_goal: String(mlToDisplayVolume(p.daily_water_goal_ml, p.units)),
    water_quick_adds: p.water_quick_adds.map((ml) => ({
      amount: String(mlToDisplayVolume(ml, p.units)),
    })),
    default_rest_seconds: p.default_rest_seconds,
  };
}

function SettingsForm({ profile }: { profile: Profile }) {
  const saveProfile = useSaveProfile();
  const [saved, setSaved] = useState(false);
  const form = useForm({
    resolver: zodResolver(settingsSchema),
    defaultValues: toFormValues(profile),
  });
  const quickAdds = useFieldArray({ control: form.control, name: 'water_quick_adds' });
  const units = useWatch({ control: form.control, name: 'units' });
  const { isDirty } = form.formState;

  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(() => setSaved(false), 2500);
    return () => clearTimeout(timer);
  }, [saved]);

  // Switching units converts what's typed, so 2500 ml becomes 85 fl oz rather than 2500 fl oz.
  const changeUnits = (next: UnitSystem, onChange: (value: UnitSystem) => void) => {
    if (next !== units) {
      const convert = (text: string) => {
        const n = Number(text);
        return /^\d+$/.test(text.trim()) && n > 0
          ? String(mlToDisplayVolume(displayVolumeToMl(n, units), next))
          : text;
      };
      form.setValue('daily_water_goal', convert(form.getValues('daily_water_goal')));
      form
        .getValues('water_quick_adds')
        .forEach((q, i) => form.setValue(`water_quick_adds.${i}.amount`, convert(q.amount)));
    }
    onChange(next);
  };

  const onSubmit = form.handleSubmit((values) => {
    saveProfile.save(values);
    form.reset(form.getValues());
    setSaved(true);
  });

  const unit = volumeUnitLabel(units);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Profile & goals</CardTitle>
        </CardHeader>
        <CardContent className="gap-4">
          <FormField
            control={form.control}
            name="display_name"
            label="Name"
            autoCapitalize="words"
            autoComplete="given-name"
          />
          <View className="gap-1.5">
            <Label nativeID="settings-units-label">Units</Label>
            <Controller
              control={form.control}
              name="units"
              render={({ field }) => (
                <SegmentedControl
                  accessibilityLabel="Units"
                  options={UNIT_OPTIONS}
                  value={field.value}
                  onChange={(next) => changeUnits(next, field.onChange)}
                />
              )}
            />
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <FormField
                control={form.control}
                name="daily_calorie_goal"
                label="Calories (kcal)"
                keyboardType="number-pad"
                selectTextOnFocus
              />
            </View>
            <View className="flex-1">
              <FormField
                control={form.control}
                name="daily_water_goal"
                label={`Water (${unit})`}
                keyboardType="number-pad"
                selectTextOnFocus
              />
            </View>
          </View>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Water buttons</CardTitle>
          <CardDescription>The one-tap amounts on Today and the water sheet.</CardDescription>
        </CardHeader>
        <CardContent className="gap-2">
          {quickAdds.fields.map((field, i) => (
            <View key={field.id} className="flex-row items-start gap-2">
              <View className="flex-1">
                <FormField
                  control={form.control}
                  name={`water_quick_adds.${i}.amount`}
                  label={`Button ${i + 1} (${unit})`}
                  keyboardType="number-pad"
                  selectTextOnFocus
                />
              </View>
              <Button
                variant="ghost"
                size="icon"
                className="mt-6"
                disabled={quickAdds.fields.length <= 1}
                onPress={() => quickAdds.remove(i)}
                aria-label={`Remove button ${i + 1}`}
              >
                <Icon as={X} size={18} className="text-muted-foreground" />
              </Button>
            </View>
          ))}
          {quickAdds.fields.length < MAX_QUICK_ADDS ? (
            <Button
              variant="secondary"
              onPress={() => quickAdds.append({ amount: '' }, { shouldFocus: true })}
            >
              <Icon as={Plus} size={16} className="text-secondary-foreground" />
              <Text>Add amount</Text>
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workouts</CardTitle>
          <CardDescription>Rest timer after each completed set.</CardDescription>
        </CardHeader>
        <CardContent>
          <Controller
            control={form.control}
            name="default_rest_seconds"
            render={({ field }) => {
              const options = REST_PRESETS.includes(field.value)
                ? REST_PRESETS
                : [...REST_PRESETS, field.value].sort((a, b) => a - b);
              return (
                <View className="flex-row flex-wrap gap-2" role="radiogroup" aria-label="Rest time">
                  {options.map((seconds) => (
                    <Button
                      key={seconds}
                      size="sm"
                      variant={field.value === seconds ? 'default' : 'secondary'}
                      onPress={() => field.onChange(seconds)}
                      role="radio"
                      aria-checked={field.value === seconds}
                      aria-label={seconds === 0 ? 'Rest timer off' : `${seconds} seconds`}
                    >
                      <Text>{seconds === 0 ? 'Off' : formatDuration(seconds)}</Text>
                    </Button>
                  ))}
                </View>
              );
            }}
          />
        </CardContent>
      </Card>

      <FormError
        message={saveProfile.error ? "Couldn't save your settings, so they were undone." : null}
      />
      <Button size="lg" onPress={onSubmit} disabled={!isDirty}>
        <Text>{saved && !isDirty ? 'Saved' : 'Save changes'}</Text>
      </Button>
    </>
  );
}

function AccountSection({ timezone }: { timezone: string | undefined }) {
  const { session } = useSession();
  const signOut = useSignOut();
  const { colorScheme, toggleColorScheme } = useColorScheme();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="gap-3">
          <Row label="Email" value={session?.user.email ?? '—'} />
          <Separator />
          <Row label="Timezone" value={timezone ?? '—'} />
          <Text variant="muted">
            Follows your phone. &quot;Today&quot; for meals, water and workouts uses this zone.
          </Text>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onPress={toggleColorScheme}>
            <Text>{colorScheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}</Text>
          </Button>
        </CardContent>
      </Card>

      <FormError message={authErrorMessage(signOut.error)} />
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="lg" disabled={signOut.isPending}>
            <Text>{signOut.isPending ? 'Signing out…' : 'Sign out'}</Text>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              Anything logged offline that hasn&apos;t synced yet will be discarded.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Text>Cancel</Text>
            </AlertDialogCancel>
            <AlertDialogAction onPress={() => signOut.mutate()}>
              <Text>Sign out</Text>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Text variant="muted" className="text-center">
        Fitness Tracker {Constants.expoConfig?.version ?? ''}
      </Text>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-4">
      <Text className="text-muted-foreground">{label}</Text>
      <Text className="shrink text-right">{value}</Text>
    </View>
  );
}
