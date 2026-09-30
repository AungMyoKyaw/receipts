import { describe, expect, test } from "bun:test";
import { addDays, calendarDays, countInRange, dateStamp, dayStart, entries, formatDuration, formatHM, formatHMS, formatLocalDateTimeInput, HOUR, parseLocalDateTimeInput, statistics, totalInRange, weekStart, type Entry } from "../src/lib/time";
import { emptySnapshot } from "../src/lib/types";

const local = (year: number, month: number, day: number, hour = 0, minute = 0) => new Date(year, month - 1, day, hour, minute).getTime();
const entry = (start: number, end: number, current = false): Entry => ({ id: 1, startedAt: start, endedAt: end, durationMs: end - start, note: "work", current });

describe("formatting", () => {
  test("clamps negative duration and supports long sessions", () => {
    expect(formatHMS(-100)).toBe("00:00:00");
    expect(formatHMS(100 * HOUR + 61000)).toBe("100:01:01");
    expect(formatHM(100 * HOUR)).toBe("100:00");
    expect(formatDuration(1200)).toBe("1s");
    expect(formatDuration(61 * 60000)).toBe("1h 01m");
  });
  test("uses local date rather than UTC date", () => {
    expect(dateStamp(local(2026, 9, 30))).toBe("2026-09-30 · WED");
    expect(dayStart(local(2026, 9, 30, 23))).toBe(local(2026, 9, 30));
  });
  test("round-trips local editor timestamps including milliseconds", () => {
    const timestamp = new Date(2026, 8, 30, 12, 34, 56, 789).getTime();
    expect(parseLocalDateTimeInput(formatLocalDateTimeInput(timestamp))).toBe(timestamp);
    expect(parseLocalDateTimeInput("2026-09-30T14:00")).toBe(local(2026, 9, 30, 14, 0));
    expect(() => parseLocalDateTimeInput("not-a-date")).toThrow("Choose a valid local date and time");
    if (process.env.TZ === "America/New_York") {
      expect(() => parseLocalDateTimeInput("2026-03-08T02:30")).toThrow("Choose a valid local date and time");
    }
  });
});

describe("statistics", () => {
  test("empty state has seven zero buckets", () => {
    const result = statistics([], local(2026, 9, 30));
    expect(result.today).toBe(0);
    expect(result.bars).toHaveLength(7);
    expect(result.bars.every(bar => bar.total === 0)).toBe(true);
  });
  test("splits overnight sessions between local days", () => {
    const start = local(2026, 9, 29, 23);
    const end = local(2026, 9, 30, 1);
    const result = statistics([entry(start, end)], end);
    expect(result.today).toBe(HOUR);
    expect(result.todayCount).toBe(1);
    expect(result.rolling).toBe(2 * HOUR);
    expect(result.bars.at(-2)?.total).toBe(HOUR);
    expect(result.bars.at(-1)?.total).toBe(HOUR);
  });
  test("calendar week and rolling seven days are distinct", () => {
    const now = local(2026, 9, 30, 12);
    const friday = entry(local(2026, 9, 25, 10), local(2026, 9, 25, 11));
    const result = statistics([friday], now);
    expect(weekStart(now)).toBe(local(2026, 9, 27));
    expect(result.week).toBe(0);
    expect(result.rolling).toBe(HOUR);
    expect(result.weekCount).toBe(0);
    expect(result.rollingCount).toBe(1);
  });
  test("zero-length saved and active sessions count on their start date", () => {
    const now = local(2026, 9, 30, 12);
    expect(countInRange([entry(now, now)], dayStart(now), addDays(dayStart(now), 1))).toBe(1);
  });
  test("live session uses wall clock and never produces negative time", () => {
    const snapshot = { ...emptySnapshot(), startedAt: 5000, running: true, note: "live" };
    expect(entries(snapshot, 9000)[0].durationMs).toBe(4000);
    expect(entries(snapshot, 1000)[0].durationMs).toBe(0);
  });
  test("range boundaries do not double count", () => {
    const rows = [entry(0, 1000), entry(1000, 2000)];
    expect(totalInRange(rows, 0, 1000)).toBe(1000);
    expect(totalInRange(rows, 1000, 2000)).toBe(1000);
  });
});

describe("weekly calendar", () => {
  test("seven aligned Sunday-first columns", () => {
    const days = calendarDays([], local(2026, 9, 30));
    expect(days).toHaveLength(7);
    expect(new Date(days[0].dayStart).getDay()).toBe(0);
    expect(new Date(days[6].dayStart).getDay()).toBe(6);
  });
  test("clips sessions spanning the visible hours", () => {
    const now = local(2026, 9, 30, 12);
    const row = entry(local(2026, 9, 30, 7), local(2026, 9, 30, 9));
    const block = calendarDays([row], now)[3].blocks[0];
    expect(block.top).toBe(0);
    expect(block.height).toBe(32);
    expect(block.offRange).toBeNull();
  });
  test("outside-hours sessions are retained for the overflow list", () => {
    const now = local(2026, 9, 30, 22);
    const block = calendarDays([entry(local(2026, 9, 30, 21), now, true)], now)[3].blocks[0];
    expect(block.offRange).toBe("after");
    expect(block.current).toBe(true);
  });
  test("overnight session appears in both date columns", () => {
    const end = local(2026, 9, 30, 9);
    const days = calendarDays([entry(local(2026, 9, 29, 19), end)], end);
    expect(days[2].blocks[0].height).toBe(32);
    expect(days[3].blocks[0].height).toBe(32);
  });
  test("calendar days respect spring and autumn DST", () => {
    // This suite also runs under America/New_York in test:timezones.
    const spring = local(2026, 3, 8);
    const autumn = local(2026, 11, 1);
    expect(new Date(addDays(spring, 1)).getHours()).toBe(0);
    expect(new Date(addDays(autumn, 1)).getHours()).toBe(0);
    if (process.env.TZ === "America/New_York") {
      expect(addDays(spring, 1) - spring).toBe(23 * HOUR);
      expect(addDays(autumn, 1) - autumn).toBe(25 * HOUR);
    }
    const total = statistics([entry(spring, addDays(spring, 1))], spring).today;
    expect(total).toBe(addDays(spring, 1) - spring);
  });
});
