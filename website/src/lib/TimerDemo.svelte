<script lang="ts">
  import { onMount } from 'svelte';
  import Arrow from './Arrow.svelte';
  import { elapsedMilliseconds, formatDuration, makeSession, validNote, type DemoSession } from './demo';

  let note = $state('Designing the next thing');
  let startedAt = $state<number | null>(null);
  let now = $state(0);
  let saved = $state<DemoSession | null>(null);
  let ready = $state(false);
  let announcement = $state('');
  let input: HTMLInputElement | undefined;

  const running = $derived(startedAt !== null);
  const elapsed = $derived(running ? elapsedMilliseconds(startedAt, now) : saved?.durationMs ?? 0);
  const timerStatus = $derived(running ? 'rec' : saved ? 'saved' : 'idle');

  onMount(() => { ready = true; });
  $effect(() => {
    if (startedAt === null) return;
    const interval = window.setInterval(() => { now = Date.now(); }, 250);
    return () => window.clearInterval(interval);
  });

  export function focusNote() { input?.focus({ preventScroll: true }); }

  function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!ready || !validNote(note)) return;
    if (startedAt !== null) {
      saved = makeSession(note, startedAt, Date.now());
      startedAt = null;
      announcement = `Demo session saved: ${saved?.note}. ${formatDuration(saved?.durationMs ?? 0)}. Nothing is stored after you leave this page.`;
    } else {
      saved = null;
      now = Date.now();
      startedAt = now;
      announcement = 'Demo recording started. Stop the timer to save an example session.';
    }
  }

  function reset() {
    startedAt = null;
    saved = null;
    note = 'Designing the next thing';
    announcement = 'Demo reset. No records are stored.';
    focusNote();
  }
</script>

<div id="demo" class="mx-auto w-full max-w-[380px] scroll-mt-8">
  <div class="mb-5 flex items-center justify-between text-ink-3">
    <span class="font-mono text-[11px]">THE MENU-BAR POPUP</span>
    <span class="font-mono text-[11px]">LIVE DEMO</span>
  </div>
  <div class="overflow-hidden rounded-xl border border-rule bg-paper-2">
    <header class="flex items-center justify-between px-4 pb-3 pt-5 sm:px-5">
      <div class="flex items-center gap-2.5">
        <span class="registration scale-[0.65] text-ink-3" aria-hidden="true"></span>
        {#if running}<span class="pulse-recording h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true"></span>{/if}
        <span class="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] {running ? 'text-accent' : saved ? 'text-positive' : 'text-ink-3'}">{timerStatus}</span>
      </div>
      <a href="#work" class="flex min-h-8 items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink-2 hover:text-accent">Open log <Arrow class="h-3.5 w-3.5" /></a>
    </header>

    <form onsubmit={submit} class="px-4 pb-5 sm:px-5">
      <label for="work-note" class="sr-only">What are you working on?</label>
      <input bind:this={input} bind:value={note} id="work-note" type="text" autocomplete="off" placeholder="What are you working on?" aria-describedby="note-help" class="w-full rounded-md border border-rule bg-paper px-3 py-3 font-mono text-[12px] leading-5 text-ink placeholder:text-ink-3 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/15" />
      <p id="note-help" class="mt-2 min-h-4 font-mono text-[10px] leading-4 text-ink-3">
        {#if !validNote(note)}{note.trim() ? 'Keep your note to 120 characters.' : 'Add a note to start.'}{:else}A note. A timer. Nothing else.{/if}
      </p>
      <div class="mt-6 flex items-center justify-between gap-2">
        <span class="font-display text-[clamp(2.4rem,8vw,3rem)] font-medium leading-none tracking-[-0.03em] tabular-nums {running ? 'text-ink' : 'text-ink-2'}" role="timer" aria-live="off" aria-label="Elapsed time">{formatDuration(elapsed)}</span>
        <button type="submit" disabled={!ready || !validNote(note)} class="min-h-11 min-w-[78px] rounded-lg px-4 py-3 text-sm font-semibold transition-colors disabled:bg-paper-3 disabled:text-ink-3 {running ? 'bg-accent text-paper hover:bg-accent-2' : 'bg-ink text-paper hover:bg-ink-2'}">{running ? 'Stop' : 'Start'}</button>
      </div>
    </form>
    <div class="flex h-[3px]" aria-hidden="true">
      <span class="flex-1 bg-accent"></span><span class="flex-1 bg-positive"></span><span class="flex-1 bg-ink"></span><span class="flex-1 bg-rule"></span>
    </div>
  </div>
  <div class="mt-5 min-h-[100px]">
    {#if saved}
      <div class="receipt-stamp flex items-start justify-between gap-4 border-y border-rule py-3">
        <div class="min-w-0">
          <p class="font-mono text-[10px] uppercase tracking-[0.12em] text-positive">Session saved · demo only</p>
          <p class="mt-1.5 break-words text-sm text-ink-2">{saved.note}</p>
        </div>
        <span class="shrink-0 font-mono text-[12px] tabular-nums text-positive">{formatDuration(saved.durationMs)}</span>
      </div>
      <button type="button" onclick={reset} class="mt-2 min-h-8 font-mono text-[11px] text-ink-3 underline decoration-rule hover:text-accent">Reset demo</button>
    {:else}
      <p class="text-sm leading-6 text-ink-3">Go on. Start the clock.<br />This demo stays on this page.</p>
    {/if}
  </div>
  <p class="sr-only" role="status">{announcement}</p>
  <noscript><p class="text-sm text-ink-2">Enable JavaScript to try the timer. The rest of this website works without it.</p></noscript>
</div>
