"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { BRANCHES } from "@/lib/constants";

interface LeaderboardEntry {
  profile_id: string;
  total_score: number;
  normalized_score: number;
  quest_score: number;
  post_score: number;
  engagement_score: number;
  kpi_score: number;
  rank: number;
  branch: string | null;
  year: number | null;
  section: string | null;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  quest_count?: number;
  post_count?: number;
  kpi_count?: number;
  follower_count?: number;
  profile_like_count?: number;
}

interface ApiResponse {
  entries: LeaderboardEntry[];
  total: number;
  filters: {
    branch: string | null;
    year: number | null;
  };
}

const YEARS = [1, 2, 3, 4];

function LeaderboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branchFilter, setBranchFilter] = useState(searchParams.get("branch") || "");
  const [yearFilter, setYearFilter] = useState(searchParams.get("year") || "");

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (branchFilter) params.set("branch", branchFilter);
      if (yearFilter) params.set("year", yearFilter);

      const response = await fetch(`/api/leaderboard?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.details || errorData.error || "Failed to fetch leaderboard";
        throw new Error(errorMessage);
      }

      const data: ApiResponse = await response.json();
      setEntries(data.entries || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      setEntries([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleReset = () => {
    setBranchFilter("");
    setYearFilter("");
    router.push("/leaderboard");
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  return (
    <main className="min-h-screen py-8">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-text-primary">Leaderboard</h1>
          <p className="mt-2 text-text-secondary">
            Top performers ranked by their quest progress and engagement
          </p>
        </header>

        {/* Filters */}
        <div className="mb-6 rounded-card bg-background-card border border-border p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="branch-filter"
                className="mb-2 block text-sm font-medium text-text-primary"
              >
                Branch
              </label>
              <select
                id="branch-filter"
                value={branchFilter}
                onChange={(e) => {
                  setBranchFilter(e.target.value);
                  const params = new URLSearchParams();
                  if (e.target.value) params.set("branch", e.target.value);
                  if (yearFilter) params.set("year", yearFilter);
                  router.push(`/leaderboard${params.toString() ? `?${params.toString()}` : ""}`);
                }}
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-text-primary focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
                aria-label="Filter by branch"
              >
                <option value="">All Branches</option>
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="year-filter"
                className="mb-2 block text-sm font-medium text-text-primary"
              >
                Year
              </label>
              <select
                id="year-filter"
                value={yearFilter}
                onChange={(e) => {
                  setYearFilter(e.target.value);
                  const params = new URLSearchParams();
                  if (branchFilter) params.set("branch", branchFilter);
                  if (e.target.value) params.set("year", e.target.value);
                  router.push(`/leaderboard${params.toString() ? `?${params.toString()}` : ""}`);
                }}
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-text-primary focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
                aria-label="Filter by year"
              >
                <option value="">All Years</option>
                {YEARS.map((y) => (
                  <option key={y} value={y.toString()}>
                    Year {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              {(branchFilter || yearFilter) && (
                <button
                  onClick={handleReset}
                  className="w-full rounded-lg border border-border bg-background-card px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-background focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
                  aria-label="Reset filters"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Leaderboard Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-text-secondary">Loading leaderboard...</div>
          </div>
        ) : error ? (
          <div className="rounded-card bg-background-card border border-border p-6 text-center">
            <p className="text-text-secondary">Error: {error}</p>
            <button
              onClick={fetchLeaderboard}
              className="mt-4 rounded-lg bg-text-primary px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
            >
              Try Again
            </button>
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-card bg-background-card border border-border p-12 text-center">
            <p className="text-text-secondary mb-4">
              No entries found matching your filters.
            </p>
            <button
              onClick={handleReset}
              className="inline-block rounded-lg bg-text-primary px-6 py-3 font-medium text-background transition-colors hover:bg-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <>
            {/* Results count */}
            <div className="mb-4 text-sm text-text-muted">
              Showing {entries.length} of {total} users
            </div>

            {/* Leaderboard Table */}
            <div className="rounded-card bg-background-card border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full" role="table" aria-label="Leaderboard rankings">
                  <thead>
                    <tr className="border-b border-border bg-background">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                        Rank
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted">
                        Score
                      </th>
                      <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted sm:table-cell">
                        Breakdown
                      </th>
                      <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-text-muted md:table-cell">
                        Info
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {entries.map((entry, index) => (
                      <tr
                        key={entry.profile_id}
                        className={`transition-colors hover:bg-background ${
                          entry.rank <= 3 ? "bg-text-primary/5" : ""
                        }`}
                      >
                        {/* Rank */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-lg font-bold text-text-primary">
                              {getRankBadge(entry.rank)}
                            </span>
                          </div>
                        </td>

                        {/* User */}
                        <td className="px-4 py-4">
                          <Link
                            href={`/u/${entry.username}`}
                            className="flex items-center gap-3 group"
                          >
                            {entry.avatar_url ? (
                              <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full">
                                <Image
                                  src={entry.avatar_url}
                                  alt={entry.display_name || entry.username}
                                  fill
                                  className="object-cover"
                                  sizes="40px"
                                />
                              </div>
                            ) : (
                              <div className="h-10 w-10 flex-shrink-0 rounded-full bg-text-muted/20 flex items-center justify-center">
                                <span className="text-sm font-semibold text-text-muted">
                                  {(entry.display_name || entry.username)[0].toUpperCase()}
                                </span>
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-text-primary group-hover:text-text-secondary transition-colors">
                                {entry.display_name || entry.username}
                              </div>
                              <div className="text-xs text-text-muted">
                                @{entry.username}
                              </div>
                            </div>
                          </Link>
                        </td>

                        {/* Score */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-right">
                            <div className="text-lg font-bold text-text-primary">
                              {entry.normalized_score.toFixed(1)}
                            </div>
                            <div className="text-xs text-text-muted">
                              Total: {entry.total_score.toFixed(0)}
                            </div>
                          </div>
                        </td>

                        {/* Breakdown (hidden on mobile) */}
                        <td className="hidden px-4 py-4 text-sm text-text-secondary sm:table-cell">
                          <div className="space-y-1">
                            <div className="flex justify-between gap-4">
                              <span>Quests:</span>
                              <span className="font-medium">{entry.quest_count !== undefined ? entry.quest_count : 0}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span>Posts:</span>
                              <span className="font-medium">{entry.post_count !== undefined ? entry.post_count : 0}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span>KPIs:</span>
                              <span className="font-medium">{entry.kpi_count !== undefined ? entry.kpi_count : 0}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span>Engagement:</span>
                              <span className="font-medium">
                                {entry.follower_count !== undefined && entry.profile_like_count !== undefined
                                  ? `${(entry.follower_count || 0) + (entry.profile_like_count || 0)}`
                                  : entry.engagement_score ? Math.round(entry.engagement_score / 3) : "0"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Info (hidden on mobile/tablet) */}
                        <td className="hidden px-4 py-4 text-sm text-text-secondary md:table-cell">
                          <div className="space-y-1">
                            {entry.branch && (
                              <div className="text-xs">
                                <span className="text-text-muted">Branch: </span>
                                <span className="font-medium">{entry.branch}</span>
                              </div>
                            )}
                            {entry.year && (
                              <div className="text-xs">
                                <span className="text-text-muted">Year: </span>
                                <span className="font-medium">{entry.year}</span>
                              </div>
                            )}
                            {entry.section && (
                              <div className="text-xs">
                                <span className="text-text-muted">Section: </span>
                                <span className="font-medium">{entry.section}</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Score Calculation Info */}
            <div className="mt-6 rounded-card bg-background-card border border-border p-4 text-xs text-text-muted">
              <p className="mb-2 font-medium text-text-secondary">Score Calculation:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Quests: Completed (50), Active (10), Paused (5) points each</li>
                <li>Posts: Published (5) + Likes (2 per like)</li>
                <li>KPIs: Achieved (1-10 points based on progress)</li>
                <li>Engagement: Profile likes (3) + Followers (5) points each</li>
                <li>Final score is normalized to 0-100 scale</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

export default function LeaderboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen py-8">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center py-12">
              <div className="text-text-secondary">Loading...</div>
            </div>
          </div>
        </main>
      }
    >
      <LeaderboardContent />
    </Suspense>
  );
}
