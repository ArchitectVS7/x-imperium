import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { games } from "@/lib/db/schema";

/**
 * Admin endpoint to clear all games
 * Use when stuck with corrupted game data
 */
export async function POST() {
  try {
    // Delete all games (cascades to all related tables)
    await db.delete(games);

    return NextResponse.json({
      success: true,
      message: "All games cleared successfully"
    });
  } catch (error) {
    console.error("Failed to clear games:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
