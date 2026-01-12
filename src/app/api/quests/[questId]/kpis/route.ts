import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { createSupabaseServerClient } from "@/lib/supabaseServerAuth";
import { calculateQuestProgress } from "@/lib/questProgress";

interface RouteParams {
  params: Promise<{ questId: string }>;
}

/**
 * POST /api/quests/[questId]/kpis
 * Add KPIs to an existing quest
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
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
    const body = await request.json();
    const { kpis } = body;

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

    // Validate KPIs
    if (!kpis || !Array.isArray(kpis) || kpis.length === 0) {
      return NextResponse.json(
        { error: "At least one KPI is required" },
        { status: 400 }
      );
    }

    // Validate and prepare KPI data
    const validKPIs = kpis
      .filter((kpi) => kpi.name && kpi.name.trim()) // Only KPIs with names
      .map((kpi) => ({
        quest_id: questId,
        name: kpi.name.trim(),
        value: kpi.value !== undefined ? parseFloat(String(kpi.value)) : 0,
        target:
          kpi.target !== null && kpi.target !== undefined
            ? parseFloat(String(kpi.target))
            : null,
        unit: kpi.unit?.trim() || null,
      }));

    if (validKPIs.length === 0) {
      return NextResponse.json(
        { error: "At least one KPI with a name is required" },
        { status: 400 }
      );
    }

    // Insert KPIs
    const { data: insertedKPIs, error: kpiError } = await supabase
      .from("kpis")
      .insert(validKPIs)
      .select();

    if (kpiError) {
      console.error("KPI creation error:", kpiError);
      return NextResponse.json(
        { error: "Failed to create KPIs", details: kpiError.message },
        { status: 500 }
      );
    }

    // Recalculate quest progress with all KPIs (existing + new)
    const { data: allKPIs, error: allKPIsError } = await supabaseServer
      .from("kpis")
      .select("value, target")
      .eq("quest_id", questId);

    if (allKPIsError) {
      console.error("Error fetching KPIs for progress calculation:", allKPIsError);
      // Return success even if progress update fails
      return NextResponse.json(
        {
          kpis: insertedKPIs || [],
          message: "KPIs created successfully, but progress calculation failed",
        },
        { status: 201 }
      );
    }

    // Calculate new progress
    const newProgress = calculateQuestProgress(allKPIs || []);

    // Determine quest status based on progress
    // If progress is 100%, automatically set status to "completed"
    const updateData: any = { progress: newProgress };
    if (newProgress >= 100) {
      updateData.status = "completed";
    }

    // Update quest progress and status if needed
    const { error: progressUpdateError } = await supabase
      .from("quests")
      .update(updateData)
      .eq("id", questId);

    if (progressUpdateError) {
      console.error("Error updating quest progress:", progressUpdateError);
      // Return success even if progress update fails
      return NextResponse.json(
        {
          kpis: insertedKPIs || [],
          progress: newProgress,
          message: "KPIs created successfully, but progress update failed",
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      {
        kpis: insertedKPIs || [],
        progress: newProgress,
        message: "KPIs created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
