import { getDatabase } from './db';

const DAILY_CONTACT_LIMIT = 50;

export async function initializeContactLimitTable() {
  const db = await getDatabase();
  
  try {
    const collection = db.collection('contact_view_logs');
    await collection.createIndex({ user_id: 1, date: 1 }, { unique: true });
  } catch (error) {
    // Index might already exist
  }

  try {
    const viewedCollection = db.collection('viewed_contacts');
    await viewedCollection.createIndex({ user_id: 1, date: 1 });
    await viewedCollection.createIndex({ user_id: 1, contact_id: 1, date: 1 });
  } catch (error) {
    // Index might already exist
  }
}

export async function getContactsViewedToday(userId: string): Promise<number> {
  const db = await getDatabase();
  const today = new Date().toISOString().split('T')[0];
  
  const collection = db.collection('contact_view_logs');
  const result = await collection.findOne({ user_id: userId, date: today });
  
  return result?.count ?? 0;
}

export async function getRemainingContactsToday(userId: string): Promise<number> {
  const viewed = await getContactsViewedToday(userId);
  return Math.max(0, DAILY_CONTACT_LIMIT - viewed);
}

export async function getAlreadyViewedContacts(userId: string): Promise<Set<string>> {
  const db = await getDatabase();
  const today = new Date().toISOString().split('T')[0];
  
  const collection = db.collection('viewed_contacts');
  const results = await collection
    .find({ user_id: userId, date: today })
    .project({ contact_id: 1 })
    .toArray();
  
  return new Set(results.map((r: any) => r.contact_id));
}

export async function addViewedContacts(userId: string, contactIds: string[]): Promise<void> {
  const db = await getDatabase();
  const today = new Date().toISOString().split('T')[0];
  
  const collection = db.collection('viewed_contacts');
  
  const docs = contactIds.map(contactId => ({
    user_id: userId,
    contact_id: contactId,
    date: today,
  }));

  if (docs.length > 0) {
    await collection.insertMany(docs, { ordered: false }).catch(() => {
      // Ignore duplicate key errors
    });
  }
}

export async function incrementContactViewCount(userId: string, count: number): Promise<boolean> {
  const db = await getDatabase();
  const today = new Date().toISOString().split('T')[0];
  const currentViewed = await getContactsViewedToday(userId);
  const newTotal = currentViewed + count;

  if (newTotal > DAILY_CONTACT_LIMIT) {
    return false;
  }

  const collection = db.collection('contact_view_logs');
  await collection.updateOne(
    { user_id: userId, date: today },
    { $inc: { count: count } },
    { upsert: true }
  );

  return true;
}

export async function hasExceededDailyLimit(userId: string): Promise<boolean> {
  const viewed = await getContactsViewedToday(userId);
  return viewed >= DAILY_CONTACT_LIMIT;
}
