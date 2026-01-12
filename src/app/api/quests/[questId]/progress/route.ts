import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { createSupabaseServerClient } from "@/lib/supabaseServerAuth";
import { calculateQuestProgress } from "@/lib/questProgress";

/**
 * POST /api/quests/[questId]/progress
 * Manually recalculate and update quest progress based on current KPI values
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ questId: string }> }
) {
  try {
    // Get authenticated user
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { questId } = await params;

    // Get user's profile
    const { data: profile, error: profileError } = await supabaseServer
      .from("profiles")
      .select("id, user_id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found. Please complete your profile first." },
        { status: 404 }
      );
    }

    // Verify quest belongs to user
    const { data: quest, error: questError } = await supabaseServer
      .from("quests")
      .select("id, profile_id")
      .eq("id", questId)
      .eq("profile_id", profile.id)
      .single();

    if (questError || !quest) {
      return NextResponse.json(
        { error: "Quest not found or access denied" },
        { status: 404 }
      );
    }

    // Fetch all KPIs for this quest
    const { data: kpis, error: kpisError } = await supabaseServer
      .from("kpis")
      .select("value, target")
      .eq("quest_id", questId);

    if (kpisError) {
      console.error("Error fetching KPIs:", kpisError);
      return NextResponse.json(
        { error: "Failed to fetch KPIs" },
        { status: 500 }
      );
    }

    // Calculate new progress
    const newProgress = calculateQuestProgress(kpis || []);

    // Determine quest status based on progress
    // If progress is 100%, automatically set status to "completed"
    const updateData: any = { progress: newProgress };
    if (newProgress >= 100) {
      updateData.status = "completed";
    }

    // Update quest progress and status if needed
    const { error: updateError } = await supabase
      .from("quests")
      .update(updateData)
      .eq("id", questId);

    if (updateError) {
      console.error("Error updating quest progress:", updateError);
      return NextResponse.json(
        { error: "Failed to update quest progress" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        questId,
        progress: newProgress,
        message: "Quest progress updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
