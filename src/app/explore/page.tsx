"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import FilterPanel from "@/components/FilterPanel";
import ProfileCard from "@/components/ProfileCard";
import Link from "next/link";

interface Profile {
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
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface ApiResponse {
  profiles: Profile[];
  pagination: PaginationInfo;
  filters: {
    branch: string | null;
    year: number | null;
    section: string | null;
    searchQuery: string | null;
  };
}

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfiles = async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query string from current search params
      const params = new URLSearchParams();
      const branch = searchParams.get("branch");
      const year = searchParams.get("year");
      const section = searchParams.get("section");
      const q = searchParams.get("q");
      const page = searchParams.get("page") || "1";

      if (branch) params.set("branch", branch);
      if (year) params.set("year", year);
      if (section) params.set("section", section);
      if (q) params.set("q", q);
      params.set("page", page);

      const response = await fetch(`/api/explore/users?${params.toString()}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.details || errorData.error || "Failed to fetch profiles";
        throw new Error(errorMessage);
      }

      const data: ApiResponse = await response.json();
      setProfiles(data.profiles || []);
      setPagination(data.pagination || null);
    } catch (err) {
      console.error("Error fetching profiles:", err);
      const errorMessage = err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      setProfiles([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/explore?${params.toString()}`, { scroll: true });
  };

  return (
    <main className="min-h-screen py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-text-primary">Explore</h1>
          <p className="mt-2 text-text-secondary">
            Discover profiles and stories from fellow students
          </p>
        </header>

        <div className="grid gap-8 lg:grid-cols-4">
          {/* Filter Panel */}
          <aside className="lg:col-span-1">
            <FilterPanel />
          </aside>

          {/* Results Section */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-text-secondary">Loading profiles...</div>
              </div>
            ) : error ? (
              <div className="rounded-card bg-background-card border border-border p-6 text-center">
                <p className="text-text-secondary">Error: {error}</p>
                <button
                  onClick={fetchProfiles}
                  className="mt-4 rounded-lg bg-text-primary px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
                >
                  Try Again
                </button>
              </div>
            ) : profiles.length === 0 ? (
              <div className="rounded-card bg-background-card border border-border p-12 text-center">
                <p className="text-text-secondary mb-4">
                  No profiles found matching your filters.
                </p>
                <Link
                  href="/explore"
                  className="inline-block rounded-lg bg-text-primary px-6 py-3 font-medium text-background transition-colors hover:bg-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
                >
                  Clear Filters
                </Link>
              </div>
            ) : (
              <>
                {/* Results count */}
                {pagination && (
                  <div className="mb-6 text-sm text-text-muted">
                    Showing {profiles.length} of {pagination.total} profiles
                  </div>
                )}

                {/* Profiles Grid */}
                <div className="grid gap-6 md:grid-cols-2">
                  {profiles.map((profile) => (
                    <ProfileCard key={profile.id} profile={profile} />
                  ))}
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-4">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={!pagination.hasPrevPage}
                      className="rounded-lg border border-border bg-background-card px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
                      aria-label="Previous page"
                    >
                      Previous
                    </button>

                    <span className="text-sm text-text-secondary">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>

                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={!pagination.hasNextPage}
                      className="rounded-lg border border-border bg-background-card px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-background disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
                      aria-label="Next page"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center py-12">
              <div className="text-text-secondary">Loading...</div>
            </div>
          </div>
        </main>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}
