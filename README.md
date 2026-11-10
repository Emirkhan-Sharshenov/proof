# Folioseen

**Know who read your portfolio.** Tracked, per-client links to portfolios and proposals for freelancers: see which case studies a client opened and for how long, and show results they can verify (client-confirmed testimonials, GitHub and domain checks).

Status: landing page + waitlist live; MVP app (case studies, per-client links, view tracking) in progress.

## What's here

| Path | What it is |
| --- | --- |
| `index.html`, `public/waitlist.js` | Landing page and waitlist form → Supabase |
| `app/index.html`, `src/` | The app (React + HeroUI v3 + Tailwind v4) at `/app`, client pages at `/v/<slug>` |
| `supabase/schema.sql` | Waitlist table with insert-only access |
| `supabase/app.sql` | App tables, row-level security and tracking functions |
| `wrangler.jsonc`, `public/_redirects` | Cloudflare deploy config |
| `docs/strategy.md` | Market research summary, positioning, pricing, plan |
| `CLAUDE.md` | Project context for continuing work with Claude Code |

## Run locally

```bash
npm install
npm run dev
```

Landing: http://localhost:5173 · App: http://localhost:5173/app

## Supabase setup (free)

1. SQL Editor → run `supabase/schema.sql` and `supabase/app.sql`.
2. Authentication → Sign In / Providers → Email: turn off **Confirm email** until custom SMTP is set up (Supabase's built-in mailer only sends to project members).
3. The project URL and publishable key live in `src/lib/supabase.ts` and `public/waitlist.js`.

## Deploy (free, commercial use allowed)

Cloudflare Workers & Pages, connected to this repo. `wrangler deploy` runs `npm run build` itself (see `wrangler.jsonc`) and uploads `dist/`. Every push to `main` redeploys.

(Vercel's free Hobby plan does not allow commercial projects, so it's not used here.)

## Next steps

See `docs/strategy.md` → Plan.
