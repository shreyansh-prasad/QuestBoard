import { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import ProfileCard from "@/components/ProfileCard";
import FollowButton from "@/components/FollowButton";
import ProfileLikeButton from "@/components/ProfileLikeButton";
import QuestCardWithEditor from "@/components/QuestCardWithEditor";
import PostListWithSort from "@/components/PostListWithSort";
import Link from "next/link";
import ProfileActionButtons from "@/components/ProfileActionButtons";
import ShareProfileButton from "@/components/ShareProfileButton";

interface PageProps {
  params: Promise<{ username: string }>;
}

async function getProfileData(username: string) {
  // Check if the requesting user owns this profile
  let currentUserId: string | null = null;
  try {
    const { createSupabaseServerClient } = await import("@/lib/supabaseServerAuth");
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    currentUserId = user?.id || null;
  } catch (error) {
    // If we can't get the user, continue with null - will only show public profiles
    console.error("Error checking current user:", error);
  }

  // Fetch profile - use server client to bypass RLS for check, but filter appropriately
  const { data: profile, error: profileError } = await supabaseServer
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
      created_at,
      email,
      user_id
    `
    )
    .eq("username", username)
    .single();

  if (profileError || !profile) {
    return null;
  }

  // If profile is private and user doesn't own it, return null
  if (!profile.is_public && profile.user_id !== currentUserId) {
    return null;
  }

  // Check if viewing own profile
  const isOwnProfile = currentUserId === profile.user_id;

  // Fetch quests with KPIs
  // If viewing someone else's profile, exclude archived quests
  let questsQuery = supabaseServer
    .from("quests")
    .select(
      `
      id,
      title,
      description,
      status,
      progress,
      created_at,
      updated_at
    `
    )
    .eq("profile_id", profile.id);
  
  // If viewing someone else's profile, exclude archived quests
  if (!isOwnProfile) {
    questsQuery = questsQuery.neq("status", "archived");
  }
  
  const { data: quests } = await questsQuery.order("created_at", { ascending: false });

  // Fetch KPIs for each quest
  const questsWithKpis = await Promise.all(
    (quests || []).map(async (quest) => {
      const { data: kpis } = await supabaseServer
        .from("kpis")
        .select("*")
        .eq("quest_id", quest.id)
        .order("created_at", { ascending: false });

      // Convert NUMERIC values to numbers (PostgreSQL NUMERIC returns as string)
      const kpisWithNumbers = (kpis || []).map((kpi: any) => ({
        ...kpi,
        value: kpi.value != null ? Number(kpi.value) : 0,
        target: kpi.target != null ? Number(kpi.target) : null,
      }));

      return {
        ...quest,
        kpis: kpisWithNumbers,
      };
    })
  );

  // Fetch posts - show all posts if viewing own profile, only published if viewing others
  let postsQuery = supabaseServer
    .from("posts")
    .select(
      `
      id,
      title,
      content,
      is_published,
      created_at,
      quest_id,
      slug
    `
    )
    .eq("profile_id", profile.id);
  
  // If viewing someone else's profile, only show published posts
  if (!isOwnProfile) {
    postsQuery = postsQuery.eq("is_published", true);
  }
  
  const { data: posts } = await postsQuery.order("created_at", { ascending: false });

  // Fetch post likes and quest information for each post
  const postsWithLikes = await Promise.all(
    (posts || []).map(async (post: any) => {
      // Get like count
      const { count: likeCount } = await supabaseServer
        .from("post_likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", post.id);

      // Check if current user has liked this post
      let isLiked = false;
      if (currentUserId) {
        const { data: currentProfile } = await supabaseServer
          .from("profiles")
          .select("id")
          .eq("user_id", currentUserId)
          .single();

        if (currentProfile && currentProfile.id !== profile.id) {
          const { data: likeData } = await supabaseServer
            .from("post_likes")
            .select("id")
            .eq("post_id", post.id)
            .eq("profile_id", currentProfile.id)
            .maybeSingle();

          isLiked = !!likeData;
        }
      }

      // Fetch quest title if post is linked to a quest
      let questTitle: string | null = null;
      if (post.quest_id) {
        const { data: quest, error: questError } = await supabaseServer
          .from("quests")
          .select("title")
          .eq("id", post.quest_id)
          .maybeSingle();
        
        if (!questError && quest) {
          questTitle = quest.title || null;
        }
      }

      return {
        ...post,
        likeCount: likeCount || 0,
        isLiked,
        questTitle,
      };
    })
  );

  // Fetch stats
  const [followersResult, followingResult, postCountResult, likesResult] =
    await Promise.all([
      supabaseServer
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("following_id", profile.id),
      supabaseServer
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("follower_id", profile.id),
      supabaseServer
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", profile.id)
        .eq("is_published", true), // Stats only count published posts
      supabaseServer
        .from("profile_likes")
        .select("id", { count: "exact", head: true })
        .eq("profile_id", profile.id),
    ]);

  const stats = {
    follower_count: followersResult.count || 0,
    following_count: followingResult.count || 0,
    quest_count: quests?.length || 0,
    post_count: postCountResult.count || 0,
    profile_likes_count: likesResult.count || 0,
  };

  // Check if current user is following this profile and if they've liked it
  let isFollowing = false;
  let isLiked = false;
  let currentUserProfileId: string | null = null;
  if (currentUserId) {
    // Get current user's profile
    const { data: currentProfile } = await supabaseServer
      .from("profiles")
      .select("id")
      .eq("user_id", currentUserId)
      .single();

    if (currentProfile) {
      currentUserProfileId = currentProfile.id;

      if (currentProfile.id !== profile.id) {
        // Check if current user is following this profile
        const { data: followData } = await supabaseServer
          .from("follows")
          .select("id")
          .eq("follower_id", currentProfile.id)
          .eq("following_id", profile.id)
          .single();

        isFollowing = !!followData;

        // Check if current user has liked this profile
        const { data: likeData } = await supabaseServer
          .from("profile_likes")
          .select("id")
          .eq("profile_id", profile.id)
          .eq("liker_profile_id", currentProfile.id)
          .single();

        isLiked = !!likeData;
      }
    }
  }

  return {
    profile,
    quests: questsWithKpis,
    posts: postsWithLikes || [],
    stats,
    isFollowing,
    isLiked,
    currentUserId,
    currentUserProfileId,
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  const data = await getProfileData(username);

  if (!data) {
    return {
      title: "Profile Not Found | QuestBoard",
    };
  }

  const { profile } = data;
  const displayName = profile.display_name || profile.username;
  const description = profile.bio || `${displayName}'s profile on QuestBoard`;
  const avatarUrl = profile.avatar_url || "";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const profileUrl = `${siteUrl}/u/${username}`;
  const ogImageUrl = `${siteUrl}/api/og/profile?username=${encodeURIComponent(username)}`;

  return {
    title: `${displayName} (@${username}) | QuestBoard`,
    description,
    openGraph: {
      title: `${displayName} (@${username})`,
      description,
      url: profileUrl,
      siteName: "QuestBoard",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${displayName}'s profile preview`,
        },
      ],
      locale: "en_US",
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title: `${displayName} (@${username})`,
      description,
      images: [ogImageUrl],
    },
    alternates: {
      canonical: profileUrl,
    },
  };
}

export default async function ProfilePage({ params }: PageProps) {
  const { username } = await params;
  const data = await getProfileData(username);

  if (!data) {
    notFound();
  }

  const { profile, quests, posts, stats, isFollowing, isLiked, currentUserId, currentUserProfileId } = data;
  const displayName = profile.display_name || profile.username;
  const isOwnProfile = currentUserId === profile.user_id;

  return (
    <main className="min-h-screen py-8">
      {/* Profile Card with Follow and Like Buttons */}
      <div className="relative">
        <ProfileCard profile={profile} stats={stats} showLink={false} isOwnProfile={isOwnProfile} />
        <div className="mt-4 flex flex-wrap gap-3">
          {isOwnProfile ? (
            <ProfileActionButtons username={profile.username} />
          ) : (
            <>
              <FollowButton
                profileId={profile.id}
                initialIsFollowing={isFollowing}
                initialFollowerCount={stats.follower_count}
              />
              <ProfileLikeButton
                profileId={profile.id}
                initialIsLiked={isLiked}
                initialLikeCount={stats.profile_likes_count || 0}
              />
            </>
          )}
          <ShareProfileButton username={profile.username} displayName={displayName} />
        </div>
      </div>

      {/* Quests Section */}
      {quests.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-2xl font-bold text-text-primary">Quests</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quests.map((quest) => (
              <QuestCardWithEditor
                key={quest.id}
                quest={quest}
                isEditable={isOwnProfile}
              />
            ))}
          </div>
        </section>
      )}

      {/* Posts Section */}
      {posts.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-2xl font-bold text-text-primary">
            Posts
          </h2>
          <PostListWithSort
            posts={posts}
            isEditable={isOwnProfile}
            currentUserId={currentUserId}
            currentUserProfileId={currentUserProfileId}
          />
        </section>
      )}

      {/* Empty State */}
      {quests.length === 0 && posts.length === 0 && (
        <div className="mt-8 rounded-card bg-background-card border border-border p-12 text-center">
          <p className="text-text-secondary">
            {displayName} hasn't created any quests or posts yet.
          </p>
        </div>
      )}
    </main>
  );
}
