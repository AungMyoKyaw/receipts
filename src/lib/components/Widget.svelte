<script lang="ts">
  import { onMount } from "svelte";
  import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
  import { receipts, reportError } from "$lib/receipts.svelte";
  import { hideWidget, native, showMain } from "$lib/timer";
  import TimerControls from "./TimerControls.svelte";
  import Notice from "./Notice.svelte";
  import Help from "./Help.svelte";

  let panel: HTMLElement;
  const running = $derived(receipts.snapshot.running);
  const saved = $derived(receipts.savedUntil > receipts.now);

  function focusNote() { panel?.querySelector<HTMLInputElement>("input")?.focus(); }
  function handleKey(event: KeyboardEvent) {
    if (event.key === "Escape") { event.preventDefault(); void hideWidget().catch(reportError); }
    if (event.key !== "Tab") return;
    const controls = [...panel.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), a[href]")];
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }

  onMount(() => {
    window.addEventListener("focus", focusNote);
    const observer = new ResizeObserver(() => {
      if (native()) void getCurrentWindow().setSize(new LogicalSize(320, Math.ceil(panel.getBoundingClientRect().height))).catch(reportError);
    });
    observer.observe(panel);
    return () => { observer.disconnect(); window.removeEventListener("focus", focusNote); };
  });
  $effect(() => { if (receipts.ready) focusNote(); });
</script>

<svelte:window onkeydown={handleKey} />
<main bind:this={panel} aria-label="Receipts timer" class="flex min-h-[176px] w-full flex-col overflow-hidden rounded-xl border border-rule bg-paper-2">
  <header class="flex items-center justify-between px-4 pt-3.5 pb-2">
    <div class="flex items-center gap-2">
      <span class="crosshair text-ink-3" aria-hidden="true"></span>
      {#if running}<span class="h-1.5 w-1.5 rounded-full bg-accent pulse-rec" aria-hidden="true"></span>{/if}
      <span class="mono text-[10px] uppercase tracking-[0.22em] font-semibold {running ? 'text-accent' : saved ? 'text-positive' : 'text-ink-3'}">
        {!receipts.ready ? 'loading' : running ? 'rec' : saved ? 'saved' : 'idle'}
      </span>
    </div>
    <button onclick={() => void showMain().catch(reportError)} class="mono text-[10px] uppercase tracking-[0.22em] text-ink-2 hover:text-ink">open log <span aria-hidden="true">→</span></button>
  </header>
  <TimerControls compact />
  <Notice />
  <Help compact />
  <div class="mt-auto flex h-[3px] w-full shrink-0" aria-hidden="true">
    <span class="flex-1 bg-accent"></span><span class="flex-1 bg-positive"></span><span class="flex-1 bg-ink"></span><span class="flex-1 bg-rule"></span>
  </div>
</main>
