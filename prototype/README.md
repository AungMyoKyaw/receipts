# Prototype

UI reference. Live timer, live log, live stats — all share JS state and persist in `localStorage`. This file is the source of truth for the Svelte port — lift markup verbatim, replace JS state with `$state`.

Open: `open prototype/index.html`.

## v9 — Galley Proof

A print-shop galley-proof aesthetic replaces v8's paper-and-ink. The metaphor shifts from "thermal paper receipt" to "test print before final press": registration crosshairs, crop marks at panel corners, perforated tear lines, color bar (CMYK-style), and a rotated date stamp. Proofing red `#c8201a` replaces burnt sienna as the accent. A display serif (Fraunces) carries the hero numerals; the time-as-print-headline idea is now literal.

- **New display face:** Fraunces at `opsz 144` for all hero numerals — 04:12, 22:08, the timer itself.
- **Stamp wordmark:** `receipts.` set in Fraunces with the period in accent. The period is the only mark.
- **Crop marks:** L-shaped corner brackets at every panel corner.
- **Perforation:** alternating dots and dashes (not dashed line), like real tear paper.
- **Registration crosshair:** small `+` symbol marks every status indicator.
- **Date stamp:** rotated −3° with a border, sits next to the wordmark.
- **Color bar:** 3 px strip (accent / positive / ink / rule) at the bottom of the popup.
- **Light theme kept:** cream proof paper, carbon ink, proofing red. Dark menu bar remains for OS chrome simulation.

## Palette — Galley Proof

```
fg:            #0c0a07       ink          primary text
fg-dim:        #3d3a35       ink-2        secondary text
fg-faint:      #5e5749       ink-3        tertiary text, crop marks

bg:            #f3eee2       paper        proof paper
surface:       #ebe5d3       paper-2      panel surface
surface-2:     #ddd5c0       paper-3
border:        #b8ad94       rule         tear lines

accent:        #c8201a       accent       recording state, active period
accent-2:      #8a1410       accent-2     accent hover
accent-soft:   #4a0a08       accent-soft

positive:      #1a5a35                    saved sessions, past totals
destructive:   #9a1810                    overflow, delete
```

Tokens are semantic (paper / ink / rule / accent), not literal ("cream" / "brown"). Contrast for `ink-3` was raised from v8's `#807968` to `#5e5749` so tertiary labels meet WCAG AA.

## Type

| Role | Face | Use |
|---|---|---|
| Display | Fraunces (opsz 144) | hero numerals, wordmark, large stats |
| Sans | Inter | UI labels, body, button text |
| Mono | JetBrains Mono | timestamps, ids, stat readouts, all-caps labels |

Self-host before shipping. Fraunces `display=swap` is fine for the prototype only.

## Sections

1. **Title** — wordmark, intro, click-the-icon hint.
2. **Palette** — color tokens + semantic usage + control buttons.
3. **Type** — three roles, each with sample text and weight list.
4. **Popup** — static render of the popup in its recording state (live popup drops from menu bar icon).
5. **Main panel** — dynamic, shared state with the popup. Wordmark + date stamp, header stats, timer strip, tabs (log / week / stats), live log rows, weekly calendar grid, bar chart.
6. **Empty log** — zero-session demo with center-aligned empty state.
7. **Empty stats** — zero-data chart demo.
8. **Empty week** — zero-week calendar demo.
9. **Components** — button / input / row / status / tab states.

## Porting to Svelte

1. Lift markup verbatim from `index.html` into `src/lib/components/Main.svelte` and `src/lib/components/Widget.svelte`.
2. Replace `localStorage` reads/writes with `$state` runes. Single store: `{ running, startedAt, note, sessions }`.
3. Replace JS render functions with Svelte `$derived` for time display, sessions list, stats, calendar.
4. Keep `setInterval` for live tick while running, or compute elapsed via `$derived(Date.now() - startedAt)`.
5. **Architectural decision from v3/v8/v9:** timer controls live in both Main and Widget. They share the same `$state`, so starting in either surface updates the other.
6. Tailwind classes identical, no rewrite. Copy the same `@theme` block into `src/app.css`.
7. The Fraunces `@font-face` declaration (or Google Fonts `<link>`) needs to move into the app shell.
8. The `@view-transition` API can replace the manual `transition` classes on `#popup` if desired.
9. **Calendar layout:** `.cal-heading` and `.cal-days` share seven equal columns and a 64px time gutter. `.cal-axis` shows explicit local times from `08:00` to `20:00` every two hours; `.cal-lines` draws subtle horizontal rules at those times. Column borders replace the repeating-gradient pattern. Both live and empty calendars use this geometry. `.cal-scroll` keeps the 620px minimum grid readable on narrow screens with horizontal scrolling. Session blocks retain `top: (startHour - 8) * 32px` and `height: durationHours * 32px`.

## Conventions

- Drag region simulated via `[data-tauri-drag-region] { cursor: move }` — Tauri behavior is native.
- Desktop backdrop behind the popup (`bg-paper` dot pattern) lets us judge translucency in-browser.
- All sample data is plausible freelancer work, not lorem.
- Color bar is decorative only — it carries no information, just reinforces the print metaphor.
- Crop marks and registration crosshairs are decorative too — they should remain even if a future surface doesn't need them, because the world owns them, not any single panel.