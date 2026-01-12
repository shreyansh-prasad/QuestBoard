/**
 * Compute user scores directly in JavaScript as a fallback
 * when the database RPC function is not available
 */

interface UserScore {
  profile_id: string;
  total_score: number;
  normalized_score: number;
  quest_score: number;
  post_score: number;
  engagement_score: number;
  kpi_score: number;
  rank: number;
  branch: string | null;
  year: number | null;
  section: string | null;
  quest_count: number;
  post_count: number;
  kpi_count: number;
  follower_count: number;
  profile_like_count: number;
}

interface ProfileData {
  id: string;
  branch: string | null;
  year: number | null;
  section: number | null;
  is_public: boolean;
}

interface QuestData {
  id: string;
  profile_id: string;
  status: string;
}

interface PostData {
  profile_id: string;
  is_published: boolean;
}

interface KPIData {
  quest_id: string;
  value: number;
  target: number | null;
}

interface EngagementData {
  profile_id: string;
  follower_count: number;
  like_count: number;
}

export async function computeUserScoresFallback(
  supabaseServer: any
): Promise<UserScore[]> {
  // Fetch all public profiles
  const { data: profiles, error: profilesError } = await supabaseServer
    .from("profiles")
    .select("id, branch, year, section, is_public")
    .eq("is_public", true);

  if (profilesError || !profiles) {
    return [];
  }

  const profileIds = profiles.map((p: ProfileData) => p.id);

  if (profileIds.length === 0) {
    return [];
  }

  // Fetch all quests
  const { data: quests, error: questsError } = await supabaseServer
    .from("quests")
    .select("id, profile_id, status")
    .in("profile_id", profileIds);

  // Fetch all posts - try is_published first, fallback to published
  let posts: any[] = [];
  const { data: postsData1, error: postsError1 } = await supabaseServer
    .from("posts")
    .select("id, profile_id, is_published")
    .in("profile_id", profileIds);
  
  if (!postsError1 && postsData1) {
    posts = postsData1;
  } else {
    // Fallback to published column
    const { data: postsData2, error: postsError2 } = await supabaseServer
      .from("posts")
      .select("id, profile_id, published")
      .in("profile_id", profileIds);
    
    if (!postsError2 && postsData2) {
      posts = postsData2.map((p: any) => ({
        ...p,
        is_published: p.published,
      }));
    }
  }

  // Fetch all KPIs
  const questIds = (quests || []).map((q: any) => q.id);
  const { data: kpis, error: kpisError } = questIds.length > 0
    ? await supabaseServer
        .from("kpis")
        .select("id, quest_id, value, target")
        .in("quest_id", questIds)
    : { data: null, error: null };

  // Fetch post likes count per profile - try is_published first, fallback to published
  let allPosts: any[] = [];
  const { data: allPostsData1, error: allPostsError1 } = await supabaseServer
    .from("posts")
    .select("id, profile_id")
    .in("profile_id", profileIds)
    .eq("is_published", true);
  
  if (!allPostsError1 && allPostsData1) {
    allPosts = allPostsData1;
  } else {
    // Fallback to published column
    const { data: allPostsData2, error: allPostsError2 } = await supabaseServer
      .from("posts")
      .select("id, profile_id")
      .in("profile_id", profileIds)
      .eq("published", true);
    
    if (!allPostsError2 && allPostsData2) {
      allPosts = allPostsData2;
    }
  }

  const postIds = (allPosts || []).map((p: any) => p.id);
  const postLikesCounts: Record<string, number> = {};
  
  if (postIds.length > 0) {
    const { data: postLikes, error: postLikesError } = await supabaseServer
      .from("post_likes")
      .select("post_id")
      .in("post_id", postIds);

    // Count likes per profile
    (postLikes || []).forEach((like: any) => {
      const post = (allPosts || []).find((p: any) => p.id === like.post_id);
      if (post) {
        postLikesCounts[post.profile_id] = (postLikesCounts[post.profile_id] || 0) + 1;
      }
    });
  }

  // Fetch profile likes count
  const { data: profileLikes, error: profileLikesError } = await supabaseServer
    .from("profile_likes")
    .select("profile_id")
    .in("profile_id", profileIds);

  // Count profile likes
  const profileLikesCounts: Record<string, number> = {};
  (profileLikes || []).forEach((like: any) => {
    profileLikesCounts[like.profile_id] = (profileLikesCounts[like.profile_id] || 0) + 1;
  });

  // Fetch follower counts
  const { data: followers, error: followersError } = await supabaseServer
    .from("follows")
    .select("following_id")
    .in("following_id", profileIds);

  // Count followers
  const followerCounts: Record<string, number> = {};
  (followers || []).forEach((follow: any) => {
    followerCounts[follow.following_id] = (followerCounts[follow.following_id] || 0) + 1;
  });

  // Group data by profile
  const questsByProfile: Record<string, QuestData[]> = {};
  (quests || []).forEach((quest: QuestData) => {
    if (!questsByProfile[quest.profile_id]) {
      questsByProfile[quest.profile_id] = [];
    }
    questsByProfile[quest.profile_id].push(quest);
  });

  const postsByProfile: Record<string, PostData[]> = {};
  (posts || []).forEach((post: PostData) => {
    if (!postsByProfile[post.profile_id]) {
      postsByProfile[post.profile_id] = [];
    }
    postsByProfile[post.profile_id].push(post);
  });

  const kpisByQuest: Record<string, KPIData[]> = {};
  (kpis || []).forEach((kpi: KPIData) => {
    if (!kpisByQuest[kpi.quest_id]) {
      kpisByQuest[kpi.quest_id] = [];
    }
    kpisByQuest[kpi.quest_id].push(kpi);
  });

  // Compute scores for each profile
  const scores: UserScore[] = profiles.map((profile: ProfileData) => {
    const profileQuests = questsByProfile[profile.id] || [];
    const profilePosts = postsByProfile[profile.id] || [];

    // Count actual numbers
    const questCount = profileQuests.length;
    const publishedPosts = profilePosts.filter((p: PostData) => p.is_published);
    const postCount = publishedPosts.length;
    
    // Count KPIs
    let kpiCount = 0;
    profileQuests.forEach((quest: QuestData) => {
      const questKPIs = kpisByQuest[quest.id] || [];
      kpiCount += questKPIs.length;
    });

    const profileLikeCount = profileLikesCounts[profile.id] || 0;
    const followerCount = followerCounts[profile.id] || 0;

    // Quest Score: Active = 10, Completed = 50, Paused = 5
    let questScore = 0;
    profileQuests.forEach((quest: QuestData) => {
      if (quest.status === "completed") questScore += 50;
      else if (quest.status === "active") questScore += 10;
      else if (quest.status === "paused") questScore += 5;
    });

    // Post Score: Published post = 5 points, Post likes = 2 points per like
    let postScore = postCount * 5;
    postScore += (postLikesCounts[profile.id] || 0) * 2;

    // KPI Score: value > 0 = 1, at 80% = 5, at/exceed target = 10
    let kpiScore = 0;
    profileQuests.forEach((quest: QuestData) => {
      const questKPIs = kpisByQuest[quest.id] || [];
      questKPIs.forEach((kpi: KPIData) => {
        const value = Number(kpi.value) || 0;
        const target = kpi.target ? Number(kpi.target) : null;
        
        if (target && target > 0) {
          if (value >= target) kpiScore += 10;
          else if (value > 0 && value / target >= 0.8) kpiScore += 5;
          else if (value > 0) kpiScore += 1;
        } else if (value > 0) {
          kpiScore += 1;
        }
      });
    });

    // Engagement Score: Profile likes = 3 points, Followers = 5 points
    const engagementScore = profileLikeCount * 3 + followerCount * 5;

    const totalScore = questScore + postScore + kpiScore + engagementScore;

    return {
      profile_id: profile.id,
      total_score: totalScore,
      normalized_score: 0, // Will normalize after
      quest_score: questScore,
      post_score: postScore,
      engagement_score: engagementScore,
      kpi_score: kpiScore,
      rank: 0, // Will compute after
      branch: profile.branch,
      year: profile.year,
      section: profile.section ? String(profile.section) : null,
      quest_count: questCount,
      post_count: postCount,
      kpi_count: kpiCount,
      follower_count: followerCount,
      profile_like_count: profileLikeCount,
    };
  });

  // Normalize scores (0-100 scale)
  const totalScores = scores.map((s) => s.total_score);
  const minScore = Math.min(...totalScores);
  const maxScore = Math.max(...totalScores);
  const range = maxScore - minScore;

  scores.forEach((score) => {
    if (range > 0) {
      score.normalized_score = ((score.total_score - minScore) / range) * 100;
    } else {
      score.normalized_score = 0;
    }
  });

  // Calculate ranks
  scores.sort((a, b) => b.total_score - a.total_score);
  scores.forEach((score, index) => {
    score.rank = index + 1;
  });

  return scores;
}
