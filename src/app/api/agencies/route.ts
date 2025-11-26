import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const state = searchParams.get("state");
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = (searchParams.get("sortOrder") || "asc").toLowerCase();

    const skip = (page - 1) * limit;
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        {
          error: "Invalid pagination parameters. Page and limit must be >= 1, limit <= 100",
        },
        { status: 400 }
      );
    }

    const validSortFields = [
      "name",
      "state",
      "population",
      "created_at",
      "type",
    ];
    const finalSortBy = validSortFields.includes(sortBy) ? sortBy : "name";
    const finalSortOrder = sortOrder === "desc" ? -1 : 1;

    const db = await getDatabase();

    // Build filter
    const filter: any = {};

    if (state) {
      filter.state_code = state.toUpperCase();
    }

    if (type) {
      filter.type = { $regex: type, $options: "i" };
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { county: { $regex: search, $options: "i" } },
      ];
    }

    const agenciesCollection = db.collection("agencies");

    const total = await agenciesCollection.countDocuments(filter);

    const agencies = await agenciesCollection
      .find(filter)
      .sort({ [finalSortBy]: finalSortOrder })
      .skip(skip)
      .limit(limit)
      .toArray();

    const totalPages = Math.ceil(total / limit);

    // Remove MongoDB _id field
    const cleanedAgencies = agencies.map(({ _id, ...rest }: any) => rest);

    return NextResponse.json(
      {
        success: true,
        data: cleanedAgencies,
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
