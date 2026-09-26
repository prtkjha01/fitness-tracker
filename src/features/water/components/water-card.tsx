import { Link } from 'expo-router';

import { ErrorState } from '@/components/error-state';
import { LoadingState } from '@/components/loading-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@/components/ui/text';

import { useTodayWater } from '../hooks';
import { WaterProgress } from './water-progress';
import { WaterQuickAdd } from './water-quick-add';

/** Today's water on the home screen: progress, quick-add, and a link to the full log. */
export function WaterCard() {
  const { profile, logs, todayLogs, totalMl, goalMl } = useTodayWater();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Water</CardTitle>
      </CardHeader>
      <CardContent className="gap-3">
        {profile.data && todayLogs ? (
          <>
            <WaterProgress totalMl={totalMl} goalMl={goalMl} units={profile.data.units} />
            <WaterQuickAdd
              amountsMl={profile.data.water_quick_adds}
              units={profile.data.units}
              logs={todayLogs}
            />
            <Link href="/water" asChild>
              <Button variant="outline">
                <Text>
                  {todayLogs.length === 1 ? '1 entry today' : `${todayLogs.length} entries today`} ·
                  Custom amount
                </Text>
              </Button>
            </Link>
          </>
        ) : logs.isError ? (
          <ErrorState
            title="Couldn't load water"
            error={logs.error}
            onRetry={() => logs.refetch()}
          />
        ) : (
          <LoadingState />
        )}
      </CardContent>
    </Card>
  );
}
