import { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import Link from "next/link";
import ProfileCard from "@/components/ProfileCard";

interface PageProps {
  params: Promise<{ username: string }>;
}

async function getFollowingData(username: string) {
  // Fetch profile
  const { data: profile, error: profileError } = await supabaseServer
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, branch, year, section, is_public, created_at, user_id")
    .eq("username", username)
    .single();

  if (profileError || !profile) {
    return null;
  }

  // Fetch following (profiles that this user follows)
  // follower_id = profile.id means these are the profiles this user follows
  const { data: follows, error: followsError } = await supabaseServer
    .from("follows")
    .select("following_id")
    .eq("follower_id", profile.id);

  if (followsError) {
    console.error("Error fetching following:", followsError);
    return null;
  }

  const followingIds = (follows || []).map((f: any) => f.following_id).filter(Boolean);

  if (followingIds.length === 0) {
    return {
      profile,
      following: [],
    };
  }

  // Fetch following profiles
  const { data: followingProfiles, error: profilesError } = await supabaseServer
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, branch, year, section, is_public, created_at")
    .in("id", followingIds)
    .eq("is_public", true);

  if (profilesError) {
    console.error("Error fetching following profiles:", profilesError);
    return null;
  }

  const following = followingProfiles || [];

  return {
    profile,
    following,
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  const data = await getFollowingData(username);

  if (!data) {
    return {
      title: "Profile Not Found | QuestBoard",
    };
  }

  return {
    title: `Following by @${username} | QuestBoard`,
  };
}

export default async function FollowingPage({ params }: PageProps) {
  const { username } = await params;
  const data = await getFollowingData(username);

  if (!data) {
    notFound();
  }

  const { profile, following } = data;
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
          {displayName} is Following
        </h1>
        <p className="mt-2 text-text-secondary">
          {following.length} {following.length === 1 ? "profile" : "profiles"}
        </p>
      </div>

      {/* Following List */}
      {following.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {following.map((followedProfile: any) => (
            <ProfileCard
              key={followedProfile.id}
              profile={followedProfile}
              showLink={true}
              isOwnProfile={false}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-card bg-background-card border border-border p-12 text-center">
          <p className="text-text-secondary">
            {displayName} is not following anyone yet.
          </p>
        </div>
      )}
    </main>
  );
}
