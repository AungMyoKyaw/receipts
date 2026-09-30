# Product

<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
SvelteKit 2 + Svelte 5 + TypeScript + Tailwind 4 bundled via Vite, shipped as a Tauri 2 desktop app for macOS. The prototype (`prototype/index.html`) is a single-file HTML + Tailwind CDN reference for the Svelte port — markup is lifted verbatim, JS state becomes `$state`.

## Users
A single freelancer (developer, designer, or writer) who bills clients by the hour and tracks work in sessions. Lives on a Mac, spends most of the day in the menu bar. Values capture speed and a glanceable weekly picture more than analytics depth.

## Product Purpose
Capture billable work sessions the moment they start and stop, without breaking focus. The product exists to make "what did I do today and how much of it counts" a one-look answer.

Success: a session is captured in under three seconds from the menu bar, the week total is legible at a glance, and nothing is lost when the app reopens.

## Positioning
A single-purpose menu-bar time tracker with one primary surface (the popup) and a secondary surface (the log). Unlike web-first trackers (Toggl, Harvest, Clockify), the popup is the entire product — no project picker, no client dropdown, no timer list to triage. The note field carries the meaning. State persists across reload so a crash or quit never loses a running session.

## Operating Context
Runs as a menu-bar app on macOS. The popup is invoked by clicking the menu-bar icon. The main window opens via the popup's "open log" link and lives as a regular Tauri window. Sessions are stored locally (SQLite via Tauri, `localStorage` in the prototype). Background clock ticks survive reload because timer state is `{ startedAt, note }` and elapsed is computed on read.

## Capabilities and Constraints
- Single running session at a time. A duplicate Start is rejected; Stop commits the active session before another can begin. The last stop can be undone for five seconds.
- Saved sessions can be edited or deleted from the log. Deletion requires confirmation; edits validate local start/end times and note length.
- Session shape: `{ id, startedAt, endedAt, durationMs, note }`.
- Live stats recompute from sessions + currently-running session.
- Popup and main window share committed Rust snapshots via Tauri events. Each webview has one Svelte rune-based controller; revision numbers reject stale responses.
- Reload must not interrupt a running timer.
- No accounts, no sync, no multi-device, no projects/clients/tags in v1.
- Tauri 2 + macOS only for now; the prototype runs in any modern browser.

## Brand Commitments
- Name: **receipts** (lowercase). The metaphor is the printed slip you hand a client — a stamped proof of work, not a financial receipt.
- Voice: terse, technical, print-shop. Avoid marketing words ("beautiful", "powerful", "intuitive"). Use units and labels a printer would set.
- Wordmark: `receipts` set in the display face with an accent period (`.`) — the period is the only mark.
- Assets: none supplied. All visuals are drawn from the product world.

## Evidence on Hand
- `prototype/index.html` — single-file HTML prototype, visual reference for the Svelte port
- `prototype/README.md` — porting notes, palette and typography documentation
- No production data, no customer assets, no marketing copy.

## Product Principles
1. **One tap to capture.** The popup is the product. Any flow longer than three taps is a bug.
2. **The note carries the work.** No project pickers, no client selectors. The free-text note is the only label.
3. **State survives everything.** A running timer is never lost. Reload, quit, crash — it keeps ticking.
4. **Read totals at a glance.** Today and week totals are always one screen away, never deeper.
5. **Print, don't paint.** Visual decisions belong to a print-shop aesthetic, not a SaaS template.

## Accessibility & Inclusion
- All controls reachable via keyboard; popup traps focus while open and dismisses on Escape.
- Time numerals use tabular figures; contrast ratio ≥4.5:1 on body and UI labels.
- Live regions announce start/stop and stats changes to screen readers.
- `prefers-reduced-motion` honored for the pulse-dot animation.