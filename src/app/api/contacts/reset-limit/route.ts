import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];

    // Delete today's contact view logs
    const deleteLogsStmt = db.prepare(
      'DELETE FROM contact_view_logs WHERE user_id = ? AND date = ?'
    );
    deleteLogsStmt.run(userId, today);

    // Delete today's viewed contacts
    const deleteViewedStmt = db.prepare(
      'DELETE FROM viewed_contacts WHERE user_id = ? AND date = ?'
    );
    deleteViewedStmt.run(userId, today);

    return NextResponse.json(
      {
        success: true,
        message: 'Daily limit has been reset. You can now view 50 more contacts.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error resetting contact limit:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
