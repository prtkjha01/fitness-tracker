/** 75 → "1:15", 3725 → "1:02:05". */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = String(s % 60).padStart(2, '0');
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
    : `${minutes}:${seconds}`;
}

/** 3725 → "1 h 2 min", 125 → "2 min", 40 → "40 s". For summaries, not timers. */
export function formatDurationWords(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s} s`;
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}

/**
 * Parses what people type into a duration field: "90" (seconds), "1:30", or "1:02:05".
 * Returns null for anything else.
 */
export function parseDuration(text: string): number | null {
  const parts = text.trim().split(':');
  if (parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  const [a, b, c] = parts.map(Number);
  if (parts.length === 1) return a!;
  if (b! >= 60 || (c !== undefined && c >= 60)) return null;
  return parts.length === 2 ? a! * 60 + b! : a! * 3600 + b! * 60 + c!;
}
