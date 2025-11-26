import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
// @ts-expect-error
import Database from 'better-sqlite3';

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
  const dbPath = path.join(process.cwd(), 'data', 'data.db');

  const agencies = readCsvRows<AgencyRow>(agenciesPath);
  const contacts = readCsvRows<ContactRow>(contactsPath);

  console.log(`Found ${agencies.length} agencies`);
  console.log(`Found ${contacts.length} contacts`);

  const db = new Database(dbPath);
  try {
    db.exec(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS agencies (
        id TEXT PRIMARY KEY,
        name TEXT,
        state TEXT,
        state_code TEXT,
        type TEXT,
        population TEXT,
        website TEXT,
        county TEXT,
        created_at TEXT,
        updated_at TEXT
      );

      CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        first_name TEXT,
        last_name TEXT,
        email TEXT,
        phone TEXT,
        title TEXT,
        email_type TEXT,
        contact_form_url TEXT,
        department TEXT,
        agency_name TEXT,
        created_at TEXT,
        updated_at TEXT,
        agency_id TEXT,
        firm_id TEXT,
        FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE SET NULL
      );
    `);

    const insertAgency = db.prepare(`
      INSERT INTO agencies (id, name, state, state_code, type, population, website, county, created_at, updated_at)
      VALUES (@id, @name, @state, @state_code, @type, @population, @website, @county, @created_at, @updated_at)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        state = excluded.state,
        state_code = excluded.state_code,
        type = excluded.type,
        population = excluded.population,
        website = excluded.website,
        county = excluded.county,
        updated_at = excluded.updated_at
    `);

    const insertContact = db.prepare(`
      INSERT INTO contacts (
        id, first_name, last_name, email, phone, title, email_type,
        contact_form_url, department, agency_name, created_at, updated_at, agency_id, firm_id
      ) VALUES (
        @id, @first_name, @last_name, @email, @phone, @title, @email_type,
        @contact_form_url, @department, @agency_name, @created_at, @updated_at, @agency_id, @firm_id
      )
      ON CONFLICT(id) DO UPDATE SET
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        email = excluded.email,
        phone = excluded.phone,
        title = excluded.title,
        email_type = excluded.email_type,
        contact_form_url = excluded.contact_form_url,
        department = excluded.department,
        agency_name = excluded.agency_name,
        updated_at = excluded.updated_at,
        agency_id = excluded.agency_id,
        firm_id = excluded.firm_id
    `);

    const insertAgenciesTxn = db.transaction((rows: AgencyRow[]) => {
      let inserted = 0;
      for (const r of rows) {
        const id = nullOrValue(r.id);
        if (!id) {
          console.warn(`Skipping agency with missing id: ${JSON.stringify(r).slice(0, 200)}`);
          continue;
        }
        insertAgency.run({
          id,
          name: nullOrValue(r.name),
          state: nullOrValue(r.state),
          state_code: nullOrValue(r.state_code),
          type: nullOrValue(r.type),
          population: nullOrValue(r.population),
          website: nullOrValue(r.website),
          county: nullOrValue(r.county),
          created_at: nullOrValue(r.created_at),
          updated_at: nullOrValue(r.updated_at),
        });
        inserted++;
      }
      return inserted;
    });

    const insertedAgencies = insertAgenciesTxn(agencies);
    console.log(`Agencies seeded (${insertedAgencies} rows)`);

    // Build a map of agency IDs to agency names and a set of valid IDs
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

    // Prepare contacts with validated agency references
    const preparedContacts = contacts.map((c) => {
      const aId = nullOrValue(c.agency_id) as string | null;
      // Only set agency_id if it exists in our valid set
      const validAgencyId = aId && validAgencyIds.has(aId) ? aId : null;
      const agencyName = validAgencyId && agencyMap.has(validAgencyId) ? agencyMap.get(validAgencyId) : null;

      return {
        ...c,
        agency_id: validAgencyId,
        agency_name: agencyName,
      };
    });

    const insertContactsTxn = db.transaction((rows: ContactRow[]) => {
      let inserted = 0;
      let skipped = 0;
      for (const c of rows) {
        const id = nullOrValue(c.id);
        if (!id) {
          skipped++;
          console.warn(`Skipping contact with missing id: ${JSON.stringify({ first_name: c.first_name, last_name: c.last_name, email: c.email })}`);
          continue;
        }
        insertContact.run({
          id,
          first_name: nullOrValue(c.first_name),
          last_name: nullOrValue(c.last_name),
          email: nullOrValue(c.email),
          phone: nullOrValue(c.phone),
          title: nullOrValue(c.title),
          email_type: nullOrValue(c.email_type),
          contact_form_url: nullOrValue(c.contact_form_url),
          department: nullOrValue(c.department),
          agency_name: nullOrValue(c.agency_name),
          created_at: nullOrValue(c.created_at),
          updated_at: nullOrValue(c.updated_at),
          agency_id: nullOrValue(c.agency_id),
          firm_id: nullOrValue(c.firm_id),
        });
        inserted++;
      }
      return { inserted, skipped };
    });

    const contactResult = insertContactsTxn(preparedContacts);
    console.log(`Contacts seeded (${contactResult.inserted} rows, ${contactResult.skipped} skipped)`);

    console.log('Database seed completed successfully!');
  } catch (err) {
    console.error('Seeding error:', err);
    process.exitCode = 1;
  } finally {
    try { db.close(); } catch {}
  }
}

seedDatabase();
