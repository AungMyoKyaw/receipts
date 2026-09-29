<script lang="ts">
  import { onMount } from "svelte";
  import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
  import Widget from "$lib/components/Widget.svelte";
  import Main from "$lib/components/Main.svelte";

  let label = $state<string | null>(null);

  onMount(async () => {
    try {
      label = getCurrentWebviewWindow().label;
    } catch (e) {
      label = "main";
    }
  });
</script>

{#if label === "widget"}
  <Widget />
{:else if label === "main"}
  <Main />
{:else}
  <div class="min-h-screen bg-neutral-950 text-neutral-500 grid place-items-center text-sm">
    loading…
  </div>
{/if}
