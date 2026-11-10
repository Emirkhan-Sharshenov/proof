# CLAUDE.md — Folioseen

## Project
Folioseen: SaaS for freelancers — per-client tracked links to portfolio/proposal pages, case-study-level view analytics, client-verified testimonials, private NDA case studies, full export. Global, self-serve (no sales calls, no bank integrations). Owner: Emir. Context and decisions: `docs/strategy.md`.

## Constraints
- Zero budget: only free tiers that allow commercial use (Cloudflare Pages/Workers, Supabase free). No Vercel Hobby. No paid AI at runtime.
- Payments later via Lemon Squeezy or Paddle.
- No invented stats or testimonials on the site; example data must be labelled "example".

## Stack
Vite multi-page build: `index.html` (landing, plain HTML + `public/waitlist.js`) and `app/index.html` (React 19 + HeroUI v3 + Tailwind v4, react-router). Supabase (auth, Postgres + RLS) called directly from the browser with the publishable key (`src/lib/supabase.ts`). Cloudflare Worker `app` (`wrangler.jsonc`): static assets from `dist/` with SPA rewrites in `public/_redirects`; `worker/index.ts` runs only for `/api/*` (Telegram webhook, visit alerts) and uses secrets `TELEGRAM_BOT_TOKEN`, `SUPABASE_SECRET_KEY` set in the Cloudflare dashboard.

Routes: `/` landing · `/app` dashboard (links) · `/app/case-studies` · `/app/links/:id` · `/app/settings` (Telegram) · `/v/:slug` public client page (tracked) · `/api/telegram` (bot webhook) · `/api/visit-alert` · `/api/telegram/setup` (registers the webhook; open once after deploy or address change) · `/api/status` (diagnostics: webhook errors, Supabase key check; no secrets shown).

Local `wrangler dev`: kill old `wrangler`/`workerd` processes first, and use a copy of the config without `build` (otherwise it rebuilds `dist/` in a loop and serves 404s).

## Current state
- Landing + waitlist live, saving to Supabase (project `gexatrweunrrnwnhmarf`). `supabase/schema.sql` applied.
- MVP v1 in `src/`: email+password auth, case studies CRUD (with NDA flag), per-client links, public viewer with per-case-study reading time. DB: `supabase/app.sql` (tables + RLS + security-definer RPCs `get_shared_link`, `start_visit`, `track_view`; anon has no direct table access).
- Telegram alerts: `supabase/telegram.sql` (profiles with chat id, one-time connect codes, `claim_visit_alert` — one alert per visit, server-only RPCs) + Worker + Settings page. Bot username goes in `TELEGRAM_BOT` in `src/pages/Settings.tsx`.
- Live: https://app.folioseen.workers.dev/ (auto-deploys on push to `main`; `wrangler.jsonc` runs `npm run build` itself).

## Next tasks
1. Telegram: open alert + reading summary (cron every 5 min, `supabase/summary.sql`, visit is finished after 10 min idle) — done. Next: optional per-user alert settings.
2. Auth: Google and GitHub sign-in live (buttons appear automatically when a provider is enabled in Supabase, read from /auth/v1/settings). Google OAuth app is published; Supabase Site URL `https://app.folioseen.workers.dev`, redirect allow-list `https://app.folioseen.workers.dev/**`, `http://localhost:5173/**`. Legal pages: `public/privacy.html`, `public/terms.html` (served at /privacy, /terms; required by Google Branding). Email confirm is ON but Supabase default SMTP only mails project members → email signups only work for Emir until custom SMTP; real email (confirm, password reset) needs a domain (folioseen.com) + Resend/Brevo.
3. Images in case studies (Supabase Storage), client-verified testimonials, export.
4. Buy folioseen.com (Cloudflare Registrar, ~$11/yr) when budget allows.

## Conventions
- Name files with plain filename + extension (e.g. `page.tsx`, `Navbar.jsx`), no descriptive suffixes.
- Communicate with Emir in Russian; product copy in English.
