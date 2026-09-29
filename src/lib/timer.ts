import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export type TimerSnapshot = {
  running: boolean;
  elapsed_secs: number;
  note: string;
};

export type StoppedSession = {
  started_unix_ms: number;
  ended_unix_ms: number;
  duration_secs: number;
  note: string;
};

export async function getTimerState(): Promise<TimerSnapshot> {
  return invoke<TimerSnapshot>("get_timer_state");
}

export async function startTimer(note: string): Promise<void> {
  await invoke("start_timer", { note });
}

export async function stopTimer(): Promise<StoppedSession> {
  return invoke<StoppedSession>("stop_timer");
}

export async function showWidget(): Promise<void> {
  await invoke("show_widget");
}

export async function hideWidget(): Promise<void> {
  await invoke("hide_widget");
}

export async function toggleWidget(): Promise<void> {
  await invoke("toggle_widget");
}

export async function showMain(): Promise<void> {
  await invoke("show_main");
}

export function onTimerTick(cb: (elapsed_secs: number) => void): Promise<UnlistenFn> {
  return listen<{ elapsed_secs: number }>("timer-tick", (e) => cb(e.payload.elapsed_secs));
}

export function onTimerStarted(cb: (note: string) => void): Promise<UnlistenFn> {
  return listen<{ note: string }>("timer-started", (e) => cb(e.payload.note));
}

export function onTimerStopped(cb: (s: StoppedSession) => void): Promise<UnlistenFn> {
  return listen<StoppedSession>("timer-stopped", (e) => cb(e.payload));
}
