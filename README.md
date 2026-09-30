# receipts.

A local-first macOS menu-bar time tracker. The popup and log window share one durable timer. Visual reference: [`prototype/`](prototype/README.md). Design system: [`DESIGN.md`](DESIGN.md).

## Run

Requires macOS 13.3 or later (modern WebKit for Tailwind 4), Bun, Rust and the Xcode command-line tools.

```sh
bun install --frozen-lockfile
bun run tauri dev
```

Click the receipt icon in the menu bar to open the 320px timer. Enter a note, then press Return or Start. Stop saves the session; Undo remains available for five seconds. **Open log** shows the main window. Both windows can start, update the running note and stop the same timer. In Log, edit a saved session's note or local start/end times, or delete it after confirmation.

- Escape or clicking outside dismisses the popup.
- Closing the log hides it; recording continues. Quit from the tray menu to exit.
- `Cmd+Shift+Space` toggles the popup when that shortcut is available. macOS Siri or another application may intercept it; the tray icon remains the primary control.
- Log / Week / Stats support arrow keys, Home and End.
- Active timers and saved sessions survive restart. Time spent while the application is closed counts toward a running session.

For browser-only development:

```sh
bun run dev
```

Open `http://127.0.0.1:1420/`. The labeled browser preview stores separate data in `localStorage`; it does not access native SQLite. `/?surface=widget` previews the popup. Preview tabs synchronize using Web Locks and storage events. No sample data is inserted automatically.

## Architecture

- **Rust** owns SQLite writes and the timer state. `start_timer`, `set_note` and `stop_timer` return committed snapshots. Stopping inserts one session and clears the timer in the same transaction. Duplicate/stale commands cannot save another row or stop a newer timer.
- **SQL plugin** preloads `sqlite:receipts.db`. Rust uses its SQLx pool. Schema initialization is direct and idempotent; there is no migration framework or data reset.
- **Svelte 5** shares a rune-based controller within each webview; Tauri events synchronize the separate webviews. Revision numbers reject stale snapshots. The frontend never saves a session from an event handler.
- **Time calculations** use local calendar days, not fixed 24-hour offsets. Overnight sessions split across daily totals. Header/week view use Sunday-first calendar weeks; Stats uses the last seven local days.
- **Offline rendering** bundles Fraunces, Inter and JetBrains Mono with the application. Tailwind 4 generates CSS at build time.

Native database on macOS:

```text
~/Library/Application Support/com.aungmyokyaw.receipts/receipts.db
```

Keep the database and its SQLite WAL files together when making a live backup; quitting first avoids a partial copy. Browser preview data uses `receipts.preview.v1` and is unrelated to native data.

## Validate

```sh
bun run check
bun run test:timezones
bun run test:native
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
bun run build
```

Unit coverage includes concurrent stop, transaction rollback/retry, stale writes, database reopen, Unicode note limits, overnight sessions, Sunday boundaries, DST, calendar clipping and preview transitions. Time tests run under UTC, America/New_York and Asia/Yangon.

Native smoke check: start in the popup, verify the main window updates, quit/reopen while recording, stop from the main window, then quit/reopen again and verify exactly one saved session. Test with a separate application identifier if the normal database contains real work:

```sh
bun run tauri dev --config '{"identifier":"com.aungmyokyaw.receipts.smoketest"}'
```

## Standalone local app

```sh
make run
```

This builds and opens `src-tauri/target/debug/bundle/macos/Receipts.app` with the frontend embedded. It does not require Vite or port 1420. Use this for local testing without a development server.

For a release bundle, run `bun run tauri build`. Distribution signing and notarization are not configured.

### Blank development window

Do not launch a binary produced by `tauri dev` directly from `target/debug/receipts`: it loads the Vite `devUrl`, so stopping Vite leaves the webview blank. Start development with `bun run tauri dev`, which manages the server, or use `make run` for a self-contained app. Restart the development app after restoring an unavailable server.
