# Proof

**Know who read your portfolio.** Tracked, per-client links to portfolios and proposals for freelancers: see which case studies a client opened and for how long, and show results they can verify (client-confirmed testimonials, GitHub and domain checks).

Status: landing page + waitlist (validation stage). The product is not built yet.

## What's here

| File | What it is |
| --- | --- |
| `index.html` | Landing page (static, no build step) |
| `waitlist.js` | Waitlist form → Supabase |
| `supabase/schema.sql` | Waitlist table with insert-only access |
| `docs/strategy.md` | Market research summary, positioning, pricing, plan |
| `CLAUDE.md` | Project context for continuing work with Claude Code |

## Run locally

Open `index.html` in a browser, or:

```bash
npx serve .
```

## Connect the waitlist (free)

1. Create a project at [supabase.com](https://supabase.com) (free plan allows commercial use).
2. SQL Editor → run `supabase/schema.sql`.
3. Project Settings → API → copy the Project URL and the `anon` public key into `waitlist.js`.
4. Test the form, then check Table Editor → `waitlist`.

Until step 3 is done the form only shows the success message and **does not save emails**.

## Deploy (free, commercial use allowed)

Cloudflare Pages → Create → Connect to Git → pick this repo → Framework preset: None, build command empty, output directory `/`. Every push to `main` redeploys.

(Vercel's free Hobby plan does not allow commercial projects, so it's not used here.)

## Next steps

See `docs/strategy.md` → Plan.
