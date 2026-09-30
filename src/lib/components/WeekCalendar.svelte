<script lang="ts">
  import { onMount, tick } from "svelte";
  import { calendarDays, dayNames, dayStart, formatDuration, formatTime, shortDate, type Entry } from "$lib/time";
  let { rows, now }: { rows: Entry[]; now: number } = $props();
  const days = $derived(calendarDays(rows, now));
  const today = $derived(dayStart(now));
  const hasSessions = $derived(days.some(day => day.blocks.length > 0));
  const outside = $derived(days.flatMap(day => day.blocks.filter(block => block.offRange).map(block => ({ ...block, dayStart: day.dayStart }))));
  const activeOutside = $derived(outside.filter(block => block.current));
  const savedOutside = $derived(outside.filter(block => !block.current));
  const currentHour = $derived(new Date(now).getHours() + new Date(now).getMinutes() / 60);
  const nowVisible = $derived(currentHour >= 8 && currentHour < 20);
  let body: HTMLDivElement;
  let intro: HTMLDivElement;
  let height = $state(384);
  const scale = $derived(height / 384);
  const nowTop = $derived((currentHour - 8) / 12 * height);
  const hours = [8, 10, 12, 14, 16, 18, 20];

  function fitCalendar() {
    if (body) height = Math.round(Math.max(144, Math.min(384, window.innerHeight - body.getBoundingClientRect().top - window.scrollY - 80)));
  }
  onMount(() => {
    const observer = new ResizeObserver(fitCalendar);
    observer.observe(intro);
    window.addEventListener('resize', fitCalendar);
    fitCalendar();
    return () => { observer.disconnect(); window.removeEventListener('resize', fitCalendar); };
  });
  $effect(() => { outside.length; void tick().then(fitCalendar); });
</script>

<div bind:this={intro}>
  <div class="mt-4 mb-3 flex flex-wrap items-baseline gap-3">
    <h2 class="mono text-[10px] uppercase tracking-[0.22em] text-ink-3 font-semibold">this week · 08:00–20:00</h2>
    <div class="h-px flex-1 bg-rule" aria-hidden="true"></div>
    <span class="mono text-[10px] uppercase tracking-[0.05em] text-ink-3 tabular">{shortDate(days[0].dayStart)} – {shortDate(days[6].dayStart)}</span>
  </div>
  {#if !hasSessions}
    <div class="my-5"><p class="text-[14px] font-medium">No sessions this week</p><p class="mt-1 text-[12px] text-ink-3">Start a timer to see your time here.</p></div>
  {/if}
  {#each activeOutside as block (`${block.id}-${block.dayStart}`)}
    <div class="my-3 flex flex-wrap items-center gap-x-3 gap-y-1 bg-paper px-3 py-2 text-[12px]">
      <span class="flex items-center gap-2 mono text-[10px] uppercase tracking-[0.12em] text-accent"><span class="h-1.5 w-1.5 rounded-full bg-accent pulse-rec" aria-hidden="true"></span>recording</span>
      <span class="min-w-0 flex-1 truncate text-ink" title={block.note}>{block.note}</span>
      <span class="mono tabular text-ink-2">{formatTime(block.startedAt)} · {formatDuration(block.durationMs)}</span>
      <span class="w-full text-[11px] text-ink-3">Outside displayed hours · {block.offRange === 'before' ? 'before 08:00' : 'after 20:00'}</span>
    </div>
  {/each}
  {#if savedOutside.length}
    <details class="my-3 text-[12px] text-ink-2" ontoggle={() => void tick().then(fitCalendar)}>
      <summary class="cursor-pointer">{savedOutside.length} session{savedOutside.length === 1 ? '' : 's'} outside 08:00–20:00</summary>
      <ul class="mt-3 space-y-2">
        {#each savedOutside as block (`${block.id}-${block.dayStart}`)}
          <li class="flex gap-3"><span class="mono shrink-0 tabular">{shortDate(block.dayStart)} {formatTime(block.startedAt)}</span><span class="min-w-0 flex-1 break-words">{block.note}</span><span class="shrink-0 mono">{formatDuration(block.durationMs)}</span></li>
        {/each}
      </ul>
    </details>
  {/if}
  {#if !nowVisible}<p class="mb-2 mono text-[10px] text-ink-3">Now {formatTime(now)} · {currentHour < 8 ? 'before' : 'after'} displayed hours</p>{/if}
</div>
<!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard users must be able to scroll the calendar.) -->
<div class="overflow-x-auto pb-2" tabindex="0" role="region" aria-label="Weekly calendar, scroll horizontally on small screens">
  <p class="mb-2 hidden mono text-[10px] text-ink-3 max-[680px]:block">Scroll horizontally for the remaining days.</p>
  <div class="cal-grid">
    <div class="cal-heading">
      <div class="pb-2.5 mono text-[11px] text-ink-3">Local</div>
      {#each days as day (day.dayStart)}
        <div class="px-1 py-2.5 text-center {day.dayStart === today ? 'text-accent' : 'text-ink-3'}">
          <div class="mono text-[10px] uppercase tracking-[0.2em] font-semibold">{dayNames[new Date(day.dayStart).getDay()]}</div>
          <div class="mono text-[9px] tabular mt-0.5">{shortDate(day.dayStart)}</div>
        </div>
      {/each}
    </div>
    <div bind:this={body} class="cal-body" style:height={`${height}px`}>
      <div class="cal-axis mono tabular" aria-label="Time of day">
        {#each hours as hour}<span style:top={`${(hour - 8) / 12 * height}px`}>{hour.toString().padStart(2, '0')}:00</span>{/each}
      </div>
      <div class="cal-lines" aria-hidden="true">{#each hours as hour}<span style:top={`${(hour - 8) / 12 * height}px`}></span>{/each}</div>
      <div class="cal-days">
        {#each days as day (day.dayStart)}
          <div class="relative {day.dayStart === today ? 'bg-paper-3/35' : ''}" aria-label={new Date(day.dayStart).toLocaleDateString()}>
            {#each day.blocks.filter(block => !block.offRange) as block (block.id)}
              {@const blockTop = Math.min(height - 14, block.top * scale)}
              {@const blockHeight = Math.min(height - blockTop, Math.max(14, block.height * scale))}
              <div
                class="absolute left-0.5 right-0.5 overflow-hidden rounded-sm px-1.5 py-0.5 mono text-[10px] leading-tight text-paper {block.current ? 'bg-accent z-[5]' : day.dayStart === today ? 'bg-ink' : 'bg-ink-2'}"
                style:top={`${blockTop}px`} style:height={`${blockHeight}px`}
                title={`${block.note} · ${formatTime(block.startedAt)} · ${formatDuration(block.durationMs)}${block.current ? ' · recording' : ''}`}
              >
                <span class="sr-only">{block.note}, {formatTime(block.startedAt)}, {formatDuration(block.durationMs)}{block.current ? ', recording' : ''}</span>
                {#if blockHeight >= 22}<div class="truncate font-semibold" aria-hidden="true">{block.note}</div>{/if}
                {#if blockHeight >= 40}<div class="text-[9px] tabular" aria-hidden="true">{formatDuration(block.durationMs)}</div>{/if}
              </div>
            {/each}
            {#if day.dayStart === today && nowVisible}
              <div class="pointer-events-none absolute left-0 right-0 z-10" style:top={`${nowTop}px`} aria-label={`Now, ${formatTime(now)}`}>
                <div class="h-px bg-accent"></div><div class="absolute -left-[3px] -top-[3px] h-[7px] w-[7px] rounded-full bg-accent ring-2 ring-paper"></div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>
<div class="mt-4 flex flex-wrap items-center gap-5 mono text-[10px] uppercase tracking-[0.18em] text-ink-3" aria-label="Calendar legend">
  <span class="flex items-center gap-2"><span class="h-2.5 w-2.5 rounded-sm bg-ink" aria-hidden="true"></span>logged</span>
  <span class="flex items-center gap-2"><span class="h-2.5 w-2.5 rounded-sm bg-accent" aria-hidden="true"></span>recording</span>
  <span class="flex items-center gap-2"><span class="h-px w-2.5 bg-accent" aria-hidden="true"></span>now</span>
</div>
