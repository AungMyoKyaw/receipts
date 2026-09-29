use std::sync::Mutex;
use std::time::Instant;

use serde::Serialize;
use tauri::async_runtime::JoinHandle;

/// Active timer state held by Rust as the single source of truth.
pub struct TimerState {
    pub started_at: Instant,
    pub note: String,
}

/// Frontend-facing snapshot of current timer state.
#[derive(Serialize, Clone)]
pub struct TimerSnapshot {
    pub running: bool,
    pub elapsed_secs: u64,
    pub note: String,
}

/// Returned from `stop_timer` so the frontend can persist the row.
#[derive(Serialize, Clone)]
pub struct StoppedSession {
    pub started_unix_ms: i64,
    pub ended_unix_ms: i64,
    pub duration_secs: i64,
    pub note: String,
}

/// Top-level app state managed by Tauri.
pub struct AppState {
    pub timer: Mutex<Option<TimerState>>,
    pub tick_handle: Mutex<Option<JoinHandle<()>>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            timer: Mutex::new(None),
            tick_handle: Mutex::new(None),
        }
    }
}

/// Format seconds as `HH:MM:SS`. Negative or zero values yield `00:00:00`.
pub fn format_hms(total_secs: u64) -> String {
    let h = total_secs / 3600;
    let m = (total_secs % 3600) / 60;
    let s = total_secs % 60;
    format!("{:02}:{:02}:{:02}", h, m, s)
}

/// Unix milliseconds at the given Instant, derived from system time at call time.
/// Used to record wall-clock start/end alongside the monotonic Instant.
pub fn unix_now_ms() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}
