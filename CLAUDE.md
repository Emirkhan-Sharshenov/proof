# CLAUDE.md — Folioseen

## Project
Folioseen: SaaS for freelancers — per-client tracked links to portfolio/proposal pages, case-study-level view analytics, client-verified testimonials, private NDA case studies, full export. Global, self-serve (no sales calls, no bank integrations). Owner: Emir. Context and decisions: `docs/strategy.md`.

## Constraints
- Zero budget: only free tiers that allow commercial use (Cloudflare Pages/Workers, Supabase free). No Vercel Hobby. No paid AI at runtime.
- Payments later via Lemon Squeezy or Paddle.
- No invented stats or testimonials on the site; example data must be labelled "example".

## Stack
Vite multi-page build: `index.html` (landing, plain HTML + `public/waitlist.js`) and `app/index.html` (React 19 + HeroUI v3 + Tailwind v4, react-router). Supabase (auth, Postgres + RLS) called directly from the browser with the publishable key (`src/lib/supabase.ts`). Cloudflare Workers static assets (`wrangler.jsonc`, worker name `proof`), output `dist/`, SPA rewrites in `public/_redirects`.

Routes: `/` landing · `/app` dashboard (links) · `/app/case-studies` · `/app/links/:id` · `/v/:slug` public client page (tracked).

## Current state
- Landing + waitlist live, saving to Supabase (project `gexatrweunrrnwnhmarf`). `supabase/schema.sql` applied.
- MVP v1 in `src/`: email+password auth, case studies CRUD (with NDA flag), per-client links, public viewer with per-case-study reading time. DB: `supabase/app.sql` (tables + RLS + security-definer RPCs `get_shared_link`, `start_visit`, `track_view`; anon has no direct table access).
- Live: https://proof.sgoo0931.workers.dev/ (auto-deploys on push to `main`; `wrangler.jsonc` runs `npm run build` itself). Planned free address: folioseen.pages.dev.

## Next tasks
1. Alerts when a link is opened (Telegram bot, free).
2. Supabase default SMTP only mails project members: confirm-email is off for now; set up free SMTP (e.g. Brevo) or GitHub OAuth before public signups.
3. Images in case studies (Supabase Storage), client-verified testimonials, export.
4. Buy folioseen.com (Cloudflare Registrar, ~$11/yr) when budget allows.

## Conventions
- Name files with plain filename + extension (e.g. `page.tsx`, `Navbar.jsx`), no descriptive suffixes.
- Communicate with Emir in Russian; product copy in English.
