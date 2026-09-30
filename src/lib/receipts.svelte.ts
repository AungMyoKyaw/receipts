import { getSnapshot, mutate, subscribe } from "./timer";
import { emptySnapshot, type Action, type Session, type Snapshot } from "./types";

export const receipts = $state({
  snapshot: emptySnapshot(),
  note: "",
  now: Date.now(),
  ready: false,
  busy: false,
  error: "",
  announcement: "",
  savedUntil: 0,
  undoSession: null as Session | null,
  undoUntil: 0,
});

let pendingNotes = 0;
let failedNote: Extract<Action, { kind: "note" }> | null = null;
let failedSessionAction: { action: Extract<Action, { kind: "updateSession" | "deleteSession" }>; announcement: string } | null = null;
let queue: Promise<void> = Promise.resolve();

function apply(snapshot: Snapshot) {
  if (snapshot.revision < receipts.snapshot.revision) return;
  const previous = receipts.snapshot;
  if (receipts.ready && snapshot.revision > previous.revision) {
    const added = snapshot.sessions.find(session => !previous.sessions.some(row => row.id === session.id));
    if (added) {
      receipts.undoSession = added;
      receipts.undoUntil = Date.now() + 5000;
    }
  }
  receipts.snapshot = snapshot;
  if (receipts.undoSession && !snapshot.sessions.some(row =>
    row.id === receipts.undoSession?.id && row.startedAt === receipts.undoSession.startedAt &&
    row.endedAt === receipts.undoSession.endedAt && row.note === receipts.undoSession.note)) {
    receipts.undoSession = null;
    receipts.undoUntil = 0;
  }
  if (pendingNotes === 0 && failedNote === null) {
    receipts.note = snapshot.note;
    pendingNotes = 0;
  }
  receipts.ready = true;
}
export function reportError(error: unknown) {
  receipts.error = error instanceof Error ? error.message : String(error);
}
export async function refresh() {
  try { apply(await getSnapshot()); } catch (error) { reportError(error); }
}
export async function retry() {
  if (receipts.busy) return;
  receipts.busy = true;
  receipts.error = "";
  try {
    await queue;
    if (failedNote) {
      const action = failedNote;
      try {
        const snapshot = await mutate(action);
        failedNote = null;
        apply(snapshot);
        receipts.announcement = "Work note saved.";
      } catch (error) { reportError(error); }
    } else if (failedSessionAction) {
      const pending = failedSessionAction;
      try {
        const snapshot = await mutate(pending.action);
        failedSessionAction = null;
        apply(snapshot);
        receipts.announcement = pending.announcement;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("changed in another window")) failedSessionAction = null;
        reportError(error);
        await refresh();
      }
    } else {
      await refresh();
    }
  } finally {
    receipts.busy = false;
  }
}

/** Subscribe before reading, and discard snapshots older than an applied event. */
export function connect(): () => void {
  let disposed = false;
  let unlisten: (() => void) | undefined;
  void (async () => {
    try {
      const release = await subscribe(snapshot => { if (!disposed) apply(snapshot); }, reportError);
      if (disposed) { release(); return; }
      unlisten = release;
      const snapshot = await getSnapshot();
      if (!disposed) apply(snapshot);
    } catch (error) { if (!disposed) reportError(error); }
  })();
  const tick = setInterval(() => { receipts.now = Date.now(); }, 1000);
  const onFocus = () => { void refresh(); };
  window.addEventListener("focus", onFocus);
  return () => {
    disposed = true;
    unlisten?.();
    clearInterval(tick);
    window.removeEventListener("focus", onFocus);
  };
}

export function setNote(note: string) {
  receipts.note = note;
  const action: Action = { kind: "note", note, startedAt: receipts.snapshot.startedAt };
  pendingNotes++;
  queue = queue.then(async () => {
    try {
      const snapshot = await mutate(action);
      pendingNotes--;
      failedNote = null;
      receipts.error = "";
      apply(snapshot);
    } catch (error) {
      pendingNotes--;
      failedNote = action;
      reportError(error);
      // Keep the local draft visible so a failed save is not mistaken for success.
    }
  });
}

async function commitSessionAction(action: Action, announcement: string): Promise<boolean> {
  if (receipts.busy || !receipts.ready) return false;
  receipts.busy = true;
  receipts.error = "";
  failedSessionAction = null;
  try {
    await queue;
    if (receipts.error) return false;
    const snapshot = await mutate(action);
    failedSessionAction = null;
    apply(snapshot);
    receipts.announcement = announcement;
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if ((action.kind === "updateSession" || action.kind === "deleteSession") && !message.includes("changed in another window")) {
      failedSessionAction = { action, announcement };
    }
    reportError(error);
    await refresh();
    return false;
  } finally {
    receipts.busy = false;
  }
}

export async function updateSavedSession(expected: Session, startedAt: number, endedAt: number, note: string) {
  return commitSessionAction({ kind: "updateSession", expected, startedAt, endedAt, note }, "Session updated.");
}

export async function deleteSavedSession(expected: Session, announcement = "Session deleted.") {
  return commitSessionAction({ kind: "deleteSession", expected }, announcement);
}

export async function undoLastStop() {
  const session = receipts.undoSession;
  if (!session || Date.now() > receipts.undoUntil) return false;
  return deleteSavedSession(session, "Last stopped session undone.");
}

export async function toggleTimer() {
  if (receipts.busy || !receipts.ready) return;
  if (!receipts.snapshot.running && !receipts.note.trim()) return;
  receipts.busy = true;
  receipts.error = "";
  // Capture the intended action before awaiting queued note edits. A concurrent
  // remote stop must never turn a user's Stop click into a new Start.
  const startedAt = receipts.snapshot.startedAt;
  const note = receipts.note;
  try {
    await queue;
    if (receipts.error) return;
    const action: Action = startedAt === null ? { kind: "start", note } : { kind: "stop", startedAt };
    const snapshot = await mutate(action);
    apply(snapshot);
    receipts.announcement = snapshot.running ? "Recording started." : "Session saved.";
    receipts.savedUntil = snapshot.running ? 0 : Date.now() + 2000;
  } catch (error) {
    reportError(error);
    await refresh();
  } finally {
    receipts.busy = false;
  }
}
