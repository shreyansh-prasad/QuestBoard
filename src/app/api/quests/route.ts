import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { createSupabaseServerClient } from "@/lib/supabaseServerAuth";
import { calculateQuestProgress } from "@/lib/questProgress";

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user using @supabase/ssr
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { quest, kpis } = body;

    // Validation
    if (!quest || !quest.title) {
      return NextResponse.json(
        { error: "Missing required field: title is required" },
        { status: 400 }
      );
    }

    // Get user's profile (more secure - fetch by user_id directly)
    const { data: profile, error: profileError } = await supabaseServer
      .from("profiles")
      .select("id, user_id, username, branch, year, section")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found. Please complete your profile first." },
        { status: 404 }
      );
    }

    // Validate KPIs if provided
    if (kpis && Array.isArray(kpis)) {
      for (const kpi of kpis) {
        if (kpi.name && !kpi.name.trim()) {
          return NextResponse.json(
            { error: "KPI names cannot be empty" },
            { status: 400 }
          );
        }
        if (kpi.value !== undefined && isNaN(parseFloat(String(kpi.value)))) {
          return NextResponse.json(
            { error: `Invalid KPI value: ${kpi.value} must be a number` },
            { status: 400 }
          );
        }
        if (
          kpi.target !== null &&
          kpi.target !== undefined &&
          isNaN(parseFloat(String(kpi.target)))
        ) {
          return NextResponse.json(
            { error: `Invalid KPI target: ${kpi.target} must be a number` },
            { status: 400 }
          );
        }
      }
    }

    // Create quest and KPIs in a transaction-like operation
    // Since Supabase doesn't support explicit transactions in JS client,
    // we'll create quest first, then KPIs, and rollback on error

    // Step 1: Create quest
    // Note: The quests table doesn't have branch/year/section columns
    // These are stored in the profiles table instead
    const questData = {
      profile_id: profile.id, // Use profile ID from authenticated user
      title: quest.title.trim(),
      description: quest.description?.trim() || null,
      status: quest.status || "active",
    };

    const { data: createdQuest, error: questError } = await supabaseServer
      .from("quests")
      .insert(questData)
      .select()
      .single();

    if (questError || !createdQuest) {
      console.error("Quest creation error:", questError);
      return NextResponse.json(
        {
          error: "Failed to create quest",
          details: questError?.message || "Unknown error",
        },
        { status: 500 }
      );
    }

    // Step 2: Create KPIs if provided
    let createdKPIs = [];
    if (kpis && Array.isArray(kpis) && kpis.length > 0) {
      const validKPIs = kpis
        .filter((kpi) => kpi.name && kpi.name.trim()) // Only KPIs with names
        .map((kpi) => ({
          quest_id: createdQuest.id,
          name: kpi.name.trim(),
          value: kpi.value !== undefined ? parseFloat(String(kpi.value)) : 0,
          target:
            kpi.target !== null && kpi.target !== undefined
              ? parseFloat(String(kpi.target))
              : null,
          unit: kpi.unit?.trim() || null,
        }));

      if (validKPIs.length > 0) {
        const { data: insertedKPIs, error: kpiError } = await supabaseServer
          .from("kpis")
          .insert(validKPIs)
          .select();

        if (kpiError) {
          console.error("KPI creation error:", kpiError);
          // Rollback: Delete the quest if KPI creation fails
          await supabaseServer
            .from("quests")
            .delete()
            .eq("id", createdQuest.id);

          return NextResponse.json(
            {
              error: "Failed to create KPIs",
              details: kpiError.message,
            },
            { status: 500 }
          );
        }

        createdKPIs = insertedKPIs || [];
        
        // Calculate and update initial quest progress
        if (createdKPIs.length > 0) {
          const initialProgress = calculateQuestProgress(
            createdKPIs.map((kpi) => ({ value: kpi.value, target: kpi.target }))
          );
          
          const { error: progressUpdateError } = await supabaseServer
            .from("quests")
            .update({ progress: initialProgress })
            .eq("id", createdQuest.id);
          
          if (progressUpdateError) {
            console.error("Failed to update initial quest progress:", progressUpdateError);
            // Don't fail the request, just log the error
          } else {
            // Update the quest object with the new progress
            createdQuest.progress = initialProgress;
          }
        }
      }
    }

    return NextResponse.json(
      {
        quest: createdQuest,
        kpis: createdKPIs,
        username: profile.username,
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
