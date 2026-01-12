-- Row Level Security (RLS) Policies Migration
-- Enables RLS and creates policies for all tables

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_scores ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own profile
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Allow public read access to public profiles
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles
FOR SELECT
TO public
USING (is_public = true);

-- Allow authenticated users to view their own profile even if private
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR is_public = true);

-- ============================================================================
-- QUESTS POLICIES
-- ============================================================================

-- Allow authenticated users to insert their own quests
CREATE POLICY "Users can insert their own quests"
ON public.quests
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = quests.profile_id
        AND profiles.user_id = auth.uid()
    )
);

-- Allow users to update their own quests
CREATE POLICY "Users can update their own quests"
ON public.quests
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = quests.profile_id
        AND profiles.user_id = auth.uid()
    )
);

-- Allow users to delete their own quests
CREATE POLICY "Users can delete their own quests"
ON public.quests
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = quests.profile_id
        AND profiles.user_id = auth.uid()
    )
);

-- Allow public read access to quests from public profiles
CREATE POLICY "Quests from public profiles are viewable"
ON public.quests
FOR SELECT
TO public
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = quests.profile_id
        AND profiles.is_public = true
    )
);

-- ============================================================================
-- KPIS POLICIES
-- ============================================================================

-- Allow authenticated users to insert KPIs for their own quests
CREATE POLICY "Users can insert KPIs for their own quests"
ON public.kpis
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.quests
        JOIN public.profiles ON profiles.id = quests.profile_id
        WHERE quests.id = kpis.quest_id
        AND profiles.user_id = auth.uid()
    )
);

-- Allow users to update KPIs for their own quests
CREATE POLICY "Users can update KPIs for their own quests"
ON public.kpis
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.quests
        JOIN public.profiles ON profiles.id = quests.profile_id
        WHERE quests.id = kpis.quest_id
        AND profiles.user_id = auth.uid()
    )
);

-- Allow users to delete KPIs for their own quests
CREATE POLICY "Users can delete KPIs for their own quests"
ON public.kpis
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.quests
        JOIN public.profiles ON profiles.id = quests.profile_id
        WHERE quests.id = kpis.quest_id
        AND profiles.user_id = auth.uid()
    )
);

-- Allow public read access to KPIs from public profiles' quests
CREATE POLICY "KPIs from public profiles are viewable"
ON public.kpis
FOR SELECT
TO public
USING (
    EXISTS (
        SELECT 1 FROM public.quests
        JOIN public.profiles ON profiles.id = quests.profile_id
        WHERE quests.id = kpis.quest_id
        AND profiles.is_public = true
    )
);

-- ============================================================================
-- POSTS POLICIES
-- ============================================================================

-- Allow authenticated users to insert their own posts
CREATE POLICY "Users can insert their own posts"
ON public.posts
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = posts.profile_id
        AND profiles.user_id = auth.uid()
    )
);

-- Allow users to update their own posts
CREATE POLICY "Users can update their own posts"
ON public.posts
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = posts.profile_id
        AND profiles.user_id = auth.uid()
    )
);

-- Allow users to delete their own posts
CREATE POLICY "Users can delete their own posts"
ON public.posts
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = posts.profile_id
        AND profiles.user_id = auth.uid()
    )
);

-- Allow public read access to published posts from public profiles
CREATE POLICY "Published posts from public profiles are viewable"
ON public.posts
FOR SELECT
TO public
USING (
    published = true
    AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = posts.profile_id
        AND profiles.is_public = true
    )
);

-- Allow authenticated users to view their own posts (even if unpublished)
CREATE POLICY "Users can view their own posts"
ON public.posts
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = posts.profile_id
        AND profiles.user_id = auth.uid()
    )
);

-- ============================================================================
-- FOLLOWS POLICIES
-- ============================================================================

-- Allow authenticated users to insert follows
CREATE POLICY "Users can follow other profiles"
ON public.follows
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = follows.follower_id
        AND profiles.user_id = auth.uid()
    )
);

-- Allow users to delete their own follows (unfollow)
CREATE POLICY "Users can unfollow profiles"
ON public.follows
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = follows.follower_id
        AND profiles.user_id = auth.uid()
    )
);

-- Allow public read access to follows (for follower/following counts)
CREATE POLICY "Follows are viewable by everyone"
ON public.follows
FOR SELECT
TO public
USING (true);

-- ============================================================================
-- POST_LIKES POLICIES
-- ============================================================================

-- Allow authenticated users to like posts
CREATE POLICY "Users can like posts"
ON public.post_likes
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = post_likes.profile_id
        AND profiles.user_id = auth.uid()
    )
);

-- Allow users to unlike posts (delete their own likes)
CREATE POLICY "Users can unlike posts"
ON public.post_likes
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = post_likes.profile_id
        AND profiles.user_id = auth.uid()
    )
);

-- Allow public read access to post likes (for like counts)
CREATE POLICY "Post likes are viewable by everyone"
ON public.post_likes
FOR SELECT
TO public
USING (true);

-- ============================================================================
-- PROFILE_LIKES POLICIES
-- ============================================================================

-- Allow authenticated users to like profiles
CREATE POLICY "Users can like profiles"
ON public.profile_likes
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = profile_likes.liker_profile_id
        AND profiles.user_id = auth.uid()
    )
);

-- Allow users to unlike profiles (delete their own likes)
CREATE POLICY "Users can unlike profiles"
ON public.profile_likes
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = profile_likes.liker_profile_id
        AND profiles.user_id = auth.uid()
    )
);

-- Allow public read access to profile likes (for like counts)
CREATE POLICY "Profile likes are viewable by everyone"
ON public.profile_likes
FOR SELECT
TO public
USING (true);

-- ============================================================================
-- REPORTS POLICIES
-- ============================================================================

-- Allow authenticated users to create reports
CREATE POLICY "Users can create reports"
ON public.reports
FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = reports.reporter_id
        AND profiles.user_id = auth.uid()
    )
);

-- Allow users to view their own reports
CREATE POLICY "Users can view their own reports"
ON public.reports
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = reports.reporter_id
        AND profiles.user_id = auth.uid()
    )
);

-- Note: Update/Delete policies for reports should be restricted to admins
-- Admin role check would require additional setup (custom claims/roles)

-- ============================================================================
-- USER_SCORES POLICIES (Leaderboard)
-- ============================================================================

-- Allow public read access to user scores (for leaderboard)
CREATE POLICY "User scores are publicly viewable"
ON public.user_scores
FOR SELECT
TO public
USING (true);

-- Allow service role to insert/update/delete scores (for cron jobs)
-- Note: Service role bypasses RLS by default, but we can be explicit

COMMENT ON POLICY "Users can insert their own profile" ON public.profiles IS 'RLS: Allow users to create their own profile';
COMMENT ON POLICY "Public profiles are viewable by everyone" ON public.profiles IS 'RLS: Public profiles are visible to all';
COMMENT ON POLICY "Users can insert their own posts" ON public.posts IS 'RLS: Users can create posts for their own profile';
COMMENT ON POLICY "Published posts from public profiles are viewable" ON public.posts IS 'RLS: Published posts are visible to all';
