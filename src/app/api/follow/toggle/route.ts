import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { createSupabaseServerClient } from "@/lib/supabaseServerAuth";

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
    const { profileId } = body;

    if (!profileId) {
      return NextResponse.json(
        { error: "profileId is required" },
        { status: 400 }
      );
    }

    // Get current user's profile
    const { data: currentProfile, error: profileError } = await supabaseServer
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !currentProfile) {
      return NextResponse.json(
        { error: "Profile not found. Please complete your profile first." },
        { status: 404 }
      );
    }

    // Prevent users from following themselves
    if (currentProfile.id === profileId) {
      return NextResponse.json(
        { error: "Cannot follow yourself" },
        { status: 400 }
      );
    }

    // Check if target profile exists and is public
    const { data: targetProfile, error: targetError } = await supabaseServer
      .from("profiles")
      .select("id, is_public")
      .eq("id", profileId)
      .single();

    if (targetError || !targetProfile) {
      return NextResponse.json(
        { error: "Target profile not found" },
        { status: 404 }
      );
    }

    // Check if already following
    const { data: existingFollow, error: checkError } = await supabaseServer
      .from("follows")
      .select("id")
      .eq("follower_id", currentProfile.id)
      .eq("following_id", profileId)
      .single();

    let isFollowing = false;
    let action = "";

    if (existingFollow) {
      // Unfollow: Delete the follow relationship
      const { error: deleteError } = await supabaseServer
        .from("follows")
        .delete()
        .eq("id", existingFollow.id);

      if (deleteError) {
        console.error("Error unfollowing:", deleteError);
        return NextResponse.json(
          { error: "Failed to unfollow" },
          { status: 500 }
        );
      }
      action = "unfollowed";
    } else {
      // Follow: Create the follow relationship
      const { data: newFollow, error: insertError } = await supabaseServer
        .from("follows")
        .insert({
          follower_id: currentProfile.id,
          following_id: profileId,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error following:", insertError);
        return NextResponse.json(
          { error: "Failed to follow" },
          { status: 500 }
        );
      }
      isFollowing = true;
      action = "followed";
    }

    // Get updated follower count
    const { count: followerCount } = await supabaseServer
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", profileId);

    return NextResponse.json(
      {
        isFollowing,
        action,
        followerCount: followerCount || 0,
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
