<script lang="ts">
  let { direction = 'right', class: className = 'h-4 w-4' }: {
    direction?: 'right' | 'down';
    class?: string;
  } = $props();
</script>

<svg class={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <g transform={direction === 'down' ? 'rotate(90 12 12)' : undefined}>
    <path d="M4 12h15m-6-6 6 6-6 6" />
  </g>
</svg>
