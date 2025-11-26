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
    await initializeContactLimitTable();

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
    const finalSortOrder = sortOrder === 'desc' ? -1 : 1;

    const db = await getDatabase();

    // Build filter
    const filter: any = {};

    if (agencyName) {
      filter.agency_name = { $regex: agencyName, $options: 'i' };
    }

    if (search) {
      filter.$or = [
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const contactsCollection = db.collection('contacts');

    const hasExceeded = await hasExceededDailyLimit(userId);

    if (hasExceeded) {
      const viewedToday = await getContactsViewedToday(userId);
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
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
          message: 'You have reached your daily limit of 50 contacts. Upgrade your plan to view more.',
        },
        { status: 200 }
      );
    }

    // Fetch both total count and contacts in parallel
    const [total, contacts, alreadyViewed] = await Promise.all([
      contactsCollection.countDocuments(filter),
      contactsCollection
        .find(filter)
        .sort({ [finalSortBy]: finalSortOrder })
        .skip(skip)
        .limit(limit)
        .toArray(),
      getAlreadyViewedContacts(userId),
    ]);

    const newContacts = contacts.filter(contact => !alreadyViewed.has(contact.id));

    if (newContacts.length > 0) {
      const currentViewed = await getContactsViewedToday(userId);
      const projectedTotal = currentViewed + newContacts.length;

      if (projectedTotal > 50) {
        const contactsCanView = 50 - currentViewed;
        const contactsToCount = newContacts.slice(0, contactsCanView);
        
        if (contactsToCount.length > 0) {
          await Promise.all([
            incrementContactViewCount(userId, contactsToCount.length),
            addViewedContacts(userId, contactsToCount.map(c => c.id)),
          ]);
        }

        const viewedToday = await getContactsViewedToday(userId);
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

      await Promise.all([
        incrementContactViewCount(userId, newContacts.length),
        addViewedContacts(userId, newContacts.map(c => c.id)),
      ]);
    }

    const viewedToday = await getContactsViewedToday(userId);
    const remainingAfter = await getRemainingContactsToday(userId);
    const totalPages = Math.ceil(total / limit);

    // Remove MongoDB _id field from response
    const cleanedContacts = contacts.map(({ _id, ...rest }) => rest);

    return NextResponse.json(
      {
        success: true,
        limitExceeded: false,
        viewedToday,
        remaining: remainingAfter,
        data: cleanedContacts,
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
