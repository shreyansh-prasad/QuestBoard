-- QuestBoard Initial Schema Migration
-- This creates all core database tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles Table
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
    section INTEGER CHECK (section IN (1, 2)),
    is_public BOOLEAN DEFAULT true,
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

-- Quests Table
CREATE TABLE IF NOT EXISTS public.quests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'archived')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    branch VARCHAR(100),
    year INTEGER CHECK (year >= 1 AND year <= 4),
    section INTEGER CHECK (section IN (1, 2)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for quests
CREATE INDEX IF NOT EXISTS idx_quests_profile_id ON public.quests(profile_id);
CREATE INDEX IF NOT EXISTS idx_quests_status ON public.quests(status);
CREATE INDEX IF NOT EXISTS idx_quests_branch ON public.quests(branch);
CREATE INDEX IF NOT EXISTS idx_quests_year ON public.quests(year);
CREATE INDEX IF NOT EXISTS idx_quests_section ON public.quests(section);

-- KPIs Table
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
CREATE INDEX IF NOT EXISTS idx_kpis_name ON public.kpis(name);

-- Posts Table
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    quest_id UUID REFERENCES public.quests(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    slug VARCHAR(255) UNIQUE,
    published BOOLEAN DEFAULT false,
    branch VARCHAR(100),
    year INTEGER CHECK (year >= 1 AND year <= 4),
    section INTEGER CHECK (section IN (1, 2)),
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
CREATE INDEX IF NOT EXISTS idx_posts_published ON public.posts(published);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON public.posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_branch ON public.posts(branch);
CREATE INDEX IF NOT EXISTS idx_posts_year ON public.posts(year);
CREATE INDEX IF NOT EXISTS idx_posts_section ON public.posts(section);

-- Follows Table
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

-- Post Likes Table
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

-- Profile Likes Table
-- Schema: profile_id = the profile being liked, liker_profile_id = the profile doing the liking
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

-- Reports Table (for moderation)
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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quests_updated_at BEFORE UPDATE ON public.quests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kpis_updated_at BEFORE UPDATE ON public.kpis
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON public.posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate slugs from post titles
CREATE OR REPLACE FUNCTION generate_slug(title TEXT)
RETURNS TEXT AS $$
DECLARE
    slug TEXT;
    counter INTEGER := 0;
BEGIN
    -- Convert to lowercase and replace spaces/special chars with hyphens
    slug := lower(regexp_replace(title, '[^a-z0-9]+', '-', 'gi'));
    slug := trim(both '-' from slug);
    
    -- Ensure slug is not empty
    IF slug = '' THEN
        slug := 'post';
    END IF;
    
    -- Check for uniqueness and append counter if needed
    WHILE EXISTS (SELECT 1 FROM public.posts WHERE posts.slug = slug) LOOP
        counter := counter + 1;
        slug := slug || '-' || counter;
    END LOOP;
    
    RETURN slug;
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

CREATE TRIGGER auto_generate_slug BEFORE INSERT ON public.posts
    FOR EACH ROW EXECUTE FUNCTION auto_generate_post_slug();

COMMENT ON TABLE public.profiles IS 'User profiles with college information';
COMMENT ON TABLE public.quests IS 'User-defined quests/goals';
COMMENT ON TABLE public.kpis IS 'Key Performance Indicators for quests';
COMMENT ON TABLE public.posts IS 'User blog posts';
COMMENT ON TABLE public.follows IS 'User follow relationships';
COMMENT ON TABLE public.post_likes IS 'Likes on posts';
COMMENT ON TABLE public.profile_likes IS 'Likes on profiles';
COMMENT ON TABLE public.reports IS 'Content moderation reports';
