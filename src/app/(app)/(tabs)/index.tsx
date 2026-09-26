import { useQueryClient } from '@tanstack/react-query';
import { formatInTimeZone } from 'date-fns-tz';
import { router } from 'expo-router';
import { Droplet, Dumbbell, Utensils, type LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { Screen } from '@/components/screen';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useSession } from '@/features/auth/session-provider';
import { CaloriesCard } from '@/features/nutrition/components/calories-card';
import { useProfile, useToday } from '@/features/profile/hooks';
import { WaterCard } from '@/features/water/components/water-card';
import { useActiveWorkout } from '@/features/workouts/active-workout-store';
import { TodayWorkoutCard } from '@/features/workouts/components/today-workout-card';
import { useStartWorkout } from '@/features/workouts/hooks';
import { useOnline } from '@/hooks/use-online';
import { localHour } from '@/lib/dates';
import { qk } from '@/lib/query-keys';

export default function TodayScreen() {
  const profile = useProfile();
  const today = useToday();
  const userId = useSession().session?.user.id;
  const queryClient = useQueryClient();
  const online = useOnline();

  if (!profile.data || !today || !userId) {
    return (
      <Screen>
        {profile.isError ? (
          <ErrorState error={profile.error} onRetry={() => profile.refetch()} />
        ) : (
          <LoadingState />
        )}
      </Screen>
    );
  }

  const { timezone, units, display_name, daily_calorie_goal } = profile.data;

  const refresh = async () => {
    // Offline, a refetch would wait for the network and leave the spinner stuck.
    if (!online) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: qk.profile(userId) }),
      queryClient.invalidateQueries({ queryKey: qk.nutrition.day(userId, today) }),
      queryClient.invalidateQueries({ queryKey: qk.water.day(userId, today) }),
      queryClient.invalidateQueries({ queryKey: qk.workouts.history(userId) }),
    ]);
  };

  return (
    <Screen onRefresh={refresh}>
      <View className="gap-0.5">
        <Text variant="muted">{formatInTimeZone(new Date(), timezone, 'EEEE, MMMM d')}</Text>
        <Text variant="h3">
          {greeting(localHour(timezone))}
          {display_name ? `, ${display_name}` : ''}
        </Text>
      </View>

      <QuickActions today={today} />
      <CaloriesCard today={today} goal={daily_calorie_goal} />
      <WaterCard />
      <TodayWorkoutCard today={today} timezone={timezone} units={units} />

      {!online ? (
        <Text variant="muted" className="text-center">
          You&apos;re offline. Anything you log is saved and syncs when you reconnect.
        </Text>
      ) : null}
    </Screen>
  );
}

function greeting(hour: number): string {
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function QuickActions({ today }: { today: string }) {
  const active = useActiveWorkout((s) => s.workout);
  const startWorkout = useStartWorkout();
  const [starting, setStarting] = useState(false);

  const workout = async () => {
    if (!active) {
      setStarting(true);
      try {
        await startWorkout();
      } finally {
        setStarting(false);
      }
    }
    router.push('/workout/active');
  };

  return (
    <View className="flex-row gap-2">
      <QuickAction
        icon={Dumbbell}
        label={active ? 'Resume workout' : 'Start workout'}
        onPress={workout}
        disabled={starting}
      />
      <QuickAction
        icon={Utensils}
        label="Log food"
        onPress={() => router.push({ pathname: '/nutrition/entry', params: { date: today } })}
      />
      <QuickAction icon={Droplet} label="Add water" onPress={() => router.push('/water')} />
    </View>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="secondary"
      className="h-auto flex-1 flex-col gap-1.5 py-3"
      onPress={onPress}
      disabled={disabled}
    >
      <Icon as={icon} size={22} className="text-secondary-foreground" />
      <Text className="text-center text-xs">{label}</Text>
    </Button>
  );
}
