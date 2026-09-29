<script lang="ts">
  import { onMount } from "svelte";
  import { listSessions, getStats, type Session, type Stats } from "$lib/db";
  import { onTimerStopped, type StoppedSession } from "$lib/timer";

  let tab = $state<"log" | "stats">("log");
  let sessions = $state<Session[]>([]);
  let stats = $state<Stats | null>(null);
  let loading = $state(true);

  async function refresh() {
    loading = true;
    try {
      sessions = await listSessions(200, 0);
      stats = await getStats();
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      await refresh();
      unlisten = await onTimerStopped(async (_s: StoppedSession) => {
        await refresh();
      });
    })();
    return () => {
      unlisten?.();
    };
  });

  function fmtDuration(secs: number): string {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${secs}s`;
  }

  function fmtTimestamp(ms: number): string {
    const d = new Date(ms);
    const today = new Date();
    const sameDay =
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate();
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    if (sameDay) return time;
    const date = d.toLocaleDateString([], { month: "short", day: "numeric" });
    return `${date} ${time}`;
  }

  function fmtTotal(secs: number): string {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  function maxDaily(secs: number[]): number {
    return Math.max(1, ...secs);
  }
</script>

<div class="min-h-screen bg-neutral-950 text-neutral-100 p-6">
  <header class="mb-6 flex items-baseline justify-between">
    <h1 class="text-2xl font-semibold tracking-tight">Receipts</h1>
    {#if stats}
      <div class="text-xs text-neutral-500 font-mono">
        today: <span class="text-neutral-300">{fmtTotal(stats.total_secs_today)}</span>
        · week: <span class="text-neutral-300">{fmtTotal(stats.total_secs_week)}</span>
      </div>
    {/if}
  </header>

  <!-- Tabs -->
  <nav class="mb-4 flex gap-1 border-b border-neutral-800">
    {#each [{ k: "log", label: "Log" }, { k: "stats", label: "Stats" }] as t}
      <button
        onclick={() => (tab = t.k as "log" | "stats")}
        class="px-3 py-2 text-sm {tab === t.k
          ? 'text-neutral-100 border-b border-neutral-100 -mb-px'
          : 'text-neutral-500 hover:text-neutral-300'}"
      >
        {t.label}
      </button>
    {/each}
  </nav>

  {#if loading}
    <div class="text-neutral-600 text-sm">loading…</div>
  {:else if tab === "log"}
    {#if sessions.length === 0}
      <div class="text-neutral-600 text-sm py-12 text-center">
        no sessions yet. start one with <span class="font-mono text-neutral-400">Cmd+Shift+Space</span>.
      </div>
    {:else}
      <ul class="divide-y divide-neutral-900">
        {#each sessions as s (s.id)}
          <li class="grid grid-cols-[80px_80px_1fr] gap-3 items-baseline py-2 text-sm">
            <span class="font-mono text-xs text-neutral-500">{fmtTimestamp(s.started_at)}</span>
            <span class="font-mono text-xs text-neutral-300 tabular-nums">
              {fmtDuration(s.duration_secs)}
            </span>
            <span class="text-neutral-200 truncate" title={s.note}>{s.note}</span>
          </li>
        {/each}
      </ul>
    {/if}
  {:else if tab === "stats" && stats}
    <div class="space-y-6">
      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-md border border-neutral-800 bg-neutral-900/40 p-4">
          <div class="text-xs text-neutral-500 mb-1">Today</div>
          <div class="text-2xl font-light tabular-nums">{fmtTotal(stats.total_secs_today)}</div>
          <div class="text-xs text-neutral-600 mt-1">{stats.sessions_today} session{stats.sessions_today === 1 ? "" : "s"}</div>
        </div>
        <div class="rounded-md border border-neutral-800 bg-neutral-900/40 p-4">
          <div class="text-xs text-neutral-500 mb-1">Last 7 days</div>
          <div class="text-2xl font-light tabular-nums">{fmtTotal(stats.total_secs_week)}</div>
          <div class="text-xs text-neutral-600 mt-1">{stats.sessions_week} session{stats.sessions_week === 1 ? "" : "s"}</div>
        </div>
      </div>

      <div class="rounded-md border border-neutral-800 bg-neutral-900/40 p-4">
        <div class="text-xs text-neutral-500 mb-3">Daily minutes (last 7 days)</div>
        {#if stats.daily_secs.length === 0}
          <div class="text-neutral-600 text-sm">no data</div>
        {:else}
          {@const secs = stats.daily_secs.map((d) => d.secs)}
          {@const max = maxDaily(secs)}
          <div class="flex items-end gap-1 h-24">
            {#each stats.daily_secs as d}
              <div class="flex-1 flex flex-col items-center gap-1">
                <div class="w-full bg-neutral-700 rounded-sm" style="height: {(d.secs / max) * 100}%; min-height: 2px"></div>
                <div class="text-[10px] text-neutral-600 font-mono">{d.day.slice(5)}</div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>
