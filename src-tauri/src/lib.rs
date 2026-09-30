mod state;

use state::{AppState, Snapshot, DB_URL};
use std::time::Duration;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder, WindowEvent};
use tauri_plugin_positioner::{Position, WindowExt};

const WIDGET: &str = "widget";
const MAIN: &str = "main";
const TRAY: &str = "receipts";

fn publish(app: &AppHandle, snapshot: &Snapshot) {
    update_tray(app, snapshot.started_at);
    if let Err(error) = app.emit("receipts:changed", snapshot) {
        eprintln!("Could not notify windows: {error}");
    }
}

#[tauri::command]
async fn get_snapshot(state: State<'_, AppState>) -> Result<Snapshot, String> {
    state.snapshot().await
}

#[tauri::command]
async fn start_timer(
    note: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Snapshot, String> {
    let snapshot = state.start(note, state::unix_now_ms()).await?;
    publish(&app, &snapshot);
    Ok(snapshot)
}

#[tauri::command]
async fn stop_timer(
    started_at: i64,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Snapshot, String> {
    let snapshot = state.stop(started_at, state::unix_now_ms()).await?;
    publish(&app, &snapshot);
    Ok(snapshot)
}

#[tauri::command]
async fn set_note(
    note: String,
    started_at: Option<i64>,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Snapshot, String> {
    let snapshot = state.set_note(note, started_at).await?;
    publish(&app, &snapshot);
    Ok(snapshot)
}

#[tauri::command]
async fn update_session(
    expected: state::Session,
    started_at: i64,
    ended_at: i64,
    note: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Snapshot, String> {
    let snapshot = state
        .update_session(expected, started_at, ended_at, note)
        .await?;
    publish(&app, &snapshot);
    Ok(snapshot)
}

#[tauri::command]
async fn delete_session(
    expected: state::Session,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<Snapshot, String> {
    let snapshot = state.delete_session(expected).await?;
    publish(&app, &snapshot);
    Ok(snapshot)
}

#[tauri::command]
fn hide_widget(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(WIDGET) {
        window.hide().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn show_main(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window(MAIN) {
        window.unminimize().map_err(|e| e.to_string())?;
        window.show().map_err(|e| e.to_string())?;
        window.set_focus().map_err(|e| e.to_string())?;
    }
    hide_widget(app)
}

fn toggle_widget(app: &AppHandle) -> Result<(), tauri::Error> {
    if let Some(window) = app.get_webview_window(WIDGET) {
        if window.is_visible()? {
            window.hide()?;
        } else {
            // Positioner receives tray events before this call. TopRight is a
            // useful fallback when the keyboard shortcut is used before a click.
            if window.move_window(Position::TrayBottomCenter).is_err() {
                let _ = window.move_window(Position::TopRight);
            }
            window.show()?;
            window.set_focus()?;
        }
    }
    Ok(())
}

fn update_tray(app: &AppHandle, started_at: Option<i64>) {
    if let Some(tray) = app.tray_by_id(TRAY) {
        let title = started_at.map(|start| state::format_hms(state::unix_now_ms() - start));
        let _ = tray.set_title(title.as_deref());
        let tooltip = if started_at.is_some() {
            "Receipts — recording"
        } else {
            "Receipts — start a session"
        };
        let _ = tray.set_tooltip(Some(tooltip));
    }
}

/// A monochrome receipt glyph for macOS template rendering. The shape
/// mirrors the bundle icon (a slim paper timecard with a stamped proofing
/// dot at the top-right) but is reduced to alpha so macOS can re-tint it
/// for light and dark menu bars.
fn tray_image() -> tauri::image::Image<'static> {
    // 44x44 (Retina template size). Generated glyph: receipt outline with
    // three perforation rows and a single record dot.
    const W: usize = 44;
    const H: usize = 44;
    let mut rgba = vec![0_u8; W * H * 4];

    // Receipt card body — rounded rectangle inset from the edges.
    let x0 = 8_usize;
    let x1 = 35_usize;
    let y0 = 6_usize;
    let y1 = 38_usize;
    let r = 3_usize;

    let mut fill = |x: usize, y: usize, a: u8| {
        rgba[(y * W + x) * 4 + 3] = a;
    };

    // Card outline + corner radius. Trace the rectangle perimeter only —
    // the interior is left transparent so the glyph stays legible at small
    // sizes in light and dark menu bars.
    for y in y0..=y1 {
        for x in x0..=x1 {
            let on_edge = x == x0 || x == x1 || y == y0 || y == y1;
            let on_corner = (x == x0 || x == x1) && (y < y0 + r || y > y1 - r)
                || (y == y0 || y == y1) && (x < x0 + r || x > x1 - r);
            if on_edge && !on_corner {
                fill(x, y, 255);
            }
            let corner_radius = (x as i32 - x0 as i32).pow(2) + (y as i32 - y0 as i32).pow(2)
                <= (r as i32).pow(2)
                || (x as i32 - x1 as i32).pow(2) + (y as i32 - y0 as i32).pow(2)
                    <= (r as i32).pow(2)
                || (x as i32 - x0 as i32).pow(2) + (y as i32 - y1 as i32).pow(2)
                    <= (r as i32).pow(2)
                || (x as i32 - x1 as i32).pow(2) + (y as i32 - y1 as i32).pow(2)
                    <= (r as i32).pow(2);
            if corner_radius && (x == x0 || x == x1 || y == y0 || y == y1) {
                fill(x, y, 255);
            }
        }
    }

    // Inner content lines (note rows).
    for &(y, x_start, x_end) in &[(15_usize, 12_usize, 31_usize), (20, 12, 28), (25, 12, 30)] {
        for x in x_start..=x_end {
            fill(x, y, 255);
        }
    }

    // Perforated bottom edge — alternating dashes.
    for x in (x0 + 1..x1).step_by(2) {
        fill(x, y1 + 2, 255);
    }

    // Recording dot — sits top-right, fully opaque so macOS keeps it
    // prominent when the template is tinted to black or white.
    for y in 30..36 {
        for x in 30..36 {
            let dx = x as i32 - 32;
            let dy = y as i32 - 32;
            if dx * dx + dy * dy <= 3 * 3 {
                fill(x, y, 255);
            }
        }
    }

    tauri::image::Image::new_owned(rgba, W as u32, H as u32)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_positioner::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _, event| {
                    if event.state() == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        if let Err(error) = toggle_widget(app) {
                            eprintln!("Could not open popup: {error}");
                        }
                    }
                })
                .build(),
        )
        .setup(|app| {
            let pool = tauri::async_runtime::block_on(async {
                let instances = app.state::<tauri_plugin_sql::DbInstances>();
                let pools = instances.0.read().await;
                match pools.get(DB_URL) {
                    Some(tauri_plugin_sql::DbPool::Sqlite(pool)) => Ok(pool.clone()),
                    _ => Err("Receipts database was not preloaded"),
                }
            })?;
            tauri::async_runtime::block_on(sqlx::raw_sql(state::SCHEMA).execute(&pool))?;
            app.manage(AppState::new(pool));

            WebviewWindowBuilder::new(app, WIDGET, WebviewUrl::App("/?surface=widget".into()))
                .title("Receipts — timer")
                .inner_size(320.0, 176.0)
                .resizable(false)
                .decorations(false)
                .transparent(true)
                .always_on_top(true)
                .skip_taskbar(true)
                .focused(false)
                .visible(false)
                .build()?;

            let toggle = MenuItem::with_id(app, "toggle", "Show / Hide Timer", true, None::<&str>)?;
            let log = MenuItem::with_id(app, "log", "Open Log", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit Receipts", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&toggle, &log, &quit])?;
            TrayIconBuilder::with_id(TRAY)
                .icon(tray_image())
                .icon_as_template(true)
                .tooltip("Receipts — start a session")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "toggle" => {
                        let _ = toggle_widget(app);
                    }
                    "log" => {
                        let _ = show_main(app.clone());
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    tauri_plugin_positioner::on_tray_event(tray.app_handle(), &event);
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let _ = toggle_widget(tray.app_handle());
                    }
                })
                .build(app)?;

            use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut};
            let shortcut = Shortcut::new(Some(Modifiers::SUPER | Modifiers::SHIFT), Code::Space);
            if let Err(error) = app.global_shortcut().register(shortcut) {
                eprintln!("Shortcut unavailable; use the menu-bar icon: {error}");
            }

            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let mut interval = tokio::time::interval(Duration::from_secs(1));
                loop {
                    interval.tick().await;
                    let state = handle.state::<AppState>();
                    match state.started_at().await {
                        Ok(started_at) => update_tray(&handle, started_at),
                        Err(error) => eprintln!("Could not read timer: {error}"),
                    }
                }
            });
            Ok(())
        })
        .on_window_event(|window, event| match event {
            WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                let _ = window.hide();
            }
            WindowEvent::Focused(false) if window.label() == WIDGET => {
                let _ = window.hide();
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            get_snapshot,
            start_timer,
            stop_timer,
            set_note,
            update_session,
            delete_session,
            hide_widget,
            show_main
        ])
        .run(tauri::generate_context!())
        .expect("Could not launch Receipts");
}
