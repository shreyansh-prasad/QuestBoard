import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { computeUserScoresFallback } from "@/lib/leaderboardScores";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    
    // Get filter parameters
    const branch = searchParams.get("branch")?.trim() || null;
    const year = searchParams.get("year")?.trim() || null;

    // Build query - read from user_scores table (precomputed)
    let query = supabaseServer
      .from("user_scores")
      .select(
        `
        profile_id,
        total_score,
        normalized_score,
        quest_score,
        post_score,
        engagement_score,
        kpi_score,
        rank,
        branch,
        year,
        section,
        computed_at,
        profiles!user_scores_profile_id_fkey (
          username,
          display_name,
          avatar_url,
          bio,
          is_public
        )
      `,
        { count: "exact" }
      )
      .order("normalized_score", { ascending: false })
      .limit(100); // Limit to top 100

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

    // Execute query
    let { data: scores, error, count } = await query;

    if (error) {
      console.error("Error fetching leaderboard:", error);
      
      // Check if it's a "table not found" error - use fallback computation instead
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        console.log("user_scores table not found, using fallback computation...");
        try {
          // Use fallback JavaScript computation
          const computedScores = await computeUserScoresFallback(supabaseServer);
          if (computedScores.length > 0) {
            scores = computedScores as any;
            count = computedScores.length;
          } else {
            scores = [];
            count = 0;
          }
        } catch (fallbackError) {
          console.error("Fallback computation error:", fallbackError);
          scores = [];
          count = 0;
        }
      } else {
        return NextResponse.json(
          { 
            error: "Failed to fetch leaderboard", 
            details: error.message,
            code: error.code,
          },
          { status: 500 }
        );
      }
    }

    // Always compute scores to ensure all public profiles are included
    // This ensures new profiles appear in the leaderboard
    try {
      // Call the compute_user_scores RPC function to refresh scores
      const { error: computeError } = await supabaseServer.rpc("compute_user_scores");
      
      if (computeError) {
        // If function doesn't exist, use fallback computation
        if (computeError.code === '42883' || computeError.message?.includes('function') || computeError.message?.includes('does not exist')) {
          console.log("RPC function not found, using fallback computation...");
          try {
            // Use fallback JavaScript computation
            const computedScores = await computeUserScoresFallback(supabaseServer);
            
            if (computedScores.length > 0) {
              // Store computed scores in user_scores table (if it exists)
              try {
                await Promise.all(
                  computedScores.map((score) =>
                    supabaseServer
                      .from("user_scores")
                      .upsert({
                        profile_id: score.profile_id,
                        total_score: score.total_score,
                        normalized_score: score.normalized_score,
                        quest_score: score.quest_score,
                        post_score: score.post_score,
                        engagement_score: score.engagement_score,
                        kpi_score: score.kpi_score,
                        rank: score.rank,
                        branch: score.branch,
                        year: score.year,
                        section: score.section,
                        computed_at: new Date().toISOString(),
                      }, {
                        onConflict: 'profile_id'
                      })
                      .select()
                  )
                );
              } catch (upsertError) {
                // If user_scores table doesn't exist, continue without storing
                console.log("user_scores table doesn't exist, skipping storage");
              }
            }
          } catch (fallbackError) {
            console.error("Fallback computation error:", fallbackError);
          }
        }
      }
      
      // Retry the query after computing scores to get updated results
      const retryQuery = supabaseServer
        .from("user_scores")
        .select(
          `
          profile_id,
          total_score,
          normalized_score,
          quest_score,
          post_score,
          engagement_score,
          kpi_score,
          rank,
          branch,
          year,
          section,
          computed_at,
          profiles!user_scores_profile_id_fkey (
            username,
            display_name,
            avatar_url,
            bio,
            is_public
          )
        `,
          { count: "exact" }
        )
        .order("normalized_score", { ascending: false })
        .limit(100);

      // Re-apply filters
      if (branch) {
        retryQuery.eq("branch", branch);
      }
      if (year) {
        const yearNum = parseInt(year, 10);
        if (!isNaN(yearNum) && yearNum >= 1 && yearNum <= 4) {
          retryQuery.eq("year", yearNum);
        }
      }

      const retryResult = await retryQuery;
      if (!retryResult.error) {
        scores = retryResult.data;
        count = retryResult.count;
      }
    } catch (computeErr: any) {
      console.error("Error computing scores:", computeErr);
      // Continue with existing scores if computation fails
    }

    // Fetch profile data if scores don't have it (fallback computation case)
    let scoresWithProfiles = scores || [];
    const profileIds = scoresWithProfiles.length > 0 ? scoresWithProfiles.map((s: any) => s.profile_id) : [];
    
    // Fetch counts for all profiles (needed for display)
    if (profileIds.length > 0) {
      const [profilesData, questsData, postsData, followersData, profileLikesData] = await Promise.all([
        supabaseServer
          .from("profiles")
          .select("id, username, display_name, avatar_url, bio, is_public")
          .in("id", profileIds),
        supabaseServer
          .from("quests")
          .select("id, profile_id")
          .in("profile_id", profileIds),
        supabaseServer
          .from("posts")
          .select("id, profile_id, is_published")
          .in("profile_id", profileIds)
          .eq("is_published", true),
        supabaseServer
          .from("follows")
          .select("following_id")
          .in("following_id", profileIds),
        supabaseServer
          .from("profile_likes")
          .select("profile_id")
          .in("profile_id", profileIds),
      ]);

      // Fetch KPIs for all quests
      const questIds = (questsData?.data || []).map((q: any) => q.id);
      const kpisData = questIds.length > 0
        ? await supabaseServer
            .from("kpis")
            .select("id, quest_id")
            .in("quest_id", questIds)
        : { data: null };

      // Compute counts per profile
      const questCounts: Record<string, number> = {};
      (questsData?.data || []).forEach((quest: any) => {
        questCounts[quest.profile_id] = (questCounts[quest.profile_id] || 0) + 1;
      });

      const postCounts: Record<string, number> = {};
      (postsData?.data || []).forEach((post: any) => {
        postCounts[post.profile_id] = (postCounts[post.profile_id] || 0) + 1;
      });

      // Group KPIs by quest, then count by profile
      const kpisByQuest: Record<string, number> = {};
      (kpisData?.data || []).forEach((kpi: any) => {
        kpisByQuest[kpi.quest_id] = (kpisByQuest[kpi.quest_id] || 0) + 1;
      });
      const kpiCounts: Record<string, number> = {};
      (questsData?.data || []).forEach((quest: any) => {
        kpiCounts[quest.profile_id] = (kpiCounts[quest.profile_id] || 0) + (kpisByQuest[quest.id] || 0);
      });

      const followerCounts: Record<string, number> = {};
      (followersData?.data || []).forEach((follow: any) => {
        followerCounts[follow.following_id] = (followerCounts[follow.following_id] || 0) + 1;
      });

      const profileLikeCounts: Record<string, number> = {};
      (profileLikesData?.data || []).forEach((like: any) => {
        profileLikeCounts[like.profile_id] = (profileLikeCounts[like.profile_id] || 0) + 1;
      });

      if (scoresWithProfiles.length > 0 && !scoresWithProfiles[0]?.profiles) {
        // Map profiles to scores
        const profilesMap = new Map((profilesData?.data || []).map((p: any) => [p.id, p]));
        scoresWithProfiles = scoresWithProfiles.map((score: any) => ({
          ...score,
          profiles: profilesMap.get(score.profile_id) || null,
          quest_count: score.quest_count !== undefined ? score.quest_count : (questCounts[score.profile_id] || 0),
          post_count: score.post_count !== undefined ? score.post_count : (postCounts[score.profile_id] || 0),
          kpi_count: score.kpi_count !== undefined ? score.kpi_count : (kpiCounts[score.profile_id] || 0),
          follower_count: score.follower_count !== undefined ? score.follower_count : (followerCounts[score.profile_id] || 0),
          profile_like_count: score.profile_like_count !== undefined ? score.profile_like_count : (profileLikeCounts[score.profile_id] || 0),
        }));
      } else {
        // Add counts to scores that already have profiles
        scoresWithProfiles = scoresWithProfiles.map((score: any) => ({
          ...score,
          quest_count: score.quest_count !== undefined ? score.quest_count : (questCounts[score.profile_id] || 0),
          post_count: score.post_count !== undefined ? score.post_count : (postCounts[score.profile_id] || 0),
          kpi_count: score.kpi_count !== undefined ? score.kpi_count : (kpiCounts[score.profile_id] || 0),
          follower_count: score.follower_count !== undefined ? score.follower_count : (followerCounts[score.profile_id] || 0),
          profile_like_count: score.profile_like_count !== undefined ? score.profile_like_count : (profileLikeCounts[score.profile_id] || 0),
        }));
      }
    }

    // Transform data to flatten profile information
    const entries = scoresWithProfiles
      .map((score: any) => {
        // Handle different profile join structures
        let profile = null;
        if (score.profiles) {
          profile = Array.isArray(score.profiles) 
            ? score.profiles[0] 
            : score.profiles;
        }
        
        // If no profile data, skip this entry
        if (!profile || !profile.username) {
          return null;
        }
        
        // Only include public profiles
        if (profile.is_public === false) {
          return null;
        }

        // Apply filters if needed
        if (branch && score.branch !== branch) {
          return null;
        }
        if (year) {
          const yearNum = parseInt(year, 10);
          if (!isNaN(yearNum) && score.year !== yearNum) {
            return null;
          }
        }
        
        return {
          profile_id: score.profile_id,
          total_score: parseFloat(String(score.total_score)) || 0,
          normalized_score: parseFloat(String(score.normalized_score)) || 0,
          quest_score: parseFloat(String(score.quest_score)) || 0,
          post_score: parseFloat(String(score.post_score)) || 0,
          engagement_score: parseFloat(String(score.engagement_score)) || 0,
          kpi_score: parseFloat(String(score.kpi_score)) || 0,
          rank: parseInt(String(score.rank)) || 0,
          branch: score.branch || null,
          year: score.year ? parseInt(String(score.year)) : null,
          section: score.section || null,
          username: profile.username,
          display_name: profile.display_name || null,
          avatar_url: profile.avatar_url || null,
          bio: profile.bio || null,
          quest_count: score.quest_count !== undefined ? parseInt(String(score.quest_count)) : 0,
          post_count: score.post_count !== undefined ? parseInt(String(score.post_count)) : 0,
          kpi_count: score.kpi_count !== undefined ? parseInt(String(score.kpi_count)) : 0,
          follower_count: score.follower_count !== undefined ? parseInt(String(score.follower_count)) : 0,
          profile_like_count: score.profile_like_count !== undefined ? parseInt(String(score.profile_like_count)) : 0,
        };
      })
      .filter((entry: any) => entry !== null) // Remove null entries
      .sort((a: any, b: any) => b.normalized_score - a.normalized_score); // Sort by normalized score

    return NextResponse.json(
      {
        entries,
        total: count || entries.length,
        filters: {
          branch: branch || null,
          year: year ? parseInt(year, 10) : null,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error?.message || "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
