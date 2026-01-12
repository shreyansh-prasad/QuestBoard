import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

/**
 * Cron endpoint to update user scores for leaderboard
 * 
 * This endpoint should be called periodically (daily recommended) to recompute
 * user scores and update the leaderboard cache.
 * 
 * Security: Protected by CRON_SECRET environment variable (optional but recommended)
 * 
 * Usage:
 * - Vercel Cron: Configure in vercel.json
 * - External Cron: Call this endpoint with Authorization header
 * - Manual: GET /api/cron/update-scores (with auth if CRON_SECRET is set)
 */
export async function GET(request: NextRequest) {
  // Verify cron secret for security (optional but recommended)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized. Provide Authorization: Bearer <CRON_SECRET> header." },
      { status: 401 }
    );
  }

  try {
    console.log("Starting user scores computation...");

    // Call the RPC function to compute scores
    const { data, error } = await supabaseServer.rpc("compute_user_scores");

    if (error) {
      console.error("Error computing scores:", error);
      return NextResponse.json(
        {
          error: "Failed to compute scores",
          details: error.message,
          code: error.code,
        },
        { status: 500 }
      );
    }

    const entriesUpdated = data?.length || 0;

    console.log(`Successfully computed scores for ${entriesUpdated} users`);

    return NextResponse.json({
      success: true,
      entries_updated: entriesUpdated,
      timestamp: new Date().toISOString(),
      message: `Computed scores for ${entriesUpdated} users`,
    });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Also support POST for compatibility with some cron services
export async function POST(request: NextRequest) {
  return GET(request);
}
