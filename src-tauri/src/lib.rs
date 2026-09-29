// Receipts — a personal stopwatch for self-audit.
//
// Architecture:
// - Rust owns timer state (single source of truth, monotonic Instant).
// - Frontend (any window) is a dumb display subscribed to `timer-tick` events.
// - On stop, Rust returns the StoppedSession; frontend persists to SQLite via plugin-sql.

mod state;

use std::time::Duration;

use serde::Serialize;
use tauri::async_runtime::JoinHandle;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder};

use state::{format_hms, AppState, StoppedSession, TimerSnapshot};

const WIDGET_LABEL: &str = "widget";
const MAIN_LABEL: &str = "main";
const TRAY_ID: &str = "main";

// ---------------------------------------------------------------------------
// Tick loop
// ---------------------------------------------------------------------------

fn spawn_tick_task(app: AppHandle) -> JoinHandle<()> {
    tauri::async_runtime::spawn(async move {
        // First tick fires immediately; skip it so elapsed reads 00:00:00 once.
        let mut interval = tokio::time::interval(Duration::from_secs(1));
        interval.tick().await;

        loop {
            interval.tick().await;

            let state = app.state::<AppState>();
            let elapsed_secs = {
                let guard = state.timer.lock().unwrap();
                match guard.as_ref() {
                    Some(t) => t.started_at.elapsed().as_secs(),
                    None => break, // timer was cleared; exit loop
                }
            };

            let _ = app.emit("timer-tick", TickPayload { elapsed_secs });
            update_tray_title(&app, elapsed_secs);
        }

        // Loop exited: timer was cleared. Clear tray title.
        if let Some(tray) = app.tray_by_id(TRAY_ID) {
            let _ = tray.set_title(Option::<String>::None);
        }
    })
}

#[derive(Serialize, Clone)]
struct TickPayload {
    elapsed_secs: u64,
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

#[tauri::command]
fn get_timer_state(state: State<'_, AppState>) -> TimerSnapshot {
    let guard = state.timer.lock().unwrap();
    match guard.as_ref() {
        Some(t) => TimerSnapshot {
            running: true,
            elapsed_secs: t.started_at.elapsed().as_secs(),
            note: t.note.clone(),
        },
        None => TimerSnapshot {
            running: false,
            elapsed_secs: 0,
            note: String::new(),
        },
    }
}

#[tauri::command]
fn start_timer(note: String, app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    let trimmed = note.trim();
    if trimmed.is_empty() {
        return Err("note is required".into());
    }
    if trimmed.chars().count() > 120 {
        return Err("note too long (max 120 chars)".into());
    }

    {
        let mut guard = state.timer.lock().unwrap();
        if guard.is_some() {
            return Err("timer already running".into());
        }
        *guard = Some(state::TimerState {
            started_at: std::time::Instant::now(),
            note: trimmed.to_string(),
        });
    }

    // Spawn the tick task (replaces any previous handle).
    if let Some(prev) = state.tick_handle.lock().unwrap().take() {
        prev.abort();
    }
    let handle = spawn_tick_task(app.clone());
    *state.tick_handle.lock().unwrap() = Some(handle);

    // Show the widget window.
    if let Some(w) = app.get_webview_window(WIDGET_LABEL) {
        let _ = w.show();
    }

    // Set initial tray title.
    update_tray_title(&app, 0);

    let _ = app.emit(
        "timer-started",
        serde_json::json!({ "note": trimmed }),
    );

    Ok(())
}

#[tauri::command]
fn stop_timer(app: AppHandle, state: State<'_, AppState>) -> Result<StoppedSession, String> {
    let session = {
        let mut guard = state.timer.lock().unwrap();
        let t = guard.take().ok_or_else(|| "timer not running".to_string())?;
        let duration_secs = t.started_at.elapsed().as_secs() as i64;
        StoppedSession {
            started_unix_ms: state::unix_now_ms() - (duration_secs * 1000),
            ended_unix_ms: state::unix_now_ms(),
            duration_secs,
            note: t.note,
        }
    };

    // Abort the tick task.
    if let Some(h) = state.tick_handle.lock().unwrap().take() {
        h.abort();
    }

    // Hide widget, clear tray title.
    if let Some(w) = app.get_webview_window(WIDGET_LABEL) {
        let _ = w.hide();
    }
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        let _ = tray.set_title(Option::<String>::None);
    }

    let _ = app.emit("timer-stopped", &session);
    Ok(session)
}

#[tauri::command]
fn show_widget(app: AppHandle) {
    if let Some(w) = app.get_webview_window(WIDGET_LABEL) {
        let _ = w.show();
    }
}

#[tauri::command]
fn hide_widget(app: AppHandle) {
    if let Some(w) = app.get_webview_window(WIDGET_LABEL) {
        let _ = w.hide();
    }
}

#[tauri::command]
fn toggle_widget(app: AppHandle) {
    if let Some(w) = app.get_webview_window(WIDGET_LABEL) {
        match w.is_visible() {
            Ok(true) => {
                let _ = w.hide();
            }
            _ => {
                let _ = w.show();
            }
        }
    }
}

#[tauri::command]
fn show_main(app: AppHandle) {
    if let Some(w) = app.get_webview_window(MAIN_LABEL) {
        let _ = w.show();
        let _ = w.unminimize();
        let _ = w.set_focus();
    }
}

// ---------------------------------------------------------------------------
// Tray helpers
// ---------------------------------------------------------------------------

fn update_tray_title(app: &AppHandle, elapsed_secs: u64) {
    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        let title = format_hms(elapsed_secs);
        let _ = tray.set_title(Some(title.as_str()));
    }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_positioner::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    use tauri_plugin_global_shortcut::{ShortcutState, Shortcut};
                    let target = Shortcut::new(
                        Some(tauri_plugin_global_shortcut::Modifiers::SUPER | tauri_plugin_global_shortcut::Modifiers::SHIFT),
                        tauri_plugin_global_shortcut::Code::Space,
                    );
                    if event.state() == ShortcutState::Pressed && shortcut == &target {
                        let app = app.clone();
                        tauri::async_runtime::spawn(async move {
                            toggle_widget(app);
                        });
                    }
                })
                .build(),
        )
        .manage(AppState::new())
        .setup(|app| {
            // -- Register global shortcut --
            use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};
            let shortcut = Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::Space);
            let _ = app.global_shortcut().register(shortcut);

            // -- Build widget window (frameless, transparent, always-on-top) --
            let widget = WebviewWindowBuilder::new(app, WIDGET_LABEL, WebviewUrl::App("/".into()))
                .title("Receipts")
                .inner_size(220.0, 120.0)
                .min_inner_size(220.0, 120.0)
                .resizable(false)
                .decorations(false)
                .transparent(true)
                .always_on_top(true)
                .skip_taskbar(true)
                .focused(false)
                .visible(false)
                .build()?;
            let _ = widget;

            // -- Build tray icon with menu --
            let toggle_i = MenuItem::with_id(app, "toggle", "Show / Hide Widget", true, None::<&str>)?;
            let show_main_i = MenuItem::with_id(app, "show_main", "Open Log", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&toggle_i, &show_main_i, &quit_i])?;

            let _tray = TrayIconBuilder::with_id(TRAY_ID)
                .icon(app.default_window_icon().cloned().unwrap())
                .tooltip("Receipts")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "toggle" => {
                        toggle_widget(app.clone());
                    }
                    "show_main" => {
                        show_main(app.clone());
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_widget(tray.app_handle().clone());
                    }
                })
                .build(app)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_timer_state,
            start_timer,
            stop_timer,
            show_widget,
            hide_widget,
            toggle_widget,
            show_main,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
