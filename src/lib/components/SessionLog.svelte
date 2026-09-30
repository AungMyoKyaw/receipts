<script lang="ts">
  import { dayStart, dateStamp, formatDuration, formatHM, formatTime, type Entry } from "$lib/time";
  let { rows, now }: { rows: Entry[]; now: number } = $props();
</script>

{#if rows.length === 0}
  <div class="flex flex-col items-center justify-center px-4 py-20 text-center">
    <span class="crosshair mb-5 text-ink-3" aria-hidden="true"></span>
    <h2 class="mono mb-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-ink-3">no sessions yet</h2>
    <p class="max-w-[320px] text-[13px] leading-relaxed text-ink-2">Start a timer from the popup or main panel. Your first session will land here.</p>
  </div>
{:else}
  <table class="w-full table-fixed border-collapse text-left">
    <colgroup><col class="w-[64px]" /><col class="w-[84px]" /><col /><col class="w-[56px] max-[560px]:w-[44px]" /></colgroup>
    <thead>
      <tr class="border-b border-rule mono text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-3">
        <th scope="col" class="py-2.5 font-semibold">time</th><th scope="col" class="py-2.5 pr-3 text-right font-semibold">duration</th><th scope="col" class="py-2.5 font-semibold">note</th><th scope="col" class="py-2.5 text-right font-semibold">id</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as row, index (row.id)}
        {#if index === 0 || dayStart(rows[index - 1].startedAt) !== dayStart(row.startedAt)}
          <tr><th colspan="4" scope="rowgroup" class="pt-4 pb-1 mono text-[10px] font-medium uppercase tracking-[0.12em] text-ink-3">{dayStart(row.startedAt) === dayStart(now) ? 'today' : dateStamp(row.startedAt)}</th></tr>
        {/if}
        <tr class="border-b border-dashed border-rule hover:bg-paper">
          <td class="py-2.5 align-top mono text-[11px] tabular text-ink-2"><time datetime={new Date(row.startedAt).toISOString()} title={new Date(row.startedAt).toLocaleString()}>{formatTime(row.startedAt)}</time></td>
          <td class="py-2.5 pr-3 text-right align-top mono text-[11px] tabular font-semibold {row.current ? 'text-accent' : 'text-positive'}" title={formatDuration(row.durationMs)}>{row.current ? formatDuration(row.durationMs) : row.durationMs < 60_000 ? formatDuration(row.durationMs) : formatHM(row.durationMs)}</td>
          <td class="py-2.5 align-top text-[13px] text-ink"><p class="truncate" title={row.note}>{row.note}</p></td>
          <td class="py-2.5 text-right align-top mono text-[10px] uppercase tracking-[0.1em] {row.current ? 'text-accent' : 'text-ink-3'}" title={row.current ? 'Recording' : `Session ${row.id}`}>{row.current ? 'rec' : row.id.toString(16).padStart(4, '0')}</td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}
