import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { mutatePreview, PREVIEW_KEY, readPreview } from "./db";
import type { Action, Snapshot } from "./types";

export const native = () => isTauri();
export async function getSnapshot(): Promise<Snapshot> {
  return native() ? invoke<Snapshot>("get_snapshot") : readPreview();
}
export async function mutate(action: Action): Promise<Snapshot> {
  if (!native()) return mutatePreview(action);
  if (action.kind === "start") return invoke("start_timer", { note: action.note });
  if (action.kind === "stop") return invoke("stop_timer", { startedAt: action.startedAt });
  if (action.kind === "note") return invoke("set_note", { note: action.note, startedAt: action.startedAt });
  if (action.kind === "updateSession") return invoke("update_session", {
    expected: action.expected, startedAt: action.startedAt, endedAt: action.endedAt, note: action.note,
  });
  return invoke("delete_session", { expected: action.expected });
}
export async function subscribe(changed: (snapshot: Snapshot) => void, failed: (error: unknown) => void): Promise<() => void> {
  if (native()) return listen<Snapshot>("receipts:changed", event => changed(event.payload));
  const onStorage = (event: StorageEvent) => {
    if (event.key === PREVIEW_KEY) {
      try { changed(readPreview()); } catch (error) { failed(error); }
    }
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}
export async function showMain(): Promise<void> {
  if (native()) await invoke("show_main");
  else window.location.assign("/");
}
export async function hideWidget(): Promise<void> {
  if (native()) await invoke("hide_widget");
  else window.location.assign("/");
}
