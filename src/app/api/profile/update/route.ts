import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { createSupabaseServerClient } from "@/lib/supabaseServerAuth";

export async function PUT(request: NextRequest) {
  try {
    // Get authenticated user using @supabase/ssr
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth error in profile update:", authError);
      return NextResponse.json(
        { error: "Unauthorized", details: authError?.message || "User not authenticated" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      bio,
      displayName,
      avatarUrl,
      hideProfile, // Maps to is_public (inverted)
    } = body;

    // Get user's profile
    const { data: existingProfile, error: profileError } = await supabaseServer
      .from("profiles")
      .select("id, user_id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !existingProfile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (existingProfile.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Build update object
    const updateData: any = {};

    if (bio !== undefined) {
      updateData.bio = bio;
    }

    if (displayName !== undefined) {
      updateData.display_name = displayName;
    }

    if (avatarUrl !== undefined) {
      updateData.avatar_url = avatarUrl;
    }

    if (hideProfile !== undefined) {
      // hideProfile = true means is_public = false
      updateData.is_public = !hideProfile;
    }

    // Note: hideMoney field would need to be added to profiles table schema
    // For now, we'll skip it or you can add it manually:
    // ALTER TABLE profiles ADD COLUMN hide_money BOOLEAN DEFAULT false;
    // if (hideMoney !== undefined) {
    //   updateData.hide_money = hideMoney;
    // }

    // Update profile
    const { data: updatedProfile, error: updateError } = await supabaseServer
      .from("profiles")
      .update(updateData)
      .eq("id", existingProfile.id)
      .select()
      .single();

    if (updateError) {
      console.error("Profile update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update profile", details: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile: updatedProfile }, { status: 200 });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
