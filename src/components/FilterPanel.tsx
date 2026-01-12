"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { BRANCHES, SECTIONS } from "@/lib/constants";

interface FilterPanelProps {
  className?: string;
}

const YEARS = [1, 2, 3, 4];

export default function FilterPanel({ className = "" }: FilterPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isInitialMount = useRef(true);

  // Get initial values from URL params
  const [branch, setBranch] = useState(searchParams.get("branch") || "");
  const [section, setSection] = useState(searchParams.get("section") || "");
  const [year, setYear] = useState(searchParams.get("year") || "");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");

  // Debounce search input
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update URL when filters change
  const updateURL = (newBranch: string, newSection: string, newYear: string, newSearch: string) => {
    const params = new URLSearchParams();
    
    if (newBranch) params.set("branch", newBranch);
    if (newSection) params.set("section", newSection);
    if (newYear) params.set("year", newYear);
    if (newSearch.trim()) params.set("q", newSearch.trim());

    // Reset to page 1 when filters change
    params.set("page", "1");

    const queryString = params.toString();
    router.push(`/explore${queryString ? `?${queryString}` : ""}`, { scroll: false });
  };

  // Update URL when branch, section, or year changes (immediate)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    updateURL(branch, section, year, debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, section, year]);

  // Update URL when debounced search changes
  useEffect(() => {
    if (isInitialMount.current) return;
    updateURL(branch, section, year, debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Sync state with URL params when they change externally (e.g., browser back/forward)
  useEffect(() => {
    const urlBranch = searchParams.get("branch") || "";
    const urlSection = searchParams.get("section") || "";
    const urlYear = searchParams.get("year") || "";
    const urlQuery = searchParams.get("q") || "";

    if (urlBranch !== branch) setBranch(urlBranch);
    if (urlSection !== section) setSection(urlSection);
    if (urlYear !== year) setYear(urlYear);
    if (urlQuery !== searchQuery) {
      setSearchQuery(urlQuery);
      setDebouncedSearch(urlQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Reset filters
  const handleReset = () => {
    setBranch("");
    setSection("");
    setYear("");
    setSearchQuery("");
    setDebouncedSearch("");
    router.push("/explore", { scroll: false });
  };

  const hasActiveFilters = branch || section || year || debouncedSearch.trim();

  return (
    <div
      className={`rounded-card bg-background-card border border-border p-6 ${className}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Filters</h2>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleReset}
            className="text-xs font-medium text-text-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background rounded px-2 py-1"
            aria-label="Reset all filters"
          >
            Reset
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Search Input */}
        <div>
          <label
            htmlFor="search-input"
            className="mb-2 block text-sm font-medium text-text-primary"
          >
            Search
          </label>
          <input
            id="search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by username or name..."
            className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
            aria-label="Search profiles by username or name"
          />
        </div>

        {/* Branch and Year Filters - Side by Side */}
        <div className="grid grid-cols-2 gap-4">
          {/* Branch Filter */}
          <div>
            <label
              htmlFor="branch-select"
              className="mb-2 block text-sm font-medium text-text-primary"
            >
              Branch
            </label>
            <select
              id="branch-select"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
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

          {/* Year Filter */}
          <div>
            <label
              htmlFor="year-select"
              className="mb-2 block text-sm font-medium text-text-primary"
            >
              Year
            </label>
            <select
              id="year-select"
              value={year}
              onChange={(e) => setYear(e.target.value)}
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
        </div>

        {/* Section Filter */}
        <div>
          <label
            htmlFor="section-select"
            className="mb-2 block text-sm font-medium text-text-primary"
          >
            Section
          </label>
          <select
            id="section-select"
            value={section}
            onChange={(e) => setSection(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-text-primary focus:border-text-secondary focus:outline-none focus:ring-2 focus:ring-text-secondary focus:ring-offset-2 focus:ring-offset-background"
            aria-label="Filter by section"
          >
            <option value="">All Sections</option>
            {SECTIONS.map((s) => (
              <option key={s} value={s === "none" ? "" : s}>
                {s === "none" ? "No Section" : `Section ${s}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-xs font-medium text-text-muted">Active:</span>
          {branch && (
            <span
              className="rounded-full bg-text-primary/10 px-2 py-1 text-xs text-text-primary"
              aria-label={`Branch filter: ${branch}`}
            >
              Branch: {branch}
            </span>
          )}
          {year && (
            <span
              className="rounded-full bg-text-primary/10 px-2 py-1 text-xs text-text-primary"
              aria-label={`Year filter: ${year}`}
            >
              Year: {year}
            </span>
          )}
          {section && (
            <span
              className="rounded-full bg-text-primary/10 px-2 py-1 text-xs text-text-primary"
              aria-label={`Section filter: ${section}`}
            >
              Section: {section}
            </span>
          )}
          {debouncedSearch.trim() && (
            <span
              className="rounded-full bg-text-primary/10 px-2 py-1 text-xs text-text-primary"
              aria-label={`Search query: ${debouncedSearch}`}
            >
              Search: {debouncedSearch}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
