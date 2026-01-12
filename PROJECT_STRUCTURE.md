# QuestBoard - Project Structure Overview

## 📁 Root Directory Structure

```
BlogHub/
├── src/                    # Main source code
├── supabase/              # Database migrations and SQL scripts
├── e2e/                   # End-to-end tests
├── scripts/               # Utility scripts
├── node_modules/          # Dependencies (generated)
├── .next/                 # Next.js build output (generated)
├── package.json           # Project dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── next.config.js         # Next.js configuration
├── tailwind.config.cjs    # Tailwind CSS configuration
├── middleware.ts          # Next.js middleware (auth session refresh)
├── .eslintrc.json         # ESLint configuration
├── .prettierrc            # Prettier code formatting
└── README.md              # Project documentation
```

---

## 📂 src/ - Main Source Code

### **src/app/** - Next.js App Router (Pages & API Routes)

Next.js 14 uses the App Router where folders define routes and files define UI/API endpoints.

#### **src/app/page.tsx**
- **Homepage** (`/`)
- Displays rotating inspirational quotes
- Minimal, centered design with animated gradient background

#### **src/app/layout.tsx**
- **Root layout** - Wraps all pages
- Includes global Navigation component
- Sets up global styles and font configuration
- Contains content wrapper with max-width constraint

#### **src/app/globals.css**
- Global CSS styles and Tailwind imports
- Custom CSS variables and animations
- Base styles for HTML elements

---

### **src/app/api/** - API Routes (Backend Endpoints)

All API routes are server-side and handle data operations:

#### **Authentication & Account**
- `auth/create-profile/route.ts` - Creates user profile after signup
- `auth/upload-avatar/route.ts` - Handles avatar image uploads
- `account/delete/route.ts` - Deletes user account and all data

#### **Social Features**
- `follow/toggle/route.ts` - Follow/unfollow users
- `like/toggle/route.ts` - Like/unlike profiles and posts
- `explore/users/route.ts` - Search and discover users

#### **Quests & KPIs**
- `quests/route.ts` - Create new quests
- `quests/[questId]/route.ts` - Update/delete specific quest
- `quests/[questId]/progress/route.ts` - Update quest progress
- `quests/[questId]/kpis/route.ts` - Manage KPIs for a quest
- `kpis/[kpiId]/update/route.ts` - Update individual KPI values

#### **Posts**
- `posts/route.ts` - Create new posts
- `posts/[postId]/route.ts` - Get/update/delete specific post

#### **Profile**
- `profile/update/route.ts` - Update profile information

#### **Leaderboard**
- `leaderboard/route.ts` - Get leaderboard rankings

#### **Other**
- `cron/update-scores/route.ts` - Scheduled job to update user scores
- `og/profile/route.ts` - Generate Open Graph images for profiles

---

### **src/app/auth/** - Authentication Pages

#### **Pages**
- `login/page.tsx` - User login (email/password + OAuth)
- `signup/page.tsx` - User registration with profile creation
- `verify/page.tsx` - Email verification handler
- `forgot-password/page.tsx` - Request password reset
- `reset-password/page.tsx` - Set new password after reset link
- `oauth-setup/page.tsx` - Complete profile setup for OAuth users

#### **Routes**
- `callback/route.ts` - OAuth callback handler (Google/GitHub)

---

### **src/app/u/[username]/** - User Profile Pages

Dynamic route for user profiles using `[username]` parameter:

- `page.tsx` - Main profile page (quests, posts, stats)
- `edit/page.tsx` - Edit own profile
- `followers/page.tsx` - List of users following this profile
- `following/page.tsx` - List of users this profile follows
- `likers/page.tsx` - List of users who liked this profile
- `not-found.tsx` - 404 page for non-existent profiles

#### **src/app/u/page.tsx**
- Redirects to user's own profile or explore page

---

### **src/app/explore/page.tsx**
- User discovery page
- Search and browse public profiles

---

### **src/app/leaderboard/page.tsx**
- Rankings page showing top users by score

---

### **src/app/quests/new/page.tsx**
- Multi-step form to create new quests with KPIs

---

### **src/app/posts/new/page.tsx**
- Create new blog posts with markdown support

---

### **src/app/blogs/** - Blog Pages
- `page.tsx` - List all published blog posts
- `[slug]/page.tsx` - Individual blog post viewer
- `[slug]/not-found.tsx` - 404 for non-existent posts

---

### **src/app/profile/liked/page.tsx**
- Shows profiles the current user has liked

---

## 📂 src/components/ - Reusable React Components

### **Navigation & Layout**
- `Navigation.tsx` - Global navigation bar (sticky header)
- `ConfirmModal.tsx` - Reusable confirmation dialog

### **Profile Components**
- `ProfileCard.tsx` - Display user profile card (avatar, name, stats)
- `ProfileActionButtons.tsx` - Edit Profile / Delete Account buttons
- `ProfileLikeButton.tsx` - Like/unlike profile button
- `FollowButton.tsx` - Follow/unfollow user button
- `ShareProfileButton.tsx` - Share profile URL button

### **Avatar Components**
- `AvatarUploader.tsx` - Upload avatar image component
- `AvatarEditor.tsx` - Crop/edit avatar before upload
- `ImageViewer.tsx` - Full-screen image viewer modal

### **Quest Components**
- `QuestCard.tsx` - Display quest card (read-only)
- `QuestCardWithEditor.tsx` - Quest card with edit/delete functionality
- `KPIProgress.tsx` - Progress bar for KPI values
- `KPIEditor.tsx` - Edit KPI values component
- `TrackerCard.tsx` - KPI tracking display

### **Post Components**
- `BlogCard.tsx` - Blog post preview card
- `PostCardWithEditor.tsx` - Post card with edit/delete functionality
- `PostListWithSort.tsx` - Sortable list of posts (latest/oldest/most-liked)

### **Filter Components**
- `FilterPanel.tsx` - Filter options for quests/posts

### **Interaction Components**
- `LikeButton.tsx` - Like/unlike button (for posts)

---

## 📂 src/lib/ - Utility Libraries & Configuration

### **Supabase Clients**
- `supabaseClient.ts` - Client-side Supabase client (browser)
- `supabaseServer.ts` - Server-side Supabase client (service role, bypasses RLS)
- `supabaseServerAuth.ts` - Server-side client with user session (respects RLS)

### **Business Logic**
- `constants.ts` - Constants (branches, sections, etc.)
- `questProgress.ts` - Calculate quest progress percentages
- `leaderboardScores.ts` - Calculate user scores for leaderboard

---

## 📂 supabase/ - Database Files

### **supabase/migrations/** - Database Migrations (Run in Order)
1. `001_initial_schema.sql` - Creates all base tables (profiles, quests, kpis, posts, etc.)
2. `002_rls_policies.sql` - Row Level Security policies for data access
3. `003_user_scores_table.sql` - User scoring system
4. `004_comments_table.sql` - Comments table (if used)
5. `005_comments_rls_policies.sql` - Comments security policies
6. `006_post_reactions_table.sql` - Post reactions/emojis
7. `007_post_reactions_rls_policies.sql` - Reactions security policies

### **SQL Scripts**
- `compute_user_scores.sql` - Calculate user scores function
- `explore_indexes.sql` - Database indexes for performance
- `optimized_queries.sql` - Optimized query examples

---

## 📂 e2e/ - End-to-End Tests

- `signup-quest-post.spec.ts` - Playwright tests for signup → create quest → create post flow

---

## 📂 scripts/ - Utility Scripts

- `setup-env.ps1` - PowerShell script to set up environment variables

---

## ⚙️ Configuration Files

### **package.json**
- Dependencies and dev dependencies
- Scripts: `dev`, `build`, `start`, `lint`, `test`, etc.

### **tsconfig.json**
- TypeScript compiler configuration
- Path aliases (`@/*` → `src/*`)

### **next.config.js**
- Next.js configuration
- Image optimization settings
- Supabase image domain whitelist

### **tailwind.config.cjs**
- Tailwind CSS theme customization
- Custom colors (background, text, border)
- Custom font families
- Custom spacing and sizing

### **middleware.ts**
- Next.js middleware
- Refreshes Supabase auth session on every request
- Ensures authentication state is current

### **.eslintrc.json**
- ESLint rules for code quality

### **.prettierrc**
- Prettier code formatting rules

---

## 🗂️ File Naming Conventions

### **Next.js App Router Rules:**
- `page.tsx` = Page component (creates a route)
- `layout.tsx` = Layout wrapper
- `route.ts` = API route handler
- `not-found.tsx` = 404 page
- `[param]` = Dynamic route parameter (e.g., `[username]`)

### **Component Naming:**
- PascalCase for component files (e.g., `ProfileCard.tsx`)
- Descriptive names indicating purpose

---

## 🔄 Data Flow

1. **User Request** → `src/app/[route]/page.tsx`
2. **Page Component** → Fetches data using `src/lib/supabaseServerAuth.ts`
3. **Renders** → Uses components from `src/components/`
4. **User Action** → Calls API route in `src/app/api/[endpoint]/route.ts`
5. **API Route** → Uses `src/lib/supabaseServer.ts` or `supabaseServerAuth.ts`
6. **Database** → Supabase PostgreSQL (defined in `supabase/migrations/`)
7. **Response** → Returns JSON or redirects

---

## 🎨 Styling System

- **Framework**: Tailwind CSS
- **Theme**: Dark mode (custom colors in `tailwind.config.cjs`)
- **Global Styles**: `src/app/globals.css`
- **Component Styles**: Inline Tailwind classes

---

## 🔐 Authentication Flow

1. **Signup/Login** → `src/app/auth/[action]/page.tsx`
2. **Auth Client** → `src/lib/supabaseClient.ts` (browser)
3. **Create Profile** → `src/app/api/auth/create-profile/route.ts`
4. **Session Management** → `middleware.ts` (refreshes session)
5. **Protected Routes** → Server components check auth status

---

## 📊 Key Features by Directory

| Feature | Location |
|---------|----------|
| User Profiles | `src/app/u/[username]/` |
| Authentication | `src/app/auth/` |
| Quest Management | `src/app/quests/`, `src/app/api/quests/` |
| Blog Posts | `src/app/posts/`, `src/app/blogs/` |
| Social (Follow/Like) | `src/app/api/follow/`, `src/app/api/like/` |
| Leaderboard | `src/app/leaderboard/`, `src/app/api/leaderboard/` |
| Database Schema | `supabase/migrations/` |
| Reusable UI | `src/components/` |

---

## 🚀 Deployment

- **Platform**: Vercel (configured in `vercel.json`)
- **Database**: Supabase (cloud-hosted PostgreSQL)
- **Storage**: Supabase Storage (for avatars)
- **Environment**: Variables in `.env.local` (not committed to git)

This structure follows Next.js 14 App Router best practices with clear separation of concerns: pages, API routes, components, and utilities.
