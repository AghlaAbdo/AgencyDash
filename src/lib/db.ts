// @ts-ignore
import Database from 'better-sqlite3';
import * as path from 'path';

let db: InstanceType<typeof Database> | null = null;

export function getDatabase() {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'database', 'data.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
  }
  return db;
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}
