use serde::Serialize;
use sqlx::{FromRow, SqliteConnection, SqlitePool};
use tokio::sync::Mutex;

pub const DB_URL: &str = "sqlite:receipts.db";
pub const SCHEMA: &str = include_str!("../sql/schema.sql");

#[derive(Debug, Clone, Serialize, FromRow)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub id: i64,
    pub started_at: i64,
    pub ended_at: i64,
    pub duration_ms: i64,
    pub note: String,
}

#[derive(Debug, FromRow)]
struct TimerRow {
    started_at: Option<i64>,
    note: String,
    revision: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    pub revision: i64,
    pub running: bool,
    pub started_at: Option<i64>,
    pub note: String,
    pub sessions: Vec<Session>,
}

/// All native windows use this one command boundary. Writes and snapshots are
/// serialized, and the stop + insert transition commits as one transaction.
pub struct AppState {
    pool: SqlitePool,
    gate: Mutex<()>,
}

impl AppState {
    pub fn new(pool: SqlitePool) -> Self {
        Self {
            pool,
            gate: Mutex::new(()),
        }
    }

    pub async fn snapshot(&self) -> Result<Snapshot, String> {
        let _guard = self.gate.lock().await;
        let mut connection = self.pool.acquire().await.map_err(db_error)?;
        read_snapshot(&mut connection).await.map_err(db_error)
    }

    pub async fn start(&self, note: String, now: i64) -> Result<Snapshot, String> {
        let note = validate_note(&note, true)?;
        let _guard = self.gate.lock().await;
        let mut tx = self.pool.begin().await.map_err(db_error)?;
        let changed = sqlx::query("UPDATE timer_state SET started_at = ?, note = ?, revision = revision + 1 WHERE id = 1 AND started_at IS NULL")
            .bind(now).bind(note).execute(&mut *tx).await.map_err(db_error)?.rows_affected();
        if changed == 0 {
            return Err("A timer is already running. Stop it before starting another.".into());
        }
        let snapshot = read_snapshot(&mut tx).await.map_err(db_error)?;
        tx.commit().await.map_err(db_error)?;
        Ok(snapshot)
    }

    pub async fn set_note(
        &self,
        note: String,
        expected_start: Option<i64>,
    ) -> Result<Snapshot, String> {
        let note = validate_note(&note, expected_start.is_some())?;
        let _guard = self.gate.lock().await;
        let mut tx = self.pool.begin().await.map_err(db_error)?;
        let changed = sqlx::query("UPDATE timer_state SET note = ?, revision = revision + 1 WHERE id = 1 AND started_at IS ?")
            .bind(note).bind(expected_start).execute(&mut *tx).await.map_err(db_error)?.rows_affected();
        if changed == 0 {
            return Err("The timer changed in another window. Your note was not applied.".into());
        }
        let snapshot = read_snapshot(&mut tx).await.map_err(db_error)?;
        tx.commit().await.map_err(db_error)?;
        Ok(snapshot)
    }

    pub async fn stop(&self, expected_start: i64, now: i64) -> Result<Snapshot, String> {
        let _guard = self.gate.lock().await;
        let mut tx = self.pool.begin().await.map_err(db_error)?;
        let row = sqlx::query_as::<_, TimerRow>(
            "SELECT started_at, note, revision FROM timer_state WHERE id = 1",
        )
        .fetch_one(&mut *tx)
        .await
        .map_err(db_error)?;
        let started_at = row.started_at.ok_or("The timer has already stopped.")?;
        if expected_start != started_at {
            return Err("The timer changed in another window. Refresh before stopping it.".into());
        }
        let ended_at = now.max(started_at);
        sqlx::query(
            "INSERT INTO sessions (started_at, ended_at, duration_secs, note) VALUES (?, ?, ?, ?)",
        )
        .bind(started_at)
        .bind(ended_at)
        .bind((ended_at - started_at) / 1000)
        .bind(row.note)
        .execute(&mut *tx)
        .await
        .map_err(db_error)?;
        sqlx::query("UPDATE timer_state SET started_at = NULL, note = '', revision = revision + 1 WHERE id = 1")
            .execute(&mut *tx).await.map_err(db_error)?;
        let snapshot = read_snapshot(&mut tx).await.map_err(db_error)?;
        tx.commit().await.map_err(db_error)?;
        Ok(snapshot)
    }

    pub async fn started_at(&self) -> Result<Option<i64>, sqlx::Error> {
        sqlx::query_scalar("SELECT started_at FROM timer_state WHERE id = 1")
            .fetch_one(&self.pool)
            .await
    }
}

async fn read_snapshot(connection: &mut SqliteConnection) -> Result<Snapshot, sqlx::Error> {
    let timer = sqlx::query_as::<_, TimerRow>(
        "SELECT started_at, note, revision FROM timer_state WHERE id = 1",
    )
    .fetch_one(&mut *connection)
    .await?;
    let sessions = sqlx::query_as::<_, Session>("SELECT id, started_at, ended_at, MAX(0, ended_at - started_at) AS duration_ms, note FROM sessions ORDER BY started_at DESC, id DESC")
        .fetch_all(connection).await?;
    Ok(Snapshot {
        revision: timer.revision,
        running: timer.started_at.is_some(),
        started_at: timer.started_at,
        note: timer.note,
        sessions,
    })
}

fn validate_note(note: &str, required: bool) -> Result<String, String> {
    if note.encode_utf16().count() > 120 {
        return Err("Keep the note to 120 characters.".into());
    }
    if required && note.trim().is_empty() {
        return Err("Add a note before starting the timer.".into());
    }
    Ok(note.to_string())
}

fn db_error(error: sqlx::Error) -> String {
    format!("Could not save or read local data: {error}. Try again.")
}

pub fn unix_now_ms() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

pub fn format_hms(ms: i64) -> String {
    let seconds = ms.max(0) / 1000;
    format!(
        "{:02}:{:02}:{:02}",
        seconds / 3600,
        (seconds / 60) % 60,
        seconds % 60
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};

    async fn memory() -> AppState {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .unwrap();
        sqlx::raw_sql(SCHEMA).execute(&pool).await.unwrap();
        AppState::new(pool)
    }

    #[tokio::test]
    async fn start_edit_stop_is_durable_and_exactly_once() {
        let state = memory().await;
        assert!(state.snapshot().await.unwrap().sessions.is_empty());
        state.set_note("draft".into(), None).await.unwrap();
        let running = state.start("work".into(), 1000).await.unwrap();
        assert!(running.running);
        assert!(state.start("duplicate".into(), 2000).await.is_err());
        state.set_note("revised".into(), Some(1000)).await.unwrap();
        let (a, b) = tokio::join!(state.stop(1000, 3456), state.stop(1000, 3456));
        assert_ne!(a.is_ok(), b.is_ok());
        let saved = state.snapshot().await.unwrap();
        assert!(!saved.running);
        assert_eq!(saved.sessions.len(), 1);
        assert_eq!(saved.sessions[0].duration_ms, 2456);
        assert_eq!(saved.sessions[0].note, "revised");
        assert_eq!(saved.revision, 4);
    }

    #[tokio::test]
    async fn failed_stop_rolls_back_and_can_retry() {
        let state = memory().await;
        state.start("work".into(), 1000).await.unwrap();
        sqlx::raw_sql("CREATE TRIGGER fail_insert BEFORE INSERT ON sessions BEGIN SELECT RAISE(ABORT, 'disk failure'); END;")
            .execute(&state.pool).await.unwrap();
        assert!(state.stop(1000, 2000).await.is_err());
        assert!(state.snapshot().await.unwrap().running);
        sqlx::query("DROP TRIGGER fail_insert")
            .execute(&state.pool)
            .await
            .unwrap();
        assert_eq!(state.stop(1000, 3000).await.unwrap().sessions.len(), 1);
    }

    #[tokio::test]
    async fn stale_writes_cannot_change_a_new_timer() {
        let state = memory().await;
        state.start("first".into(), 1000).await.unwrap();
        state.stop(1000, 2000).await.unwrap();
        state.start("second".into(), 3000).await.unwrap();
        assert!(state.stop(1000, 4000).await.is_err());
        assert!(state.set_note("old edit".into(), Some(1000)).await.is_err());
        assert_eq!(state.snapshot().await.unwrap().note, "second");
    }

    #[tokio::test]
    async fn preserves_legacy_rows_and_recovers_after_reopen() {
        let path = std::env::temp_dir().join(format!(
            "receipts-test-{}-{}.db",
            std::process::id(),
            unix_now_ms()
        ));
        let options = SqliteConnectOptions::new()
            .filename(&path)
            .create_if_missing(true);
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(options.clone())
            .await
            .unwrap();
        sqlx::raw_sql("CREATE TABLE schema_version (version INTEGER PRIMARY KEY); INSERT INTO schema_version VALUES (1); CREATE TABLE sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, started_at INTEGER NOT NULL, ended_at INTEGER NOT NULL, duration_secs INTEGER NOT NULL, note TEXT NOT NULL); INSERT INTO sessions VALUES (9, 0, 60000, 60, 'legacy');").execute(&pool).await.unwrap();
        sqlx::raw_sql(SCHEMA).execute(&pool).await.unwrap();
        let state = AppState::new(pool.clone());
        state.start("survives quit".into(), 70000).await.unwrap();
        pool.close().await;
        let reopened = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(options)
            .await
            .unwrap();
        sqlx::raw_sql(SCHEMA).execute(&reopened).await.unwrap();
        let recovered = AppState::new(reopened.clone());
        let snapshot = recovered.snapshot().await.unwrap();
        assert_eq!(snapshot.started_at, Some(70000));
        assert_eq!(snapshot.sessions[0].id, 9);
        assert_eq!(snapshot.sessions[0].note, "legacy");
        assert_eq!(
            recovered.stop(70000, 130000).await.unwrap().sessions.len(),
            2
        );
        reopened.close().await;
        std::fs::remove_file(path).unwrap();
    }

    #[tokio::test]
    async fn validation_and_backward_clock() {
        let state = memory().await;
        assert!(state.start(" \n ".into(), 100).await.is_err());
        assert!(state.start("a".repeat(121), 100).await.is_err());
        assert!(state.start("😀".repeat(61), 100).await.is_err());
        state.start("work".into(), 1000).await.unwrap();
        let stopped = state.stop(1000, 500).await.unwrap();
        assert_eq!(stopped.sessions[0].duration_ms, 0);
        assert_eq!(format_hms(-1), "00:00:00");
        assert_eq!(format_hms(360_001_000), "100:00:01");
    }
}
