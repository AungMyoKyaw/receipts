<script lang="ts">
  import { receipts, retry, undoLastStop } from "$lib/receipts.svelte";
  const undoSeconds = $derived(Math.max(0, Math.ceil((receipts.undoUntil - receipts.now) / 1000)));
</script>

<div class="sr-only" role="status" aria-live="polite">{receipts.announcement}</div>
{#if receipts.error}
  <div class="mx-4 my-3 flex items-start gap-3 text-[13px] text-destructive" role="alert">
    <p class="min-w-0 flex-1 break-words">{receipts.error}</p>
    <button class="shrink-0 underline hover:text-ink disabled:opacity-40" disabled={receipts.busy} onclick={() => void retry()}>Retry</button>
  </div>
{/if}
{#if receipts.undoSession && receipts.undoUntil > receipts.now}
  <div class="mx-4 my-2 flex items-center justify-between gap-3 border-t border-rule pt-2 text-[12px] text-ink-2" role="group" aria-label="Undo saved session">
    <p class="min-w-0 truncate">Session saved · undo for {undoSeconds} seconds</p>
    <button class="shrink-0 rounded border border-rule bg-paper px-3 py-1.5 mono text-[10px] font-semibold uppercase tracking-[0.12em] hover:bg-paper-3 disabled:opacity-50" disabled={receipts.busy} onclick={() => void undoLastStop()}>Undo</button>
  </div>
{/if}
