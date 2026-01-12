import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const PROFILES_PER_PAGE = 12;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Get filter parameters
    const branch = searchParams.get("branch")?.trim() || null;
    const year = searchParams.get("year")?.trim() || null;
    const section = searchParams.get("section")?.trim() || null;
    const searchQuery = searchParams.get("q")?.trim() || null;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || String(PROFILES_PER_PAGE), 10);

    // Validate pagination
    const validPage = Math.max(1, page);
    const validLimit = Math.min(50, Math.max(1, limit)); // Max 50 per page
    const offset = (validPage - 1) * validLimit;

    // Build query
    let query = supabaseServer
      .from("profiles")
      .select(
        `
        id,
        username,
        display_name,
        bio,
        avatar_url,
        branch,
        year,
        section,
        is_public,
        created_at
      `,
        { count: "exact" }
      )
      .eq("is_public", true); // Only public profiles

    // Apply filters
    if (branch) {
      query = query.eq("branch", branch);
    }

    if (year) {
      const yearNum = parseInt(year, 10);
      if (!isNaN(yearNum) && yearNum >= 1 && yearNum <= 4) {
        query = query.eq("year", yearNum);
      }
    }

    if (section) {
      query = query.eq("section", section);
    }

    // Text search on username, display_name, and bio
    if (searchQuery) {
      // Use ilike for case-insensitive pattern matching
      // Supabase PostgREST uses * as wildcard for ilike in .or() method
      // Escape special characters (*, \, %) that might interfere
      const escapedQuery = searchQuery.replace(/[*\\%_]/g, "\\$&");
      
      // Supabase .or() syntax: "column.operator.value,column2.operator.value2"
      // Use * wildcards for pattern matching: *pattern* means contains pattern
      query = query.or(
        `username.ilike.*${escapedQuery}*,display_name.ilike.*${escapedQuery}*,bio.ilike.*${escapedQuery}*`
      );
    }

    // Order by creation date (newest first)
    query = query.order("created_at", { ascending: false });

    // Apply pagination
    query = query.range(offset, offset + validLimit - 1);

    // Execute query
    const { data: profiles, error, count } = await query;

    if (error) {
      console.error("Error fetching profiles:", error);
      
      // Check if it's a "table not found" error
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        return NextResponse.json(
          {
            error: "Database tables not found",
            details: "The profiles table does not exist. Database migrations have not been run.",
            hint: "Please run migrations in Supabase SQL Editor. See README.md section 'Database Setup' for instructions.",
            code: error.code,
            action: "Run the SQL from supabase/migrations/001_initial_schema.sql in Supabase SQL Editor",
          },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { 
          error: "Failed to fetch profiles", 
          details: error.message,
          code: error.code,
        },
        { status: 500 }
      );
    }

    // Calculate pagination metadata
    const totalPages = count ? Math.ceil(count / validLimit) : 0;
    const hasNextPage = validPage < totalPages;
    const hasPrevPage = validPage > 1;

    return NextResponse.json(
      {
        profiles: profiles || [],
        pagination: {
          page: validPage,
          limit: validLimit,
          total: count || 0,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
        filters: {
          branch: branch || null,
          year: year ? parseInt(year, 10) : null,
          section: section || null,
          searchQuery: searchQuery || null,
        },
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
