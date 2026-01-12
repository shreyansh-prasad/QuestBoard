"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

interface FollowButtonProps {
  profileId: string;
  initialIsFollowing?: boolean;
  initialFollowerCount?: number;
  onFollowChange?: (isFollowing: boolean, followerCount: number) => void;
  className?: string;
}

export default function FollowButton({
  profileId,
  initialIsFollowing = false,
  initialFollowerCount = 0,
  onFollowChange,
  className = "",
}: FollowButtonProps) {
  const router = useRouter();
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
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
    setIsFollowing(initialIsFollowing);
    setFollowerCount(initialFollowerCount);
  }, [initialIsFollowing, initialFollowerCount]);

  const handleFollow = async () => {
    if (!user) {
      router.push("/auth/login");
      return;
    }

    setLoading(true);
    const previousIsFollowing = isFollowing;
    const previousFollowerCount = followerCount;

    // Optimistic update
    setIsFollowing(!isFollowing);
    setFollowerCount((prev) => (isFollowing ? prev - 1 : prev + 1));

    try {
      const response = await fetch("/api/follow/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ profileId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to toggle follow");
      }

      // Update with server response
      setIsFollowing(data.isFollowing);
      setFollowerCount(data.followerCount || followerCount);

      // Notify parent component
      if (onFollowChange) {
        onFollowChange(data.isFollowing, data.followerCount || followerCount);
      }
    } catch (error) {
      console.error("Error toggling follow:", error);
      // Revert optimistic update
      setIsFollowing(previousIsFollowing);
      setFollowerCount(previousFollowerCount);
      alert(error instanceof Error ? error.message : "Failed to toggle follow");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleFollow}
      disabled={loading}
      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
        isFollowing
          ? "border-border bg-background-card text-text-primary hover:bg-background"
          : "border-text-primary bg-text-primary text-background hover:bg-text-secondary"
      } ${className}`}
      aria-label={isFollowing ? "Unfollow" : "Follow"}
      aria-pressed={isFollowing}
    >
      {loading ? "..." : isFollowing ? "Unfollow" : "Follow"}
    </button>
  );
}
