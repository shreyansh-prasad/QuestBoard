-- Optimized query for fetching liked profiles with KPIs and latest posts
-- This avoids N+1 queries by using JOINs and window functions

-- SCHEMA NOTE: The profile_likes table needs both liker and liked profile columns.
-- Recommended schema structure:
--   profile_likes.profile_id = the profile being liked
--   profile_likes.liker_profile_id = who liked it (REQUIRED)
--
-- If using different column names, adjust the queries below.

-- Option 1: Using JOINs (recommended for Supabase/Postgres)
-- This fetches all data in a single query with proper JOINs

CREATE OR REPLACE FUNCTION get_liked_profiles_with_snapshots(liker_profile_uuid UUID)
RETURNS TABLE (
  profile_id UUID,
  username TEXT,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  branch TEXT,
  year INTEGER,
  section TEXT,
  is_public BOOLEAN,
  created_at TIMESTAMPTZ,
  -- Top 3 KPIs as JSON
  top_kpis JSONB,
  -- Latest post
  latest_post_id UUID,
  latest_post_title TEXT,
  latest_post_content TEXT,
  latest_post_created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH liked_profiles AS (
    -- Get all profiles liked by the current user
    SELECT DISTINCT pl.profile_id as liked_profile_id
    FROM profile_likes pl
    WHERE pl.liker_profile_id = liker_profile_uuid
       OR (pl.profile_id = liker_profile_uuid AND pl.liked_profile_id IS NOT NULL) -- Fallback for alternative schema
  ),
  profile_kpis AS (
    -- Get top 3 KPIs per profile (by progress ratio, then value, then recency)
    SELECT DISTINCT ON (k.quest_id, k.id)
      q.profile_id,
      k.id as kpi_id,
      k.name,
      k.value,
      k.target,
      k.unit,
      k.updated_at,
      ROW_NUMBER() OVER (
        PARTITION BY q.profile_id 
        ORDER BY 
          CASE WHEN k.target > 0 THEN (k.value::NUMERIC / k.target::NUMERIC) ELSE 0 END DESC,
          k.value DESC,
          k.updated_at DESC
      ) as kpi_rank
    FROM kpis k
    INNER JOIN quests q ON k.quest_id = q.id
    INNER JOIN liked_profiles lp ON q.profile_id = lp.liked_profile_id
    WHERE q.status IN ('active', 'paused', 'completed')
  ),
  top_3_kpis_per_profile AS (
    SELECT 
      profile_id,
      jsonb_agg(
        jsonb_build_object(
          'id', kpi_id,
          'name', name,
          'value', value,
          'target', target,
          'unit', unit
        ) ORDER BY kpi_rank
      ) FILTER (WHERE kpi_rank <= 3) as top_kpis
    FROM profile_kpis
    GROUP BY profile_id
  ),
  latest_posts_per_profile AS (
    SELECT DISTINCT ON (p.profile_id)
      p.profile_id,
      p.id as post_id,
      p.title,
      p.content,
      p.created_at
    FROM posts p
    INNER JOIN liked_profiles lp ON p.profile_id = lp.liked_profile_id
    WHERE p.published = true
    ORDER BY p.profile_id, p.created_at DESC
  )
  SELECT 
    pr.id as profile_id,
    pr.username,
    pr.display_name,
    pr.bio,
    pr.avatar_url,
    pr.branch,
    pr.year,
    pr.section,
    pr.is_public,
    pr.created_at,
    COALESCE(k.top_kpis, '[]'::jsonb) as top_kpis,
    lp.post_id as latest_post_id,
    lp.title as latest_post_title,
    lp.content as latest_post_content,
    lp.created_at as latest_post_created_at
  FROM profiles pr
  INNER JOIN liked_profiles lpf ON pr.id = lpf.liked_profile_id
  LEFT JOIN top_3_kpis_per_profile k ON pr.id = k.profile_id
  LEFT JOIN latest_posts_per_profile lp ON pr.id = lp.profile_id
  WHERE pr.is_public = true
  ORDER BY pr.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Usage example:
-- SELECT * FROM get_liked_profiles_with_snapshots('current-user-profile-uuid');

-- Option 2: Simpler query using multiple CTEs (if RPC not available)
-- This can be used directly in Supabase queries with proper JOINs

/*
WITH liked_profile_ids AS (
  SELECT profile_id as liked_id
  FROM profile_likes
  WHERE liker_profile_id = $1
),
profile_quests AS (
  SELECT q.profile_id, q.id as quest_id
  FROM quests q
  INNER JOIN liked_profile_ids l ON q.profile_id = l.liked_id
  WHERE q.status IN ('active', 'paused', 'completed')
),
profile_kpis AS (
  SELECT 
    q.profile_id,
    k.*,
    ROW_NUMBER() OVER (
      PARTITION BY q.profile_id 
      ORDER BY 
        CASE WHEN k.target > 0 THEN (k.value::NUMERIC / k.target::NUMERIC) ELSE 0 END DESC,
        k.value DESC,
        k.updated_at DESC
    ) as rank
  FROM kpis k
  INNER JOIN profile_quests q ON k.quest_id = q.quest_id
)
SELECT 
  p.*,
  jsonb_agg(k.*) FILTER (WHERE k.rank <= 3) as top_kpis,
  (SELECT row_to_json(lp.*) FROM (
    SELECT id, title, content, created_at
    FROM posts
    WHERE profile_id = p.id AND published = true
    ORDER BY created_at DESC
    LIMIT 1
  ) lp) as latest_post
FROM profiles p
INNER JOIN liked_profile_ids l ON p.id = l.liked_id
LEFT JOIN profile_kpis k ON p.id = k.profile_id AND k.rank <= 3
WHERE p.is_public = true
GROUP BY p.id;
*/
