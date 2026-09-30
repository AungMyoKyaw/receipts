import { emptySnapshot, type Action, type Snapshot } from "./types";

/** Browser-only preview storage. Native persistence is entirely owned by Rust. */
export const PREVIEW_KEY = "receipts.preview.v1";
const PREVIEW_NEXT_SESSION_ID_KEY = "receipts.preview.next-session-id.v1";

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

export function reducePreview(state: Snapshot, action: Action, now: number, nextSessionId?: number): Snapshot {
  if (action.kind === "start" || action.kind === "note" || action.kind === "updateSession") {
    if (action.note.length > 120) throw new Error("Keep the note to 120 characters.");
    const required = action.kind === "start" || action.kind === "updateSession" || state.running;
    const requiredMessage = action.kind === "start" ? "Add a note before starting the timer."
      : action.kind === "updateSession" ? "Add a note before saving the session."
        : "Add a note while the timer is running.";
    if (required && !action.note.trim()) throw new Error(requiredMessage);
  }

  const next = { ...state, revision: state.revision + 1 };
  if (action.kind === "start") {
    if (state.running) throw new Error("A timer is already running. Stop it before starting another.");
    return { ...next, running: true, startedAt: now, note: action.note };
  }
  if (action.kind === "note") {
    if (action.startedAt !== state.startedAt) throw new Error("The timer changed in another window. Refresh and try again.");
    return { ...next, note: action.note };
  }
  if (action.kind === "stop") {
    if (action.startedAt !== state.startedAt) throw new Error("The timer changed in another window. Refresh and try again.");
    if (state.startedAt === null) throw new Error("The timer has already stopped.");
    const endedAt = Math.max(state.startedAt, now);
    const session = { id: nextSessionId ?? state.sessions.reduce((max, row) => Math.max(max, row.id), 0) + 1,
      startedAt: state.startedAt, endedAt, durationMs: endedAt - state.startedAt, note: state.note };
    return { ...next, running: false, startedAt: null, note: "", sessions: [session, ...state.sessions] };
  }
  if (action.kind === "updateSession" && action.endedAt < action.startedAt) {
    throw new Error("End time must not be earlier than start time.");
  }

  const index = state.sessions.findIndex(session => session.id === action.expected.id &&
    session.startedAt === action.expected.startedAt && session.endedAt === action.expected.endedAt &&
    session.note === action.expected.note);
  if (index < 0) throw new Error("This session changed in another window. Refresh and try again.");
  const sessions = [...state.sessions];
  if (action.kind === "deleteSession") {
    sessions.splice(index, 1);
  } else {
    sessions[index] = { id: action.expected.id, startedAt: action.startedAt, endedAt: action.endedAt,
      durationMs: action.endedAt - action.startedAt, note: action.note };
  }
  return { ...next, sessions };
}

export async function mutatePreview(action: Action): Promise<Snapshot> {
  // Web Locks serialize all preview tabs; never emulate success if storage fails.
  return navigator.locks.request(PREVIEW_KEY, () => {
    const current = readPreview();
    const maxId = current.sessions.reduce((max, row) => Math.max(max, row.id), 0);
    const storedNextId = Number(localStorage.getItem(PREVIEW_NEXT_SESSION_ID_KEY));
    const nextSessionId = Number.isSafeInteger(storedNextId) && storedNextId > maxId
      ? storedNextId : maxId + 1;
    const next = reducePreview(current, action, Date.now(), nextSessionId);
    if (action.kind === "stop") localStorage.setItem(PREVIEW_NEXT_SESSION_ID_KEY, String(nextSessionId + 1));
    localStorage.setItem(PREVIEW_KEY, JSON.stringify(next));
    return next;
  });
}
