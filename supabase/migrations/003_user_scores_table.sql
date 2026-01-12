-- Migration: Create user_scores table for leaderboard
-- This table stores precomputed scores for fast leaderboard queries

CREATE TABLE IF NOT EXISTS public.user_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  total_score NUMERIC(10, 2) NOT NULL DEFAULT 0,
  normalized_score NUMERIC(10, 4) NOT NULL DEFAULT 0, -- Normalized between 0-100
  quest_score NUMERIC(10, 2) NOT NULL DEFAULT 0,
  post_score NUMERIC(10, 2) NOT NULL DEFAULT 0,
  engagement_score NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Likes, follows, etc.
  kpi_score NUMERIC(10, 2) NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rank INTEGER,
  branch TEXT,
  year INTEGER,
  section TEXT,
  UNIQUE(profile_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_scores_normalized_score 
  ON public.user_scores(normalized_score DESC);

CREATE INDEX IF NOT EXISTS idx_user_scores_branch_year 
  ON public.user_scores(branch, year, normalized_score DESC);

CREATE INDEX IF NOT EXISTS idx_user_scores_computed_at 
  ON public.user_scores(computed_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_scores_rank 
  ON public.user_scores(rank);

-- Add comment for documentation
COMMENT ON TABLE public.user_scores IS 'Precomputed user scores for leaderboard. Updated by compute_user_scores() RPC function.';
COMMENT ON COLUMN public.user_scores.normalized_score IS 'Score normalized to 0-100 scale using min-max normalization';
COMMENT ON COLUMN public.user_scores.rank IS 'Global rank based on normalized_score (1 = highest score)';
