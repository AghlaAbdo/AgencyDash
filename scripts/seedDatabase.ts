import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

interface AgencyRow {
  id?: string;
  name?: string;
  state?: string;
  state_code?: string;
  type?: string;
  population?: string;
  website?: string;
  county?: string;
  created_at?: string;
  updated_at?: string;
}

interface ContactRow {
  id?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  title?: string;
  email_type?: string;
  contact_form_url?: string;
  department?: string;
  created_at?: string;
  updated_at?: string;
  agency_id?: string;
  agency_name?: string;
  firm_id?: string;
}

function nullOrValue(s: unknown) {
  if (s === undefined || s === null) return null;
  const trimmed = String(s).trim();
  return trimmed === '' ? null : trimmed;
}

function readCsvRows<T = any>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) {
    console.warn(`CSV not found: ${filePath}`);
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8').trim();
  if (content === '') {
    console.warn(`CSV is empty: ${filePath}`);
    return [];
  }
  return parse(content, { columns: true, skip_empty_lines: true }) as T[];
}

async function seedDatabase() {
  console.log('Starting database seed...');

  const agenciesPath = path.join(process.cwd(), 'data', 'agencies_agency_rows.csv');
  const contactsPath = path.join(process.cwd(), 'data', 'contacts_contact_rows.csv');

  const agencies = readCsvRows<AgencyRow>(agenciesPath);
  const contacts = readCsvRows<ContactRow>(contactsPath);

  console.log(`Found ${agencies.length} agencies`);
  console.log(`Found ${contacts.length} contacts`);

  const mongoUrl = process.env.MONGODB_URI;
  if (!mongoUrl) {
    throw new Error('MONGODB_URI environment variable is not set. Please add it to .env.local');
  }

  const client = new MongoClient(mongoUrl);

  try {
    await client.connect();
    const db = client.db('agency_contacts');

    // Drop existing collections
    try {
      await db.collection('agencies').drop();
      await db.collection('contacts').drop();
    } catch (err) {
      // Collections might not exist yet
    }

    const agenciesCollection = db.collection('agencies');
    const contactsCollection = db.collection('contacts');

    // Build a map of agency IDs to agency names
    const agencyMap = new Map<string, string>();
    const validAgencyIds = new Set<string>();

    for (const a of agencies) {
      const id = nullOrValue(a.id) as string | null;
      const name = nullOrValue(a.name) as string | null;
      if (id && name) {
        agencyMap.set(id, name);
        validAgencyIds.add(id);
      }
    }

    // Insert agencies
    const agencyDocs = agencies
      .map((a) => {
        const id = nullOrValue(a.id);
        if (!id) return null;

        return {
          id,
          name: nullOrValue(a.name),
          state: nullOrValue(a.state),
          state_code: nullOrValue(a.state_code),
          type: nullOrValue(a.type),
          population: nullOrValue(a.population),
          website: nullOrValue(a.website),
          county: nullOrValue(a.county),
          created_at: nullOrValue(a.created_at),
          updated_at: nullOrValue(a.updated_at),
        };
      })
      .filter((doc) => doc !== null);

    if (agencyDocs.length > 0) {
      await agenciesCollection.insertMany(agencyDocs);
      console.log(`Agencies seeded (${agencyDocs.length} rows)`);
    }

    // Prepare and insert contacts
    const contactDocs = contacts
      .map((c) => {
        const id = nullOrValue(c.id);
        if (!id) return null;

        const aId = nullOrValue(c.agency_id) as string | null;
        const validAgencyId = aId && validAgencyIds.has(aId) ? aId : null;
        const agencyName = validAgencyId && agencyMap.has(validAgencyId) ? agencyMap.get(validAgencyId) : null;

        return {
          id,
          first_name: nullOrValue(c.first_name),
          last_name: nullOrValue(c.last_name),
          email: nullOrValue(c.email),
          phone: nullOrValue(c.phone),
          title: nullOrValue(c.title),
          email_type: nullOrValue(c.email_type),
          contact_form_url: nullOrValue(c.contact_form_url),
          department: nullOrValue(c.department),
          agency_name: agencyName,
          created_at: nullOrValue(c.created_at),
          updated_at: nullOrValue(c.updated_at),
          agency_id: validAgencyId,
          firm_id: nullOrValue(c.firm_id),
        };
      })
      .filter((doc) => doc !== null);

    if (contactDocs.length > 0) {
      await contactsCollection.insertMany(contactDocs);
      console.log(`Contacts seeded (${contactDocs.length} rows)`);
    }

    // Create indexes
    await agenciesCollection.createIndex({ id: 1 });
    await contactsCollection.createIndex({ id: 1 });
    await contactsCollection.createIndex({ agency_id: 1 });

    console.log('Database seed completed successfully!');
  } catch (err) {
    console.error('Seeding error:', err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

seedDatabase();
