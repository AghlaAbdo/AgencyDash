import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Query parameters
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const state = searchParams.get("state");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = (searchParams.get("sortOrder") || "asc").toLowerCase();

    // Validate pagination
    const skip = (page - 1) * limit;
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        {
          error: "Invalid pagination parameters. Page and limit must be >= 1, limit <= 100",
        },
        { status: 400 }
      );
    }

    // Validate sortBy
    const validSortFields = [
      "name",
      "state",
      "population",
      "created_at",
      "type",
    ];
    const finalSortBy = validSortFields.includes(sortBy) ? sortBy : "name";
    const finalSortOrder = sortOrder === "desc" ? "DESC" : "ASC";

    const db = getDatabase();

    // Build WHERE clause
    let whereClause = "1=1";
    const params: any[] = [];

    if (state) {
      whereClause += " AND state_code = ?";
      params.push(state.toUpperCase());
    }

    if (type) {
      whereClause += " AND LOWER(type) = LOWER(?)";
      params.push(type);
    }

    if (search) {
      whereClause += " AND (LOWER(name) LIKE LOWER(?) OR LOWER(county) LIKE LOWER(?))";
      const searchTerm = `%${search}%`;
      params.push(searchTerm);
      params.push(searchTerm);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as count FROM agencies WHERE ${whereClause}`;
    const countStmt = db.prepare(countQuery);
    const countResult = countStmt.get(...params) as { count: number };
    const total = countResult.count;

    // Fetch agencies
    const query = `
      SELECT id, name, state, state_code, type, population, website, county, created_at, updated_at
      FROM agencies
      WHERE ${whereClause}
      ORDER BY ${finalSortBy} ${finalSortOrder}
      LIMIT ? OFFSET ?
    `;

    const stmt = db.prepare(query);
    const agencies = stmt.all(...params, limit, skip) as any[];

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json(
      {
        success: true,
        data: agencies,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching agencies:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
