-- RLS Policies for Comments Table

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view comments on public posts
CREATE POLICY "Anyone can view comments on public posts"
    ON public.comments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = comments.post_id
            AND posts.is_published = true
            AND EXISTS (
                SELECT 1 FROM public.profiles
                WHERE profiles.id = posts.profile_id
                AND profiles.is_public = true
            )
        )
    );

-- Policy: Authenticated users can view comments on their own posts (even if private)
CREATE POLICY "Users can view comments on their own posts"
    ON public.comments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.posts
            JOIN public.profiles ON profiles.id = posts.profile_id
            JOIN auth.users ON users.id = profiles.user_id
            WHERE posts.id = comments.post_id
            AND (SELECT auth.uid()) = users.id
        )
    );

-- Policy: Authenticated users can create comments on published posts
CREATE POLICY "Authenticated users can create comments"
    ON public.comments
    FOR INSERT
    WITH CHECK (
        (SELECT auth.uid()) IS NOT NULL
        AND EXISTS (
            SELECT 1 FROM public.posts
            WHERE posts.id = comments.post_id
            AND posts.is_published = true
        )
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = comments.profile_id
            AND profiles.user_id = (SELECT auth.uid())
        )
    );

-- Policy: Users can update their own comments
CREATE POLICY "Users can update their own comments"
    ON public.comments
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = comments.profile_id
            AND profiles.user_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = comments.profile_id
            AND profiles.user_id = (SELECT auth.uid())
        )
    );

-- Policy: Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
    ON public.comments
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = comments.profile_id
            AND profiles.user_id = (SELECT auth.uid())
        )
    );

-- Policy: Post authors can delete comments on their posts
CREATE POLICY "Post authors can delete comments on their posts"
    ON public.comments
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.posts
            JOIN public.profiles ON profiles.id = posts.profile_id
            JOIN auth.users ON users.id = profiles.user_id
            WHERE posts.id = comments.post_id
            AND (SELECT auth.uid()) = users.id
        )
    );
