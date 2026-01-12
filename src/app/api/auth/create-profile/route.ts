import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      email,
      username,
      displayName,
      branch,
      section,
      year,
      avatarUrl,
    } = body;

    // Validation
    if (!userId || !email || !username) {
      return NextResponse.json(
        { 
          error: "Missing required fields",
          details: `Missing: ${!userId ? 'userId ' : ''}${!email ? 'email ' : ''}${!username ? 'username' : ''}`.trim(),
        },
        { status: 400 }
      );
    }

    // Quick check: Verify profiles table exists by attempting a simple query
    // This will give us a better error message if table doesn't exist
    const { error: tableCheckError } = await supabaseServer
      .from("profiles")
      .select("id")
      .limit(0);
    
    if (tableCheckError) {
      // Check if it's a "table not found" error
      if (tableCheckError.code === 'PGRST205' || 
          tableCheckError.message?.includes('schema cache') ||
          tableCheckError.message?.includes('Could not find the table')) {
        return NextResponse.json(
          {
            error: "Database tables not found",
            details: "The profiles table does not exist. Database migrations have not been run.",
            hint: "Please run migrations in Supabase SQL Editor.",
            code: tableCheckError.code,
            action: "1. Open Supabase Dashboard → SQL Editor → New Query\n2. Copy contents of RUN_ALL_MIGRATIONS.sql\n3. Paste and Run\n4. See README.md section 'Database Setup' for complete instructions",
          },
          { status: 503 }
        );
      }
      // For other errors, log but continue - might be RLS or other issue
      console.warn("Table check warning:", tableCheckError);
    }

    // Validate username format (alphanumeric, underscore, hyphen, 3-30 chars)
    const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        {
          error:
            "Username must be 3-30 characters and contain only letters, numbers, underscores, and hyphens",
        },
        { status: 400 }
      );
    }

    // Check if username already exists
    const { data: existingUsername, error: checkError } = await supabaseServer
      .from("profiles")
      .select("id")
      .eq("username", username.toLowerCase().trim())
      .maybeSingle(); // Use maybeSingle() to avoid error if no row found

    // If checkError exists and it's not a "not found" error, return it
    if (checkError && checkError.code !== 'PGRST116') {
      console.error("Error checking username:", checkError);
      return NextResponse.json(
        {
          error: "Failed to check username availability",
          details: checkError.message,
          code: checkError.code,
          hint: checkError.hint || "Make sure the profiles table exists and migrations are run",
        },
        { status: 500 }
      );
    }

    if (existingUsername) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 }
      );
    }

    // Validate year (1-4)
    if (year !== null && year !== undefined) {
      const yearNum = parseInt(String(year), 10);
      if (isNaN(yearNum) || yearNum < 1 || yearNum > 4) {
        return NextResponse.json(
          { error: "Year must be between 1 and 4" },
          { status: 400 }
        );
      }
    }

    // Validate section (1 or 2)
    if (section !== null && section !== undefined) {
      const sectionNum = parseInt(String(section), 10);
      if (isNaN(sectionNum) || (sectionNum !== 1 && sectionNum !== 2)) {
        return NextResponse.json(
          { error: "Section must be 1 or 2" },
          { status: 400 }
        );
      }
    }

    // Create profile
    const profileData = {
      user_id: userId,
      email: email.toLowerCase().trim(),
      username: username.toLowerCase().trim(),
      display_name: displayName?.trim() || null,
      branch: branch || null,
      section: section ? parseInt(String(section), 10) : null,
      year: year ? parseInt(String(year), 10) : null,
      avatar_url: avatarUrl || null,
      is_public: true, // Default to public
      bio: null,
    };

    const { data: profile, error: profileError } = await supabaseServer
      .from("profiles")
      .insert(profileData)
      .select()
      .single();

    if (profileError) {
      console.error("Profile creation error:", profileError);
      console.error("Profile data attempted:", profileData);
      
      // Check if the error is because table doesn't exist
      if (profileError.code === 'PGRST205' || profileError.message?.includes('schema cache')) {
        return NextResponse.json(
          {
            error: "Database tables not found",
            details: "The profiles table does not exist. Please run database migrations first.",
            hint: "See README.md section 'Database Setup' for instructions",
            code: profileError.code,
          },
          { status: 500 }
        );
      }

      // Check for foreign key constraint violation (user_id doesn't exist in auth.users)
      if (profileError.code === '23503' || profileError.message?.includes('foreign key')) {
        return NextResponse.json(
          {
            error: "Invalid user ID",
            details: "The user ID does not exist in the authentication system",
            hint: "Make sure signup completed successfully before creating profile",
            code: profileError.code,
          },
          { status: 400 }
        );
      }

      // Check for unique constraint violation
      if (profileError.code === '23505' || profileError.message?.includes('unique constraint')) {
        if (profileError.message?.includes('username')) {
          return NextResponse.json(
            { error: "Username already taken" },
            { status: 409 }
          );
        }
        if (profileError.message?.includes('user_id')) {
          return NextResponse.json(
            { error: "Profile already exists for this user" },
            { status: 409 }
          );
        }
      }

      return NextResponse.json(
        {
          error: "Failed to create profile",
          details: profileError.message,
          code: profileError.code,
          hint: profileError.hint,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ profile }, { status: 201 });
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error?.message || "Unknown error occurred",
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      },
      { status: 500 }
    );
  }
}
