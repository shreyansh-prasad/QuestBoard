import Image from "next/image";
import Link from "next/link";

interface BlogCardProps {
  post: {
    id: string;
    title: string;
    content: string;
    created_at: string;
    thumbnail_url?: string | null;
    author?: {
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      branch?: string | null;
      year?: number | null;
      section?: string | null;
    } | null;
    likeCount?: number;
    commentCount?: number;
    quest_id?: string | null;
  };
  slug: string;
  className?: string;
}

// Generate a slug from post ID and title
export function generatePostSlug(id: string, title: string): string {
  const titleSlug = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces, underscores, and hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens

  // Use first 8 characters of ID + title slug for uniqueness
  const shortId = id.substring(0, 8);
  return `${shortId}-${titleSlug}` || shortId;
}

export default function BlogCard({ post, slug, className = "" }: BlogCardProps) {
  // Extract first image from markdown content or use thumbnail
  const extractImageFromContent = (content: string): string | null => {
    // Match markdown image syntax: ![alt](url)
    const imageMatch = content.match(/!\[.*?\]\((.*?)\)/);
    if (imageMatch && imageMatch[1]) {
      return imageMatch[1];
    }
    // Match HTML img tags
    const imgTagMatch = content.match(/<img[^>]+src="([^"]+)"/i);
    if (imgTagMatch && imgTagMatch[1]) {
      return imgTagMatch[1];
    }
    return null;
  };

  const thumbnailUrl = post.thumbnail_url || extractImageFromContent(post.content);
  
  // Extract excerpt from content (first 150 characters, strip markdown)
  const getExcerpt = (content: string): string => {
    const plainText = content
      .replace(/!\[.*?\]\(.*?\)/g, "") // Remove images
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Convert links to text
      .replace(/#{1,6}\s+/g, "") // Remove headers
      .replace(/\*\*([^*]+)\*\*/g, "$1") // Remove bold
      .replace(/\*([^*]+)\*/g, "$1") // Remove italic
      .replace(/`([^`]+)`/g, "$1") // Remove code
      .trim();

    return plainText.length > 150
      ? plainText.substring(0, 150) + "..."
      : plainText;
  };

  const excerpt = getExcerpt(post.content);
  const formattedDate = new Date(post.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article
      className={`group rounded-card bg-background-card border border-border overflow-hidden transition-all hover:border-text-secondary/50 hover:shadow-lg ${className}`}
    >
      <Link
        href={`/blogs/${slug}`}
        className="block focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background rounded-card"
        aria-label={`Read blog post: ${post.title}`}
      >
        {/* Thumbnail */}
        <div className="relative h-48 w-full overflow-hidden bg-background">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={post.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-background to-background-card">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-text-muted"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="mt-2 text-xs text-text-muted">No thumbnail</p>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Metrics */}
          <div className="mb-3 flex items-center gap-4 text-sm text-text-muted">
            {typeof post.commentCount === "number" && (
              <span className="inline-flex items-center gap-1">
                <span aria-hidden="true">💬</span>
                <span>:{post.commentCount}</span>
              </span>
            )}
            {typeof post.likeCount === "number" && (
              <span className="inline-flex items-center gap-1">
                <span aria-hidden="true">❤️</span>
                <span>:{post.likeCount}</span>
              </span>
            )}
            {post.quest_id && (
              <span className="inline-flex items-center gap-1">
                <span aria-hidden="true">⭐</span>
                <span>:0</span>
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="mb-3 text-xl font-semibold text-text-primary line-clamp-2 group-hover:text-text-secondary transition-colors">
            {post.title}
          </h2>

          {/* Date */}
          <time
            dateTime={post.created_at}
            className="text-sm text-text-muted"
          >
            {formattedDate}
          </time>
        </div>
      </Link>
    </article>
  );
}
