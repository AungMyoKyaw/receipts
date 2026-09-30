import { describe, expect, test } from 'bun:test';
import { elapsedMilliseconds, formatDuration, makeSession, validNote } from '../src/lib/demo';

describe('isolated website demo', () => {
  test('requires a non-empty note and enforces the Unicode limit', () => {
    expect(validNote('   ')).toBe(false);
    expect(validNote(' A real note ')).toBe(true);
    expect(validNote('🧾'.repeat(120))).toBe(true);
    expect(validNote('🧾'.repeat(121))).toBe(false);
  });

  test('derives elapsed time from the start timestamp', () => {
    expect(elapsedMilliseconds(null, 10000)).toBe(0);
    expect(elapsedMilliseconds(1000, 4500)).toBe(3500);
    expect(elapsedMilliseconds(4500, 1000)).toBe(0);
  });

  test('formats boundaries without wrapping hours', () => {
    expect(formatDuration(0)).toBe('00:00:00');
    expect(formatDuration(59999)).toBe('00:00:59');
    expect(formatDuration(60000)).toBe('00:01:00');
    expect(formatDuration(3661000)).toBe('01:01:01');
    expect(formatDuration(360000000)).toBe('100:00:00');
    expect(formatDuration(-1000)).toBe('00:00:00');
  });

  test('commits the trimmed note with a non-negative duration', () => {
    expect(makeSession(' Drawing a wordmark ', 1000, 4500)).toEqual({
      note: 'Drawing a wordmark', durationMs: 3500
    });
    expect(makeSession(' ', 1000, 4500)).toBeNull();
    expect(makeSession('Review', 4500, 1000)?.durationMs).toBe(0);
  });
});
