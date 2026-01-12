import { supabaseServer } from "@/lib/supabaseServer";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import TrackerCard from "@/components/TrackerCard";
import { generatePostSlug } from "@/components/BlogCard";

interface PageProps {
  params: {
    slug: string;
  };
}

async function getPostBySlug(slug: string) {
  try {
    // Fetch all published posts from public profiles (limited to recent ones for performance)
    // In production, you might want to store slugs in the database or use a different approach
    const { data: publicProfiles, error: profilesError } = await supabaseServer
      .from("profiles")
      .select("id")
      .eq("is_public", true);

    if (profilesError) {
      console.error("Error fetching public profiles:", profilesError);
      return null;
    }

    const publicProfileIds = (publicProfiles || []).map((p) => p.id);

    if (publicProfileIds.length === 0) {
      return null;
    }

    // Fetch recent published posts (limit to last 1000 for performance)
    const { data: posts, error: postsError } = await supabaseServer
      .from("posts")
      .select(
        `
        id,
        title,
        content,
        created_at,
        quest_id,
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
      .order("created_at", { ascending: false })
      .limit(1000);

    if (postsError) {
      console.error("Error fetching posts:", postsError);
      return null;
    }

    if (!posts || posts.length === 0) {
      return null;
    }

    // Find post that matches the slug
    const matchingPost = posts.find((post: any) => {
      try {
        const generatedSlug = generatePostSlug(post.id, post.title);
        return generatedSlug === slug;
      } catch (error) {
        console.error("Error generating slug for post:", post.id, error);
        return false;
      }
    });

    if (!matchingPost) {
      return null;
    }

    // Handle profile relation
    const profileData = Array.isArray(matchingPost.profiles)
      ? matchingPost.profiles[0]
      : matchingPost.profiles;

    // Fetch related quest and KPIs if quest_id exists
    let quest = null;
    let kpis: any[] = [];

    if (matchingPost.quest_id) {
      const { data: questData, error: questError } = await supabaseServer
        .from("quests")
        .select("id, title, description, status")
        .eq("id", matchingPost.quest_id)
        .single();

      if (questError) {
        console.error("Error fetching quest:", questError);
      } else if (questData) {
        quest = questData;

        // Fetch KPIs for this quest
        const { data: kpisData, error: kpisError } = await supabaseServer
          .from("kpis")
          .select("id, name, value, target, unit")
          .eq("quest_id", quest.id)
          .order("created_at", { ascending: false });

        if (kpisError) {
          console.error("Error fetching KPIs:", kpisError);
        } else {
          kpis = kpisData || [];
        }
      }
    }

    // Get like count
    const { data: likesData, error: likesError } = await supabaseServer
      .from("post_likes")
      .select("id")
      .eq("post_id", matchingPost.id);

    if (likesError) {
      console.error("Error fetching likes:", likesError);
    }

    const likeCount = likesData?.length || 0;

    return {
      id: matchingPost.id,
      title: matchingPost.title,
      content: matchingPost.content,
      created_at: matchingPost.created_at,
      quest_id: matchingPost.quest_id,
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
      quest,
      kpis,
      likeCount,
    };
  } catch (error) {
    console.error("Error in getPostBySlug:", error);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = params;
  const post = await getPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  // Extract excerpt for description
  const excerpt = post.content
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim()
    .substring(0, 160);

  return {
    title: `${post.title} | QuestBoard`,
    description: excerpt,
    openGraph: {
      title: post.title,
      description: excerpt,
      type: "article",
      publishedTime: post.created_at,
      authors: post.author ? [post.author.username] : undefined,
    },
  };
}

export default async function BlogDetailPage({ params }: PageProps) {
  const { slug } = params;
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const formattedDate = new Date(post.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Custom sanitization schema for rehype-sanitize
  // Only allow safe HTML tags and attributes, prevent script injection
  // This ensures no script tags or dangerous HTML can be executed
  const sanitizeSchema = {
    tagNames: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "blockquote",
      "pre",
      "code",
      "a",
      "img",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
      "hr",
    ],
    attributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      code: ["className"],
    },
    protocols: {
      href: ["http", "https", "mailto"],
      src: ["http", "https"],
    },
  };

  return (
    <main className="min-h-screen py-8">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* Back Button */}
        {post.author && (
          <Link
            href={`/u/${post.author.username}`}
            className="mb-6 inline-flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background rounded"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to {post.author.display_name || post.author.username}'s Profile
          </Link>
        )}

        {/* Header */}
        <header className="mb-8">
          <h1 className="mb-4 text-4xl font-bold text-text-primary">
            {post.title}
          </h1>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted">
            {post.author && (
              <Link
                href={`/u/${post.author.username}`}
                className="flex items-center gap-2 hover:text-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background rounded"
              >
                {post.author.avatar_url ? (
                  <div className="relative h-8 w-8 overflow-hidden rounded-full">
                    <Image
                      src={post.author.avatar_url}
                      alt={post.author.display_name || post.author.username}
                      fill
                      className="object-cover"
                      sizes="32px"
                    />
                  </div>
                ) : (
                  <div className="h-8 w-8 rounded-full bg-text-muted/20 flex items-center justify-center">
                    <span className="text-xs">
                      {(post.author.display_name || post.author.username)[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <span>{post.author.display_name || post.author.username}</span>
              </Link>
            )}

            <time dateTime={post.created_at}>{formattedDate}</time>

            {post.author?.branch && (
              <span className="rounded-full bg-background px-2.5 py-1 text-xs font-medium text-text-secondary">
                {post.author.branch}
              </span>
            )}

            {post.author?.year && (
              <span className="rounded-full bg-background px-2.5 py-1 text-xs font-medium text-text-secondary">
                Year {post.author.year}
              </span>
            )}

            {post.likeCount > 0 && (
              <span className="inline-flex items-center gap-1 text-text-secondary">
                <span aria-hidden="true">❤️</span>
                <span>{post.likeCount}</span>
              </span>
            )}
          </div>
        </header>

        {/* Tracker Cards Section */}
        {post.kpis && post.kpis.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold text-text-primary">
              Tracker Metrics
            </h2>
            {post.quest && (
              <p className="mb-4 text-sm text-text-secondary">
                Linked to quest:{" "}
                <span className="font-medium">{post.quest.title}</span>
              </p>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {post.kpis.map((kpi: any) => (
                <TrackerCard
                  key={kpi.id}
                  name={kpi.name}
                  value={kpi.value}
                  target={kpi.target}
                  unit={kpi.unit}
                />
              ))}
            </div>
          </section>
        )}

        {/* Content */}
        <article className="prose prose-invert prose-lg max-w-none">
          <div className="rounded-card bg-background-card border border-border p-6 sm:p-8">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
              components={{
                // Custom styling for markdown elements
                h1: ({ ...props }: any) => (
                  <h1
                    className="mb-4 mt-6 text-3xl font-bold text-text-primary first:mt-0"
                    {...props}
                  />
                ),
                h2: ({ ...props }: any) => (
                  <h2
                    className="mb-3 mt-5 text-2xl font-semibold text-text-primary"
                    {...props}
                  />
                ),
                h3: ({ ...props }: any) => (
                  <h3
                    className="mb-2 mt-4 text-xl font-semibold text-text-primary"
                    {...props}
                  />
                ),
                p: ({ ...props }: any) => (
                  <p className="mb-4 text-text-secondary leading-relaxed" {...props} />
                ),
                a: ({ ...props }: any) => (
                  <a
                    className="text-text-primary underline hover:text-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background rounded"
                    target="_blank"
                    rel="noopener noreferrer"
                    {...props}
                  />
                ),
                img: ({ ...props }: any) => (
                  <div className="my-6 overflow-hidden rounded-lg">
                    <img
                      className="w-full object-cover"
                      alt={props.alt || ""}
                      {...props}
                    />
                  </div>
                ),
                code: ({ inline, ...props }: any) =>
                  inline ? (
                    <code
                      className="rounded bg-background px-1.5 py-0.5 font-mono text-sm text-text-primary"
                      {...props}
                    />
                  ) : (
                    <code
                      className="block overflow-x-auto rounded-lg bg-background p-4 font-mono text-sm text-text-primary"
                      {...props}
                    />
                  ),
                ul: ({ ...props }: any) => (
                  <ul className="mb-4 ml-6 list-disc text-text-secondary" {...props} />
                ),
                ol: ({ ...props }: any) => (
                  <ol className="mb-4 ml-6 list-decimal text-text-secondary" {...props} />
                ),
                li: ({ ...props }: any) => (
                  <li className="mb-1 text-text-secondary" {...props} />
                ),
                blockquote: ({ ...props }: any) => (
                  <blockquote
                    className="my-4 border-l-4 border-text-muted pl-4 italic text-text-secondary"
                    {...props}
                  />
                ),
                hr: ({ ...props }: any) => (
                  <hr className="my-6 border-border" {...props} />
                ),
              }}
            >
              {post.content}
            </ReactMarkdown>
          </div>
        </article>
      </div>
    </main>
  );
}
