import { useState, type ReactNode } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { cn } from '@/lib/utils';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  className?: string;
  /** Enables pull-to-refresh; the spinner shows until the promise settles. */
  onRefresh?: () => Promise<unknown>;
};

export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  className,
  onRefresh,
}: ScreenProps) {
  const [refreshing, setRefreshing] = useState(false);
  const refresh = onRefresh
    ? () => {
        setRefreshing(true);
        onRefresh().finally(() => setRefreshing(false));
      }
    : undefined;

  return (
    <SafeAreaView edges={edges} className="flex-1 bg-background">
      {scroll ? (
        <ScrollView
          contentContainerClassName={cn('gap-4 p-4 pb-12', className)}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          refreshControl={
            refresh ? <RefreshControl refreshing={refreshing} onRefresh={refresh} /> : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View className={cn('flex-1 gap-4 p-4', className)}>{children}</View>
      )}
    </SafeAreaView>
  );
}
