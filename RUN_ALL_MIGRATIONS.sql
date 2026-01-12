-- ============================================================================
-- QUESTBOARD - COMPLETE DATABASE SETUP
-- Copy and paste ALL of this into Supabase SQL Editor and click RUN
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(30) NOT NULL UNIQUE,
    email TEXT NOT NULL,
    display_name VARCHAR(100),
    bio TEXT,
    avatar_url TEXT,
    branch VARCHAR(100),
    year INTEGER CHECK (year >= 1 AND year <= 4),
    section TEXT CHECK (section IN ('1', '2')),
    is_public BOOLEAN DEFAULT true,
    hide_money BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_branch ON public.profiles(branch);
CREATE INDEX IF NOT EXISTS idx_profiles_year ON public.profiles(year);
CREATE INDEX IF NOT EXISTS idx_profiles_section ON public.profiles(section);
CREATE INDEX IF NOT EXISTS idx_profiles_is_public ON public.profiles(is_public);

-- ============================================================================
-- 2. QUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'archived')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for quests
CREATE INDEX IF NOT EXISTS idx_quests_profile_id ON public.quests(profile_id);
CREATE INDEX IF NOT EXISTS idx_quests_status ON public.quests(status);
CREATE INDEX IF NOT EXISTS idx_quests_is_public ON public.quests(is_public);

-- ============================================================================
-- 3. KPIS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.kpis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quest_id UUID NOT NULL REFERENCES public.quests(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    value NUMERIC(10, 2) DEFAULT 0,
    target NUMERIC(10, 2),
    unit VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for KPIs
CREATE INDEX IF NOT EXISTS idx_kpis_quest_id ON public.kpis(quest_id);

-- ============================================================================
-- 4. POSTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    quest_id UUID REFERENCES public.quests(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    slug VARCHAR(255) UNIQUE,
    thumbnail_url TEXT,
    is_published BOOLEAN DEFAULT true,
    sleep_hours NUMERIC(4, 2),
    dsa_hours NUMERIC(4, 2),
    project_hours NUMERIC(4, 2),
    money_saved NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for posts
CREATE INDEX IF NOT EXISTS idx_posts_profile_id ON public.posts(profile_id);
CREATE INDEX IF NOT EXISTS idx_posts_quest_id ON public.posts(quest_id);
CREATE INDEX IF NOT EXISTS idx_posts_is_published ON public.posts(is_published);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON public.posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);

-- ============================================================================
-- 5. FOLLOWS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower_id, following_id),
    CHECK (follower_id != following_id)
);

-- Indexes for follows
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);

-- ============================================================================
-- 6. POST LIKES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.post_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profile_id, post_id)
);

-- Indexes for post_likes
CREATE INDEX IF NOT EXISTS idx_post_likes_profile_id ON public.post_likes(profile_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);

-- ============================================================================
-- 7. PROFILE LIKES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profile_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    liker_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(profile_id, liker_profile_id),
    CHECK (profile_id != liker_profile_id)
);

-- Indexes for profile_likes
CREATE INDEX IF NOT EXISTS idx_profile_likes_profile_id ON public.profile_likes(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_likes_liker_profile_id ON public.profile_likes(liker_profile_id);

-- ============================================================================
-- 8. REPORTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reported_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    reported_post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    reported_quest_id UUID REFERENCES public.quests(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (
        (reported_profile_id IS NOT NULL)::int +
        (reported_post_id IS NOT NULL)::int +
        (reported_quest_id IS NOT NULL)::int = 1
    )
);

-- Indexes for reports
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);

-- ============================================================================
-- 9. USER SCORES TABLE (FOR LEADERBOARD)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    total_score NUMERIC(10, 2) NOT NULL DEFAULT 0,
    normalized_score NUMERIC(10, 4) NOT NULL DEFAULT 0,
    quest_score NUMERIC(10, 2) NOT NULL DEFAULT 0,
    post_score NUMERIC(10, 2) NOT NULL DEFAULT 0,
    engagement_score NUMERIC(10, 2) NOT NULL DEFAULT 0,
    kpi_score NUMERIC(10, 2) NOT NULL DEFAULT 0,
    rank INTEGER,
    branch TEXT,
    year INTEGER,
    section TEXT,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for user_scores
CREATE INDEX IF NOT EXISTS idx_user_scores_profile_id ON public.user_scores(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_scores_normalized_score ON public.user_scores(normalized_score DESC);
CREATE INDEX IF NOT EXISTS idx_user_scores_branch_year ON public.user_scores(branch, year);
CREATE INDEX IF NOT EXISTS idx_user_scores_rank ON public.user_scores(rank);

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quests_updated_at ON public.quests;
CREATE TRIGGER update_quests_updated_at 
    BEFORE UPDATE ON public.quests
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kpis_updated_at ON public.kpis;
CREATE TRIGGER update_kpis_updated_at 
    BEFORE UPDATE ON public.kpis
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
CREATE TRIGGER update_posts_updated_at 
    BEFORE UPDATE ON public.posts
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_scores_updated_at ON public.user_scores;
CREATE TRIGGER update_user_scores_updated_at 
    BEFORE UPDATE ON public.user_scores
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Function to generate slugs from post titles
CREATE OR REPLACE FUNCTION generate_slug(title TEXT)
RETURNS TEXT AS $$
DECLARE
    result_slug TEXT;
    counter INTEGER := 0;
    base_slug TEXT;
BEGIN
    result_slug := lower(regexp_replace(title, '[^a-z0-9]+', '-', 'gi'));
    result_slug := trim(both '-' from result_slug);
    
    IF result_slug = '' THEN
        result_slug := 'post';
    END IF;
    
    base_slug := result_slug;
    WHILE EXISTS (SELECT 1 FROM public.posts p WHERE p.slug = result_slug) LOOP
        counter := counter + 1;
        result_slug := base_slug || '-' || counter;
    END LOOP;
    
    RETURN result_slug;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate slug for posts
CREATE OR REPLACE FUNCTION auto_generate_post_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := generate_slug(NEW.title);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_generate_slug ON public.posts;
CREATE TRIGGER auto_generate_slug 
    BEFORE INSERT ON public.posts
    FOR EACH ROW 
    EXECUTE FUNCTION auto_generate_post_slug();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

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

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Profiles policies
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile"
    ON public.profiles FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    TO public
    USING (is_public = true);

CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Drop and recreate quests policies
DROP POLICY IF EXISTS "Anyone can view public quests" ON public.quests;
DROP POLICY IF EXISTS "Users can create quests" ON public.quests;
DROP POLICY IF EXISTS "Users can update their own quests" ON public.quests;
DROP POLICY IF EXISTS "Users can delete their own quests" ON public.quests;

CREATE POLICY "Anyone can view public quests"
    ON public.quests FOR SELECT
    TO public
    USING (is_public = true OR auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id));

CREATE POLICY "Users can create quests"
    ON public.quests FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id));

CREATE POLICY "Users can update their own quests"
    ON public.quests FOR UPDATE
    TO authenticated
    USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id))
    WITH CHECK (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id));

CREATE POLICY "Users can delete their own quests"
    ON public.quests FOR DELETE
    TO authenticated
    USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id));

-- KPIs policies
DROP POLICY IF EXISTS "KPIs are viewable with their quest" ON public.kpis;
DROP POLICY IF EXISTS "Users can create KPIs" ON public.kpis;
DROP POLICY IF EXISTS "Users can update their own KPIs" ON public.kpis;

CREATE POLICY "KPIs are viewable with their quest"
    ON public.kpis FOR SELECT
    TO public
    USING (EXISTS (SELECT 1 FROM public.quests WHERE id = quest_id AND (is_public = true OR auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id))));

CREATE POLICY "Users can create KPIs"
    ON public.kpis FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IN (SELECT p.user_id FROM public.profiles p JOIN public.quests q ON q.profile_id = p.id WHERE q.id = quest_id));

CREATE POLICY "Users can update their own KPIs"
    ON public.kpis FOR UPDATE
    TO authenticated
    USING (auth.uid() IN (SELECT p.user_id FROM public.profiles p JOIN public.quests q ON q.profile_id = p.id WHERE q.id = quest_id))
    WITH CHECK (auth.uid() IN (SELECT p.user_id FROM public.profiles p JOIN public.quests q ON q.profile_id = p.id WHERE q.id = quest_id));

-- Posts policies
DROP POLICY IF EXISTS "Anyone can view published posts" ON public.posts;
DROP POLICY IF EXISTS "Users can create posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;

CREATE POLICY "Anyone can view published posts"
    ON public.posts FOR SELECT
    TO public
    USING (is_published = true OR auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id));

CREATE POLICY "Users can create posts"
    ON public.posts FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IN (SELECT user_id FROM public.profiles WHERE profiles.id = posts.profile_id));

CREATE POLICY "Users can update their own posts"
    ON public.posts FOR UPDATE
    TO authenticated
    USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id))
    WITH CHECK (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id));

-- Follows, likes, and other policies
DROP POLICY IF EXISTS "Users can view follows" ON public.follows;
DROP POLICY IF EXISTS "Users can create follows" ON public.follows;
DROP POLICY IF EXISTS "Users can delete their own follows" ON public.follows;

CREATE POLICY "Users can view follows"
    ON public.follows FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Users can create follows"
    ON public.follows FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = follower_id));

CREATE POLICY "Users can delete their own follows"
    ON public.follows FOR DELETE
    TO authenticated
    USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = follower_id));

-- Post likes policies
DROP POLICY IF EXISTS "Anyone can view post likes" ON public.post_likes;
DROP POLICY IF EXISTS "Users can like posts" ON public.post_likes;
DROP POLICY IF EXISTS "Users can unlike posts" ON public.post_likes;

CREATE POLICY "Anyone can view post likes"
    ON public.post_likes FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Users can like posts"
    ON public.post_likes FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id));

CREATE POLICY "Users can unlike posts"
    ON public.post_likes FOR DELETE
    TO authenticated
    USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = profile_id));

-- Profile likes policies
DROP POLICY IF EXISTS "Users can view profile likes" ON public.profile_likes;
DROP POLICY IF EXISTS "Users can like profiles" ON public.profile_likes;
DROP POLICY IF EXISTS "Users can unlike profiles" ON public.profile_likes;

CREATE POLICY "Users can view profile likes"
    ON public.profile_likes FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Users can like profiles"
    ON public.profile_likes FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = liker_profile_id));

CREATE POLICY "Users can unlike profiles"
    ON public.profile_likes FOR DELETE
    TO authenticated
    USING (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = liker_profile_id));

-- Reports policies
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
DROP POLICY IF EXISTS "Admins can view reports" ON public.reports;

CREATE POLICY "Users can create reports"
    ON public.reports FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IN (SELECT user_id FROM public.profiles WHERE id = reporter_id));

CREATE POLICY "Admins can view reports"
    ON public.reports FOR SELECT
    TO authenticated
    USING (true); -- In production, add role check: auth.jwt() ->> 'role' = 'admin'

-- User scores policies (read-only for everyone)
DROP POLICY IF EXISTS "Anyone can view user scores" ON public.user_scores;

CREATE POLICY "Anyone can view user scores"
    ON public.user_scores FOR SELECT
    TO public
    USING (true);

-- ============================================================================
-- 10. ADD SOCIAL MEDIA FIELDS TO PROFILES
-- ============================================================================
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS instagram_url TEXT,
ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
ADD COLUMN IF NOT EXISTS github_url TEXT;

COMMENT ON COLUMN public.profiles.instagram_url IS 'Instagram profile URL';
COMMENT ON COLUMN public.profiles.linkedin_url IS 'LinkedIn profile URL';
COMMENT ON COLUMN public.profiles.github_url IS 'GitHub profile URL';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN ('profiles', 'quests', 'kpis', 'posts', 'follows', 'post_likes', 'profile_likes', 'reports', 'user_scores')
ORDER BY table_name;

-- Verify social media columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles' 
  AND column_name IN ('instagram_url', 'linkedin_url', 'github_url')
ORDER BY column_name;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Database setup complete!';
    RAISE NOTICE '✅ All 9 tables created';
    RAISE NOTICE '✅ All indexes created';
    RAISE NOTICE '✅ All RLS policies enabled';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Next steps:';
    RAISE NOTICE '1. Create Storage bucket named "avatars" (Public)';
    RAISE NOTICE '2. Restart your dev server: npm run dev';
    RAISE NOTICE '3. Test signup at /auth/signup';
END $$;
