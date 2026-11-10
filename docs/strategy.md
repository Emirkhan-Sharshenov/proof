# Folioseen — strategy notes (November 2026)

Summary of the market research done before building. Numbers are from the linked sources; prices for Folioseen are hypotheses to test.

## Why this product

- **Trust problem in hiring.** 57% of recruiters can't verify whether a resume and skills are real; 53% believe most profiles are AI-written ([TestGorilla](https://www.testgorilla.com/reports/recruiting-ai-era/)). 72% of B2B buyers don't fully trust vendor case studies ([CustomerVerified](https://linkedin.com/company/customerverified)).
- **"Who viewed" is a proven paid feature.** LinkedIn Premium's main analytics upgrade is the full viewer list ([source](https://demandbird-com.pages.dev/resources/linkedin-analytics-paid-vs-free)); Contra Pro sells portfolio viewer analytics ([source](https://contra.com/blog/using-contra-s-pro-analytics-to-land-more-work)); DocSend charges $10–65/user/month for tracked links ([Capterra](https://www.capterra.ie/software/136311/docsend)).
- **Platforms die, users fear losing data.** Polywork (Jan 2025), Read.cv (May 2025) and Bento (Feb 2026) shut down ([Bento](https://alternativeto.net/news/2025/12/bento-to-shut-down-in-2026-as-linktree-takes-over-and-offers-migration-path/), [Read.cv](https://www.neowin.net/amp/readcv-announces-acquisition-by-perplexity-as-it-begins-winding-down-operations/)). → One-click export is a selling point.
- **Best work is under NDA.** Recurring question on Reddit and Habr Q&A ([example](https://qna.habr.com/q/1332280)).

## What NOT to build / compete on

- Templates, "GitHub → portfolio" generators, AI bios: commodity, often free.
- "Chat with my resume" bots: many exist, little traction.
- Generic link-in-bio: Linktree, Taplink.

## Positioning

Portfolio-native tracked links (case-study level, not PDF) + verified results + private NDA case studies + export. Target: freelancers who pitch clients every week (they need it continuously, unlike job seekers who churn after getting hired — resume tools churn 8–15%/month, [source](https://localaimaster.com/blog/resume-saas-pricing-strategy)).

## Pricing (hypothesis)

| Plan | Price | Includes |
| --- | --- | --- |
| Free | $0 | 5 case studies, 3 links, opens + view time, GitHub/domain verification, "Made with Folioseen" badge |
| Pro | $7/mo or $49/yr | Unlimited links, case-study analytics, alerts, client-verified testimonials, NDA case studies, custom domain |

Payments: Lemon Squeezy or Paddle (merchant of record, no monthly fee, supports sellers in KG/KZ).

## Zero-budget stack

- Hosting: Cloudflare Pages/Workers (free tier allows commercial use; Vercel Hobby does not).
- DB/auth/storage: Supabase free (500 MB DB, pauses after 7 days without requests).
- No paid AI at runtime.

## Plan

1. **Week 1:** deploy landing on Cloudflare Pages, connect waitlist to Supabase, pick a final name + domain (done: renamed from "Proof" to Folioseen; folioseen.com was free on 2026-11-10, buy when budget allows).
2. **Weeks 1–4:** traffic — Reddit (r/freelance, r/forhire, r/web_design), Indie Hackers, Product Hunt "coming soon", own YouTube channels. Goal: 300+ sign-ups.
3. **Weeks 2–5:** MVP — auth, case-study pages, per-client links, view tracking per case study, email/Telegram alerts.
4. **Week 6:** payments (Lemon Squeezy/Paddle), early-access offer to the waitlist.
5. **Kill/pivot rule:** fewer than 100 sign-ups after a month of promotion → change positioning before building further.
