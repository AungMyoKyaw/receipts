import { emptySnapshot, type Action, type Snapshot } from "./types";

/** Browser-only preview storage. Native persistence is entirely owned by Rust. */
export const PREVIEW_KEY = "receipts.preview.v1";

export function readPreview(): Snapshot {
  const raw = localStorage.getItem(PREVIEW_KEY);
  if (!raw) return emptySnapshot();
  const value = JSON.parse(raw) as Snapshot;
  if (!value || !Number.isSafeInteger(value.revision) || value.revision < 0 ||
    typeof value.running !== "boolean" || typeof value.note !== "string" ||
    !(value.startedAt === null || Number.isFinite(value.startedAt)) ||
    value.running !== (value.startedAt !== null) || !Array.isArray(value.sessions) ||
    !value.sessions.every(row => Number.isSafeInteger(row.id) && Number.isFinite(row.startedAt) &&
      Number.isFinite(row.endedAt) && row.endedAt >= row.startedAt && Number.isFinite(row.durationMs) && typeof row.note === "string")) {
    throw new Error("Preview data could not be read. Export the browser's local storage before resetting it.");
  }
  return value;
}

export function reducePreview(state: Snapshot, action: Action, now: number): Snapshot {
  if (action.kind !== "stop") {
    if (action.note.length > 120) throw new Error("Keep the note to 120 characters.");
    if ((action.kind === "start" || state.running) && !action.note.trim()) throw new Error("Add a note before starting the timer.");
  }
  const next = { ...state, revision: state.revision + 1 };
  if (action.kind === "start") {
    if (state.running) throw new Error("A timer is already running. Stop it before starting another.");
    return { ...next, running: true, startedAt: now, note: action.note };
  }
  if (action.startedAt !== state.startedAt) throw new Error("The timer changed in another window. Refresh and try again.");
  if (action.kind === "note") return { ...next, note: action.note };
  if (state.startedAt === null) throw new Error("The timer has already stopped.");
  const endedAt = Math.max(state.startedAt, now);
  const session = { id: state.sessions.reduce((max, row) => Math.max(max, row.id), 0) + 1,
    startedAt: state.startedAt, endedAt, durationMs: endedAt - state.startedAt, note: state.note };
  return { ...next, running: false, startedAt: null, note: "", sessions: [session, ...state.sessions] };
}

export async function mutatePreview(action: Action): Promise<Snapshot> {
  // Web Locks serialize all preview tabs; never emulate success if storage fails.
  return navigator.locks.request(PREVIEW_KEY, () => {
    const next = reducePreview(readPreview(), action, Date.now());
    localStorage.setItem(PREVIEW_KEY, JSON.stringify(next));
    return next;
  });
}
