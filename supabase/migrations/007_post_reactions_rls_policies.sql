-- RLS Policies for Post Reactions Table

-- Enable RLS
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view reactions on published posts
CREATE POLICY "Anyone can view reactions on published posts"
    ON public.post_reactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = post_reactions.post_id
            AND posts.is_published = true
        )
    );

-- Policy: Authenticated users can add reactions to published posts
CREATE POLICY "Authenticated users can add reactions"
    ON public.post_reactions
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = post_reactions.post_id
            AND posts.is_published = true
        )
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = post_reactions.profile_id
            AND profiles.user_id = auth.uid()
        )
    );

-- Policy: Users can remove their own reactions
CREATE POLICY "Users can remove their own reactions"
    ON public.post_reactions
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = post_reactions.profile_id
            AND profiles.user_id = auth.uid()
        )
    );
