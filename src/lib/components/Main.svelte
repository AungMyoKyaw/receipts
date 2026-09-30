<script lang="ts">
  import { receipts } from "$lib/receipts.svelte";
  import { dateStamp, entries, formatHM, statistics } from "$lib/time";
  import TimerControls from "./TimerControls.svelte";
  import Notice from "./Notice.svelte";
  import SessionLog from "./SessionLog.svelte";
  import WeekCalendar from "./WeekCalendar.svelte";
  import Statistics from "./Statistics.svelte";

  const tabs = ['log', 'week', 'stats'] as const;
  type Tab = typeof tabs[number];
  let tab = $state<Tab>('log');
  const rows = $derived(entries(receipts.snapshot, receipts.now));
  const stats = $derived(statistics(rows, receipts.now));

  function navigate(event: KeyboardEvent) {
    const index = tabs.indexOf(tab);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = tabs.length - 1;
    else return;
    event.preventDefault();
    tab = tabs[next];
    document.getElementById(`tab-${tab}`)?.focus();
  }
</script>

<main class="crops min-h-screen w-full overflow-hidden bg-paper-2">
  <span class="crop tl" aria-hidden="true"></span><span class="crop tr" aria-hidden="true"></span><span class="crop bl" aria-hidden="true"></span><span class="crop br" aria-hidden="true"></span>
  <header class="p-7 pb-5 max-[560px]:px-5">
    <div class="mb-3 flex flex-wrap items-baseline justify-between gap-4">
      <h1 class="display text-[30px] font-normal leading-none tracking-[-0.03em] text-ink">receipts<span class="text-accent">.</span></h1>
      <time datetime={new Date(receipts.now).toISOString()} class="stamp mono inline-block whitespace-nowrap border border-ink-3 bg-paper-2 px-2 py-1 text-[10px] uppercase tracking-[0.22em] text-ink-2">{dateStamp(receipts.now)}</time>
    </div>
    <div class="mono flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.15em] text-ink-3" aria-label="Session totals">
      <span>today <strong class="ml-1 font-semibold text-ink tabular">{formatHM(stats.today)}</strong></span>
      <span aria-hidden="true">·</span>
      <span>week <strong class="ml-1 font-semibold text-ink tabular">{formatHM(stats.week)}</strong></span>
      <span aria-hidden="true">·</span>
      <span><strong class="font-semibold text-ink tabular">{stats.weekCount}</strong> session{stats.weekCount === 1 ? '' : 's'}</span>
    </div>
  </header>
  <div class="perf mx-7 max-[560px]:mx-5" aria-hidden="true"></div>
  <TimerControls />
  <Notice />
  <div class="perf mx-7 max-[560px]:mx-5" aria-hidden="true"></div>
  <div class="flex gap-1 px-7 pt-5 max-[560px]:px-5" role="tablist" aria-label="Sessions">
    {#each tabs as item}
      <button id={`tab-${item}`} role="tab" aria-selected={tab === item} aria-controls={`panel-${item}`} tabindex={tab === item ? 0 : -1} onkeydown={navigate} onclick={() => tab = item}
        class="mono border-b-2 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] {tab === item ? 'border-accent bg-paper text-ink' : 'border-transparent text-ink-3 hover:text-ink-2'}">{item}</button>
    {/each}
  </div>
  <div class="px-7 pt-2 pb-7 max-[560px]:px-5">
    {#if !receipts.ready}
      <p class="py-16 text-center mono text-[12px] text-ink-3" role="status">{receipts.error ? 'Local data unavailable.' : 'Opening your log…'}</p>
    {/if}
    {#each tabs as item}
      <div id={`panel-${item}`} role="tabpanel" aria-labelledby={`tab-${item}`} hidden={tab !== item} tabindex="0">
        {#if receipts.ready && tab === item}
          {#if item === 'log'}<SessionLog {rows} now={receipts.now} />
          {:else if item === 'week'}<WeekCalendar {rows} now={receipts.now} />
          {:else}<Statistics {stats} />{/if}
        {/if}
      </div>
    {/each}
  </div>
</main>
