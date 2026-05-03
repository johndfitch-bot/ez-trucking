# ERIC Z TRUCKING LLC · DIAMOND v4.3 SHIP PACKET
**For Claude Code · Single Session · Marketing Brochure Refactor**
**Issued 2026-05-01 by FITCH**

---

## ⚡ MISSION

Replace the production ERIC Z TRUCKING LLC site with the diamond mockup (v4.3). Push to `main`. Vercel auto-deploys.

**Source of truth:** `./CLAUDE_HANDOFF/index.diamond-v4.3.html` (dropped into repo root for this session)

---

## 🎯 ACCEPTANCE CRITERIA

After Vercel auto-deploy completes, https://ez-trucking-app.vercel.app/ must show:

- [ ] Wide boxed frame (1440px max, dark canvas on widescreen, edge-to-edge on mobile)
- [ ] Hero: full-bleed `ez-night-road.png` + "When you need it there yesterday." + Call/Text CTAs
- [ ] Marquee trust bar (15s+ loop)
- [ ] Services: 4 full-bleed cinematic blocks alternating L/R (Hay · Flatbed · Container · Hot Shot)
- [ ] Eric Spread: portrait + pull quote ("If I said I'd be there at six...")
- [ ] Gallery strip: 3 captioned tiles
- [ ] Lanes section: 6 corridor tiles
- [ ] **Federal Safety Record**: "Twenty years. Zero crashes." + 4-stat grid (0% OOS · 0 crashes · 74K mi · Active) + USDOT 1710197 / MC-627443 source line
- [ ] Contact: "I answer my own phone." + huge phone number
- [ ] Trust strip: USDOT 1710197 + MC-627443 (no blanks)
- [ ] Footer: stamped wordmark + © 2026
- [ ] Desktop photo position tuning intact (`@media min-width: 769px` block)
- [ ] Mobile renders without horizontal scroll
- [ ] PWA installable, service worker generated
- [ ] Lint clean, build green

---

## 🛠️ EXECUTION PLAN

### Phase 0 — Read Doctrine
1. Read `CLAUDE.md` at repo root — apply HQ doctrine pointer + Six Laws + 2.8c staging discipline.
2. Read existing `index.html` to identify what must be **preserved** in `<head>`:
   - PWA manifest link (`<link rel="manifest" ...>`)
   - Favicon links (favicon.svg, icon-192, icon-512)
   - Apple touch icons
   - SEO `<meta name="description">` and any OG tags
   - Service worker registration script (if present in body, identify it)
   - Theme color meta
   - Title tag
3. Read `src/App.jsx`, `src/main.jsx`, and `src/index.css` to understand current React rendering pipeline. Confirm: this is a React 19 app whose components render into `#root`.

### Phase 1 — Implementation Decision
Two viable paths. Pick the one with lower risk surface:

**Path A · Static rewrite (recommended for marketing brochure scope):**
- Rewrite `src/App.jsx` so it renders ONE component (`<DiamondHome />`) containing the entire mockup body markup as JSX.
- Move the mockup `<style>` block contents into `src/index.css` (replace existing global CSS).
- Leave `src/components/*` files in place but unused — DO NOT DELETE. (Cleanup is a separate packet.)
- Preserve PWA `<head>` from existing `index.html`. Replace only the body's `<div id="root">` content path (which is React-rendered anyway, so leave `<div id="root">` alone).

**Path B · Component port:**
- Port each mockup section into the existing component files (Hero.jsx, Services.jsx, etc.). Bigger surface area, more risk.

**Path A is the call** unless reading the existing code reveals a blocker.

### Phase 2 — Implement
1. Convert mockup HTML → JSX (HTML attrs: `class` → `className`, self-close tags, escape inline styles if any, etc.)
2. Move mockup CSS → `src/index.css` (replace existing global content; preserve any PWA-related CSS if present).
3. Verify all 9 images exist at `public/images/`:
   - ez-night-road.png · ez-hay-night.png · ez-bales.png · ez-container2.png
   - ez-night-yard.png · ez-flatbed-sf.png · ez-trees.png · ez-container1.png · eric.jpg
4. Update `index.html` `<head>` — keep PWA setup; update `<title>` and `<meta description>` to:
   - Title: `ERIC Z TRUCKING LLC · Owner-Operator Since 2006 · Lincoln, CA`
   - Description: `Owner-operator hot shot, hay, flatbed, and container transport based in Lincoln, CA. Direct line to Eric. USDOT 1710197 · MC-627443. Since 2006.`

### Phase 3 — Verify (Phase A doctrine)
```bash
npm run lint    # MUST pass — 0 errors, 0 warnings
npm run build   # MUST succeed; PWA service worker must generate
```
If either fails: fix forward, do not commit broken state. Prime Directive — DO NO HARM.

### Phase 4 — Stage + Commit (2.8c discipline — explicit, NO `git add -A`)
```bash
git add index.html src/App.jsx src/index.css src/main.jsx
# Add any other files you touched, EXPLICITLY. Verify with `git status` before committing.
git diff --cached --stat   # sanity check what's about to commit

git commit -m "feat(ezt): ship diamond v4.3 — boxed frame, FMCSA safety record, real DOT/MC numbers

- Replace site shell with single DiamondHome component
- Add boxed 1440px frame layout (mobile edge-to-edge)
- Add Federal Safety Record section: USDOT 1710197 / MC-627443, 0% OOS, 0 crashes, 74K mi 2024
- Replace 30+ Years claim with accurate Since 2006
- Tune service photo positions (desktop-only, mobile uses default crop)
- Pull-quote: 'If I said I'd be there at six, I'm there at five-forty-five' (placeholder until Eric confirms real line)
- Contact: 'I answer my own phone.' (Eric's voice, not marketing voice)"

git push
```

### Phase 5 — Auto-Deploy + Verify
- Vercel auto-deploys from `main`.
- After ~90s, fetch https://ez-trucking-app.vercel.app/ and verify acceptance criteria above.
- If any criterion fails → roll back: `git revert HEAD && git push`. Do NOT patch-fix on prod.

---

## 🚫 DO NOT

- Do not add Supabase, Stripe, or any backend. (This is locked out per repo doctrine.)
- Do not modify EmailJS wiring (separate packet).
- Do not rebuild admin/booking/driver flows. (Stripped intentionally — see commit `2ace1d3`.)
- Do not delete `src/components/*` or `src/lib/*` files in this packet — leave for cleanup pass.
- Do not run `git add -A` or `git add .`.
- Do not deploy via `vercel --prod` CLI. Let GitHub auto-deploy handle it.
- Do not commit `.env.local`.
- Do not change copy that says "Lincoln, CA" or the tagline "When You Need It There Yesterday" — those are brand-locked.

---

## ⚠️ KNOWN UNVERIFIED ITEMS (DO NOT BLOCK ON THESE)

These are open with FITCH for Eric to confirm. Ship the v4.3 markup as-is; FITCH will issue follow-up packets if any need to change:

1. **Legal name on footer/trust strip.** FMCSA may list variants without spaces (e.g. ERICZ TRUCKING LLC); site displays **ERIC Z TRUCKING LLC** per owner direction.
2. **MC authority status.** FMCSA shows interstate authority "NOT AUTHORIZED" but cargo flagged as exempt-for-hire (hay = exempt commodity). Pending Eric clarifying which lanes need authority. **For this packet: ship as-is; do not adjust lanes copy.**
3. **Eric pull-quote.** "If I said I'd be there at six..." is placeholder until FITCH gets Eric's real line. **For this packet: ship the placeholder.**

---

## 📋 PRE-FLIGHT QUESTIONS — ASK FITCH IF UNCLEAR

If reading the codebase surfaces ambiguity, stop and ask. Otherwise proceed.

---

*Packet · 2026-05-01 · FITCH · ERIC Z TRUCKING LLC diamond v4.3 ship*
