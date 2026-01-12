import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { createSupabaseServerClient } from "@/lib/supabaseServerAuth";

interface RouteParams {
  params: Promise<{ questId: string }>;
}

/**
 * DELETE /api/quests/[questId]
 * Delete a quest (cascades to KPIs)
 */
export async function DELETE(
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

    // Delete quest (KPIs will be deleted automatically via CASCADE)
    const { error: deleteError } = await supabase
      .from("quests")
      .delete()
      .eq("id", questId);

    if (deleteError) {
      console.error("Error deleting quest:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete quest" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Quest deleted successfully" },
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

/**
 * PUT /api/quests/[questId]
 * Update a quest (title, description, status)
 */
export async function PUT(
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
    const { title, description, status } = body;

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

    // Build update object
    const updateData: any = {};

    if (title !== undefined) {
      if (!title || !title.trim()) {
        return NextResponse.json(
          { error: "Title cannot be empty" },
          { status: 400 }
        );
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      updateData.description = description?.trim() || null;
    }

    if (status !== undefined) {
      const validStatuses = ["active", "completed", "paused", "archived"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.status = status;
    }

    // Update quest
    const { data: updatedQuest, error: updateError } = await supabase
      .from("quests")
      .update(updateData)
      .eq("id", questId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating quest:", updateError);
      return NextResponse.json(
        { error: "Failed to update quest" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { quest: updatedQuest },
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
