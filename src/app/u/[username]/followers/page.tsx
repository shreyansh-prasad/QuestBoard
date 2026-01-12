import { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import Link from "next/link";
import Image from "next/image";
import ProfileCard from "@/components/ProfileCard";

interface PageProps {
  params: Promise<{ username: string }>;
}

async function getFollowersData(username: string) {
  // Fetch profile
  const { data: profile, error: profileError } = await supabaseServer
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, branch, year, section, is_public, created_at, user_id")
    .eq("username", username)
    .single();

  if (profileError || !profile) {
    return null;
  }

  // Fetch followers (users who follow this profile)
  // following_id = profile.id means these are the followers
  const { data: follows, error: followsError } = await supabaseServer
    .from("follows")
    .select("follower_id")
    .eq("following_id", profile.id);

  if (followsError) {
    console.error("Error fetching followers:", followsError);
    return null;
  }

  const followerIds = (follows || []).map((f: any) => f.follower_id).filter(Boolean);

  if (followerIds.length === 0) {
    return {
      profile,
      followers: [],
    };
  }

  // Fetch follower profiles
  const { data: followerProfiles, error: profilesError } = await supabaseServer
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, branch, year, section, is_public, created_at")
    .in("id", followerIds)
    .eq("is_public", true);

  if (profilesError) {
    console.error("Error fetching follower profiles:", profilesError);
    return null;
  }

  const followers = followerProfiles || [];

  return {
    profile,
    followers,
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  const data = await getFollowersData(username);

  if (!data) {
    return {
      title: "Profile Not Found | QuestBoard",
    };
  }

  return {
    title: `Followers of @${username} | QuestBoard`,
  };
}

export default async function FollowersPage({ params }: PageProps) {
  const { username } = await params;
  const data = await getFollowersData(username);

  if (!data) {
    notFound();
  }

  const { profile, followers } = data;
  const displayName = profile.display_name || profile.username;

  return (
    <main className="min-h-screen py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/u/${username}`}
          className="mb-4 inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <span>←</span>
          <span>Back to Profile</span>
        </Link>
        <h1 className="text-4xl font-bold text-text-primary">
          Followers of {displayName}
        </h1>
        <p className="mt-2 text-text-secondary">
          {followers.length} {followers.length === 1 ? "follower" : "followers"}
        </p>
      </div>

      {/* Followers List */}
      {followers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {followers.map((follower: any) => (
            <ProfileCard
              key={follower.id}
              profile={follower}
              showLink={true}
              isOwnProfile={false}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-card bg-background-card border border-border p-12 text-center">
          <p className="text-text-secondary">
            {displayName} doesn't have any followers yet.
          </p>
        </div>
      )}
    </main>
  );
}
