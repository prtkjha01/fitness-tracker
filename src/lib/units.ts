import { roundTo } from '@/lib/number';
import type { Enums } from '@/types/database.types';

// Everything is stored metric (kg, ml, m); these convert only at the display/input edge.
export type UnitSystem = Enums<'unit_system'>;

const ML_PER_FL_OZ = 29.5735295625;

export function mlToFlOz(ml: number): number {
  return ml / ML_PER_FL_OZ;
}

export function flOzToMl(flOz: number): number {
  return flOz * ML_PER_FL_OZ;
}

/** A water amount in the user's display unit, rounded to a whole number. */
export function mlToDisplayVolume(ml: number, units: UnitSystem): number {
  return Math.round(units === 'imperial' ? mlToFlOz(ml) : ml);
}

/** A whole-number water amount entered in the user's display unit, converted to ml. */
export function displayVolumeToMl(amount: number, units: UnitSystem): number {
  return Math.round(units === 'imperial' ? flOzToMl(amount) : amount);
}

export function volumeUnitLabel(units: UnitSystem): string {
  return units === 'imperial' ? 'fl oz' : 'ml';
}

// ---- Weight (stored in kg with 3 decimals, so lb values round-trip exactly) ----

const KG_PER_LB = 0.45359237;

export function weightUnitLabel(units: UnitSystem): string {
  return units === 'imperial' ? 'lb' : 'kg';
}

/** kg → the user's unit, rounded to 0.1. */
export function kgToDisplayWeight(kg: number, units: UnitSystem): number {
  return roundTo(units === 'imperial' ? kg / KG_PER_LB : kg, 1);
}

export function displayWeightToKg(weight: number, units: UnitSystem): number {
  return roundTo(units === 'imperial' ? weight * KG_PER_LB : weight, 3);
}

/** e.g. "62.5 kg" or "135 lb". */
export function formatWeight(kg: number, units: UnitSystem): string {
  return `${kgToDisplayWeight(kg, units).toLocaleString()} ${weightUnitLabel(units)}`;
}

// ---- Distance (stored in metres) ----

const M_PER_MI = 1609.344;

export function distanceUnitLabel(units: UnitSystem): string {
  return units === 'imperial' ? 'mi' : 'km';
}

/** metres → km or mi, rounded to 0.01. */
export function metersToDisplayDistance(m: number, units: UnitSystem): number {
  return roundTo(m / (units === 'imperial' ? M_PER_MI : 1000), 2);
}

export function displayDistanceToMeters(distance: number, units: UnitSystem): number {
  return roundTo(distance * (units === 'imperial' ? M_PER_MI : 1000), 2);
}

export function formatDistance(m: number, units: UnitSystem): string {
  return `${metersToDisplayDistance(m, units).toLocaleString()} ${distanceUnitLabel(units)}`;
}

/** e.g. "250 ml" or "8 fl oz". */
export function formatVolume(ml: number, units: UnitSystem): string {
  return `${mlToDisplayVolume(ml, units).toLocaleString()} ${volumeUnitLabel(units)}`;
}
