"use client";

import { useState, useMemo } from "react";
import PostCardWithEditor from "./PostCardWithEditor";

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  slug: string | null;
  likeCount: number;
  isLiked: boolean;
  quest_id?: string | null;
  questTitle?: string | null;
}

interface PostListWithSortProps {
  posts: Post[];
  isEditable: boolean;
  currentUserId: string | null;
  currentUserProfileId: string | null;
}

type SortOption = "latest" | "most-liked" | "oldest";

export default function PostListWithSort({
  posts,
  isEditable,
  currentUserId,
  currentUserProfileId,
}: PostListWithSortProps) {
  const [sortBy, setSortBy] = useState<SortOption>("latest");

  const sortedPosts = useMemo(() => {
    const postsCopy = [...posts];

    switch (sortBy) {
      case "latest":
        return postsCopy.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case "oldest":
        return postsCopy.sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      case "most-liked":
        return postsCopy.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
      default:
        return postsCopy;
    }
  }, [posts, sortBy]);

  return (
    <div>
      {/* Sort Options */}
      <div className="mb-4 flex items-center gap-4">
        <label
          htmlFor="post-sort"
          className="text-sm font-medium text-text-secondary"
        >
          Sort by:
        </label>
        <select
          id="post-sort"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text-primary focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
        >
          <option value="latest">Latest</option>
          <option value="most-liked">Most Liked</option>
          <option value="oldest">Oldest</option>
        </select>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {sortedPosts.map((post) => (
          <PostCardWithEditor
            key={post.id}
            post={{
              id: post.id,
              title: post.title,
              content: post.content,
              created_at: post.created_at,
              slug: post.slug,
              likeCount: post.likeCount || 0,
              isLiked: post.isLiked || false,
              quest_id: post.quest_id || null,
              questTitle: post.questTitle || null,
            }}
            isEditable={isEditable}
            currentUserId={currentUserId}
            currentUserProfileId={currentUserProfileId}
          />
        ))}
      </div>
    </div>
  );
}
