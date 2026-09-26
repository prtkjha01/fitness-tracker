import { getCalendars, getLocales } from 'expo-localization';

import type { UnitSystem } from '@/lib/units';

/** IANA timezone of the device, e.g. "Asia/Kolkata". Falls back to UTC when the OS doesn't say. */
export function getDeviceTimezone(): string {
  return getCalendars()[0]?.timeZone ?? 'UTC';
}

/** Suggested unit system for a new user: imperial only for US measurement settings. */
export function getDeviceUnits(): UnitSystem {
  return getLocales()[0]?.measurementSystem === 'us' ? 'imperial' : 'metric';
}
