# QuestBoard

A multi-user progress and blog platform for college students. Built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Features

- User authentication and profiles
- Quest tracking with KPIs
- Blog posts with markdown support
- Explore and follow other students
- Leaderboard with scoring system
- Responsive design with dark theme
- Social media links (Instagram, LinkedIn, GitHub)

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (Auth, PostgreSQL, Storage)
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account and project

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/shreyansh-prasad/QuestBoard.git
   cd QuestBoard
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Copy `env.example` to `.env.local` and fill in your Supabase credentials:
   
   ```bash
   cp env.example .env.local
   ```
   
   Get your credentials from: Supabase Dashboard → Settings → API
   - `NEXT_PUBLIC_SUPABASE_URL` - Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - anon/public key
   - `SUPABASE_SERVICE_ROLE_KEY` - service_role key (keep secret!)

4. **Set up the database**
   
   Open Supabase Dashboard → SQL Editor and run `RUN_ALL_MIGRATIONS.sql`

5. **Create storage bucket**
   
   In Supabase Dashboard → Storage, create a public bucket named `avatars`

6. **Run the development server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                 # Next.js pages and API routes
├── components/         # React components
└── lib/               # Utilities (Supabase clients, constants)

supabase/
├── migrations/        # Database migrations
└── *.sql             # SQL scripts
```

For detailed structure, see [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md).

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Database Schema

- `profiles` - User profiles with social links
- `quests` - User quests/goals
- `kpis` - Quest KPIs (metrics)
- `posts` - Blog posts
- `comments` - Comments on posts
- `follows` - User follow relationships
- `post_likes` - Post likes
- `profile_likes` - Profile likes
- `user_scores` - Leaderboard scores

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment instructions.

---

**Built for NSUT students**
