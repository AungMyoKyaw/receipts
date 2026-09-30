CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at INTEGER NOT NULL,
    ended_at INTEGER NOT NULL,
    duration_secs INTEGER NOT NULL,
    note TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at DESC);

CREATE TABLE IF NOT EXISTS timer_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    started_at INTEGER,
    note TEXT NOT NULL DEFAULT '',
    revision INTEGER NOT NULL DEFAULT 0
);
INSERT OR IGNORE INTO timer_state (id) VALUES (1);
