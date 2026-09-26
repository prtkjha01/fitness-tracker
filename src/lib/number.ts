/**
 * Rounds to `dp` decimals the way people expect: 1.255 → 1.26. Multiplying by 10ⁿ first
 * (Math.round(1.255 * 100)) gives 125.4999… in binary floating point and rounds down,
 * so shift the decimal point through the exponent instead.
 */
export function roundTo(n: number, dp: number): number {
  if (!Number.isFinite(n)) return n;
  // Very large/small numbers already print in exponent form; the shift trick can't apply.
  if (String(n).includes('e')) return Math.round(n * 10 ** dp) / 10 ** dp;
  return Number(`${Math.round(Number(`${n}e${dp}`))}e-${dp}`);
}
