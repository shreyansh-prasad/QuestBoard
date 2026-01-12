import { supabaseServer } from "@/lib/supabaseServer";
import BlogCard from "@/components/BlogCard";
import { generatePostSlug } from "@/components/BlogCard";
import Link from "next/link";

async function getAllPublishedPosts() {
  // Fetch all published posts from public profiles
  const { data: publicProfiles, error: profilesError } = await supabaseServer
    .from("profiles")
    .select("id")
    .eq("is_public", true);

  if (profilesError || !publicProfiles || publicProfiles.length === 0) {
    return [];
  }

  const publicProfileIds = publicProfiles.map((p) => p.id);

  // Fetch all published posts
  const { data: posts, error: postsError } = await supabaseServer
    .from("posts")
    .select(
      `
      id,
      title,
      content,
      created_at,
      thumbnail_url,
      quest_id,
      profile_id,
      profiles!posts_profile_id_fkey (
        id,
        username,
        display_name,
        avatar_url,
        branch,
        year,
        section
      )
    `
    )
    .eq("is_published", true)
    .in("profile_id", publicProfileIds)
    .order("created_at", { ascending: false });

  if (postsError || !posts) {
    return [];
  }

  // Fetch likes and comments for all posts
  const postIds = posts.map((p: any) => p.id);

  // Get like counts
  const { data: likesData } = await supabaseServer
    .from("post_likes")
    .select("post_id")
    .in("post_id", postIds);

  // Get comment counts (if comments table exists)
  const { data: commentsData } = await supabaseServer
    .from("comments")
    .select("post_id")
    .in("post_id", postIds);

  // Count likes and comments per post
  const likesCountMap: Record<string, number> = {};
  (likesData || []).forEach((like: any) => {
    likesCountMap[like.post_id] = (likesCountMap[like.post_id] || 0) + 1;
  });

  const commentsCountMap: Record<string, number> = {};
  (commentsData || []).forEach((comment: any) => {
    commentsCountMap[comment.post_id] = (commentsCountMap[comment.post_id] || 0) + 1;
  });

  // Combine data
  const postsWithMetrics = posts.map((post: any) => {
    const profileData = Array.isArray(post.profiles)
      ? post.profiles[0]
      : post.profiles;

    return {
      id: post.id,
      title: post.title,
      content: post.content,
      created_at: post.created_at,
      thumbnail_url: post.thumbnail_url,
      quest_id: post.quest_id,
      likeCount: likesCountMap[post.id] || 0,
      commentCount: commentsCountMap[post.id] || 0,
      author:
        profileData && typeof profileData === "object"
          ? {
              username: profileData.username,
              display_name: profileData.display_name,
              avatar_url: profileData.avatar_url,
              branch: profileData.branch || null,
              year: profileData.year || null,
              section: profileData.section || null,
            }
          : null,
    };
  });

  return postsWithMetrics;
}

export default async function BlogsPage() {
  const posts = await getAllPublishedPosts();

  return (
    <main className="min-h-screen py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-text-primary">
            Blogs & Journey
          </h1>
          <p className="text-text-secondary">
            New day new challenges and a new blog
          </p>
          <Link
            href="/posts/new"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-background-card px-6 py-3 text-sm font-medium text-text-primary transition-colors hover:bg-background focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
          >
            <span>✨</span>
            <span>Let's Do This</span>
          </Link>
        </div>

        {/* Posts Grid */}
        {posts.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post: any) => (
              <BlogCard
                key={post.id}
                post={post}
                slug={generatePostSlug(post.id, post.title)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-card bg-background-card border border-border p-12 text-center">
            <p className="text-text-secondary">
              No blogs published yet. Be the first to share your journey!
            </p>
            <Link
              href="/posts/new"
              className="mt-4 inline-block rounded-lg bg-text-primary px-6 py-3 font-medium text-background transition-colors hover:bg-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
            >
              Create Your First Blog
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
