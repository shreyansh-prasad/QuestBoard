"use client";

import { useState } from "react";
import Link from "next/link";
import KPIProgress from "./KPIProgress";

interface QuestCardProps {
  quest: {
    id: string;
    title: string;
    description: string | null;
    status: "active" | "completed" | "paused" | "cancelled";
    progress: number;
    created_at: string;
    updated_at?: string;
  };
  kpis?: Array<{
    id: string;
    name: string;
    value: number;
    target: number | null;
    unit: string | null;
  }>;
  author?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  showAuthor?: boolean;
  likeCount?: number;
  isLiked?: boolean;
  onLike?: (questId: string) => void;
  className?: string;
}

export default function QuestCard({
  quest,
  kpis = [],
  author,
  showAuthor = false,
  likeCount = 0,
  isLiked = false,
  onLike,
  className = "",
}: QuestCardProps) {
  const [isLiking, setIsLiking] = useState(false);

  const handleLike = async () => {
    if (!onLike || isLiking) return;

    setIsLiking(true);
    try {
      await onLike(quest.id);
    } finally {
      setIsLiking(false);
    }
  };

  const statusColors = {
    active: "bg-blue-500/20 text-blue-400",
    completed: "bg-green-500/20 text-green-400",
    paused: "bg-yellow-500/20 text-yellow-400",
    cancelled: "bg-red-500/20 text-red-400",
  };

  const statusLabel = {
    active: "Active",
    completed: "Completed",
    paused: "Paused",
    cancelled: "Cancelled",
  };

  return (
    <article
      className={`rounded-card bg-background-card border border-border p-6 transition-shadow hover:border-border/80 ${className}`}
    >
      {/* Header */}
      <div className="mb-4">
        <div className="mb-2 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-text-primary mb-1">
              <Link
                href={`/quests/${quest.id}`}
                className="hover:text-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background rounded"
              >
                {quest.title}
              </Link>
            </h3>
            {author && showAuthor && (
              <p className="text-sm text-text-muted">
                by{" "}
                <Link
                  href={`/u/${author.username}`}
                  className="text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background rounded"
                >
                  {author.display_name || author.username}
                </Link>
              </p>
            )}
          </div>

          {/* Status Badge */}
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium flex-shrink-0 ${statusColors[quest.status]}`}
            aria-label={`Quest status: ${statusLabel[quest.status]}`}
          >
            {statusLabel[quest.status]}
          </span>
        </div>

        {/* Description/Summary */}
        {quest.description && (
          <p className="text-sm text-text-secondary line-clamp-2">
            {quest.description}
          </p>
        )}
      </div>

      {/* Overall Progress */}
      <div className="mb-4">
        <div className="mb-1 flex items-center justify-between text-xs text-text-muted">
          <span>Overall Progress</span>
          <span>{quest.progress}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={quest.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Quest progress: ${quest.progress}%`}
          className="h-2 overflow-hidden rounded-full bg-background"
        >
          <div
            className="h-full bg-text-primary transition-all duration-300 ease-in-out"
            style={{ width: `${quest.progress}%` }}
          />
        </div>
      </div>

      {/* KPIs */}
      {kpis.length > 0 && (
        <div className="mb-4 space-y-3 border-t border-border pt-4">
          {kpis.map((kpi) => (
            <KPIProgress
              key={kpi.id}
              name={kpi.name}
              value={kpi.value}
              target={kpi.target}
              unit={kpi.unit}
              showLabel={true}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-text-muted">
        <time dateTime={quest.created_at}>
          {new Date(quest.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </time>

        {/* Like Button */}
        {onLike && (
          <button
            type="button"
            onClick={handleLike}
            disabled={isLiking}
            aria-label={isLiked ? `Unlike quest (${likeCount} likes)` : `Like quest (${likeCount} likes)`}
            aria-pressed={isLiked}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background ${
              isLiked
                ? "bg-text-primary/10 text-text-primary"
                : "bg-background text-text-muted hover:bg-background-card hover:text-text-secondary"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <span aria-hidden="true">{isLiked ? "❤️" : "🤍"}</span>
            <span>{likeCount}</span>
          </button>
        )}
      </div>
    </article>
  );
}
