<script lang="ts">
  import { receipts, setNote, toggleTimer } from "$lib/receipts.svelte";
  import { formatHMS } from "$lib/time";

  let { compact = false }: { compact?: boolean } = $props();
  const running = $derived(receipts.snapshot.running);
  const elapsed = $derived(receipts.snapshot.startedAt === null ? 0 : Math.max(0, receipts.now - receipts.snapshot.startedAt));
  const saved = $derived(!running && receipts.savedUntil > receipts.now);
  const noteHintId = $derived(compact ? "popup-note-hint" : "main-note-hint");
  function submitShortcut(event: KeyboardEvent) {
    if (!event.isComposing && event.key === "Enter" && (event.metaKey || event.ctrlKey) && event.currentTarget instanceof HTMLInputElement) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }
</script>

<form
  class={compact ? "grid grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-3 px-4 pb-4" : "flex flex-wrap items-center gap-3 px-7 py-4 max-[560px]:px-5"}
  onsubmit={(event) => { event.preventDefault(); void toggleTimer(); }}
>
  <div
    class="display tabular flex items-center gap-3 min-w-0 leading-none font-medium tracking-[-0.02em] {running ? 'text-ink' : 'text-ink-3'} {compact ? 'col-start-1 row-start-2 text-[46px]' : 'order-1 flex-1 text-[42px] max-[560px]:basis-full'}"
    aria-label="Elapsed time"
    role="timer"
  >
    {#if !compact && running}<span class="h-1.5 w-1.5 shrink-0 rounded-full bg-accent pulse-rec" aria-hidden="true"></span>{/if}
    {formatHMS(elapsed)}
  </div>
  <div class="min-w-0 {compact ? 'col-span-2 row-start-1' : 'order-2 flex-[2] max-[560px]:basis-full'}">
    <label for={compact ? "popup-note" : "main-note"} class="sr-only">Work note</label>
    <input
      id={compact ? "popup-note" : "main-note"}
      type="text"
      maxlength="120"
      value={receipts.note}
      oninput={(event) => setNote(event.currentTarget.value)}
      onkeydown={submitShortcut}
      disabled={!receipts.ready || receipts.busy}
      placeholder="what are you doing?"
      autocomplete="off"
      spellcheck="false"
      aria-describedby={receipts.ready && !running && !receipts.note.trim() ? noteHintId : undefined}
      class="w-full min-w-0 rounded-md border bg-paper px-3 py-2 mono text-[13px] text-ink placeholder:text-ink-3 focus:border-accent focus:bg-paper-2 focus:ring-2 focus:ring-accent/15 disabled:opacity-50 {running ? 'border-accent' : 'border-rule'}"
    />
    {#if receipts.ready && !running && !receipts.note.trim()}
      <p id={noteHintId} class="mt-1 mono text-[10px] leading-snug text-ink-3">Add a note to start · 120 characters max</p>
    {/if}
  </div>
  <button
    type="submit"
    aria-keyshortcuts="Enter Meta+Enter Control+Enter"
    title="Start or stop · Return or ⌘↵"
    disabled={!receipts.ready || receipts.busy || (!running && !receipts.note.trim())}
    class="shrink-0 rounded-lg px-4 py-2.5 text-[14px] font-semibold disabled:opacity-25 {running ? 'bg-accent text-paper hover:bg-accent-2' : saved ? 'bg-positive/12 text-positive' : 'bg-ink text-paper hover:bg-ink-2'} {compact ? 'col-start-2 row-start-2' : 'order-3'}"
  >{receipts.busy ? (running ? 'Saving…' : 'Starting…') : running ? 'Stop' : saved ? 'Saved' : 'Start'}</button>
</form>
