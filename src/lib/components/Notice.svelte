<script lang="ts">
  import { receipts, retry } from "$lib/receipts.svelte";
</script>

<div class="sr-only" role="status" aria-live="polite">{receipts.announcement}</div>
{#if receipts.error}
  <div class="mx-4 my-3 flex items-start gap-3 text-[12px] text-destructive" role="alert">
    <p class="min-w-0 flex-1 break-words">{receipts.error}</p>
    <button class="shrink-0 underline hover:text-ink" onclick={() => void retry()}>Retry</button>
  </div>
{/if}
