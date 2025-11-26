import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { 
  getContactsViewedToday, 
  getRemainingContactsToday,
  incrementContactViewCount,
  hasExceededDailyLimit,
  initializeContactLimitTable,
  addViewedContacts,
  getAlreadyViewedContacts
} from '@/lib/contactLimiter';
import { auth } from '@clerk/nextjs/server';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Initialize contact limit table on first request
    initializeContactLimitTable();

    const searchParams = request.nextUrl.searchParams;

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const agencyName = searchParams.get('agencyName');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'last_name';
    const sortOrder = (searchParams.get('sortOrder') || 'asc').toLowerCase();

    // Validate pagination
    const skip = (page - 1) * limit;
    if (page < 1 || limit < 1 || limit > 50) {
      return NextResponse.json(
        {
          error: 'Invalid pagination parameters. Page and limit must be >= 1, limit <= 50',
        },
        { status: 400 }
      );
    }

    const validSortFields = [
      'first_name',
      'last_name',
      'email',
      'phone',
      'title',
      'created_at',
    ];
    const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'last_name';
    const finalSortOrder = sortOrder === 'desc' ? 'DESC' : 'ASC';

    const db = getDatabase();

    let whereClause = '1=1';
    const params: any[] = [];

    if (agencyName) {
      whereClause += ' AND LOWER(agency_name) LIKE LOWER(?)';
      params.push(`%${agencyName}%`);
    }

    if (search) {
      whereClause += ` AND (LOWER(first_name) LIKE LOWER(?) OR LOWER(last_name) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?))`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm);
      params.push(searchTerm);
      params.push(searchTerm);
    }

    const countQuery = `SELECT COUNT(*) as count FROM contacts WHERE ${whereClause}`;
    const countStmt = db.prepare(countQuery);
    const countResult = countStmt.get(...params) as { count: number };
    const total = countResult.count;

    const hasExceeded = hasExceededDailyLimit(userId);

    if (hasExceeded) {
      const viewedToday = getContactsViewedToday(userId);
      return NextResponse.json(
        {
          success: false,
          limitExceeded: true,
          viewedToday,
          remaining: 0,
          data: [],
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNextPage: false,
            hasPreviousPage: page > 1,
          },
          message: 'You have reached your daily limit of 50 contacts. Upgrade your plan to view more.',
        },
        { status: 200 }
      );
    }

    const query = `
      SELECT 
        id, first_name, last_name, email, phone, title, 
        email_type, contact_form_url, department, agency_name, agency_id, created_at, updated_at
      FROM contacts
      WHERE ${whereClause}
      ORDER BY ${finalSortBy} ${finalSortOrder}
      LIMIT ? OFFSET ?
    `;

    const stmt = db.prepare(query);
    const contacts = stmt.all(...params, limit, skip) as any[];

    const alreadyViewed = getAlreadyViewedContacts(userId);
    const alreadyViewedSet = new Set(alreadyViewed);

    const newContacts = contacts.filter(contact => !alreadyViewedSet.has(contact.id));

    if (newContacts.length > 0) {
      const currentViewed = getContactsViewedToday(userId);
      const projectedTotal = currentViewed + newContacts.length;

      if (projectedTotal > 50) {
        const contactsCanView = 50 - currentViewed;
        const contactsToCount = newContacts.slice(0, contactsCanView);
        
        if (contactsToCount.length > 0) {
          incrementContactViewCount(userId, contactsToCount.length);
          addViewedContacts(userId, contactsToCount.map(c => c.id));
        }

        const viewedToday = getContactsViewedToday(userId);
        return NextResponse.json(
          {
            success: false,
            limitExceeded: false,
            viewedToday,
            remaining: 0,
            data: contactsToCount,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
              hasNextPage: false,
              hasPreviousPage: page > 1,
            },
            message: 'You have reached your daily limit of 50 contacts. Upgrade your plan to view more.',
          },
          { status: 200 }
        );
      }

      incrementContactViewCount(userId, newContacts.length);
      addViewedContacts(userId, newContacts.map(c => c.id));
    }

    const viewedToday = getContactsViewedToday(userId);
    const remainingAfter = getRemainingContactsToday(userId);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(
      {
        success: true,
        limitExceeded: false,
        viewedToday,
        remaining: remainingAfter,
        data: contacts,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages && remainingAfter > 0,
          hasPreviousPage: page > 1,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
