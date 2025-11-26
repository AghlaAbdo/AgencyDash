import { MongoClient, Db } from 'mongodb';

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDatabase() {
  if (db) {
    return db;
  }

  const mongoUrl = process.env.MONGODB_URI;
  if (!mongoUrl) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  try {
    client = new MongoClient(mongoUrl);
    await client.connect();
    db = client.db('agency_contacts');
    
    // Create indexes
    await db.collection('agencies').createIndex({ id: 1 });
    await db.collection('contacts').createIndex({ id: 1 });
    await db.collection('contacts').createIndex({ agency_id: 1 });
    
    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function closeDatabase() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}
