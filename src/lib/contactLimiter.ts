import { getDatabase } from './db';

const DAILY_CONTACT_LIMIT = 50;

interface ContactViewLog {
  user_id: string;
  date: string;
  count: number;
}

export function initializeContactLimitTable() {
  const db = getDatabase();
  db.exec(`
    CREATE TABLE IF NOT EXISTS contact_view_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      UNIQUE(user_id, date)
    );

    CREATE TABLE IF NOT EXISTS viewed_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      contact_id TEXT NOT NULL,
      date TEXT NOT NULL,
      UNIQUE(user_id, contact_id, date)
    );

    CREATE INDEX IF NOT EXISTS idx_contact_view_logs_user_date 
      ON contact_view_logs(user_id, date);

    CREATE INDEX IF NOT EXISTS idx_viewed_contacts_user_date 
      ON viewed_contacts(user_id, date);
  `);
}

export function getContactsViewedToday(userId: string): number {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];
  
  const stmt = db.prepare(
    'SELECT count FROM contact_view_logs WHERE user_id = ? AND date = ?'
  );
  const result = stmt.get(userId, today) as { count: number } | undefined;
  
  return result?.count ?? 0;
}

export function getRemainingContactsToday(userId: string): number {
  const viewed = getContactsViewedToday(userId);
  return Math.max(0, DAILY_CONTACT_LIMIT - viewed);
}

export function getAlreadyViewedContacts(userId: string): string[] {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];
  
  const stmt = db.prepare(
    'SELECT contact_id FROM viewed_contacts WHERE user_id = ? AND date = ?'
  );
  const results = stmt.all(userId, today) as { contact_id: string }[];
  
  return results.map(r => r.contact_id);
}

export function addViewedContacts(userId: string, contactIds: string[]): void {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];
  
  const stmt = db.prepare(
    'INSERT INTO viewed_contacts (user_id, contact_id, date) VALUES (?, ?, ?) ON CONFLICT DO NOTHING'
  );

  const insertMany = db.transaction((ids: string[]) => {
    for (const contactId of ids) {
      stmt.run(userId, contactId, today);
    }
  });

  insertMany(contactIds);
}

export function incrementContactViewCount(userId: string, count: number): boolean {
  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];
  const currentViewed = getContactsViewedToday(userId);
  const newTotal = currentViewed + count;

  if (newTotal > DAILY_CONTACT_LIMIT) {
    return false;
  }

  const stmt = db.prepare(`
    INSERT INTO contact_view_logs (user_id, date, count)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET
      count = count + ?
  `);

  stmt.run(userId, today, count, count);
  return true;
}

export function hasExceededDailyLimit(userId: string): boolean {
  return getContactsViewedToday(userId) >= DAILY_CONTACT_LIMIT;
}
