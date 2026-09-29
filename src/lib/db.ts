import Database from "@tauri-apps/plugin-sql";

const DB_URL = "sqlite:receipts.db";

let dbPromise: Promise<Database> | null = null;

export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load(DB_URL).then(async (db) => {
      await migrate(db);
      return db;
    });
  }
  return dbPromise;
}

async function migrate(db: Database): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY);
  `);

  const rows = await db.select<{ version: number }[]>(
    "SELECT version FROM schema_version ORDER BY version DESC LIMIT 1",
  );
  const current = rows[0]?.version ?? 0;

  const MIGRATIONS: Array<(db: Database) => Promise<void>> = [
    async (db) => {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          started_at INTEGER NOT NULL,
          ended_at   INTEGER NOT NULL,
          duration_secs INTEGER NOT NULL,
          note TEXT NOT NULL
        );
      `);
      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_sessions_started_at
        ON sessions(started_at DESC);
      `);
    },
  ];

  for (let i = current; i < MIGRATIONS.length; i++) {
    await MIGRATIONS[i](db);
    await db.execute("INSERT INTO schema_version (version) VALUES ($1)", [i + 1]);
  }
}

export type Session = {
  id: number;
  started_at: number;
  ended_at: number;
  duration_secs: number;
  note: string;
};

export async function insertSession(s: Omit<Session, "id">): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO sessions (started_at, ended_at, duration_secs, note) VALUES ($1, $2, $3, $4)",
    [s.started_at, s.ended_at, s.duration_secs, s.note],
  );
}

export async function listSessions(limit = 100, offset = 0): Promise<Session[]> {
  const db = await getDb();
  return db.select<Session[]>(
    "SELECT * FROM sessions ORDER BY started_at DESC LIMIT $1 OFFSET $2",
    [limit, offset],
  );
}

export type Stats = {
  total_secs_today: number;
  total_secs_week: number;
  sessions_today: number;
  sessions_week: number;
  daily_secs: Array<{ day: string; secs: number }>;
};

export async function getStats(): Promise<Stats> {
  const db = await getDb();
  const nowSecs = Math.floor(Date.now() / 1000);
  const startOfToday = nowSecs - (nowSecs % 86400); // UTC midnight-ish; good enough for v1
  const startOfWeek = startOfToday - 6 * 86400;

  const todayRows = await db.select<{ total: number; count: number }[]>(
    "SELECT COALESCE(SUM(duration_secs), 0) AS total, COUNT(*) AS count FROM sessions WHERE started_at >= $1",
    [startOfToday * 1000],
  );
  const weekRows = await db.select<{ total: number; count: number }[]>(
    "SELECT COALESCE(SUM(duration_secs), 0) AS total, COUNT(*) AS count FROM sessions WHERE started_at >= $1",
    [startOfWeek * 1000],
  );

  const dailyRows = await db.select<{ day: string; secs: number }[]>(
    `SELECT
        strftime('%Y-%m-%d', started_at / 1000, 'unixepoch') AS day,
        COALESCE(SUM(duration_secs), 0) AS secs
     FROM sessions
     WHERE started_at >= $1
     GROUP BY day
     ORDER BY day ASC`,
    [startOfWeek * 1000],
  );

  return {
    total_secs_today: todayRows[0]?.total ?? 0,
    total_secs_week: weekRows[0]?.total ?? 0,
    sessions_today: todayRows[0]?.count ?? 0,
    sessions_week: weekRows[0]?.count ?? 0,
    daily_secs: dailyRows,
  };
}
