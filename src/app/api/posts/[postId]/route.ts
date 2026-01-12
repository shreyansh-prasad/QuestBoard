import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { createSupabaseServerClient } from "@/lib/supabaseServerAuth";

interface RouteParams {
  params: Promise<{ postId: string }>;
}

/**
 * DELETE /api/posts/[postId]
 * Delete a post
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
      console.error("Delete post auth error:", authError);
      return NextResponse.json(
        { error: "Unauthorized", details: authError?.message || "User not authenticated" },
        { status: 401 }
      );
    }

    const { postId } = await params;

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

    // Verify post belongs to user
    const { data: post, error: postError } = await supabaseServer
      .from("posts")
      .select("id, profile_id")
      .eq("id", postId)
      .eq("profile_id", profile.id)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { error: "Post not found or access denied" },
        { status: 404 }
      );
    }

    // Delete post (likes will be deleted automatically via CASCADE)
    // Use supabaseServer since we've already verified ownership
    const { error: deleteError } = await supabaseServer
      .from("posts")
      .delete()
      .eq("id", postId);

    if (deleteError) {
      console.error("Error deleting post:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete post" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Post deleted successfully" },
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
 * PUT /api/posts/[postId]
 * Update a post (title, content, published status)
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

    const { postId } = await params;
    const body = await request.json();
    const { title, content, published } = body;

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

    // Verify post belongs to user
    const { data: post, error: postError } = await supabaseServer
      .from("posts")
      .select("id, profile_id")
      .eq("id", postId)
      .eq("profile_id", profile.id)
      .single();

    if (postError || !post) {
      return NextResponse.json(
        { error: "Post not found or access denied" },
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

    if (content !== undefined) {
      if (!content || !content.trim()) {
        return NextResponse.json(
          { error: "Content cannot be empty" },
          { status: 400 }
        );
      }
      updateData.content = content.trim();
    }

    if (published !== undefined) {
      updateData.is_published = published === true;
    }

    // Update post
    const { data: updatedPost, error: updateError } = await supabase
      .from("posts")
      .update(updateData)
      .eq("id", postId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating post:", updateError);
      return NextResponse.json(
        { error: "Failed to update post" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { post: updatedPost },
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
