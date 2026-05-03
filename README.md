# ERIC Z TRUCKING LLC

> **For the agent dropping into this repo cold:** read this once, then `CLAUDE.md` for HQ doctrine pointers and project rules. You'll be productive in 5 minutes.

## What this is

Single-page marketing site for **ERIC Z TRUCKING LLC** — an owner-operator trucking business out of **Lincoln, CA**. Hay, flatbed, containers, hot shot. Tagline: *"When You Need It There Yesterday."* Customer email contact: `1haytrucker1@gmail.com`.

This is a **client project** under the FitchCraft brand — built and maintained by FITCH for the ERIC Z TRUCKING LLC owner-operator. It is NOT a FitchCraft platform / SaaS product.

## What this is NOT (anymore)

There used to be a full booking + tracking + admin platform here, with Supabase wiring, driver flows, and admin panels. That was deliberately scoped down — see commit `2ace1d3` *"refactor: strip platform, ship lean marketing brochure"*. The old `screenshots/admin-full.png` is a leftover artifact from that era; it does NOT reflect the current build.

**Current scope: marketing brochure + lead capture form. Nothing else.**

If a future packet asks you to "re-add booking" or "wire admin back in," that's a non-trivial pivot that deserves an explicit FITCH go-ahead — don't infer it from prior commits.

## Stack

| Layer | Tech |
|---|---|
| Frontend | Vite 8 + React 19 |
| Styling | CSS Modules |
| Routing | React Router 7 |
| Animation | Framer Motion |
| Icons | Lucide |
| Image gallery | yet-another-react-lightbox |
| Lead capture | EmailJS (browser-side, no backend) |
| Hosting | Vercel (`prj_OC4C8tajpj9aJRagXUIHFzhpZ7DA`, team `fitch-craft`) |
| PWA | Workbox via vite-plugin-pwa, generates `sw.js` on build |

No Supabase. No backend. No auth. No database. EmailJS is the only external write surface.

## Routes (App.jsx)

- `/` — Home (Navbar + Hero + Services + MarqueeTrust + NightOps + Gallery + RateEstimator + QuoteForm + Reviews + About + GoogleMap + Footer)
- `/gallery` — Standalone gallery page

## Component map (`src/components/`)

| Component | Role |
|---|---|
| `Navbar.jsx` | Top nav, mobile-aware |
| `Hero.jsx` | Above-the-fold headline + CTAs ("There Yesterday" tagline) |
| `Services.jsx` | List of trucking service types (hay, flatbed, container, hot shot) |
| `MarqueeTrust.jsx` | Scrolling trust signals (probably partner logos / certifications) |
| `NightOps.jsx` | Night operations / 24-hr availability messaging |
| `Gallery.jsx` | Photo gallery, drives `/gallery` route + lightbox |
| `RateEstimator.jsx` | Computes a rate quote in-browser using `lib/pricing.js` + `lib/geo.js` |
| `QuoteForm.jsx` | Quote-request form, sends via EmailJS to FITCH/owner email |
| `Reviews.jsx` | Customer testimonials |
| `About.jsx` | Owner-operator backstory + brand voice |
| `GoogleMap.jsx` | Embedded service-area map |
| `Footer.jsx` + `MobileStickyFooter.jsx` | Site footer + mobile-only persistent CTA |

## Local logic (`src/lib/`)

- `pricing.js` — rate computation. Tweak this when the owner adjusts pricing tiers.
- `geo.js` — distance / service-area helpers.

Both are plain JS modules, no external deps. Self-contained.

## Environment

`.env.example` shows the only three vars needed:

```
VITE_EMAILJS_SERVICE_ID=
VITE_EMAILJS_TEMPLATE_ID=
VITE_EMAILJS_PUBLIC_KEY=
```

All three are public (`VITE_` prefix → exposed to the client bundle by design — EmailJS uses public keys for its browser SDK). No secrets in this repo. **Do not** add `SUPABASE_*`, `STRIPE_*`, etc. to `.env.local` "just in case" — there's no consumer for them.

## Build + deploy

```bash
npm install
npm run dev      # Vite dev server (default port 5173)
npm run build    # production build → dist/, generates PWA sw.js
npm run lint     # ESLint
npm run preview  # serve dist/ locally
```

Vercel auto-deploys from `main`. Production URL: per `.vercel/project.json` (project ID `prj_OC4C8tajpj9aJRagXUIHFzhpZ7DA`).

## What to ALWAYS do

- Keep the bundle lean. Current build: ~426 kB JS / ~137 kB gzipped + 451 kB precache. Don't drag in big libraries (date-fns, lodash, three) — this site is a brochure, not a platform.
- Match the brand voice: blue-collar, direct, "owner-operator who shows up." See `Hero.jsx` and `About.jsx` for tone.
- Run `npm run lint && npm run build` before committing UI changes.
- Stage explicitly per Grail Part 2.8c (no `git add -A`). Yes, even on a marketing site.

## What to NEVER do

- Don't add Supabase, Stripe, Firebase, or any other external service without an explicit FITCH packet authorizing it. This was deliberately stripped.
- Don't build admin/driver/booking features. Same reason.
- Don't replace EmailJS with a backend service. Owner workflow tolerates the EmailJS limitations; backend changes the operational model.
- Don't change copy that says "Lincoln, CA" or the tagline without owner sign-off — those are brand decisions, not code decisions.
- Don't commit a real `.env.local` (gitignored already).

## Boundaries

- **Client-owned project.** Material scope or messaging changes need FITCH alignment with the ERIC Z TRUCKING LLC owner-operator. Bug fixes + lint/build hygiene + minor UI polish can happen without that step; new features cannot.
- **No FitchCraft platform coupling.** ERIC Z TRUCKING LLC does not appear in any other FitchCraft repo's data model and does not plug into EYS, Lodge, or marketplace. It's a pure client deliverable.

## Doctrine

- HQ pointer + Six Laws + 2.8c staging discipline → see `CLAUDE.md` at this repo's root, which points to `../fitchcraft-ops/DOCTRINE/`.
- This repo is in the active wired fleet — the May 4 weekly HQ sync routine (`trig_01Qt1Fui2anSinTyr8oRtJ9p`) keeps the CLAUDE.md HQ pointer block current.

## Recent state (as of 2026-05-01)

- Working tree clean.
- Build green: 0 lint errors, ✓ 1.83s build, PWA generated cleanly.
- Last commit: `b91a191` — wired CLAUDE.md to fitchcraft-ops HQ doctrine.
- No pending blockers.

---

*ERIC Z TRUCKING LLC · Lincoln, CA · "When You Need It There Yesterday." · Built by FitchCraft.*
