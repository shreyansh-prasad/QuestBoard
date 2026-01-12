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
    const {
      title,
      content,
      published,
      questId,
      kpiUpdates,
    } = body;

    // Validation
    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    // Get user's profile
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

    // Validate quest ownership if questId provided
    if (questId) {
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
    }

    // Step 1: Create post
    // Note: slug is optional and unique, so we don't set it here
    // It can be generated later if needed for SEO-friendly URLs
    // Important: Use authenticated client (not supabaseServer) for RLS policies to work
    const postData = {
      profile_id: profile.id,
      quest_id: questId || null,
      title: title.trim(),
      content: content.trim(),
      is_published: published === true,
    };

    // Use authenticated client to ensure RLS policies are evaluated correctly
    // supabaseServer uses service role which bypasses RLS, but we need RLS to validate auth
    const { data: createdPost, error: postError } = await supabase
      .from("posts")
      .insert(postData)
      .select()
      .single();

    if (postError || !createdPost) {
      console.error("Post creation error:", postError);
      // Return more detailed error information for debugging
      return NextResponse.json(
        {
          error: "Failed to create post",
          details: postError?.message || "Unknown error",
          code: postError?.code,
          hint: postError?.hint,
        },
        { status: 500 }
      );
    }

    // Step 2: Update KPIs if mappings provided
    const updatedKPIIds: string[] = [];
    const questsToUpdate: Set<string> = new Set();
    
    if (kpiUpdates && Array.isArray(kpiUpdates) && kpiUpdates.length > 0) {
      // Validate and update each KPI from explicit mappings
      for (const update of kpiUpdates) {
        if (!update.kpiId || !update.questId || update.valueToAdd === undefined) {
          continue; // Skip invalid updates
        }

        // Verify KPI belongs to the quest
        // Use supabaseServer for verification queries (bypasses RLS)
        const { data: kpi, error: kpiError } = await supabaseServer
          .from("kpis")
          .select("id, quest_id, value, target")
          .eq("id", update.kpiId)
          .eq("quest_id", update.questId)
          .single();

        if (kpiError || !kpi) {
          console.error(`KPI ${update.kpiId} not found or invalid:`, kpiError);
          continue; // Skip this update but continue with others
        }

        // Verify quest belongs to user
        const { data: quest } = await supabaseServer
          .from("quests")
          .select("profile_id")
          .eq("id", update.questId)
          .eq("profile_id", profile.id)
          .single();

        if (!quest) {
          console.error(`Quest ${update.questId} does not belong to user`);
          continue; // Skip this update
        }

        // Update KPI value (increment)
        // Use authenticated client for updates to respect RLS
        const valueToAdd = parseFloat(String(update.valueToAdd));
        if (isNaN(valueToAdd) || valueToAdd <= 0) {
          continue; // Skip invalid values
        }

        let newValue = (parseFloat(String(kpi.value)) || 0) + valueToAdd;
        
        // Cap value at target if target exists
        const kpiTarget = kpi.target !== null && kpi.target !== undefined ? parseFloat(String(kpi.target)) : null;
        if (kpiTarget !== null && kpiTarget > 0) {
          newValue = Math.min(newValue, kpiTarget);
        }

        const { error: updateError } = await supabase
          .from("kpis")
          .update({ value: newValue })
          .eq("id", update.kpiId);

        if (updateError) {
          console.error(`Failed to update KPI ${update.kpiId}:`, updateError);
          // Continue with other updates even if one fails
        } else {
          updatedKPIIds.push(update.kpiId);
          questsToUpdate.add(update.questId);
        }
      }
    }

    // Step 3: Recalculate quest progress for all affected quests
    for (const questId of questsToUpdate) {
      try {
        // Fetch all KPIs for this quest
        const { data: allKPIs, error: kpisError } = await supabaseServer
          .from("kpis")
          .select("value, target")
          .eq("quest_id", questId);

        if (kpisError || !allKPIs) {
          console.error(`Failed to fetch KPIs for quest ${questId}:`, kpisError);
          continue;
        }

        // Calculate new progress
        const newProgress = calculateQuestProgress(allKPIs);

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
          console.error(`Failed to update progress for quest ${questId}:`, progressUpdateError);
        }
      } catch (error) {
        console.error(`Error updating progress for quest ${questId}:`, error);
      }
    }


    return NextResponse.json(
      {
        post: createdPost,
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
