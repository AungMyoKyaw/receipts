import type { Session, Snapshot } from "./types";

export const HOUR = 3_600_000;
export const pad = (value: number) => String(value).padStart(2, "0");
export const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

export function formatHMS(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor(seconds / 60) % 60)}:${pad(seconds % 60)}`;
}
export function formatHM(ms: number): string {
  return formatHMS(ms).slice(0, -3);
}
export function formatDuration(ms: number): string {
  if (ms < 60_000) return `${Math.max(0, Math.floor(ms / 1000))}s`;
  const hours = Math.floor(ms / HOUR);
  const minutes = Math.floor(ms / 60_000) % 60;
  return hours ? `${hours}h ${pad(minutes)}m` : `${minutes}m`;
}
export function formatTime(ts: number): string {
  const date = new Date(ts);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function dateStamp(ts: number): string {
  const date = new Date(ts);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} · ${dayNames[date.getDay()]}`;
}
export function shortDate(ts: number): string {
  const date = new Date(ts);
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}`;
}
export function dayStart(ts: number): number {
  const date = new Date(ts);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}
export function addDays(ts: number, count: number): number {
  const date = new Date(ts);
  date.setDate(date.getDate() + count);
  return date.getTime();
}
export function weekStart(ts: number): number {
  return addDays(dayStart(ts), -new Date(ts).getDay());
}

export type Entry = Session & { current: boolean };
export function entries(snapshot: Snapshot, now: number): Entry[] {
  const saved = snapshot.sessions.map(session => ({ ...session, current: false }));
  if (snapshot.startedAt !== null) {
    const endedAt = Math.max(snapshot.startedAt, now);
    saved.unshift({ id: -1, startedAt: snapshot.startedAt, endedAt,
      durationMs: endedAt - snapshot.startedAt, note: snapshot.note, current: true });
  }
  return saved.sort((a, b) => b.startedAt - a.startedAt || b.id - a.id);
}

export function totalInRange(rows: Entry[], start: number, end: number): number {
  return rows.reduce((sum, row) => sum + Math.max(0, Math.min(row.endedAt, end) - Math.max(row.startedAt, start)), 0);
}
export function countInRange(rows: Entry[], start: number, end: number): number {
  return rows.filter(row => row.startedAt < end && (row.endedAt > start || (row.startedAt >= start && row.endedAt === row.startedAt))).length;
}
export function statistics(rows: Entry[], now: number) {
  const today = dayStart(now);
  const tomorrow = addDays(today, 1);
  const week = weekStart(now);
  const rolling = addDays(today, -6);
  return {
    today: totalInRange(rows, today, tomorrow),
    todayCount: countInRange(rows, today, tomorrow),
    week: totalInRange(rows, week, addDays(week, 7)),
    weekCount: countInRange(rows, week, addDays(week, 7)),
    rolling: totalInRange(rows, rolling, tomorrow),
    rollingCount: countInRange(rows, rolling, tomorrow),
    bars: Array.from({ length: 7 }, (_, index) => {
      const start = addDays(rolling, index);
      return { dayStart: start, total: totalInRange(rows, start, addDays(start, 1)) };
    }),
  };
}

export function calendarDays(rows: Entry[], now: number) {
  return Array.from({ length: 7 }, (_, index) => {
    const start = addDays(weekStart(now), index);
    const end = addDays(start, 1);
    const blocks = rows.filter(row => row.startedAt < end && (row.endedAt > start || (row.startedAt >= start && row.current))).map(row => {
      const clippedStart = Math.max(start, row.startedAt);
      const clippedEnd = Math.min(end, row.endedAt);
      const startDate = new Date(clippedStart);
      const endDate = new Date(clippedEnd);
      const firstHour = startDate.getHours() + startDate.getMinutes() / 60 + startDate.getSeconds() / 3600;
      const lastHour = clippedEnd === end ? 24 : endDate.getHours() + endDate.getMinutes() / 60 + endDate.getSeconds() / 3600;
      const offRange = lastHour <= 8 ? "before" : firstHour >= 20 ? "after" : null;
      const top = Math.max(0, Math.min(370, (firstHour - 8) * 32));
      const height = Math.min(384 - top, Math.max(14, (Math.min(20, lastHour) - Math.max(8, firstHour)) * 32));
      return { ...row, top, height, offRange, durationMs: Math.max(0, clippedEnd - clippedStart) };
    });
    return { dayStart: start, blocks };
  });
}
