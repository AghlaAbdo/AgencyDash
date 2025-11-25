import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const db = getDatabase();
    const stmt = db.prepare(
      "SELECT * FROM agencies WHERE id = ?"
    );
    const agency = stmt.get(id) as any;

    if (!agency) {
      return NextResponse.json(
        { error: "Agency not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: agency,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching agency:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
