-- Indexes for optimized Explore/Filter queries
-- These indexes significantly improve performance for filtered searches

-- Index on is_public for filtering public profiles (most common filter)
CREATE INDEX IF NOT EXISTS idx_profiles_is_public ON profiles(is_public) WHERE is_public = true;

-- Composite index for branch filtering (is_public + branch)
-- This index is optimal for queries filtering by branch on public profiles
CREATE INDEX IF NOT EXISTS idx_profiles_branch_public ON profiles(branch, is_public) WHERE is_public = true;

-- Composite index for year filtering (is_public + year)
CREATE INDEX IF NOT EXISTS idx_profiles_year_public ON profiles(year, is_public) WHERE is_public = true;

-- Composite index for section filtering (is_public + section)
CREATE INDEX IF NOT EXISTS idx_profiles_section_public ON profiles(section, is_public) WHERE is_public = true;

-- Composite index for multiple filters (branch + year + section)
-- This index helps when multiple filters are applied simultaneously
CREATE INDEX IF NOT EXISTS idx_profiles_multi_filter ON profiles(branch, year, section, is_public) WHERE is_public = true;

-- Index on created_at for sorting (newest first)
-- This is used for ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_profiles_created_at_desc ON profiles(created_at DESC) WHERE is_public = true;

-- Text search indexes for username, display_name, and bio
-- Using GIN index for full-text search (requires pg_trgm extension for ilike queries)
-- Note: You may need to enable the extension first: CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- For username search
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm ON profiles USING gin(username gin_trgm_ops) WHERE is_public = true;

-- For display_name search
CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm ON profiles USING gin(display_name gin_trgm_ops) WHERE is_public = true;

-- For bio search
CREATE INDEX IF NOT EXISTS idx_profiles_bio_trgm ON profiles USING gin(bio gin_trgm_ops) WHERE is_public = true;

-- Alternative: If pg_trgm extension is not available, use B-tree indexes
-- These work well for exact matches and prefix searches but less optimal for pattern matching
-- CREATE INDEX IF NOT EXISTS idx_profiles_username_btree ON profiles(username) WHERE is_public = true;
-- CREATE INDEX IF NOT EXISTS idx_profiles_display_name_btree ON profiles(display_name) WHERE is_public = true;

-- Example optimized query that leverages these indexes:
/*
SELECT 
  id,
  username,
  display_name,
  bio,
  avatar_url,
  branch,
  year,
  section,
  is_public,
  created_at
FROM profiles
WHERE is_public = true
  AND (branch = 'Computer Science' OR branch IS NULL)  -- Uses idx_profiles_branch_public
  AND (year = 2 OR year IS NULL)                        -- Uses idx_profiles_year_public
  AND (section = '1' OR section IS NULL)                -- Uses idx_profiles_section_public
  AND (
    username ILIKE '%search%' OR                        -- Uses idx_profiles_username_trgm
    display_name ILIKE '%search%' OR                    -- Uses idx_profiles_display_name_trgm
    bio ILIKE '%search%'                                -- Uses idx_profiles_bio_trgm
  )
ORDER BY created_at DESC                                -- Uses idx_profiles_created_at_desc
LIMIT 12 OFFSET 0;
*/

-- Note: To enable pg_trgm extension (required for GIN trigram indexes):
-- Run this in your Supabase SQL editor:
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Performance considerations:
-- 1. Partial indexes (WHERE is_public = true) reduce index size and improve query performance
-- 2. Composite indexes help when multiple filters are applied
-- 3. GIN indexes with trigram operators are optimal for ILIKE pattern matching
-- 4. Consider index maintenance - these indexes will slow down INSERT/UPDATE operations slightly
-- 5. Monitor query performance with EXPLAIN ANALYZE to verify index usage

-- To check if indexes are being used, run:
-- EXPLAIN ANALYZE SELECT ... (your query here);
