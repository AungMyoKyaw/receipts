<script lang="ts">
  import { dayNames, formatDuration, formatHM, HOUR, statistics } from "$lib/time";
  let { stats }: { stats: ReturnType<typeof statistics> } = $props();
  const max = $derived(Math.max(...stats.bars.map(bar => bar.total), 1));
</script>

<div class="mt-6 grid grid-cols-2 gap-8">
  <section class="py-1">
    <h2 class="mono mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">today</h2>
    <div class="display tabular text-[52px] max-[560px]:text-[42px] leading-none tracking-[-0.025em] text-ink" title={formatDuration(stats.today)}>{formatHM(stats.today)}</div>
    <p class="mono mt-3 text-[11px] text-ink-2 tabular">{stats.todayCount} session{stats.todayCount === 1 ? '' : 's'}</p>
  </section>
  <section class="py-1">
    <h2 class="mono mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-3">last 7 days</h2>
    <div class="display tabular text-[52px] max-[560px]:text-[42px] leading-none tracking-[-0.025em] text-ink" title={formatDuration(stats.rolling)}>{formatHM(stats.rolling)}</div>
    <p class="mono mt-3 text-[11px] text-ink-2 tabular">{stats.rollingCount} session{stats.rollingCount === 1 ? '' : 's'}</p>
  </section>
</div>
<section class="mt-8 py-1">
  <h2 class="mono mb-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-3">daily · last 7 days (hours)</h2>
  {#if stats.rolling === 0}
    <div class="flex h-36 items-center justify-center"><p class="mono text-[10px] uppercase tracking-[0.22em] text-ink-3">no data · last 7 days</p></div>
  {:else}
    <div class="flex items-end gap-2 border-t border-dashed border-rule px-1 pt-3" role="img" aria-label={stats.bars.map(bar => `${dayNames[new Date(bar.dayStart).getDay()]}: ${formatDuration(bar.total)}`).join('; ')}>
      {#each stats.bars as bar, index (bar.dayStart)}
        <div class="min-w-0 flex-1" title={`${new Date(bar.dayStart).toLocaleDateString()}: ${formatDuration(bar.total)}`}>
          <div class="flex h-28 items-end"><div class="w-full {index === 6 ? 'bg-accent' : 'bg-ink-2'}" style:height={`${bar.total ? Math.max(3, bar.total / max * 100) : 0}%`}></div></div>
          <div class="mono mt-2 text-center text-[9px] uppercase tracking-[0.1em] tabular {index === 6 ? 'text-accent font-semibold' : 'text-ink-3'}">
            <span class="block">{dayNames[new Date(bar.dayStart).getDay()]}</span><span>{(bar.total / HOUR).toFixed(1)}h</span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</section>
