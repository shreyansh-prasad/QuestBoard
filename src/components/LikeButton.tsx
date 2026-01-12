"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface LikeButtonProps {
  type: "post" | "profile";
  targetId: string;
  initialIsLiked: boolean;
  initialLikeCount: number;
  className?: string;
  showCount?: boolean;
  onToggle?: (isLiked: boolean, likeCount: number) => void;
}

export default function LikeButton({
  type,
  targetId,
  initialIsLiked,
  initialLikeCount,
  className = "",
  showCount = true,
  onToggle,
}: LikeButtonProps) {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    if (isLoading) return;

    // Optimistic update
    const previousIsLiked = isLiked;
    const previousLikeCount = likeCount;
    const newIsLiked = !isLiked;
    const newLikeCount = newIsLiked
      ? likeCount + 1
      : Math.max(0, likeCount - 1);

    setIsLiked(newIsLiked);
    setLikeCount(newLikeCount);
    setIsLoading(true);

    // Callback for parent component
    if (onToggle) {
      onToggle(newIsLiked, newLikeCount);
    }

    try {
      // Get current user session
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        // Revert optimistic update
        setIsLiked(previousIsLiked);
        setLikeCount(previousLikeCount);
        if (onToggle) {
          onToggle(previousIsLiked, previousLikeCount);
        }
        router.push("/auth/login");
        return;
      }

      // Call API
      const response = await fetch("/api/like/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Include cookies for authentication
        body: JSON.stringify({ type, targetId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to toggle like");
      }

      // Update with server response
      setIsLiked(data.isLiked);
      setLikeCount(data.likeCount);

      if (onToggle) {
        onToggle(data.isLiked, data.likeCount);
      }

      // Refresh page to update UI
      router.refresh();
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert optimistic update on error
      setIsLiked(previousIsLiked);
      setLikeCount(previousLikeCount);
      if (onToggle) {
        onToggle(previousIsLiked, previousLikeCount);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isLoading}
      aria-label={
        isLiked
          ? `Unlike ${type} (${likeCount} likes)`
          : `Like ${type} (${likeCount} likes)`
      }
      aria-pressed={isLiked}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
        isLiked
          ? "bg-text-primary/10 text-text-primary"
          : "bg-background text-text-muted hover:bg-background-card hover:text-text-secondary"
      } ${className}`}
    >
      {isLoading ? (
        <>
          <svg
            className="h-3.5 w-3.5 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>{showCount && likeCount}</span>
        </>
      ) : (
        <>
          <span aria-hidden="true">{isLiked ? "❤️" : "🤍"}</span>
          {showCount && <span>{likeCount}</span>}
        </>
      )}
    </button>
  );
}
