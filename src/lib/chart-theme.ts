import { useColorScheme } from 'nativewind';

import { THEME } from '@/lib/theme';

// Chart colors, validated with the dataviz palette checker against the card surfaces
// (white / #0a0a0a): the series blue passes lightness, chroma and 3:1 contrast in both
// modes, and the calendar ramp is a monotone single-hue ordinal ramp in both modes.
// Dark mode uses its own steps, not an automatic flip.
const CHART = {
  light: {
    series: '#2a78d6',
    /** 1, 2, 3+ workouts. Light → dark = fewer → more. */
    ramp: ['#86b6ef', '#3987e5', '#1c5cab'],
    grid: THEME.light.border,
    text: THEME.light.mutedForeground,
    surface: THEME.light.card,
    empty: THEME.light.muted,
  },
  dark: {
    series: '#3987e5',
    /** On the dark surface "more" is lighter. */
    ramp: ['#1c5cab', '#3987e5', '#86b6ef'],
    grid: THEME.dark.border,
    text: THEME.dark.mutedForeground,
    surface: THEME.dark.card,
    empty: THEME.dark.muted,
  },
} as const;

export type ChartTheme = (typeof CHART)['light'] | (typeof CHART)['dark'];

export function useChartTheme(): ChartTheme {
  const { colorScheme } = useColorScheme();
  return colorScheme === 'dark' ? CHART.dark : CHART.light;
}

/** Clean y-axis ticks (1, 2, 2.5, 5 × 10ⁿ) spanning [min, max] in roughly `sections` steps. */
export function niceScale(min: number, max: number, sections = 3) {
  const span = max - min || Math.abs(max) * 0.1 || 1;
  const rough = span / sections;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude;
  const lo = Math.floor(min / step) * step;
  let hi = Math.ceil(max / step) * step;
  if (hi === lo) hi = lo + step;
  return { lo, hi, step, sections: Math.round((hi - lo) / step) };
}
