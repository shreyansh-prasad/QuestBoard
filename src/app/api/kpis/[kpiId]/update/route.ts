import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { createSupabaseServerClient } from "@/lib/supabaseServerAuth";
import { calculateQuestProgress } from "@/lib/questProgress";

/**
 * PUT /api/kpis/[kpiId]/update
 * Update KPI value and automatically recalculate quest progress
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ kpiId: string }> }
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

    const { kpiId } = await params;
    const body = await request.json();
    const { value, operation } = body; // operation: 'set' | 'increment' | 'decrement'

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

    // Fetch the KPI and verify ownership
    const { data: kpi, error: kpiError } = await supabaseServer
      .from("kpis")
      .select("id, quest_id, value, name, target, unit")
      .eq("id", kpiId)
      .single();

    if (kpiError || !kpi) {
      return NextResponse.json(
        { error: "KPI not found" },
        { status: 404 }
      );
    }

    // Verify quest belongs to user
    const { data: quest, error: questError } = await supabaseServer
      .from("quests")
      .select("id, profile_id")
      .eq("id", kpi.quest_id)
      .eq("profile_id", profile.id)
      .single();

    if (questError || !quest) {
      return NextResponse.json(
        { error: "Quest not found or access denied" },
        { status: 403 }
      );
    }

    // Calculate new value based on operation
    const currentValue = parseFloat(String(kpi.value)) || 0;
    let newValue: number;

    if (operation === "set") {
      const setValue = parseFloat(String(value));
      if (isNaN(setValue)) {
        return NextResponse.json(
          { error: "Invalid value. Must be a number." },
          { status: 400 }
        );
      }
      newValue = setValue;
    } else if (operation === "increment") {
      const incrementValue = parseFloat(String(value)) || 1;
      newValue = currentValue + incrementValue;
    } else if (operation === "decrement") {
      const decrementValue = parseFloat(String(value)) || 1;
      newValue = Math.max(0, currentValue - decrementValue); // Don't go below 0
    } else {
      return NextResponse.json(
        { error: "Invalid operation. Must be 'set', 'increment', or 'decrement'." },
        { status: 400 }
      );
    }

    // Ensure value is not negative
    newValue = Math.max(0, newValue);
    
    // Cap value at target if target exists
    if (kpi.target !== null && kpi.target !== undefined && kpi.target > 0) {
      newValue = Math.min(newValue, kpi.target);
    }

    // Update KPI value using authenticated client to respect RLS
    const { error: updateError } = await supabase
      .from("kpis")
      .update({ value: newValue })
      .eq("id", kpiId);

    if (updateError) {
      console.error("Error updating KPI:", updateError);
      return NextResponse.json(
        { error: "Failed to update KPI value" },
        { status: 500 }
      );
    }

    // Recalculate quest progress
    const { data: allKPIs, error: kpisError } = await supabaseServer
      .from("kpis")
      .select("value, target")
      .eq("quest_id", kpi.quest_id);

    if (kpisError || !allKPIs) {
      console.error("Error fetching KPIs for progress calculation:", kpisError);
      // Return success even if progress update fails
      return NextResponse.json(
        {
          kpiId,
          value: newValue,
          message: "KPI updated successfully, but progress calculation failed",
        },
        { status: 200 }
      );
    }

    const newProgress = calculateQuestProgress(allKPIs);

    // Determine quest status based on progress
    // If progress is 100%, automatically set status to "completed"
    let statusUpdate: any = {};
    if (newProgress >= 100) {
      statusUpdate.status = "completed";
    }

    // Update quest progress and status if needed
    const updateData: any = { progress: newProgress, ...statusUpdate };
    const { error: progressUpdateError } = await supabase
      .from("quests")
      .update(updateData)
      .eq("id", kpi.quest_id);

    if (progressUpdateError) {
      console.error("Error updating quest progress:", progressUpdateError);
      // Return success even if progress update fails
      return NextResponse.json(
        {
          kpiId,
          value: newValue,
          progress: newProgress,
          message: "KPI updated successfully, but progress update failed",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        kpiId,
        value: Number(newValue),
        progress: newProgress,
        kpi: {
          id: kpi.id,
          name: kpi.name,
          value: Number(newValue),
          target: kpi.target ? Number(kpi.target) : null,
          unit: kpi.unit,
        },
        message: "KPI and quest progress updated successfully",
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
