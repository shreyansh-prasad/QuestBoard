# QuestBoard Deployment Guide

This guide will help you deploy QuestBoard to production.

## Prerequisites

- ✅ Node.js 18+ installed
- ✅ Supabase account and project set up
- ✅ Git repository (optional, for version control)
- ✅ Vercel account (recommended) or another hosting provider

## Pre-Deployment Checklist

### 1. Environment Variables

Create a `.env.local` file (or set environment variables in your hosting platform):

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_SITE_URL=https://your-domain.com
CRON_SECRET=your-secure-random-string-here
```

**Get your Supabase credentials:**
1. Go to Supabase Dashboard → Settings → API
2. Copy Project URL → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy anon/public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Copy service_role key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

**Generate CRON_SECRET:**
```bash
openssl rand -hex 32
```

### 2. Supabase Configuration

#### Email Configuration
1. Go to Supabase Dashboard → Authentication → Providers → Email
2. Enable "Enable email confirmations"
3. Configure SMTP (recommended for production) OR use Supabase's default email service

#### OAuth Providers (Optional)
1. Go to Authentication → Providers
2. Enable Google/GitHub if needed
3. Add OAuth credentials (Client ID, Client Secret)
4. Set Authorization callback URL to: `https://your-project-ref.supabase.co/auth/v1/callback`

#### Storage Buckets
1. Go to Storage
2. Create bucket named `avatars`
3. Set to public or configure RLS policies

#### Database Migrations
1. Go to SQL Editor
2. Run all migrations from `supabase/` folder in order
3. Or use `RUN_ALL_MIGRATIONS.sql` if available

### 3. Build Test

Test the production build locally:

```bash
npm run build
npm start
```

Visit `http://localhost:3000` to verify everything works.

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel is the easiest option for Next.js apps:

1. **Install Vercel CLI** (optional):
   ```bash
   npm i -g vercel
   ```

2. **Deploy via Vercel Dashboard:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your Git repository (GitHub/GitLab/Bitbucket)
   - Or upload your project folder

3. **Configure Environment Variables:**
   - In Vercel Dashboard → Project Settings → Environment Variables
   - Add all variables from `.env.local`
   - Make sure to set them for "Production", "Preview", and "Development"

4. **Deploy:**
   - Vercel will automatically detect Next.js
   - Click "Deploy"
   - Your site will be live at `https://your-project.vercel.app`

5. **Custom Domain (Optional):**
   - Go to Project Settings → Domains
   - Add your custom domain
   - Update `NEXT_PUBLIC_SITE_URL` to your custom domain

### Option 2: Other Hosting Providers

#### Netlify
1. Connect your Git repository
2. Build command: `npm run build`
3. Publish directory: `.next`
4. Add environment variables in Netlify dashboard

#### Railway
1. Connect repository
2. Set build command: `npm run build`
3. Set start command: `npm start`
4. Add environment variables

#### Self-Hosted (VPS/Server)
1. Install Node.js 18+
2. Clone repository
3. Run `npm install`
4. Set environment variables
5. Run `npm run build`
6. Use PM2 or similar: `pm2 start npm --name "questboard" -- start`
7. Set up reverse proxy (nginx) for port 3000

## Post-Deployment Steps

### 1. Update Supabase Redirect URLs

1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add your production URL to "Site URL"
3. Add your production URL to "Redirect URLs":
   - `https://your-domain.com/auth/callback`
   - `https://your-domain.com/auth/verify`

### 2. Update OAuth Redirect URLs (if using OAuth)

For each OAuth provider (Google, GitHub):
- Update Authorization callback URL to: `https://your-project-ref.supabase.co/auth/v1/callback`
- This should already be set, but verify it's correct

### 3. Test Critical Features

- ✅ User signup and email verification
- ✅ User login
- ✅ Profile creation and editing
- ✅ Quest creation
- ✅ Post creation
- ✅ Avatar upload
- ✅ OAuth login (if enabled)
- ✅ Password reset
- ✅ Follow/unfollow users
- ✅ Like posts and profiles

### 4. Performance Optimization

- ✅ Check Vercel Analytics (if using Vercel)
- ✅ Verify images are optimized (Next.js Image component)
- ✅ Test on mobile devices
- ✅ Check Core Web Vitals

### 5. Security Checklist

- ✅ All environment variables are set (not hardcoded)
- ✅ Service role key is not exposed to client
- ✅ RLS policies are enabled in Supabase
- ✅ HTTPS is enabled (Vercel does this automatically)
- ✅ CORS is properly configured
- ✅ Email verification is enabled

## Monitoring

### Vercel Analytics (if using Vercel)
- Enable Analytics in Vercel Dashboard
- Monitor page views, performance metrics

### Supabase Dashboard
- Monitor API usage
- Check authentication logs
- Review database performance
- Monitor storage usage

## Troubleshooting

### Build Errors
- Check all environment variables are set
- Verify Node.js version (18+)
- Check for TypeScript errors: `npm run lint`

### Runtime Errors
- Check browser console for client-side errors
- Check Vercel function logs for API errors
- Verify Supabase connection
- Check environment variables are correct

### Email Not Sending
- Verify SMTP is configured (or Supabase default email is working)
- Check Supabase Authentication logs
- Verify email templates are set up

### OAuth Not Working
- Verify OAuth credentials are correct
- Check redirect URLs match exactly
- Verify callback URL in provider settings

## Support

For issues:
1. Check Supabase Dashboard logs
2. Check Vercel function logs
3. Review browser console errors
4. Check this deployment guide

## Environment Variables Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | Yes | `eyJ...` (secret!) |
| `NEXT_PUBLIC_SITE_URL` | Your production URL | Recommended | `https://your-domain.com` |
| `CRON_SECRET` | Secret for cron endpoints | Optional | Random hex string |

## Next Steps After Deployment

1. ✅ Test all features thoroughly
2. ✅ Set up monitoring/analytics
3. ✅ Configure custom domain (if needed)
4. ✅ Set up backup strategy for database
5. ✅ Document any custom configurations
6. ✅ Share with users! 🎉
