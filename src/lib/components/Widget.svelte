<script lang="ts">
  import { onMount } from "svelte";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import {
    getTimerState,
    startTimer,
    stopTimer,
    onTimerTick,
    onTimerStopped,
    type StoppedSession,
  } from "$lib/timer";
  import { insertSession } from "$lib/db";

  let note = $state("");
  let elapsed = $state(0);
  let running = $state(false);
  let busy = $state(false);
  let error = $state<string | null>(null);

  async function refresh() {
    const s = await getTimerState();
    running = s.running;
    elapsed = s.elapsed_secs;
    if (s.note) note = s.note;
  }

  onMount(() => {
    let unTick: (() => void) | undefined;
    let unStopped: (() => void) | undefined;
    (async () => {
      await refresh();
      unTick = await onTimerTick((e) => {
        elapsed = e;
        running = true;
      });
      unStopped = await onTimerStopped(async (s: StoppedSession) => {
        try {
          await insertSession({
            started_at: s.started_unix_ms,
            ended_at: s.ended_unix_ms,
            duration_secs: s.duration_secs,
            note: s.note,
          });
        } catch (err) {
          console.error("insertSession failed", err);
          error = String(err);
        }
        running = false;
        elapsed = 0;
        note = "";
      });
    })();
    return () => {
      unTick?.();
      unStopped?.();
    };
  });

  async function start() {
    if (!note.trim() || busy) return;
    busy = true;
    error = null;
    try {
      await startTimer(note.trim());
      running = true;
      elapsed = 0;
    } catch (e) {
      error = String(e);
    } finally {
      busy = false;
    }
  }

  async function stop() {
    if (busy) return;
    busy = true;
    try {
      await stopTimer();
      // timer-stopped handler will reset state
    } catch (e) {
      error = String(e);
    } finally {
      busy = false;
    }
  }

  async function hide() {
    await getCurrentWindow().hide();
  }

  function fmt(secs: number): string {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
</script>

<div
  data-tauri-drag-region
  class="flex h-screen w-screen flex-col rounded-xl border border-white/10 bg-black/70 text-neutral-100 backdrop-blur-md shadow-2xl select-none"
>
  <!-- Top bar: drag region + close -->
  <div data-tauri-drag-region class="flex items-center justify-end px-2 pt-1.5">
    <button
      onclick={hide}
      class="text-neutral-500 hover:text-neutral-200 text-xs px-1"
      title="Hide"
    >
      ✕
    </button>
  </div>

  <!-- Time display -->
  <div class="flex flex-1 items-center justify-center px-3 -mt-2">
    <div class="font-mono text-4xl font-light tabular-nums tracking-tight">
      {fmt(elapsed)}
    </div>
  </div>

  <!-- Note + button -->
  <div class="px-3 pb-3 flex flex-col gap-2">
    {#if running}
      <div class="text-xs text-neutral-500 truncate" title={note}>
        {note || "—"}
      </div>
      <button
        onclick={stop}
        disabled={busy}
        class="w-full rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-white disabled:opacity-50"
      >
        Stop
      </button>
    {:else}
      <input
        type="text"
        bind:value={note}
        maxlength="120"
        placeholder="what are you doing?"
        class="w-full rounded-md bg-white/5 border border-white/10 px-2 py-1 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-white/30"
        onkeydown={(e) => e.key === "Enter" && start()}
      />
      <button
        onclick={start}
        disabled={!note.trim() || busy}
        class="w-full rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed"
      >
        Start
      </button>
    {/if}

    {#if error}
      <div class="text-xs text-red-400 truncate" title={error}>{error}</div>
    {/if}
  </div>
</div>
