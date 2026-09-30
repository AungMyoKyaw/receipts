export type DemoSession = { note: string; durationMs: number };

export const NOTE_LIMIT = 120;

export function validNote(note: string): boolean {
  const length = Array.from(note.trim()).length;
  return length > 0 && length <= NOTE_LIMIT;
}

export function elapsedMilliseconds(startedAt: number | null, now: number): number {
  return startedAt === null ? 0 : Math.max(0, now - startedAt);
}

export function formatDuration(durationMs: number): string {
  const seconds = Math.floor(Math.max(0, durationMs) / 1000);
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60]
    .map((part) => String(part).padStart(2, '0'))
    .join(':');
}

export function makeSession(note: string, startedAt: number, endedAt: number): DemoSession | null {
  if (!validNote(note)) return null;
  return { note: note.trim(), durationMs: elapsedMilliseconds(startedAt, endedAt) };
}
