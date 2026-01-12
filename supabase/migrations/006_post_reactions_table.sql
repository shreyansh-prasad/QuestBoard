-- Post Reactions Table for Emoji Reactions
-- This table stores emoji reactions on posts

CREATE TABLE IF NOT EXISTS public.post_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(post_id, profile_id, emoji)
);

-- Indexes for post_reactions
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id ON public.post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_profile_id ON public.post_reactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_emoji ON public.post_reactions(emoji);

-- Trigger to update updated_at timestamp (if needed in future)
-- Note: Reactions don't need updated_at, but we can add it if needed

COMMENT ON TABLE public.post_reactions IS 'Emoji reactions on posts';
