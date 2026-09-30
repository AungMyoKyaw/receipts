<script lang="ts">
  import { base } from '$app/paths';
  import TimerDemo from '$lib/TimerDemo.svelte';
  import Arrow from '$lib/Arrow.svelte';
  import { downloads, installCommand, releaseUrl, repositoryUrl, version } from '$lib/distribution';

  let demo: TimerDemo | undefined;
  const views = [
    { id: 'log', label: 'Log', caption: 'Every session, with the note that makes it yours.', alt: 'Receipts Log view showing example work notes, start times, durations, and edit and delete controls.', height: 2346 },
    { id: 'week', label: 'Week', caption: 'A week of work. Read it at a glance.', alt: 'Receipts Week view showing example work sessions laid out across a Sunday-first calendar.', height: 2000 },
    { id: 'stats', label: 'Stats', caption: 'Today and the last seven days, without the spreadsheet.', alt: 'Receipts Stats view showing example daily and seven-day totals with a seven-day bar chart.', height: 2000 }
  ] as const;
  let selected = $state<(typeof views)[number]['id']>('week');

  const questions = [
    { question: 'Is this an expense or invoicing app?', answer: 'No. Receipts tracks time spent working. The name means a record of your work, not a financial receipt. There are no invoices, expense scans, client lists or project pickers.' },
    { question: 'Where does my work go?', answer: 'The Mac app saves sessions in a local SQLite database. No account, no cloud sync and no multi-device setup. The website demo is separate: it keeps nothing after you leave the page.' },
    { question: 'What happens if I quit while recording?', answer: 'The app saves the timer’s start time, not just a running counter. When you reopen receipts, the timer includes time spent while the app was closed. Closing the log only hides the window; recording continues.' },
    { question: 'Can I correct a session?', answer: 'Yes. Edit the note or start and end times in the log, or delete a session after confirmation. Just stopped too soon? The Mac app gives you five seconds to undo your last stop.' },
    { question: 'Which Macs does it work on?', answer: 'Receipts supports macOS 13.3 or later, with separate builds for Apple Silicon and Intel. Install with Homebrew or download a DMG below. Bun, Rust and Xcode are only needed to build from source. Windows and Linux releases are not provided.' },
    { question: 'How do I install and update it?', answer: 'Run the Homebrew command below, then open Receipts from Applications. Homebrew selects the build for your Mac. To update, run brew update, then brew upgrade --cask AungMyoKyaw/homebrew-tap/receipts. You can also install a DMG from GitHub Releases.' },
    { question: 'Why does macOS ask me to approve it?', answer: 'These builds are ad-hoc signed, not Apple Developer ID signed or notarized. If macOS blocks the first launch, open System Settings, then Privacy & Security, and choose Open Anyway for Receipts. Homebrew keeps the normal macOS quarantine checks.' }
  ];

  function focusDemo(event: MouseEvent) {
    event.preventDefault();
    document.getElementById('demo')?.scrollIntoView({ block: 'center' });
    demo?.focusNote();
  }

  function navigateTabs(event: KeyboardEvent) {
    const index = views.findIndex((view) => view.id === selected);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % views.length;
    else if (event.key === 'ArrowLeft') next = (index + views.length - 1) % views.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = views.length - 1;
    else return;
    event.preventDefault();
    selected = views[next].id;
    document.getElementById(`view-tab-${selected}`)?.focus();
  }
</script>

<svelte:head>
  <title>receipts. — Your hours. Accounted for.</title>
  <meta name="description" content="A local-first menu-bar time tracker for Mac. Write a note, start working, and see your sessions, week and totals. No accounts. No cloud sync." />
  <meta property="og:title" content="receipts. — Your hours. Accounted for." />
  <meta property="og:description" content="A menu-bar time tracker for Mac. A note, a timer, a local record of your work." />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="receipts" />
  <link rel="canonical" href="https://aungmyokyaw.github.io/receipts/" />
  <meta property="og:url" content="https://aungmyokyaw.github.io/receipts/" />
  <meta property="og:image" content="https://aungmyokyaw.github.io/receipts/images/week.webp" />
  <meta property="og:image:alt" content="Receipts weekly calendar with illustrative work sessions" />
  <meta name="twitter:card" content="summary_large_image" />
</svelte:head>

<a href="#main" class="sr-only z-50 bg-ink px-5 py-3 text-paper focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>

<div class="mx-auto max-w-[1440px] px-5 sm:px-10 lg:px-16">
  <header id="top" class="flex items-center justify-between gap-4 border-b border-rule py-6 sm:py-8">
    <a href="#top" aria-label="receipts home" class="font-display text-[36px] leading-none tracking-[-0.03em] sm:text-[42px]">receipts<span class="text-accent">.</span></a>
    <nav aria-label="Main navigation" class="flex items-center gap-5 text-[13px] sm:gap-8 sm:text-sm">
      <a href="#work" class="hidden min-h-11 items-center text-ink-2 hover:text-accent sm:inline-flex">The app</a>
      <a href="#questions" class="hidden min-h-11 items-center text-ink-2 hover:text-accent sm:inline-flex">Questions</a>
      <a href="#install" class="inline-flex min-h-11 items-center gap-2 font-medium underline decoration-rule hover:text-accent">Install on Mac <Arrow class="h-4 w-4" /></a>
    </nav>
  </header>
</div>

<main id="main">
<div class="mx-auto max-w-[1440px] px-5 sm:px-10 lg:px-16">
    <section aria-labelledby="offer" class="relative pb-4 pt-14 sm:pt-20 lg:pt-24">
      <div class="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
        <div>
          <h1 id="offer" class="max-w-[700px] font-display text-[clamp(3.4rem,7.6vw,6rem)] font-normal leading-[1.02] tracking-[-0.035em]">Your hours.<br />Accounted for<span class="text-accent">.</span></h1>
          <p class="mt-7 max-w-[420px] text-[17px] leading-[1.75] text-ink-2 sm:mt-8 sm:text-lg">A menu-bar time tracker for Mac.<br />Write a note. Start working.<br />Leave the rest out of it.</p>
          <div class="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4 sm:mt-10">
            <a href="#demo" onclick={focusDemo} class="inline-flex min-h-12 items-center justify-center gap-5 rounded-lg bg-ink px-6 py-3.5 text-sm font-medium text-paper transition-colors hover:bg-ink-2">Try the timer <Arrow class="h-[18px] w-[18px]" /></a>
            <a href="#install" class="inline-flex min-h-12 items-center gap-2 text-sm font-medium underline decoration-rule hover:text-accent">Install on Mac <Arrow direction="down" class="h-4 w-4" /></a>
          </div>
          <p class="mt-5 font-mono text-[11px] leading-5 text-ink-3">macOS 13.3+ · Local-first · No account</p>
        </div>

        <div class="crop-marks mx-auto w-full max-w-[450px] px-2 pb-2 pt-7 sm:px-8 lg:mt-4">
          <TimerDemo bind:this={demo} />
        </div>
      </div>
      <div class="proof-rule mt-9 sm:mt-14 lg:mt-20" aria-hidden="true"></div>
      <div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-5 font-mono text-[10px] uppercase leading-5 tracking-[0.1em] text-ink-3 sm:text-[11px]">
        <span>A proof of work, set in type.</span>
        <span class="flex items-center gap-3"><span class="registration scale-[0.65]" aria-hidden="true"></span>Made for independent work</span>
      </div>
    </section>

    <section aria-labelledby="setup" class="grid gap-10 border-b border-rule py-16 sm:py-24 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
      <div>
        <h2 id="setup" class="font-display text-[clamp(2.5rem,4.4vw,4rem)] leading-[1.06] tracking-[-0.03em]">A note is<br />all the setup.</h2>
        <p class="mt-6 max-w-[370px] text-base leading-7 text-ink-2">No project picker. No client dropdown. No dashboard to negotiate before you can get to work.</p>
      </div>
      <div class="max-w-[450px]">
        <div class="border-b border-rule pb-6">
          <h3 class="text-base font-medium">Name the work.</h3>
          <p class="mt-2 text-sm leading-6 text-ink-2">A few words are enough. “Fixing the checkout.”<br class="hidden sm:block" /> “Sketching the homepage.” Your note carries the meaning.</p>
        </div>
        <div class="border-b border-rule py-6">
          <h3 class="text-base font-medium">Start the clock.</h3>
          <p class="mt-2 text-sm leading-6 text-ink-2">Click Start or press Return. One running session, right in your menu bar. The log can stay closed.</p>
        </div>
        <div class="pt-6">
          <h3 class="text-base font-medium">Keep the record.</h3>
          <p class="mt-2 text-sm leading-6 text-ink-2">Stop to save the session on your Mac. Open the log when you want the bigger picture.</p>
        </div>
      </div>
    </section>

    <section id="work" aria-labelledby="review" class="scroll-mt-10 py-16 sm:py-24">
      <div class="flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
        <div>
          <h2 id="review" class="max-w-[650px] font-display text-[clamp(2.5rem,4.4vw,4rem)] leading-[1.06] tracking-[-0.03em]">See where the week went.</h2>
          <p class="mt-5 max-w-[510px] text-base leading-7 text-ink-2">The notes, the hours, the shape of your week.<br class="hidden sm:block" /> Three views of the same work. No extra admin.</p>
        </div>
        <div role="tablist" aria-label="App screenshot views" class="flex shrink-0 self-start border-b border-rule lg:self-auto">
          {#each views as view}
            <button id={`view-tab-${view.id}`} type="button" role="tab" aria-selected={selected === view.id} aria-controls={`view-panel-${view.id}`} tabindex={selected === view.id ? 0 : -1} onclick={() => { selected = view.id; }} onkeydown={navigateTabs} class="min-h-12 border-b-2 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.13em] transition-colors hover:text-accent {selected === view.id ? 'border-accent text-ink' : 'border-transparent text-ink-3'}">{view.label}</button>
          {/each}
        </div>
      </div>
      <div class="mt-9 overflow-hidden rounded-xl border border-rule bg-paper-2 p-1.5 sm:mt-10 sm:p-2.5">
        {#each views as view}
          <div id={`view-panel-${view.id}`} role="tabpanel" aria-labelledby={`view-tab-${view.id}`} tabindex="0" hidden={selected !== view.id}>
            <div class="aspect-[1.44]">
              <img src={`${base}/images/${view.id}.webp`} width="2880" height={view.height} alt={view.alt} loading="lazy" decoding="async" class="h-full w-full object-contain" />
            </div>
          </div>
        {/each}
      </div>
      <div class="mt-5 flex flex-wrap items-start justify-between gap-3 text-[12px] leading-6 text-ink-3">
        <p>{views.find((view) => view.id === selected)?.caption} <span class="block sm:inline">Actual app. Illustrative sessions.</span></p>
        <a href={`${base}/images/${selected}.webp`} target="_blank" rel="noreferrer" class="inline-flex min-h-8 items-center gap-2 underline decoration-rule hover:text-accent">Open full screenshot <Arrow class="h-3.5 w-3.5" /></a>
      </div>
      <noscript><p class="mt-3 text-sm text-ink-2">View screenshots: <a href={`${base}/images/log.webp`} class="underline">Log</a>, <a href={`${base}/images/week.webp`} class="underline">Week</a>, <a href={`${base}/images/stats.webp`} class="underline">Stats</a>.</p></noscript>
    </section>
</div>

<section aria-labelledby="local" class="bg-ink text-paper">
  <div class="mx-auto grid max-w-[1440px] gap-10 px-5 py-16 sm:px-10 sm:py-20 lg:grid-cols-[1.35fr_1fr] lg:gap-14 lg:px-16">
    <div>
      <h2 id="local" class="font-display text-[clamp(2.5rem,4.4vw,4rem)] leading-[1.1] tracking-[-0.03em]">No account. No cloud.<br />Just your Mac<span class="text-accent">.</span></h2>
      <p class="mt-6 max-w-[400px] text-base leading-7 text-paper-3">Your notes are your business. Receipts saves your sessions locally, in SQLite. No login between you and your work.</p>
    </div>
    <dl class="max-w-[450px] self-center text-sm">
      <div class="flex justify-between gap-4 border-b border-paper/25 py-4"><dt class="text-paper-3">Records</dt><dd class="font-mono text-[12px]">On your Mac</dd></div>
      <div class="flex justify-between gap-4 border-b border-paper/25 py-4"><dt class="text-paper-3">Network</dt><dd class="font-mono text-[12px]">Not required</dd></div>
      <div class="flex justify-between gap-4 border-b border-paper/25 py-4"><dt class="text-paper-3">Quit & reopen</dt><dd class="font-mono text-[12px]">Timer survives</dd></div>
      <div class="flex justify-between gap-4 py-4"><dt class="text-paper-3">Clients & projects</dt><dd class="font-mono text-[12px]">Not another chore</dd></div>
    </dl>
  </div>
</section>

<div class="mx-auto max-w-[1440px] px-5 sm:px-10 lg:px-16">
  <section id="questions" aria-labelledby="faq-heading" class="grid scroll-mt-10 gap-8 border-b border-rule py-16 sm:py-24 lg:grid-cols-[1fr_1.35fr] lg:gap-20">
    <div>
      <h2 id="faq-heading" class="font-display text-[clamp(2.5rem,4.4vw,4rem)] leading-[1.06] tracking-[-0.03em]">Small print.<br />Straight answers.</h2>
    </div>
    <div>
      {#each questions as item}
        <details class="group border-b border-rule last:border-b-0">
          <summary class="flex min-h-16 list-none items-center justify-between gap-5 py-5 text-sm font-medium [&::-webkit-details-marker]:hidden hover:text-accent">
            {item.question}
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4 shrink-0" aria-hidden="true"><path d="M3 10h14" /><path d="M10 3v14" class="group-open:hidden" /></svg>
          </summary>
          <p class="max-w-[65ch] pb-6 pr-7 text-sm leading-7 text-ink-2">{item.answer}</p>
        </details>
      {/each}
    </div>
  </section>

  <section id="install" aria-labelledby="install-heading" class="grid grid-cols-1 scroll-mt-10 gap-10 py-16 sm:py-24 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
    <div>
      <h2 id="install-heading" class="font-display text-[clamp(2.5rem,4.4vw,4rem)] leading-[1.06] tracking-[-0.03em]">Less setup.<br />More actual work.</h2>
      <p class="mt-6 max-w-[410px] text-base leading-7 text-ink-2">Install with Homebrew. It picks the right build for your Mac. Then open Receipts from Applications and start a session.</p>
      <a href={releaseUrl} class="mt-7 inline-flex min-h-11 items-center gap-3 text-sm font-medium underline decoration-rule hover:text-accent">Release notes · v{version} <Arrow class="h-4 w-4" /></a>
    </div>
    <div class="min-w-0 max-w-[450px] self-center">
      <pre aria-label="Homebrew install command" class="overflow-x-auto rounded-lg border border-rule bg-paper-2 px-5 py-5 font-mono text-[13px] leading-8 text-ink"><code>{installCommand}</code></pre>
      <p class="mt-4 text-[12px] leading-6 text-ink-3">Requires macOS 13.3+ and <a href="https://brew.sh/" class="underline decoration-rule hover:text-accent">Homebrew</a>. No development tools needed.</p>
      <div class="mt-5 flex flex-wrap gap-x-6 gap-y-2">
        {#each downloads as download}
          <a href={download.url} class="inline-flex min-h-11 items-center gap-2 text-sm font-medium underline decoration-rule hover:text-accent">Download for {download.label} <Arrow direction="down" class="h-4 w-4" /></a>
        {/each}
      </div>
      <p class="mt-3 text-[12px] leading-6 text-ink-3">Ad-hoc signed; not notarized. If the first launch is blocked, choose Open Anyway in System Settings → Privacy &amp; Security. Prefer a source build? <a href={`${repositoryUrl}#run`} class="underline decoration-rule hover:text-accent">Read the development instructions</a>.</p>
    </div>
  </section>

</div>
</main>

<div class="mx-auto max-w-[1440px] px-5 sm:px-10 lg:px-16">
  <footer class="pb-6 sm:pb-8">
    <div class="proof-rule" aria-hidden="true"></div>
    <div class="flex flex-wrap items-center justify-between gap-6 pt-7">
      <a href="#top" aria-label="receipts home" class="font-display text-[36px] leading-none tracking-[-0.03em]">receipts<span class="text-accent">.</span></a>
      <a href={`${repositoryUrl}/blob/master/LICENSE`} class="inline-flex min-h-11 items-center text-[12px] text-ink-3 underline decoration-rule hover:text-accent">Source · AGPL-3.0-or-later</a>
      <a href="#main" class="inline-flex min-h-11 items-center gap-3 text-[12px] text-ink-3 underline decoration-rule hover:text-accent">Back to top <Arrow class="h-3.5 w-3.5 rotate-[-90deg]" /></a>
    </div>
  </footer>
</div>
