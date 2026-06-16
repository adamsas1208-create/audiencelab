# AudienceLab

Premium AI audience-insights dashboard where creators test short-form **hooks**
(opening lines) against a live audience. Built with React 19 + Vite +
Tailwind v4, with realtime voting powered by Supabase.

## Features

- **Rooms Dashboard** — interactive grid of 11 voting rooms with live per-room
  stats and Realtime presence ("creators online").
- **Vote View** — pick the winning hook in a room; results update live as
  others vote.
- **Supabase realtime** — vote counts stream in via Postgres Changes; the UI
  falls back to demo data when the database isn't reachable.

## Local development

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build -> dist/
npm run lint     # eslint
```

## Environment variables

Create a `.env` in the project root (it is gitignored — never commit it):

```bash
VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"
VITE_SUPABASE_ANON_KEY="<your-anon-/-publishable-key>"
```

Both are read in [`src/lib/supabaseClient.js`](src/lib/supabaseClient.js). The
anon key is the public/publishable key — safe to ship to the client because
Row Level Security protects the data.

## Database setup

Run the schema once in your Supabase project's **SQL Editor**:

```
supabase/migrations/0001_audiencelab_rooms_realtime.sql
```

It creates `rooms`, `hooks`, and `votes`, plus RLS policies, the
`room_stats` view, the realtime publication, and seed data. The script is
idempotent (safe to re-run).

## Deployment (Vercel)

1. Push to GitHub (already wired): `git add -A && git commit -m "..." && git push`
2. On [vercel.com](https://vercel.com) → **Add New → Project → Import** this repo.
3. Vercel auto-detects Vite — keep the defaults:
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
4. **Add Environment Variables** (the deploy has no `.env`, so this is required):

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | `https://<your-project-ref>.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | your anon / publishable key |

5. **Deploy.** You'll get a live `*.vercel.app` URL. Every `git push` to `main`
   triggers an automatic redeploy.

> **Netlify** works the same way: import the repo, set build `npm run build`,
> publish directory `dist`, and add the same two environment variables under
> **Site settings → Environment**.

## Project structure

```
src/
  components/
    Sidebar/      navigation + canonical room list
    Rooms/        RoomsGrid — live dashboard cards
    Dashboard/    Dashboard view wrapper
    VoteView.jsx  live + demo voting
  hooks/          useRoomsLive, useRoomHooks (realtime)
  lib/            supabaseClient, rooms data layer
supabase/migrations/  database schema + seed
```
