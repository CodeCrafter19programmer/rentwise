# Vercel Deployment Guide

This guide will help you deploy the RentWise application to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. A PostgreSQL database (Vercel Postgres, Supabase, or any PostgreSQL provider)
3. Node.js 18+ installed locally (for testing)

## Environment Variables

Before deploying, you need to set the following environment variables in your Vercel project:

### Required Variables

- `DATABASE_URL` - Your PostgreSQL connection string
  - Format: `postgresql://user:password@host:port/database`
  - Example: `postgresql://user:pass@localhost:5432/rentwise`

### Optional Variables

- `NODE_ENV` - Set to `production` (automatically set by Vercel)
- `PORT` - Server port (not needed for Vercel serverless functions)

## Deployment Steps

### Option 1: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. For production deployment:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via GitHub Integration

1. Push your code to a GitHub repository
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Other
   - **Root Directory**: `./` (root)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/public`
   - **Install Command**: `npm install`

5. Add environment variables in the Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - Add `DATABASE_URL` with your PostgreSQL connection string

6. Click "Deploy"

## Project Structure

The project is configured as follows:

- **Frontend**: Built with Vite and React, output to `dist/public`
- **API Routes**: Express app wrapped as serverless functions in `/api/index.ts`
- **Build Output**: Static files in `dist/public`, API functions in `/api`

## Database Setup

1. Run database migrations before deploying:
   ```bash
   npm run db:push
   ```

   Or set up migrations to run automatically in Vercel:
   - Add a build script that runs migrations
   - Or use Vercel's Postgres integration which can handle migrations

## Troubleshooting

### Build Fails

- Ensure all dependencies are in `package.json`
- Check that `DATABASE_URL` is set correctly
- Review build logs in Vercel dashboard

### API Routes Not Working

- Verify that routes are prefixed with `/api` in your Express app
- Check that `vercel.json` rewrites are configured correctly
- Review function logs in Vercel dashboard

### Database Connection Issues

- Verify `DATABASE_URL` is set correctly
- Ensure your database allows connections from Vercel's IP ranges
- Check database credentials and permissions

## Local Development

For local development, use:

```bash
npm run dev
```

This will start the Express server with Vite dev server on port 5000 (or PORT env var).

## Production Build

To test the production build locally:

```bash
npm run build
npm run start
```

## Additional Resources

- [Vercel Documentation](https://docs.vercel.com)
- [Vercel Serverless Functions](https://docs.vercel.com/functions)
- [Vercel Environment Variables](https://docs.vercel.com/environment-variables)

