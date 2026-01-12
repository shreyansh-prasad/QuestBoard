import { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import Link from "next/link";
import ProfileCard from "@/components/ProfileCard";

interface PageProps {
  params: Promise<{ username: string }>;
}

async function getLikersData(username: string) {
  // Fetch profile
  const { data: profile, error: profileError } = await supabaseServer
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, branch, year, section, is_public, created_at, user_id")
    .eq("username", username)
    .single();

  if (profileError || !profile) {
    return null;
  }

  // Fetch profile likers (users who liked this profile)
  // profile_id = profile.id means these are the likers
  const { data: likes, error: likesError } = await supabaseServer
    .from("profile_likes")
    .select("liker_profile_id")
    .eq("profile_id", profile.id);

  if (likesError) {
    console.error("Error fetching profile likers:", likesError);
    return null;
  }

  const likerIds = (likes || []).map((l: any) => l.liker_profile_id).filter(Boolean);

  if (likerIds.length === 0) {
    return {
      profile,
      likers: [],
    };
  }

  // Fetch liker profiles
  const { data: likerProfiles, error: profilesError } = await supabaseServer
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, branch, year, section, is_public, created_at")
    .in("id", likerIds)
    .eq("is_public", true);

  if (profilesError) {
    console.error("Error fetching liker profiles:", profilesError);
    return null;
  }

  const likers = likerProfiles || [];

  return {
    profile,
    likers,
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  const data = await getLikersData(username);

  if (!data) {
    return {
      title: "Profile Not Found | QuestBoard",
    };
  }

  return {
    title: `Users who liked @${username} | QuestBoard`,
  };
}

export default async function LikersPage({ params }: PageProps) {
  const { username } = await params;
  const data = await getLikersData(username);

  if (!data) {
    notFound();
  }

  const { profile, likers } = data;
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
          Users who liked {displayName}
        </h1>
        <p className="mt-2 text-text-secondary">
          {likers.length} {likers.length === 1 ? "user" : "users"} liked this profile
        </p>
      </div>

      {/* Likers List */}
      {likers.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {likers.map((liker: any) => (
            <ProfileCard
              key={liker.id}
              profile={liker}
              showLink={true}
              isOwnProfile={false}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-card bg-background-card border border-border p-12 text-center">
          <p className="text-text-secondary">
            No users have liked {displayName}'s profile yet.
          </p>
        </div>
      )}
    </main>
  );
}
