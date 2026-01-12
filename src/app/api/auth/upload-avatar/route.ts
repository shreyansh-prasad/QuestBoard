import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// Note: Before using avatar upload, create a storage bucket named "avatars" in Supabase:
// 1. Go to Supabase Dashboard > Storage
// 2. Create a new bucket named "avatars"
// 3. Set it to public (or configure RLS policies as needed)
// 4. Configure CORS if necessary

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;

    if (!file || !userId) {
      return NextResponse.json(
        { error: "File and userId are required" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = fileName; // File path within the avatars bucket

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage (avatars bucket)
    const { data: uploadData, error: uploadError } = await supabaseServer.storage
      .from("avatars")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      
      // Check if bucket doesn't exist
      if (uploadError.message?.includes("Bucket not found") || uploadError.message?.includes("does not exist")) {
        return NextResponse.json(
          { 
            error: "Avatar storage bucket not found", 
            details: "The 'avatars' storage bucket does not exist. Please create it in Supabase Dashboard > Storage.",
            hint: "Go to Supabase Dashboard > Storage > Create Bucket > Name: 'avatars' > Set Public",
          },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { error: "Failed to upload avatar", details: uploadError.message },
        { status: 500 }
      );
    }

    if (!uploadData?.path) {
      return NextResponse.json(
        { error: "Upload succeeded but no path returned" },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseServer.storage
      .from("avatars")
      .getPublicUrl(uploadData.path);

    // Optionally update profile.avatar_url if userId is provided and profile exists
    // Note: This is optional - the component can handle updating the profile separately
    // But we can also do it here for convenience
    // We don't fail the upload if profile update fails - upload is still successful
    if (userId && uploadData.path) {
      try {
        // Get user's profile
        const { data: profile, error: profileError } = await supabaseServer
          .from("profiles")
          .select("id, user_id")
          .eq("user_id", userId)
          .single();

        if (profile && !profileError) {
          // Update profile with new avatar URL (non-blocking - don't fail if this fails)
          const { error: updateError } = await supabaseServer
            .from("profiles")
            .update({ avatar_url: publicUrl })
            .eq("id", profile.id);

          if (updateError) {
            console.error(
              "Avatar uploaded successfully but profile update failed:",
              updateError
            );
            // Continue - upload was successful, profile update can be done separately
          }
        }
      } catch (profileUpdateError) {
        console.error(
          "Error updating profile after avatar upload:",
          profileUpdateError
        );
        // Continue - upload was successful
      }
    }

    return NextResponse.json(
      { url: publicUrl, path: uploadData.path || filePath },
      { status: 200 }
    );
  } catch (error) {
    console.error("Upload API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
