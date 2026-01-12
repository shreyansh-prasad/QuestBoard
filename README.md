# QuestBoard

A multi-user progress and blog platform for college students. Built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Features

- 🔐 User authentication and profiles
- 📊 Quest tracking with KPIs
- ✍️ Blog posts with markdown support
- 👥 Explore and follow other students
- 🏆 Leaderboard with scoring system
- 📱 Responsive design with dark theme

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (Auth, Postgres, Storage)
- **Deployment**: Vercel
- **Testing**: Jest, Playwright

## Quick Start

### 1. Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### 2. Installation

```bash
# Clone the repository
git clone <repository-url>
cd BlogHub

# Install dependencies
npm install

# Copy environment variables template
cp env.example .env.local
```

### 3. Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
CRON_SECRET=your_random_secret_for_cron_jobs
```

**Get your Supabase credentials:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project (or create a new one)
3. Go to Settings → API
4. Copy the URL and keys

### 4. Database Setup

1. Open `RUN_ALL_MIGRATIONS.sql` in your editor
2. Copy ALL contents
3. Go to Supabase Dashboard → SQL Editor → New Query
4. Paste and click "Run"
5. Verify success message

### 5. Storage Setup

1. Go to Supabase Dashboard → Storage
2. Create a new bucket named `avatars`
3. Set it to **Public** (toggle "Public bucket" ON)
4. Save

### 6. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm test             # Run Jest tests
npm run test:watch   # Run tests in watch mode
npm run test:e2e     # Run Playwright E2E tests
```

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── api/            # API routes
│   ├── auth/           # Authentication pages
│   ├── blogs/          # Blog listing and detail pages
│   ├── explore/        # User exploration page
│   ├── leaderboard/    # Leaderboard page
│   ├── posts/          # Post creation
│   ├── profile/        # Profile-related pages
│   ├── quests/         # Quest creation
│   └── u/              # User profile pages
├── components/         # React components
├── lib/               # Utility libraries (Supabase clients)
└── globals.css        # Global styles

supabase/
├── migrations/        # Database migration files
└── *.sql             # Additional SQL scripts
```

## Key Features Explained

### Authentication
- Email/password authentication via Supabase Auth
- Email verification (can be disabled in Supabase Dashboard)
- Protected routes and API endpoints

### Profiles
- Public/private profile settings
- Avatar uploads (Supabase Storage)
- Profile editing with bio, branch, year, section

### Quests & KPIs
- Create quests with multiple KPIs
- Track progress with numeric values and targets
- Public/private quest visibility

### Blog Posts
- Markdown content support
- Optional KPI updates when posting
- Published/draft status
- Slug-based URLs

### Leaderboard
- Score calculation based on quests, posts, KPIs, engagement
- Filterable by branch and year
- Precomputed scores (run cron job to update)

## Database Schema

Main tables:
- `profiles` - User profiles
- `quests` - User quests
- `kpis` - Quest KPIs (metrics)
- `posts` - Blog posts
- `follows` - User follows
- `post_likes` - Post likes
- `profile_likes` - Profile likes
- `user_scores` - Precomputed leaderboard scores

See `RUN_ALL_MIGRATIONS.sql` for complete schema.

## Deployment

### Vercel Deployment

1. Push your code to GitHub/GitLab/Bitbucket
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy

### Environment Variables (Production)

Add these in Vercel Dashboard → Settings → Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL` (your production URL)
- `CRON_SECRET` (random string for cron job security)

### Cron Job Setup (Leaderboard Scores)

To update leaderboard scores daily:

1. Go to Vercel Dashboard → Project → Settings → Cron Jobs
2. Add new cron job:
   - **Path**: `/api/cron/update-scores`
   - **Schedule**: `0 0 * * *` (daily at midnight UTC)
   - **Secret**: Same as `CRON_SECRET` env var

Or use Supabase Edge Functions or external cron service.

## Troubleshooting

### Database Tables Not Found

If you see errors like "Could not find table 'public.profiles'":
1. Run `RUN_ALL_MIGRATIONS.sql` in Supabase SQL Editor
2. Wait a few seconds for schema cache to update
3. Restart dev server

### Avatar Upload Fails

1. Ensure `avatars` storage bucket exists in Supabase
2. Make sure bucket is set to **Public**
3. Check file size (max 5MB) and format (image only)

### Environment Variables Missing

1. Check `.env.local` exists in project root
2. Verify all required variables are set
3. Restart dev server after adding variables

### Email Verification Issues

1. Check Supabase Dashboard → Authentication → Email Templates
2. To disable (development): Authentication → Settings → "Enable email confirmations" OFF
3. For production: Ensure email is configured in Supabase

## Testing

### Unit Tests (Jest)

```bash
npm test
```

### E2E Tests (Playwright)

```bash
npm run test:e2e
```

## License

Private - All rights reserved

## Support

For issues and questions, please check:
- Supabase documentation: https://supabase.com/docs
- Next.js documentation: https://nextjs.org/docs
