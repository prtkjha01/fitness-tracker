import { Text } from '@/components/ui/text';
import { useNow } from '@/hooks/use-now';
import { formatDuration } from '@/lib/duration';
import { cn } from '@/lib/utils';

/** Live "12:34" since `since`, recomputed from the timestamp every second. */
export function ElapsedTime({ since, className }: { since: string; className?: string }) {
  const now = useNow(1000);
  const seconds = (now - new Date(since).getTime()) / 1000;
  return <Text className={cn('tabular-nums', className)}>{formatDuration(seconds)}</Text>;
}
