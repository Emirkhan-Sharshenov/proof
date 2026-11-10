# CLAUDE.md — Proof

## Project
Proof: SaaS for freelancers — per-client tracked links to portfolio/proposal pages, case-study-level view analytics, client-verified testimonials, private NDA case studies, full export. Global, self-serve (no sales calls, no bank integrations). Owner: Emir. Context and decisions: `docs/strategy.md`.

## Constraints
- Zero budget: only free tiers that allow commercial use (Cloudflare Pages/Workers, Supabase free). No Vercel Hobby. No paid AI at runtime.
- Payments later via Lemon Squeezy or Paddle.
- No invented stats or testimonials on the site; example data must be labelled "example".

## Current state
- `index.html` + `waitlist.js`: static landing page with waitlist, saving to Supabase (project `gexatrweunrrnwnhmarf`, publishable key in `waitlist.js`).
- `supabase/schema.sql`: waitlist table, insert-only RLS for anon (applied).
- Live: https://proof.sgoo0931.workers.dev/ (Cloudflare, auto-deploys on push to `main`).

## Next tasks
1. Choose final name/domain.
2. MVP: auth, case studies, per-client links, view tracking, alerts.

## Conventions
- Name files with plain filename + extension (e.g. `page.tsx`, `Navbar.jsx`), no descriptive suffixes.
- Communicate with Emir in Russian; product copy in English.
