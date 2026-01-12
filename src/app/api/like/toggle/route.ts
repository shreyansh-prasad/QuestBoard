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
    const { type, targetId } = body; // type: 'post' | 'profile', targetId: post_id or profile_id

    if (!type || !targetId) {
      return NextResponse.json(
        { error: "type and targetId are required" },
        { status: 400 }
      );
    }

    if (type !== "post" && type !== "profile") {
      return NextResponse.json(
        { error: "type must be 'post' or 'profile'" },
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

    // Prevent users from liking their own content
    if (type === "profile" && currentProfile.id === targetId) {
      return NextResponse.json(
        { error: "Cannot like your own profile" },
        { status: 400 }
      );
    }

    // Verify target exists
    if (type === "post") {
      const { data: post, error: postError } = await supabaseServer
        .from("posts")
        .select("id, profile_id")
        .eq("id", targetId)
        .single();

      if (postError || !post) {
        return NextResponse.json(
          { error: "Post not found" },
          { status: 404 }
        );
      }

      // Prevent liking own posts
      if (post.profile_id === currentProfile.id) {
        return NextResponse.json(
          { error: "Cannot like your own post" },
          { status: 400 }
        );
      }
    } else {
      const { data: targetProfile, error: targetError } = await supabaseServer
        .from("profiles")
        .select("id")
        .eq("id", targetId)
        .single();

      if (targetError || !targetProfile) {
        return NextResponse.json(
          { error: "Profile not found" },
          { status: 404 }
        );
      }
    }

    const tableName = type === "post" ? "post_likes" : "profile_likes";
    
    // Schema fix needed: profile_likes table should have:
    // - profile_id: the profile being liked (consistent with stats query: .eq("profile_id", profile.id))
    // - liker_profile_id: who liked it (the current user's profile)
    // This matches the pattern: profile_likes.profile_id counts likes FOR a profile
    //
    // If schema uses different column names, update accordingly.
    
    // Check if already liked
    let existingLike = null;
    let checkError = null;
    
    if (type === "profile") {
      // Try schema: profile_id = liked profile, liker_profile_id = liker
      const result = await supabaseServer
        .from(tableName)
        .select("id")
        .eq("profile_id", targetId) // The profile being liked
        .eq("liker_profile_id", currentProfile.id) // Who liked it
        .maybeSingle();
      
      existingLike = result.data || null;
      checkError = result.error;
      
      // If that fails, try alternative schema: profile_id = liker, liked_profile_id = liked
      if (checkError || !existingLike) {
        const result2 = await supabaseServer
          .from(tableName)
          .select("id")
          .eq("profile_id", currentProfile.id) // The liker
          .eq("liked_profile_id", targetId) // The liked profile
          .maybeSingle();
        
        if (!result2.error && result2.data) {
          existingLike = result2.data;
          checkError = null;
        }
      }
    } else {
      // For posts, standard structure: profile_id = liker, post_id = post
      const result = await supabaseServer
        .from(tableName)
        .select("id")
        .eq("profile_id", currentProfile.id)
        .eq("post_id", targetId)
        .maybeSingle();
      
      existingLike = result.data || null;
      checkError = result.error;
    }
    
    if (checkError && !existingLike) {
      console.error("Error checking existing like:", checkError);
    }

    let isLiked = false;
    let action = "";

    if (existingLike) {
      // Unlike: Delete the like
      const { error: deleteError } = await supabaseServer
        .from(tableName)
        .delete()
        .eq("id", existingLike.id);

      if (deleteError) {
        console.error(`Error unliking ${type}:`, deleteError);
        return NextResponse.json(
          { error: `Failed to unlike ${type}` },
          { status: 500 }
        );
      }
      action = "unliked";
    } else {
      // Like: Create the like relationship
      let insertData: any;
      let insertError: any = null;
      let newLike: any = null;
      
      if (type === "profile") {
        // For profile likes, we need both liker and liked profile IDs
        // Schema should have: profile_id = liked profile, liker_profile_id = liker
        // OR: profile_id = liker, liked_profile_id = liked profile
        // Try primary schema first (matches stats query pattern)
        let result = await supabaseServer
          .from(tableName)
          .insert({
            profile_id: targetId, // The profile being liked (consistent with stats: .eq("profile_id", profile.id))
            liker_profile_id: currentProfile.id, // Who liked it
          })
          .select()
          .maybeSingle();
        
        newLike = result.data;
        insertError = result.error;
        
        // If that fails (schema doesn't have liker_profile_id), try alternative schema
        if ((insertError && insertError.code === "42703") || !newLike) {
          // Column doesn't exist, try alternative: profile_id = liker, liked_profile_id = liked
          result = await supabaseServer
            .from(tableName)
            .insert({
              profile_id: currentProfile.id, // The liker
              liked_profile_id: targetId, // The liked profile
            })
            .select()
            .maybeSingle();
          
          if (!result.error && result.data) {
            newLike = result.data;
            insertError = null;
          } else if (!insertError) {
            insertError = result.error;
          }
        }
      } else {
        // For post likes, standard structure
        const result = await supabaseServer
          .from(tableName)
          .insert({
            profile_id: currentProfile.id, // Who liked
            post_id: targetId, // What was liked
          })
          .select()
          .maybeSingle();
        
        newLike = result.data;
        insertError = result.error;
      }

      if (insertError || !newLike) {
        console.error(`Error liking ${type}:`, insertError);
        return NextResponse.json(
          { 
            error: `Failed to like ${type}`,
            details: insertError?.message || "Schema may need liker_profile_id or liked_profile_id column"
          },
          { status: 500 }
        );
      }
      isLiked = true;
      action = "liked";
    }

    // Get updated like count
    let likeCount = 0;
    if (type === "profile") {
      // Count likes for the profile
      // Try schema: profile_id = liked profile (consistent with stats query)
      const result1 = await supabaseServer
        .from(tableName)
        .select("*", { count: "exact", head: true })
        .eq("profile_id", targetId);
      
      if (result1.count !== null) {
        likeCount = result1.count;
      } else {
        // Try alternative: liked_profile_id = liked profile
        const result2 = await supabaseServer
          .from(tableName)
          .select("*", { count: "exact", head: true })
          .eq("liked_profile_id", targetId);
        
        likeCount = result2.count || 0;
      }
    } else {
      // For posts
      const result = await supabaseServer
        .from(tableName)
        .select("*", { count: "exact", head: true })
        .eq("post_id", targetId);
      
      likeCount = result.count || 0;
    }

    return NextResponse.json(
      {
        isLiked,
        action,
        likeCount: likeCount || 0,
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
