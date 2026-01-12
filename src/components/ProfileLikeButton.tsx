"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface ProfileLikeButtonProps {
  profileId: string;
  initialIsLiked?: boolean;
  initialLikeCount?: number;
  onLikeChange?: (isLiked: boolean, likeCount: number) => void;
  className?: string;
}

export default function ProfileLikeButton({
  profileId,
  initialIsLiked = false,
  initialLikeCount = 0,
  onLikeChange,
  className = "",
}: ProfileLikeButtonProps) {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check if user is authenticated
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setIsLiked(initialIsLiked);
    setLikeCount(initialLikeCount);
  }, [initialIsLiked, initialLikeCount]);

  const handleLike = async () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    setLoading(true);
    const previousIsLiked = isLiked;
    const previousLikeCount = likeCount;

    // Optimistic update
    setIsLiked(!isLiked);
    setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));

    try {
      const response = await fetch("/api/like/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ type: "profile", targetId: profileId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to toggle like");
      }

      // Update with server response
      setIsLiked(data.isLiked);
      setLikeCount(data.likeCount || likeCount);

      // Notify parent component
      if (onLikeChange) {
        onLikeChange(data.isLiked, data.likeCount || likeCount);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      // Revert optimistic update
      setIsLiked(previousIsLiked);
      setLikeCount(previousLikeCount);
      alert(error instanceof Error ? error.message : "Failed to toggle like");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={loading}
      className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
        isLiked
          ? "border-border bg-background-card text-text-primary hover:bg-background"
          : "border-border bg-background-card text-text-secondary hover:bg-background hover:text-text-primary"
      } ${className}`}
      aria-label={isLiked ? "Unlike profile" : "Like profile"}
      aria-pressed={isLiked}
    >
      <span aria-hidden="true">{isLiked ? "❤️" : "🤍"}</span>
      <span>{likeCount}</span>
      {loading && <span className="text-xs">...</span>}
    </button>
  );
}
