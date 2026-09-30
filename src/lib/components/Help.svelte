<script lang="ts">
  let { compact = false }: { compact?: boolean } = $props();
</script>

<details class="my-2 text-ink-2 {compact ? 'mx-4' : 'mx-7 max-[560px]:mx-5'}">
  <summary class="w-fit cursor-pointer mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-3 hover:text-ink">Help & shortcuts</summary>
  <dl class="mt-3 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 border-t border-rule pt-3 text-[12px] leading-relaxed">
    <dt class="mono text-[10px] text-ink-3">Return · ⌘↵</dt>
    <dd>Start or stop while editing the work note.</dd>
    <dt class="mono text-[10px] text-ink-3">⌘⇧Space</dt>
    <dd>Show or hide the popup, if the shortcut is available. Otherwise use the menu-bar icon.</dd>
    <dt class="mono text-[10px] text-ink-3">← / → · Home / End</dt>
    <dd>Move between Log, Week and Stats.</dd>
    <dt class="mono text-[10px] text-ink-3">Esc</dt>
    <dd>Close the timer popup.</dd>
    <dt class="mono text-[10px] text-ink-3">Saved sessions</dt>
    <dd>Edit or delete a session in Log. Undo is available for 5 seconds after Stop.</dd>
  </dl>
</details>
