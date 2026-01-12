"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import ImageViewer from "./ImageViewer";

interface ProfileCardProps {
  profile: {
    id: string;
    username: string;
    display_name: string | null;
    bio: string | null;
    avatar_url: string | null;
    branch: string | null;
    year: number | null;
    section: string | null;
    is_public: boolean;
    created_at: string;
  };
  stats?: {
    follower_count?: number;
    following_count?: number;
    quest_count?: number;
    post_count?: number;
    profile_likes_count?: number;
  };
  showLink?: boolean;
  isOwnProfile?: boolean;
}

export default function ProfileCard({
  profile,
  stats,
  showLink = true,
  isOwnProfile = false,
}: ProfileCardProps) {
  const [showImageViewer, setShowImageViewer] = useState(false);
  const displayName = profile.display_name || profile.username;
  const profileUrl = `/u/${profile.username}`;

  const handleAvatarClick = (e: React.MouseEvent) => {
    if (profile.avatar_url) {
      e.preventDefault();
      e.stopPropagation();
      setShowImageViewer(true);
    }
  };

  const cardContent = (
    <>
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div
          className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border border-border ${
            profile.avatar_url
              ? "cursor-pointer transition-transform hover:scale-105"
              : ""
          }`}
          onClick={handleAvatarClick}
          role={profile.avatar_url ? "button" : undefined}
          tabIndex={profile.avatar_url ? 0 : undefined}
          onKeyDown={(e) => {
            if (profile.avatar_url && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              setShowImageViewer(true);
            }
          }}
          aria-label={profile.avatar_url ? `View ${displayName}'s profile picture` : undefined}
        >
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={`${displayName}'s avatar`}
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-background text-2xl font-bold text-text-muted">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Profile Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-text-primary">
              {displayName}
            </h1>
            {!profile.is_public && (
              <span className="text-xs text-text-muted" aria-label="Private profile">
                🔒
              </span>
            )}
          </div>

          <p className="text-sm text-text-secondary">@{profile.username}</p>

          {/* Academic Info */}
          {(profile.branch || profile.year || profile.section) && (
            <div className="mt-2 flex flex-wrap gap-2 text-sm text-text-muted">
              {profile.branch && (
                <span className="rounded bg-background px-2 py-1">
                  {profile.branch}
                </span>
              )}
              {profile.year && (
                <span className="rounded bg-background px-2 py-1">
                  Year {profile.year}
                </span>
              )}
              {profile.section && (
                <span className="rounded bg-background px-2 py-1">
                  Section {profile.section}
                </span>
              )}
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <div className="mt-3">
              <p className="text-base leading-relaxed text-text-secondary whitespace-pre-wrap">
                {profile.bio}
              </p>
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              {stats.follower_count !== undefined && (
                <div>
                  {isOwnProfile ? (
                    <Link
                      href={`/u/${profile.username}/followers`}
                      className="hover:text-text-primary transition-colors cursor-pointer"
                    >
                      <span className="font-medium text-text-primary">
                        {stats.follower_count}
                      </span>{" "}
                      <span className="text-text-muted">Followers</span>
                    </Link>
                  ) : (
                    <>
                      <span className="font-medium text-text-primary">
                        {stats.follower_count}
                      </span>{" "}
                      <span className="text-text-muted">Followers</span>
                    </>
                  )}
                </div>
              )}
              {stats.following_count !== undefined && (
                <div>
                  {isOwnProfile ? (
                    <Link
                      href={`/u/${profile.username}/following`}
                      className="hover:text-text-primary transition-colors cursor-pointer"
                    >
                      <span className="font-medium text-text-primary">
                        {stats.following_count}
                      </span>{" "}
                      <span className="text-text-muted">Following</span>
                    </Link>
                  ) : (
                    <>
                      <span className="font-medium text-text-primary">
                        {stats.following_count}
                      </span>{" "}
                      <span className="text-text-muted">Following</span>
                    </>
                  )}
                </div>
              )}
              {stats.quest_count !== undefined && (
                <div>
                  <span className="font-medium text-text-primary">
                    {stats.quest_count}
                  </span>{" "}
                  <span className="text-text-muted">Quests</span>
                </div>
              )}
              {stats.post_count !== undefined && (
                <div>
                  <span className="font-medium text-text-primary">
                    {stats.post_count}
                  </span>{" "}
                  <span className="text-text-muted">Posts</span>
                </div>
              )}
              {stats.profile_likes_count !== undefined && (
                <div>
                  {isOwnProfile ? (
                    <Link
                      href={`/u/${profile.username}/likers`}
                      className="hover:text-text-primary transition-colors cursor-pointer"
                    >
                      <span className="font-medium text-text-primary">
                        {stats.profile_likes_count}
                      </span>{" "}
                      <span className="text-text-muted">Likes</span>
                    </Link>
                  ) : (
                    <>
                      <span className="font-medium text-text-primary">
                        {stats.profile_likes_count}
                      </span>{" "}
                      <span className="text-text-muted">Likes</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );

  if (showLink) {
    return (
      <>
        <Link
          href={profileUrl}
          className="block rounded-card bg-background-card border border-border p-6 transition-colors hover:border-text-secondary/50 hover:bg-background/50 focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
        >
          {cardContent}
        </Link>
        {profile.avatar_url && (
          <ImageViewer
            imageSrc={profile.avatar_url}
            alt={`${displayName}'s profile picture`}
            isOpen={showImageViewer}
            onClose={() => setShowImageViewer(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="rounded-card bg-background-card border border-border p-6">
        {cardContent}
      </div>
      {profile.avatar_url && (
        <ImageViewer
          imageSrc={profile.avatar_url}
          alt={`${displayName}'s profile picture`}
          isOpen={showImageViewer}
          onClose={() => setShowImageViewer(false)}
        />
      )}
    </>
  );
}
