<script lang="ts">
  import { onMount } from "svelte";
  import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
  import { connect } from "$lib/receipts.svelte";
  import { native } from "$lib/timer";
  import Main from "$lib/components/Main.svelte";
  import Widget from "$lib/components/Widget.svelte";

  let surface = $state<'main' | 'widget' | null>(null);
  let preview = $state(false);
  onMount(() => {
    preview = !native();
    surface = native()
      ? getCurrentWebviewWindow().label === 'widget' ? 'widget' : 'main'
      : new URLSearchParams(window.location.search).get('surface') === 'widget' ? 'widget' : 'main';
    return connect();
  });
</script>

{#if surface === 'widget'}
  <Widget />
{:else if surface === 'main'}
  {#if preview}
    <aside class="flex flex-wrap items-center justify-between gap-2 border-b border-rule bg-paper px-7 py-2 mono text-[10px] text-ink-3">
      <span>Browser preview · separate local data</span>
      <a class="underline hover:text-ink" href="/?surface=widget" target="receipts-popup">Open timer popup</a>
    </aside>
  {/if}
  <Main />
{:else}
  <div class="grid min-h-screen place-items-center bg-paper-2 text-sm text-ink-3" role="status">Opening receipts…</div>
{/if}
