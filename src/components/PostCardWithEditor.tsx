"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LikeButton from "./LikeButton";

interface Post {
  id: string;
  title: string;
  content: string;
  created_at: string;
  slug: string | null;
  likeCount?: number;
  isLiked?: boolean;
  quest_id?: string | null;
  questTitle?: string | null;
}

interface PostCardWithEditorProps {
  post: Post;
  isEditable?: boolean;
  currentUserId?: string | null;
  currentUserProfileId?: string | null;
}

export default function PostCardWithEditor({
  post,
  isEditable = false,
  currentUserId,
  currentUserProfileId,
}: PostCardWithEditorProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editData, setEditData] = useState({
    title: post.title,
    content: post.content,
  });
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);
  const [isLiked, setIsLiked] = useState(post.isLiked || false);

  // Sync edit data with post changes
  useEffect(() => {
    setEditData({
      title: post.title,
      content: post.content,
    });
  }, [post]);

  // Sync like state with prop changes
  useEffect(() => {
    setLikeCount(post.likeCount || 0);
    setIsLiked(post.isLiked || false);
  }, [post.likeCount, post.isLiked]);

  const handleEdit = () => {
    setError(null);
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    setError(null);

    if (!editData.title.trim()) {
      setError("Title is required");
      return;
    }

    if (!editData.content.trim()) {
      setError("Content is required");
      return;
    }

    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          title: editData.title.trim(),
          content: editData.content.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update post");
      }

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating post:", error);
      setError(error instanceof Error ? error.message : "Failed to update post");
    }
  };

  const handleCancelEdit = () => {
    setEditData({
      title: post.title,
      content: post.content,
    });
    setError(null);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setError(null);
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/posts/${post.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete post");
      }

      // Refresh the page to update the post list
      window.location.reload();
    } catch (error) {
      console.error("Error deleting post:", error);
      setError(error instanceof Error ? error.message : "Failed to delete post");
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setError(null);
  };

  const handleLikeToggle = (newIsLiked: boolean, newLikeCount: number) => {
    setIsLiked(newIsLiked);
    setLikeCount(newLikeCount);
  };

  const formattedDate = new Date(post.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <article className="rounded-card bg-background-card border border-border p-6">
      {/* Header with title and actions */}
      <div className="mb-2 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={editData.title}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
              className="w-full rounded border border-border bg-background px-2 py-1 text-xl font-semibold text-text-primary focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary"
              placeholder="Post title"
              autoFocus
            />
          ) : (
            <h3 className="text-xl font-semibold text-text-primary">
              <span>{post.title}</span>
            </h3>
          )}
        </div>
        {!isEditing && isEditable && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleEdit}
              className="rounded px-2 py-1 text-xs font-medium text-text-secondary hover:bg-background hover:text-text-primary transition-colors"
              title="Edit post"
              aria-label="Edit post"
            >
              ✏️
            </button>
            {!showDeleteConfirm ? (
              <button
                onClick={handleDelete}
                className="rounded px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                title="Delete post"
                aria-label="Delete post"
              >
                🗑️
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="rounded px-2 py-1 text-xs font-medium text-red-400 bg-red-500/20 hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Confirm delete"
                  aria-label="Confirm delete"
                >
                  ✓
                </button>
                <button
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  className="rounded px-2 py-1 text-xs font-medium text-text-secondary hover:bg-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Cancel delete"
                  aria-label="Cancel delete"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quest Linkage */}
      {post.quest_id && (
        <div className="mb-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-text-primary/10 px-3 py-1 text-xs font-medium text-text-secondary">
            <span>⭐</span>
            <span>Linked to: {post.questTitle || "Quest"}</span>
          </div>
        </div>
      )}

      {/* Content */}
      {isEditing ? (
        <div className="mb-3">
          <textarea
            value={editData.content}
            onChange={(e) => setEditData({ ...editData, content: e.target.value })}
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm text-text-primary focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary"
            placeholder="Post content"
            rows={6}
          />
        </div>
      ) : (
        <p className="mb-3 line-clamp-3 text-text-secondary">
          {post.content}
        </p>
      )}

      {/* Edit actions */}
      {isEditing && (
        <div className="mb-3 flex gap-2">
          <button
            onClick={handleSaveEdit}
            className="rounded px-3 py-1.5 text-sm font-medium text-green-400 bg-green-500/20 hover:bg-green-500/30 transition-colors"
          >
            Save
          </button>
          <button
            onClick={handleCancelEdit}
            className="rounded px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-background transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-3 rounded border border-red-500/50 bg-red-500/10 p-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Footer with date and like */}
      <div className="flex items-center justify-between gap-4">
        <time
          className="text-sm text-text-muted"
          dateTime={post.created_at}
        >
          {formattedDate}
        </time>
        {!isEditing && currentUserId && !isEditable && (
          <LikeButton
            type="post"
            targetId={post.id}
            initialIsLiked={isLiked}
            initialLikeCount={likeCount}
            onToggle={handleLikeToggle}
            showCount={true}
          />
        )}
      </div>
    </article>
  );
}
