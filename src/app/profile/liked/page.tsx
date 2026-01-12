import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { createSupabaseServerClient } from "@/lib/supabaseServerAuth";
import Link from "next/link";
import Image from "next/image";

async function getLikedProfilesData() {
  // Get authenticated user using @supabase/ssr
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null; // Will redirect to login
  }

  // Get current user's profile
  const { data: currentProfile, error: profileError } = await supabaseServer
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (profileError || !currentProfile) {
    return null;
  }

  // Step 1: Get all liked profile IDs (optimized single query - avoids N+1)
  // 
  // SCHEMA REQUIREMENT: The profile_likes table needs both liker and liked columns.
  // Based on stats query pattern (.eq("profile_id", profile.id) counts likes FOR a profile),
  // the schema should be:
  //   profile_likes.profile_id = the profile being liked
  //   profile_likes.liker_profile_id = who liked it (REQUIRED COLUMN)
  //
  // If your schema uses: profile_id = liker, liked_profile_id = liked, update queries below.
  //
  // OPTIMIZED QUERY (avoids N+1):
  // Instead of querying each profile's KPIs/posts separately, we:
  // 1. Fetch all liked profile IDs in one query
  // 2. Fetch all profiles in one query
  // 3. Fetch all quests for those profiles in one query
  // 4. Fetch all KPIs for those quests in one query
  // 5. Fetch latest posts per profile using a single optimized query
  // 6. Process results in memory (much faster than N+1 database calls)
  
  let likedProfileIds: string[] = [];
  
  // Query where liker_profile_id = current user (profile_id = liked profile)
  // This matches the schema where profile_id counts likes FOR a profile
  // Schema: profile_id = the profile being liked, liker_profile_id = who liked it
  const { data: likes1, error: error1 } = await supabaseServer
    .from("profile_likes")
    .select("profile_id")
    .eq("liker_profile_id", currentProfile.id);
  
  if (error1) {
    console.error("Error fetching profile likes (primary schema):", error1);
    // If column doesn't exist, try fallback schema
    if (error1.code === "42703" || error1.message?.includes("column") || error1.message?.includes("does not exist")) {
      // Fallback: Try alternative schema (profile_id = liker, liked_profile_id = liked)
      const { data: likes2, error: error2 } = await supabaseServer
        .from("profile_likes")
        .select("liked_profile_id")
        .eq("profile_id", currentProfile.id);
      
      if (error2) {
        console.error("Error fetching profile likes (fallback schema):", error2);
      } else if (likes2 && likes2.length > 0) {
        likedProfileIds = likes2
          .map((like: any) => like.liked_profile_id)
          .filter((id: string) => id && id !== currentProfile.id);
      }
    }
  } else if (likes1 && likes1.length > 0) {
    likedProfileIds = likes1
      .map((like: any) => like.profile_id)
      .filter((id: string) => id && id !== currentProfile.id);
  }

  if (likedProfileIds.length === 0) {
    return { profiles: [], currentProfileId: currentProfile.id };
  }

  // Step 2: Fetch all liked profiles in a single query
  const { data: profiles, error: profilesError } = await supabaseServer
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
    `
    )
    .in("id", likedProfileIds)
    .eq("is_public", true); // Only show public profiles

  if (profilesError || !profiles) {
    return { profiles: [], currentProfileId: currentProfile.id };
  }

  // Step 3: Fetch all quests for these profiles in a single query
  const { data: allQuests, error: questsError } = await supabaseServer
    .from("quests")
    .select("id, profile_id, title, status")
    .in("profile_id", likedProfileIds)
    .in("status", ["active", "paused", "completed"]); // Include active/completed quests

  // Group quests by profile_id
  const questsByProfile: Record<string, any[]> = {};
  (allQuests || []).forEach((quest: any) => {
    if (!questsByProfile[quest.profile_id]) {
      questsByProfile[quest.profile_id] = [];
    }
    questsByProfile[quest.profile_id].push(quest);
  });

  // Step 4: Fetch all KPIs for all quests in a single query (optimized)
  const questIds = (allQuests || []).map((q: any) => q.id);
  const { data: allKPIs, error: kpisError } = questIds.length > 0
    ? await supabaseServer
        .from("kpis")
        .select("id, quest_id, name, value, target, unit, updated_at")
        .in("quest_id", questIds)
        .order("updated_at", { ascending: false })
    : { data: null, error: null };

  // Group KPIs by quest_id, then by profile_id
  const kpisByQuest: Record<string, any[]> = {};
  (allKPIs || []).forEach((kpi: any) => {
    if (!kpisByQuest[kpi.quest_id]) {
      kpisByQuest[kpi.quest_id] = [];
    }
    kpisByQuest[kpi.quest_id].push(kpi);
  });

  // Step 5: Fetch latest post for each profile in optimized queries
  // We'll use a batch approach: fetch all posts and filter in JS
  const { data: allPosts, error: postsError } = await supabaseServer
    .from("posts")
    .select("id, profile_id, title, content, created_at")
    .in("profile_id", likedProfileIds)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  // Group posts by profile_id and get latest one for each
  const latestPostByProfile: Record<string, any> = {};
  (allPosts || []).forEach((post: any) => {
    if (!latestPostByProfile[post.profile_id]) {
      latestPostByProfile[post.profile_id] = post;
    }
  });

  // Step 6: Aggregate data per profile (avoiding N+1 by processing in memory)
  const profilesWithData = profiles.map((profile: any) => {
    const profileQuests = questsByProfile[profile.id] || [];
    
    // Get all KPIs for this profile's quests
    const allProfileKPIs: any[] = [];
    profileQuests.forEach((quest: any) => {
      const questKPIs = kpisByQuest[quest.id] || [];
      allProfileKPIs.push(...questKPIs.map((kpi: any) => ({
        ...kpi,
        quest_title: quest.title,
      })));
    });

    // Get top 3 KPIs: prioritize by value/target ratio, then by recency
    const topKPIs = allProfileKPIs
      .sort((a, b) => {
        // Calculate progress ratio for sorting
        const aRatio = a.target && a.target > 0 ? (a.value || 0) / a.target : 0;
        const bRatio = b.target && b.target > 0 ? (b.value || 0) / b.target : 0;
        
        // Sort by progress ratio (descending), then by value (descending), then by updated_at (descending)
        if (Math.abs(aRatio - bRatio) > 0.01) {
          return bRatio - aRatio;
        }
        if ((b.value || 0) !== (a.value || 0)) {
          return (b.value || 0) - (a.value || 0);
        }
        return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
      })
      .slice(0, 3);

    const latestPost = latestPostByProfile[profile.id] || null;

    return {
      profile,
      topKPIs,
      latestPost,
    };
  });

  return {
    profiles: profilesWithData,
    currentProfileId: currentProfile.id,
  };
}

export default async function LikedProfilesPage() {
  const data = await getLikedProfilesData();

  if (!data) {
    redirect("/auth/login");
  }

  const { profiles, currentProfileId } = data;

  return (
    <main className="min-h-screen py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="mb-2 text-4xl font-bold text-text-primary">
            Liked Profiles
          </h1>
          <p className="text-text-secondary">
            Profiles you've liked
          </p>
          {profiles.length === 0 && (
            <p className="mt-4 text-sm text-text-muted">
              You haven't liked any profiles yet. Start exploring and like profiles that inspire you!
            </p>
          )}
        </div>

        {/* Liked Profiles Grid */}
        {profiles.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map(({ profile }: any) => (
              <div
                key={profile.id}
                className="rounded-card bg-background-card border border-border p-6"
              >
                <div className="flex flex-col items-center text-center">
                  {/* Avatar */}
                  {profile.avatar_url ? (
                    <div className="relative h-20 w-20 mb-4 overflow-hidden rounded-full">
                      <Image
                        src={profile.avatar_url}
                        alt={profile.display_name || profile.username}
                        fill
                        className="object-cover"
                        sizes="80px"
                      />
                    </div>
                  ) : (
                    <div className="h-20 w-20 mb-4 rounded-full bg-text-muted/20 flex items-center justify-center">
                      <span className="text-2xl font-semibold text-text-muted">
                        {(profile.display_name || profile.username)[0].toUpperCase()}
                      </span>
                    </div>
                  )}

                  {/* Profile Info */}
                  <div className="w-full mb-4">
                    <Link
                      href={`/u/${profile.username}`}
                      className="group block"
                    >
                      <h2 className="text-lg font-semibold text-text-primary group-hover:text-text-secondary transition-colors">
                        {profile.display_name || profile.username}
                      </h2>
                      <p className="text-sm text-text-muted mt-1">
                        @{profile.username}
                      </p>
                    </Link>
                    
                    {/* Tags */}
                    <div className="mt-3 flex flex-wrap justify-center gap-2 text-xs text-text-muted">
                      {profile.branch && (
                        <span className="rounded-full bg-background px-2 py-1">
                          {profile.branch}
                        </span>
                      )}
                      {profile.year && (
                        <span className="rounded-full bg-background px-2 py-1">
                          Year {profile.year}
                        </span>
                      )}
                      {profile.section && (
                        <span className="rounded-full bg-background px-2 py-1">
                          Section {profile.section}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* View Profile Button */}
                  <Link
                    href={`/u/${profile.username}`}
                    className="w-full rounded-lg border border-border bg-background-card px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-background focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
                  >
                    View Profile
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-card bg-background-card border border-border p-12 text-center">
            <p className="text-text-secondary">
              You haven't liked any profiles yet.
            </p>
            <Link
              href="/explore"
              className="mt-4 inline-block rounded-lg bg-text-primary px-6 py-3 font-medium text-background transition-colors hover:bg-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
            >
              Explore Profiles
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
