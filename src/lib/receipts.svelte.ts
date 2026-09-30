import { getSnapshot, mutate, subscribe } from "./timer";
import { emptySnapshot, type Action, type Snapshot } from "./types";

export const receipts = $state({
  snapshot: emptySnapshot(),
  note: "",
  now: Date.now(),
  ready: false,
  busy: false,
  error: "",
  announcement: "",
  savedUntil: 0,
});

let pendingNotes = 0;
let failedNote: Extract<Action, { kind: "note" }> | null = null;
let queue: Promise<void> = Promise.resolve();

function apply(snapshot: Snapshot) {
  if (snapshot.revision < receipts.snapshot.revision) return;
  receipts.snapshot = snapshot;
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
  receipts.error = "";
  await queue;
  if (failedNote) {
    const action = failedNote;
    try {
      const snapshot = await mutate(action);
      failedNote = null;
      apply(snapshot);
    } catch (error) { reportError(error); }
  } else {
    await refresh();
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
