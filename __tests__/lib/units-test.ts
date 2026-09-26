import { formatDuration, formatDurationWords, parseDuration } from '@/lib/duration';
import {
  displayDistanceToMeters,
  displayVolumeToMl,
  displayWeightToKg,
  formatVolume,
  kgToDisplayWeight,
  metersToDisplayDistance,
  mlToDisplayVolume,
} from '@/lib/units';

describe('units', () => {
  it('round-trips pounds exactly through the 3-decimal kg column', () => {
    for (const lb of [45, 135, 137.5, 225, 315, 405]) {
      expect(kgToDisplayWeight(displayWeightToKg(lb, 'imperial'), 'imperial')).toBe(lb);
    }
    expect(displayWeightToKg(135, 'imperial')).toBe(61.235);
    expect(kgToDisplayWeight(100, 'metric')).toBe(100);
  });

  it('converts water and distance', () => {
    expect(mlToDisplayVolume(2500, 'imperial')).toBe(85);
    expect(displayVolumeToMl(8, 'imperial')).toBe(237);
    expect(formatVolume(250, 'metric')).toBe('250 ml');
    expect(metersToDisplayDistance(displayDistanceToMeters(3.1, 'imperial'), 'imperial')).toBe(3.1);
    expect(metersToDisplayDistance(5000, 'metric')).toBe(5);
  });
});

describe('durations', () => {
  it('parses what people type into a time field', () => {
    expect(['90', '1:30', '1:02:05', '0:45'].map(parseDuration)).toEqual([90, 90, 3725, 45]);
    expect(['1:60', 'abc', '1:2:3:4', '', '-5'].map(parseDuration)).toEqual([null, null, null, null, null]);
  });

  it('formats timers and summaries', () => {
    expect([0, 75, 3725].map(formatDuration)).toEqual(['0:00', '1:15', '1:02:05']);
    expect([40, 125, 3725].map(formatDurationWords)).toEqual(['40 s', '2 min', '1 h 2 min']);
  });
});

describe('roundTo', () => {
  it('rounds decimal halves up despite binary floating point', () => {
    const { roundTo } = jest.requireActual<typeof import('@/lib/number')>('@/lib/number');
    expect([roundTo(1.255, 2), roundTo(1.005, 2), roundTo(0.15, 1), roundTo(61.2349, 3)]).toEqual([1.26, 1.01, 0.2, 61.235]);
    expect([roundTo(-1.25, 1), roundTo(1e-7, 2), roundTo(NaN, 1)]).toEqual([-1.2, 0, NaN]);
  });
});
