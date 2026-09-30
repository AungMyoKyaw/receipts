<script lang="ts">
  import { tick } from "svelte";
  import { dayStart, dateStamp, formatDuration, formatHM, formatLocalDateTimeInput, formatTime, parseLocalDateTimeInput, type Entry } from "$lib/time";
  import { deleteSavedSession, receipts, updateSavedSession } from "$lib/receipts.svelte";
  import type { Session } from "$lib/types";

  let { rows, now }: { rows: Entry[]; now: number } = $props();
  let editingId = $state<number | null>(null);
  let editingError = $state("");
  let savingEdit = $state(false);
  let deletingSession = $state(false);
  let draft = $state({ startedAt: "", endedAt: "", note: "", originalStartedAt: 0, originalEndedAt: 0 });
  let deleteDialog: HTMLDialogElement;
  let pendingDelete = $state<Session | null>(null);

  function sessionOf(row: Entry): Session {
    return { id: row.id, startedAt: row.startedAt, endedAt: row.endedAt, durationMs: row.durationMs, note: row.note };
  }
  async function beginEdit(row: Entry) {
    editingId = row.id;
    editingError = "";
    draft = {
      startedAt: formatLocalDateTimeInput(row.startedAt),
      endedAt: formatLocalDateTimeInput(row.endedAt),
      note: row.note,
      originalStartedAt: row.startedAt,
      originalEndedAt: row.endedAt,
    };
    await tick();
    document.getElementById(`edit-start-${row.id}`)?.focus();
  }
  async function cancelEdit(row?: Entry) {
    editingId = null;
    editingError = "";
    await tick();
    if (row) document.querySelector<HTMLButtonElement>(`[data-session-edit="${row.id}"]`)?.focus();
  }
  async function saveEdit(event: SubmitEvent, row: Entry) {
    event.preventDefault();
    if (!draft.note.trim()) {
      editingError = "Add a note before saving the session.";
      return;
    }
    try {
      const startedAt = draft.startedAt === formatLocalDateTimeInput(draft.originalStartedAt)
        ? draft.originalStartedAt : parseLocalDateTimeInput(draft.startedAt);
      const endedAt = draft.endedAt === formatLocalDateTimeInput(draft.originalEndedAt)
        ? draft.originalEndedAt : parseLocalDateTimeInput(draft.endedAt);
      if (endedAt < startedAt) {
        editingError = "End time must not be earlier than start time.";
        return;
      }
      savingEdit = true;
      try {
        if (await updateSavedSession(sessionOf(row), startedAt, endedAt, draft.note)) await cancelEdit(row);
      } finally {
        savingEdit = false;
      }
    } catch (error) {
      editingError = error instanceof Error ? error.message : String(error);
    }
  }
  function askDelete(row: Entry) {
    pendingDelete = sessionOf(row);
    deleteDialog.showModal();
  }
  async function confirmDelete() {
    if (!pendingDelete) return;
    deletingSession = true;
    try {
      if (await deleteSavedSession(pendingDelete)) {
        deleteDialog.close();
        pendingDelete = null;
        await tick();
        const nextAction = document.querySelector<HTMLButtonElement>("[data-session-edit]");
        if (nextAction) nextAction.focus();
        else document.getElementById("session-empty")?.focus();
      }
    } finally {
      deletingSession = false;
    }
  }
  function onDialogClose() { pendingDelete = null; }
</script>

{#if rows.length === 0}
  <div class="flex flex-col items-center justify-center px-4 py-20 text-center">
    <span class="crosshair mb-5 text-ink-3" aria-hidden="true"></span>
    <h2 id="session-empty" tabindex="-1" class="mono mb-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-ink-3">no sessions yet</h2>
    <p class="max-w-[320px] text-[13px] leading-relaxed text-ink-2">Start a timer from the popup or main panel. Your first session will land here.</p>
  </div>
{:else}
  <table class="w-full table-fixed border-collapse text-left">
    <colgroup><col class="w-[64px]" /><col class="w-[84px]" /><col /><col class="w-[56px]" /><col class="w-[112px]" /></colgroup>
    <thead>
      <tr class="border-b border-rule mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-3">
        <th scope="col" class="py-2.5 font-semibold">time</th><th scope="col" class="py-2.5 pr-3 text-right font-semibold">duration</th><th scope="col" class="py-2.5 font-semibold">note</th><th scope="col" class="py-2.5 text-right font-semibold">id</th><th scope="col" class="py-2.5 text-right font-semibold">actions</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as row, index (row.id)}
        {#if index === 0 || dayStart(rows[index - 1].startedAt) !== dayStart(row.startedAt)}
          <tr><th colspan="5" scope="rowgroup" class="pt-4 pb-1 mono text-[10px] font-medium uppercase tracking-[0.12em] text-ink-3">{dayStart(row.startedAt) === dayStart(now) ? 'today' : dateStamp(row.startedAt)}</th></tr>
        {/if}
        <tr class="border-b border-dashed border-rule hover:bg-paper">
          <td class="py-2.5 align-top mono text-[10px] tabular text-ink-2"><time datetime={new Date(row.startedAt).toISOString()} title={new Date(row.startedAt).toLocaleString()}>{formatTime(row.startedAt)}</time></td>
          <td class="py-2.5 pr-3 text-right align-top mono text-[10px] tabular font-semibold {row.current ? 'text-accent' : 'text-positive'}" title={formatDuration(row.durationMs)}>{row.current ? formatDuration(row.durationMs) : row.durationMs < 60_000 ? formatDuration(row.durationMs) : formatHM(row.durationMs)}</td>
          <td class="py-2.5 align-top text-[13px] text-ink"><p class="truncate" title={row.note}>{row.note}</p></td>
          <td class="py-2.5 text-right align-top mono text-[10px] uppercase tracking-[0.1em] {row.current ? 'text-accent' : 'text-ink-3'}" title={row.current ? 'Recording' : `Session ${row.id}`}>{row.current ? 'rec' : row.id.toString(16).padStart(4, '0')}</td>
          <td class="py-2 align-top text-right">
            {#if !row.current}
              <div class="flex justify-end gap-2">
                <button class="min-h-11 min-w-11 rounded px-1.5 mono text-[10px] underline underline-offset-2 hover:bg-paper-3 hover:text-ink" aria-label={`Edit session: ${row.note}`} data-session-edit={row.id} onclick={() => void beginEdit(row)}>Edit</button>
                <button class="min-h-11 min-w-11 rounded px-1.5 mono text-[10px] text-destructive underline underline-offset-2 hover:bg-paper-3 hover:text-ink" aria-label={`Delete session: ${row.note}`} onclick={() => askDelete(row)}>Delete</button>
              </div>
            {/if}
          </td>
        </tr>
        {#if editingId === row.id}
          <tr class="border-b border-rule bg-paper">
            <td colspan="5" class="py-3">
              <form class="grid grid-cols-2 gap-3" onsubmit={(event) => void saveEdit(event, row)}>
                <label class="flex min-w-0 flex-col gap-1 mono text-[10px] uppercase tracking-[0.12em] text-ink-3">Start · local time
                  <input id={`edit-start-${row.id}`} type="datetime-local" step="0.001" required bind:value={draft.startedAt} class="min-w-0 rounded-md border border-rule bg-paper-2 px-2 py-2 font-sans text-[13px] text-ink focus:border-accent focus:ring-2 focus:ring-accent/15" />
                </label>
                <label class="flex min-w-0 flex-col gap-1 mono text-[10px] uppercase tracking-[0.12em] text-ink-3">End · local time
                  <input type="datetime-local" step="0.001" required bind:value={draft.endedAt} class="min-w-0 rounded-md border border-rule bg-paper-2 px-2 py-2 font-sans text-[13px] text-ink focus:border-accent focus:ring-2 focus:ring-accent/15" />
                </label>
                <label class="col-span-2 flex min-w-0 flex-col gap-1 mono text-[10px] uppercase tracking-[0.12em] text-ink-3">Work note
                  <input type="text" maxlength="120" required bind:value={draft.note} class="min-w-0 rounded-md border border-rule bg-paper-2 px-3 py-2 font-sans text-[13px] normal-case tracking-normal text-ink focus:border-accent focus:ring-2 focus:ring-accent/15" />
                </label>
                {#if editingError}<p class="col-span-2 text-[13px] text-destructive" role="alert">{editingError}</p>{/if}
                <div class="col-span-2 flex flex-wrap justify-end gap-2">
                  <button type="button" class="min-h-11 rounded-md border border-rule px-3 py-2 text-[13px] hover:bg-paper-3 disabled:opacity-40" disabled={receipts.busy} onclick={() => void cancelEdit(row)}>Cancel</button>
                  <button type="submit" class="min-h-11 rounded-md bg-ink px-3 py-2 text-[13px] font-semibold text-paper disabled:opacity-40" disabled={receipts.busy || !draft.note.trim()}>{savingEdit ? 'Saving…' : 'Save changes'}</button>
                </div>
              </form>
            </td>
          </tr>
        {/if}
      {/each}
    </tbody>
  </table>
{/if}

<dialog bind:this={deleteDialog} aria-labelledby="delete-session-title" aria-describedby="delete-session-description" onclose={onDialogClose} class="m-auto w-[min(420px,calc(100vw-32px))] rounded-xl border border-rule bg-paper-2 p-5 text-ink backdrop:bg-ink/40">
  <h2 id="delete-session-title" class="display text-[24px] leading-tight">Delete this session?</h2>
  <p id="delete-session-description" class="mt-2 break-words text-[13px] leading-relaxed text-ink-2">“{pendingDelete?.note}” will be removed from this Mac. This cannot be undone.</p>
  <div class="mt-5 flex justify-end gap-2">
    <button class="min-h-11 rounded-md border border-rule px-3 py-2 text-[13px] hover:bg-paper-3 disabled:opacity-40" disabled={receipts.busy} onclick={() => deleteDialog.close()}>Keep session</button>
    <button class="min-h-11 rounded-md bg-destructive px-3 py-2 text-[13px] font-semibold text-paper hover:bg-accent-2 disabled:opacity-40" disabled={receipts.busy} aria-busy={deletingSession} onclick={() => void confirmDelete()}>{deletingSession ? 'Deleting…' : 'Delete session'}</button>
  </div>
</dialog>
