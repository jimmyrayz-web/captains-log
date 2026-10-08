import { createClient } from '@libsql/client';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In production, point TURSO_DATABASE_URL (+ TURSO_AUTH_TOKEN) at a free
// Turso database so data survives host restarts/redeploys. Without it,
// this falls back to a local SQLite file on disk, which is fine for
// local development but will NOT persist on hosts with ephemeral disks.
let url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  const dataDir = path.join(__dirname, '..', 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  url = `file:${path.join(dataDir, 'captains-log.db')}`;
}

export const db = createClient({ url, authToken });

await db.execute(`
  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    location TEXT,
    weather TEXT,
    engine_hours REAL,
    departure_point TEXT,
    departure_time TEXT,
    departure_fuel REAL,
    arrival_point TEXT,
    arrival_time TEXT,
    arrival_fuel REAL,
    fuel_consumed REAL,
    distance_nm REAL,
    duration_hours REAL,
    crew TEXT,
    fuel_added_gal REAL,
    gps_lat REAL,
    gps_lng REAL,
    oil_checked INTEGER NOT NULL DEFAULT 0,
    maintenance_notes TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Migration for databases created before newer columns existed:
// CREATE TABLE IF NOT EXISTS won't retrofit columns onto an already-
// existing table, so add any that are missing here.
const existingColumns = new Set(
  (await db.execute('PRAGMA table_info(entries)')).rows.map((row) => row.name)
);
const newColumns = [
  ['departure_time', 'TEXT'],
  ['arrival_time', 'TEXT'],
  ['departure_fuel', 'REAL'],
  ['arrival_fuel', 'REAL'],
  ['fuel_consumed', 'REAL'],
  ['gps_lat', 'REAL'],
  ['gps_lng', 'REAL'],
];
for (const [name, type] of newColumns) {
  if (!existingColumns.has(name)) {
    await db.execute(`ALTER TABLE entries ADD COLUMN ${name} ${type}`);
  }
}

await db.execute(`
  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    data BLOB NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

await db.execute('CREATE INDEX IF NOT EXISTS idx_photos_entry_id ON photos(entry_id)');
await db.execute('CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date)');
