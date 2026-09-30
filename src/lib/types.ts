export type Session = {
  id: number;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  note: string;
};

export type Snapshot = {
  revision: number;
  running: boolean;
  startedAt: number | null;
  note: string;
  sessions: Session[];
};

export const emptySnapshot = (): Snapshot => ({
  revision: 0, running: false, startedAt: null, note: "", sessions: [],
});

export type Action =
  | { kind: "start"; note: string }
  | { kind: "stop"; startedAt: number }
  | { kind: "note"; note: string; startedAt: number | null };
