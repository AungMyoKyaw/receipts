---
version: alpha
name: Receipts — Galley Proof
description: A print-shop proof of work, adapted from prototype v9.
colors:
  primary: "#0c0a07"
  ink-2: "#3d3a35"
  ink-3: "#5e5749"
  paper: "#f3eee2"
  paper-2: "#ebe5d3"
  paper-3: "#ddd5c0"
  rule: "#b8ad94"
  accent: "#c8201a"
  accent-2: "#8a1410"
  positive: "#1a5a35"
  destructive: "#9a1810"
typography:
  wordmark:
    fontFamily: "Fraunces Variable, Georgia, serif"
    fontSize: 30px
    fontWeight: 400
    lineHeight: 1
    letterSpacing: -0.03em
    fontVariation: '"opsz" 144'
  timer:
    fontFamily: "Fraunces Variable, Georgia, serif"
    fontSize: 46px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: -0.02em
    fontVariation: '"opsz" 144'
  micro:
    fontFamily: "JetBrains Mono Variable, monospace"
    fontSize: 9px
  label:
    fontFamily: "JetBrains Mono Variable, monospace"
    fontSize: 10px
    fontWeight: 600
    letterSpacing: 0.22em
  metadata:
    fontFamily: "JetBrains Mono Variable, monospace"
    fontSize: 11px
  detail:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: 12px
  body:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  dialog-title:
    fontFamily: "Fraunces Variable, Georgia, serif"
    fontSize: 24px
  main-timer:
    fontFamily: "Fraunces Variable, Georgia, serif"
    fontSize: 42px
  statistics:
    fontFamily: "Fraunces Variable, Georgia, serif"
    fontSize: 52px
  button:
    fontFamily: "Inter Variable, system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 600
rounded:
  field: 6px
  button: 8px
  popup: 12px
spacing:
  small: 8px
  gap: 12px
  popup-inset: 16px
  narrow-inset: 20px
  main-inset: 28px
components:
  button-start:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    rounded: "{rounded.button}"
    typography: "{typography.button}"
    padding: "10px 16px"
  button-stop:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.paper}"
    rounded: "{rounded.button}"
    typography: "{typography.button}"
    padding: "10px 16px"
  note:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.primary}"
    rounded: "{rounded.field}"
    padding: "8px 12px"
  popup:
    backgroundColor: "{colors.paper-2}"
    rounded: "{rounded.popup}"
    width: 320px
  tab-active:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.primary}"
  button-start-hover:
    backgroundColor: "{colors.ink-2}"
  button-stop-hover:
    backgroundColor: "{colors.accent-2}"
  tab-idle:
    textColor: "{colors.ink-3}"
  day-current:
    backgroundColor: "{colors.paper-3}"
  perforation:
    backgroundColor: "{colors.rule}"
  saved-duration:
    textColor: "{colors.positive}"
  error:
    textColor: "{colors.destructive}"
---

# Receipts design system

## Overview

**Creative North Star: "Galley Proof"**

The visual authority is `prototype/index.html` and its v9 README: a print-shop test sheet, not a financial dashboard. Receipts is a macOS menu-bar tool for a freelancer capturing work. Its two surfaces share paper, ink, display numerals, registration marks and direct controls.

**Key characteristics:** cream proof paper; carbon ink; proofing red; large serif time; compact measured labels; perforated rules; a stamped date.

## Colors

Primary is the ink used for text and Start. Paper is the field fill; paper-2 is the panel; paper-3 distinguishes the current calendar day. Rule separates rows and marks the calendar grid. Ink-2 carries supporting text and saved calendar blocks; ink-3 carries readable metadata.

Accent signals recording, Stop, selection and the wordmark's period. Accent-2 is the Stop hover state. Positive marks saved durations and save feedback. Destructive is reserved for errors. The popup's four-color strip is decorative, not a status key.

**The State Ink Rule.** Preserve the distinction between live red and saved green, with accompanying text rather than color alone.

## Typography

Fraunces carries the wordmark, timer and totals, with optical size 144. The main timer is 42px, the popup timer 46px and stats 52px (42px on narrow windows). Inter carries notes and controls. JetBrains Mono carries time stamps, IDs, measurements and uppercase labels. All three fonts ship locally; never require Google Fonts at runtime.

**The Three Roles Rule.** Do not replace the display face with the label face. All duration numerals use tabular figures.

## Layout

The 320px popup has a status/open-log row, full-width note, timer and Start/Stop, help disclosure, then the color strip. Its height follows content, including recoverable errors and expanded help. An empty note shows the Start requirement beside the field. The full window starts at 760×720 and keeps the native title bar. Main content uses a 28px inset, reduced to 20px below 560px. At that breakpoint, the timer moves above the note and action.

The week is Sunday-first and shares a 64px gutter plus seven equal columns between dates and blocks. Its grid has a 620px minimum width and horizontal keyboard scrolling on narrow windows, with a visible cue for remaining days. The 08:00–20:00 axis adapts between 144px and 384px high to keep its last label and legend visible in normal window sizes. Date headings, rules, blocks and the current-time indicator must use the same scale. Tiny windows may scroll vertically rather than remove content.

Off-hours recordings appear above the grid. Do not pretend an early-morning recording started at 08:00. Saved off-hours sessions remain available in the disclosure above the grid.

## Elevation & Depth

The native window manager supplies window shadows. The web content uses paper tones, thin rules and whitespace rather than stacked cards or added elevation. No simulated menu bar ships in the app.

## Shapes

Fields use the field radius; controls use the button radius; the popup uses the popup radius. The log's four crop marks and registration crosshair are geometry, not interactive controls. Perforations alternate dots and short lines. The bordered date stamp rotates −3°.

## Components

- **Timer controls:** identical behavior in both surfaces; empty notes disable Start and show the note requirement. Return or ⌘↵ submits the note form. Stop commits before displaying Saved; Undo remains available for five seconds.
- **Note:** editable while recording. Focus uses one accent border and a subtle 2px ring, not a second outer outline. Other keyboard targets retain a visible outline.
- **Tabs:** uppercase mono labels; selected paper background with a red underline. Left/Right, Home and End navigate.
- **Log:** time, duration, note, hexadecimal ID and Edit/Delete actions; date groups disambiguate earlier days. Edit exposes local start/end and note with Save/Cancel. Delete requires an explicit confirmation. A recording is a live row, not a saved duplicate.
- **Week:** explicit time labels, aligned columns, distinct recording blocks and a truthful current-time line only inside the displayed range.
- **Stats:** today and rolling seven days, with seven actual-height bars. Zero data has a real empty state.
- **Help:** a compact disclosure lists Return/⌘↵, tab navigation, popup toggle/dismiss, and saved-session recovery on both surfaces.
- **Motion:** the recording dot pulses over 1.4s; press feedback moves 0.5px over 80ms. State colors change immediately so background native webviews never retain a stale selected tab or Stop color. Reduced motion disables animation. Screen readers announce transitions, not every clock tick.

## Do's and Don'ts

- Do preserve the prototype's palette and three type roles.
- Do keep the lowercase wordmark and accent period.
- Do keep crop marks, crosshairs, perforations and the popup color strip.
- Do expose keyboard focus without doubling field outlines.
- Do keep off-hours recordings visible above the calendar.
- Do calculate time in the user's local timezone.
- Do let notes wrap in error/recovery messages.
- Don't seed production data with prototype examples.
- Don't add account, project or client selectors.
- Don't invent a dark theme or replace paper with a generic dashboard shell.
- Don't use a chart bar whose percentage parent has no height.
- Don't require a network connection to render typography.
