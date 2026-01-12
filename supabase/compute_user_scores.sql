-- SQL RPC Function to compute normalized user scores
-- This function calculates scores based on various user activities and engagement metrics

-- Ensure user_scores table exists (if not, create it)
-- CREATE TABLE IF NOT EXISTS user_scores (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
--   total_score NUMERIC(10, 2) NOT NULL DEFAULT 0,
--   normalized_score NUMERIC(10, 4) NOT NULL DEFAULT 0, -- Normalized between 0-100
--   quest_score NUMERIC(10, 2) NOT NULL DEFAULT 0,
--   post_score NUMERIC(10, 2) NOT NULL DEFAULT 0,
--   engagement_score NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Likes, follows, etc.
--   kpi_score NUMERIC(10, 2) NOT NULL DEFAULT 0,
--   computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   rank INTEGER,
--   branch TEXT,
--   year INTEGER,
--   section TEXT,
--   UNIQUE(profile_id)
-- );
--
-- CREATE INDEX IF NOT EXISTS idx_user_scores_normalized_score ON user_scores(normalized_score DESC);
-- CREATE INDEX IF NOT EXISTS idx_user_scores_branch_year ON user_scores(branch, year, normalized_score DESC);
-- CREATE INDEX IF NOT EXISTS idx_user_scores_computed_at ON user_scores(computed_at DESC);

-- RPC Function to compute and update user scores
CREATE OR REPLACE FUNCTION compute_user_scores()
RETURNS TABLE (
  profile_id UUID,
  total_score NUMERIC,
  normalized_score NUMERIC,
  quest_score NUMERIC,
  post_score NUMERIC,
  engagement_score NUMERIC,
  kpi_score NUMERIC,
  rank INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  max_total_score NUMERIC := 0;
  min_total_score NUMERIC := 0;
  score_range NUMERIC := 1;
BEGIN
  -- Step 1: Compute raw scores for each user
  -- This CTE calculates individual score components
  WITH user_raw_scores AS (
    SELECT 
      p.id as profile_id,
      p.branch,
      p.year,
      p.section,
      -- Quest Score: Points based on quest completion and active quests
      -- Active quest = 10 points, Completed quest = 50 points, Paused = 5 points
      COALESCE(
        SUM(
          CASE 
            WHEN q.status = 'completed' THEN 50.0
            WHEN q.status = 'active' THEN 10.0
            WHEN q.status = 'paused' THEN 5.0
            ELSE 0.0
          END
        ), 
        0
      ) as quest_score_raw,
      
      -- Post Score: Points based on published posts and engagement
      -- Published post = 5 points, Post likes = 2 points per like
      COALESCE(
        SUM(
          CASE 
            WHEN po.published = true THEN 5.0
            ELSE 0.0
          END
        ),
        0
      ) + COALESCE(
        (SELECT COUNT(*) * 2.0 FROM public.post_likes pl 
         WHERE pl.post_id IN (SELECT id FROM public.posts WHERE profile_id = p.id)),
        0
      ) as post_score_raw,
      
      -- KPI Score: Points based on KPI progress and achievements
      -- KPI with value > 0 = 1 point, KPI at target = 5 points, KPI exceeded = 10 points
      COALESCE(
        SUM(
          CASE
            WHEN k.value >= k.target AND k.target > 0 THEN 10.0
            WHEN k.value > 0 AND k.target > 0 AND (k.value / k.target) >= 0.8 THEN 5.0
            WHEN k.value > 0 THEN 1.0
            ELSE 0.0
          END
        ),
        0
      ) as kpi_score_raw,
      
      -- Engagement Score: Points from profile likes and followers
      -- Profile like = 3 points, Follower = 5 points
      -- Note: Handle both schema possibilities for profile_likes
      COALESCE(
        (SELECT COUNT(*) * 3.0 FROM public.profile_likes pl 
         WHERE pl.profile_id = p.id OR pl.liked_profile_id = p.id),
        0
      ) + COALESCE(
        (SELECT COUNT(*) * 5.0 FROM public.follows f WHERE f.following_id = p.id),
        0
      ) as engagement_score_raw
      
    FROM public.profiles p
    LEFT JOIN public.quests q ON q.profile_id = p.id
    LEFT JOIN public.posts po ON po.profile_id = p.id
    LEFT JOIN public.kpis k ON k.quest_id = q.id
    WHERE p.is_public = true  -- Only compute scores for public profiles
    GROUP BY p.id, p.branch, p.year, p.section
  ),
  
  -- Step 2: Calculate total score for each user
  user_total_scores AS (
    SELECT 
      profile_id,
      branch,
      year,
      section,
      quest_score_raw,
      post_score_raw,
      kpi_score_raw,
      engagement_score_raw,
      (quest_score_raw + post_score_raw + kpi_score_raw + engagement_score_raw) as total_score
    FROM user_raw_scores
  ),
  
  -- Step 3: Find min and max for normalization (0-100 scale)
  score_bounds AS (
    SELECT 
      MIN(total_score) as min_score,
      MAX(total_score) as max_score
    FROM user_total_scores
  ),
  
  -- Step 4: Normalize scores and calculate ranks
  normalized_scores AS (
    SELECT 
      uts.profile_id,
      uts.branch,
      uts.year,
      uts.section,
      uts.quest_score_raw as quest_score,
      uts.post_score_raw as post_score,
      uts.kpi_score_raw as kpi_score,
      uts.engagement_score_raw as engagement_score,
      uts.total_score,
      -- Normalize to 0-100 scale using min-max normalization
      CASE 
        WHEN sb.max_score > sb.min_score THEN
          ((uts.total_score - sb.min_score) / (sb.max_score - sb.min_score)) * 100.0
        ELSE 0.0
      END as normalized_score,
      -- Calculate rank within all users
      DENSE_RANK() OVER (ORDER BY uts.total_score DESC) as global_rank
    FROM user_total_scores uts
    CROSS JOIN score_bounds sb
  )
  
  -- Step 5: Upsert scores into user_scores table
  INSERT INTO public.user_scores (
    profile_id,
    total_score,
    normalized_score,
    quest_score,
    post_score,
    engagement_score,
    kpi_score,
    rank,
    branch,
    year,
    section,
    computed_at
  )
  SELECT 
    profile_id,
    total_score,
    normalized_score,
    quest_score,
    post_score,
    engagement_score,
    kpi_score,
    global_rank,
    branch,
    year,
    section,
    NOW()
  FROM normalized_scores
  ON CONFLICT (profile_id) 
  DO UPDATE SET
    total_score = EXCLUDED.total_score,
    normalized_score = EXCLUDED.normalized_score,
    quest_score = EXCLUDED.quest_score,
    post_score = EXCLUDED.post_score,
    engagement_score = EXCLUDED.engagement_score,
    kpi_score = EXCLUDED.kpi_score,
    rank = EXCLUDED.rank,
    branch = EXCLUDED.branch,
    year = EXCLUDED.year,
    section = EXCLUDED.section,
    computed_at = NOW();
  
  -- Step 6: Return computed scores for verification
  RETURN QUERY
  SELECT 
    us.profile_id,
    us.total_score,
    us.normalized_score,
    us.quest_score,
    us.post_score,
    us.engagement_score,
    us.kpi_score,
    us.rank
  FROM public.user_scores us
  ORDER BY us.normalized_score DESC
  LIMIT 100;
END;
$$;

-- Example: Run the function manually
-- SELECT * FROM compute_user_scores();

-- Materialized View Alternative (for even faster reads)
-- This creates a materialized view that can be refreshed periodically
CREATE MATERIALIZED VIEW IF NOT EXISTS public.leaderboard_cache AS
SELECT 
  us.profile_id,
  us.total_score,
  us.normalized_score,
  us.quest_score,
  us.post_score,
  us.engagement_score,
  us.kpi_score,
  us.rank,
  us.branch,
  us.year,
  us.section,
  us.computed_at,
  p.username,
  p.display_name,
  p.avatar_url,
  p.bio
FROM public.user_scores us
INNER JOIN public.profiles p ON p.id = us.profile_id
WHERE p.is_public = true
ORDER BY us.normalized_score DESC;

-- Create indexes on materialized view for fast filtering
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_normalized_score 
  ON public.leaderboard_cache(normalized_score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_branch_year 
  ON public.leaderboard_cache(branch, year, normalized_score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_cache_rank 
  ON public.leaderboard_cache(rank);

-- Function to refresh the materialized view
-- This should be called after compute_user_scores()
CREATE OR REPLACE FUNCTION refresh_leaderboard_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.leaderboard_cache;
END;
$$;

-- Complete update process (run both functions in sequence):
-- 1. SELECT * FROM compute_user_scores();  -- Compute and update scores
-- 2. SELECT refresh_leaderboard_cache();    -- Refresh cached view (optional, for better read performance)
