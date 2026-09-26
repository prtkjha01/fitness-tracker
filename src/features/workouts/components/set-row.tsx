import { Check } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { formatDuration, parseDuration } from '@/lib/duration';
import {
  displayDistanceToMeters,
  displayWeightToKg,
  kgToDisplayWeight,
  metersToDisplayDistance,
  type UnitSystem,
} from '@/lib/units';
import { cn } from '@/lib/utils';

import type { DraftSet, SetValues, TrackingType } from '../draft';
import { formatSet } from '../format';

type SetRowProps = {
  set: DraftSet;
  /** "1", "2"… for working sets; warm-ups show "W". */
  label: string;
  tracking: TrackingType;
  units: UnitSystem;
  previous: SetValues | undefined;
  onChange: (patch: Partial<DraftSet>) => void;
  onToggleComplete: () => void;
  onToggleWarmup: () => void;
  onRemove: () => void;
};

export function SetRow({
  set,
  label,
  tracking,
  units,
  previous,
  onChange,
  onToggleComplete,
  onToggleWarmup,
  onRemove,
}: SetRowProps) {
  const showWeight = tracking === 'weight_reps';
  const showReps = tracking === 'weight_reps' || tracking === 'reps';
  const showDistance = tracking === 'distance_duration';
  const showDuration = tracking === 'duration' || tracking === 'distance_duration';

  return (
    <View
      className={cn(
        'flex-row items-center gap-2 rounded-md px-1 py-1',
        set.is_completed && 'bg-emerald-500/15',
      )}
    >
      <Pressable
        onPress={onToggleWarmup}
        onLongPress={onRemove}
        className="h-11 w-11 items-center justify-center rounded-md active:bg-accent"
        aria-label={`Set ${label}${set.is_warmup ? ', warm-up' : ''}. Tap to ${set.is_warmup ? 'make it a working set' : 'mark as warm-up'}. Long press to delete.`}
      >
        <Text
          className={cn('font-semibold', set.is_warmup && 'text-amber-600 dark:text-amber-400')}
        >
          {set.is_warmup ? 'W' : label}
        </Text>
      </Pressable>

      <Text className="w-20 text-sm text-muted-foreground" numberOfLines={1}>
        {previous ? formatSet(previous, tracking, units) : '—'}
      </Text>

      {showWeight ? (
        <Cell
          value={set.weight_kg}
          placeholder={previous?.weight_kg ?? null}
          format={(kg) => String(kgToDisplayWeight(kg, units))}
          parse={(t) => parseDecimal(t, (n) => displayWeightToKg(n, units))}
          onCommit={(weight_kg) => onChange({ weight_kg })}
          keyboardType="decimal-pad"
          label="Weight"
        />
      ) : null}
      {showDistance ? (
        <Cell
          value={set.distance_m}
          placeholder={previous?.distance_m ?? null}
          format={(m) => String(metersToDisplayDistance(m, units))}
          parse={(t) => parseDecimal(t, (n) => displayDistanceToMeters(n, units))}
          onCommit={(distance_m) => onChange({ distance_m })}
          keyboardType="decimal-pad"
          label="Distance"
        />
      ) : null}
      {showReps ? (
        <Cell
          value={set.reps}
          placeholder={previous?.reps ?? null}
          format={String}
          parse={(t) =>
            t.trim() === '' ? null : /^\d+$/.test(t.trim()) ? Math.min(Number(t), 1000) : undefined
          }
          onCommit={(reps) => onChange({ reps })}
          keyboardType="number-pad"
          label="Reps"
        />
      ) : null}
      {showDuration ? (
        <Cell
          value={set.duration_seconds}
          placeholder={previous?.duration_seconds ?? null}
          format={formatDuration}
          parse={(t) => (t.trim() === '' ? null : (parseDuration(t) ?? undefined))}
          onCommit={(duration_seconds) => onChange({ duration_seconds })}
          keyboardType="numbers-and-punctuation"
          label="Time, minutes colon seconds"
        />
      ) : null}

      <Pressable
        onPress={onToggleComplete}
        className={cn(
          'h-11 w-11 items-center justify-center rounded-md',
          set.is_completed ? 'bg-emerald-500' : 'bg-muted active:bg-accent',
        )}
        role="checkbox"
        aria-checked={set.is_completed}
        aria-label={`Set ${label} done`}
      >
        <Icon
          as={Check}
          size={20}
          className={set.is_completed ? 'text-white' : 'text-muted-foreground'}
        />
      </Pressable>
    </View>
  );
}

/** Empty → null, a valid number → converted value, anything else → undefined (ignored). */
function parseDecimal(text: string, convert: (n: number) => number): number | null | undefined {
  const t = text.trim().replace(',', '.');
  if (t === '') return null;
  if (!/^\d+(\.\d*)?$/.test(t)) return undefined;
  return convert(Number(t));
}

type CellProps = {
  value: number | null;
  /** Last session's value, shown greyed out and used if the set is completed empty. */
  placeholder: number | null;
  format: (value: number) => string;
  parse: (text: string) => number | null | undefined;
  onCommit: (value: number | null) => void;
  keyboardType: KeyboardTypeOptions;
  label: string;
};

/** A numeric input that keeps the user's exact typing ("62.") while storing parsed values. */
function Cell({ value, placeholder, format, parse, onCommit, keyboardType, label }: CellProps) {
  const [text, setText] = useState(value === null ? '' : format(value));
  const [seen, setSeen] = useState(value);
  // Adopt changes made elsewhere (e.g. filled from "previous" on completion) without
  // clobbering what's being typed.
  if (value !== seen) {
    setSeen(value);
    if (parse(text) !== value) setText(value === null ? '' : format(value));
  }

  return (
    <TextInput
      value={text}
      onChangeText={(next) => {
        setText(next);
        const parsed = parse(next);
        if (parsed !== undefined) onCommit(parsed);
      }}
      placeholder={placeholder === null ? '' : format(placeholder)}
      keyboardType={keyboardType}
      selectTextOnFocus
      aria-label={label}
      className="h-11 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-center text-lg text-foreground placeholder:text-muted-foreground/50 dark:bg-input/30"
    />
  );
}
