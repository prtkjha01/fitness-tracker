import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { Screen } from '@/components/screen';
import { Separator } from '@/components/ui/separator';
import { Text } from '@/components/ui/text';
import { WaterCustomAmount } from '@/features/water/components/water-custom-amount';
import { WaterLogList } from '@/features/water/components/water-log-list';
import { WaterProgress } from '@/features/water/components/water-progress';
import { WaterQuickAdd } from '@/features/water/components/water-quick-add';
import { useTodayWater } from '@/features/water/hooks';

// Presented as a form sheet (see (app)/_layout.tsx). Android form sheets can't show a
// native header, so the title is part of the content.
export default function WaterScreen() {
  const { profile, logs, todayLogs, totalMl, goalMl } = useTodayWater();

  const error = profile.error ?? logs.error;
  const retry = () => (profile.isError ? profile.refetch() : logs.refetch());

  return (
    <Screen edges={[]} className="pt-6">
      <Text variant="h4">Water today</Text>
      {profile.data && todayLogs ? (
        <>
          <WaterProgress totalMl={totalMl} goalMl={goalMl} units={profile.data.units} />
          <WaterQuickAdd
            amountsMl={profile.data.water_quick_adds}
            units={profile.data.units}
            logs={todayLogs}
          />
          <WaterCustomAmount units={profile.data.units} />
          <Separator />
          <WaterLogList
            logs={todayLogs}
            units={profile.data.units}
            timezone={profile.data.timezone}
          />
        </>
      ) : error ? (
        <ErrorState title="Couldn't load today's water" error={error} onRetry={retry} />
      ) : (
        <LoadingState />
      )}
    </Screen>
  );
}
