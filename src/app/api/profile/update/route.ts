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
      branch,
      section,
      year,
      instagramUrl,
      linkedinUrl,
      githubUrl,
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

    if (branch !== undefined) {
      updateData.branch = branch || null;
    }

    if (section !== undefined) {
      updateData.section = section ? parseInt(String(section), 10) : null;
    }

    if (year !== undefined) {
      updateData.year = year ? parseInt(String(year), 10) : null;
    }

    // Add social media fields to update data
    if (instagramUrl !== undefined) {
      const trimmedUrl = instagramUrl?.trim() || null;
      updateData.instagram_url = trimmedUrl && trimmedUrl.length > 0 ? trimmedUrl : null;
      console.log("Setting instagram_url:", updateData.instagram_url);
    }
    if (linkedinUrl !== undefined) {
      const trimmedUrl = linkedinUrl?.trim() || null;
      updateData.linkedin_url = trimmedUrl && trimmedUrl.length > 0 ? trimmedUrl : null;
      console.log("Setting linkedin_url:", updateData.linkedin_url);
    }
    if (githubUrl !== undefined) {
      const trimmedUrl = githubUrl?.trim() || null;
      updateData.github_url = trimmedUrl && trimmedUrl.length > 0 ? trimmedUrl : null;
      console.log("Setting github_url:", updateData.github_url);
    }

    console.log("Updating profile with data:", JSON.stringify(updateData, null, 2));

    // Update all fields in one operation
    const { data: updatedProfile, error: updateError } = await supabaseServer
      .from("profiles")
      .update(updateData)
      .eq("id", existingProfile.id)
      .select()
      .single();

    if (updateError) {
      console.error("Profile update error:", updateError);
      
      // Check if error is due to missing social media columns
      const isColumnError = updateError.code === '42703' || 
                           updateError.message?.includes('column') ||
                           updateError.message?.includes('does not exist');
      
      if (isColumnError && (instagramUrl !== undefined || linkedinUrl !== undefined || githubUrl !== undefined)) {
        // Try updating without social media fields
        const basicUpdateData: any = {};
        Object.keys(updateData).forEach(key => {
          if (!['instagram_url', 'linkedin_url', 'github_url'].includes(key)) {
            basicUpdateData[key] = updateData[key];
          }
        });

        const { data: basicUpdatedProfile, error: basicError } = await supabaseServer
          .from("profiles")
          .update(basicUpdateData)
          .eq("id", existingProfile.id)
          .select()
          .single();

        if (basicError) {
          return NextResponse.json(
            { 
              error: "Failed to update profile", 
              details: basicError.message,
              code: basicError.code,
              hint: basicError.hint
            },
            { status: 500 }
          );
        }

        // Return with warning about social media fields
        return NextResponse.json({
          profile: basicUpdatedProfile,
          warning: "Social media links could not be saved because the database columns don't exist yet. Please run the migration '008_add_social_media_fields.sql' in Supabase SQL Editor to enable this feature."
        }, { status: 200 });
      }

      return NextResponse.json(
        { 
          error: "Failed to update profile", 
          details: updateError.message,
          code: updateError.code,
          hint: updateError.hint
        },
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
