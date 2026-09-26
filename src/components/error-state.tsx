import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

type ErrorStateProps = {
  title?: string;
  error: unknown;
  onRetry?: () => void;
};

export function ErrorState({ title = 'Something went wrong', error, onRetry }: ErrorStateProps) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <View className="items-center justify-center gap-3 py-12">
      <Text className="font-semibold">{title}</Text>
      <Text className="text-center text-muted-foreground">{message}</Text>
      {onRetry ? (
        <Button variant="outline" onPress={onRetry}>
          <Text>Try again</Text>
        </Button>
      ) : null}
    </View>
  );
}
