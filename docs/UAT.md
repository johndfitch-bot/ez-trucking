# EZ Trucking — End-to-End UAT (Web Agent Spec)

**Audience:** an autonomous browser agent (Playwright / Puppeteer / browser-tool LLM) that will exercise the full booking → dispatch → delivery → review loop and report pass/fail per case.

**Build under test:** commit `2b9a231` on `main` (or later). Verify with `git log -1` before starting.

---

## 0. Preconditions

### 0.1 Environment variables (`.env.local`)
The full UAT requires Supabase. Without it the app falls back to PIN-only admin and disables tracking/reviews/calendar.

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_EMAILJS_SERVICE_ID=<optional — fallback only>
VITE_EMAILJS_TEMPLATE_ID=<optional>
VITE_EMAILJS_PUBLIC_KEY=<optional>
```

### 0.2 Backend setup (one-time, manual)
1. Apply `supabase/schema.sql` in the Supabase SQL Editor (idempotent).
2. Create the public `pod` storage bucket (see `supabase/README.md` §3).
3. Deploy edge functions `notify-eric`, `notify-status` and set Twilio + Resend secrets.
4. Wire DB webhooks: `quotes` INSERT → `notify-eric`; `status_history` INSERT → `notify-status`.
5. Create Eric's auth user (Authentication → Users → Invite). **Record email + password as `ERIC_EMAIL` / `ERIC_PASSWORD` test secrets.**

### 0.3 Local dev server
```
npm install
npm run lint     # must be 0 errors
npm run build    # must succeed
npm run dev      # serves http://localhost:5173
```
Run UAT against `http://localhost:5173` unless `BASE_URL` is overridden to the production URL.

### 0.4 Test data the agent must generate
- `TRACK_TOKEN` — captured from Quote submission (format `EZ-XXXX-XXXX`).
- `QUOTE_ID` — read from URL/network response.
- Two browser contexts:
  - **CLIENT** — anonymous, mobile viewport (`390x844`).
  - **ERIC** — desktop viewport (`1440x900`), authenticated.
- A throwaway test client name: `UAT Client {{ISO timestamp}}`. Phone `(555) 010-0000`. Email `uat+{{ts}}@example.com`.

### 0.5 Cleanup contract
At the end, ERIC context must delete the test quote (Detail → Delete) **and** any review row it produced (Supabase SQL: `delete from public.reviews where client_name like 'UAT Client%';`). Calendar edits made during TC-09 must be reverted.

### 0.6 Pass/fail rules
- Every TC has explicit asserts. A TC fails on the first failed assert.
- Console errors of severity `error` during a TC = soft failure (report, don't abort).
- Network 4xx/5xx to `*.supabase.co` not explicitly expected = hard failure.
- Capture full-page screenshot on every TC end (pass or fail) into `uat-artifacts/<TC-id>.png`.

---

## 1. Test matrix

| ID    | Title                                  | Context | Route                |
|-------|----------------------------------------|---------|----------------------|
| TC-01 | Home page renders & golden path links  | CLIENT  | `/`                  |
| TC-02 | Quote flow — happy path 3 steps        | CLIENT  | `/` § Quote          |
| TC-03 | Tracking lookup widget                 | CLIENT  | `/` § TrackLookup    |
| TC-04 | Track page initial state               | CLIENT  | `/track/:token`      |
| TC-05 | Admin login (Supabase email)           | ERIC    | `/admin`             |
| TC-06 | Admin queue + selection + filters      | ERIC    | `/admin`             |
| TC-07 | Admin set quoted price                 | ERIC    | `/admin`             |
| TC-08 | Admin → status pipeline & realtime     | ERIC+CLIENT | `/admin` + `/track/:t` |
| TC-09 | Admin availability calendar edit       | ERIC    | `/admin`/home        |
| TC-10 | Driver login + queue                   | ERIC    | `/driver`            |
| TC-11 | Driver advance status & quick SMS      | ERIC+CLIENT | `/driver` + `/track/:t` |
| TC-12 | POD upload → delivered                 | ERIC+CLIENT | `/driver` or `/admin` |
| TC-13 | Customer review submission             | CLIENT  | `/review/:token`     |
| TC-14 | Reviews on home (after publish)        | ERIC+CLIENT | `/admin` then `/`    |
| TC-15 | Negative — invalid tracking code       | CLIENT  | `/track/EZ-BAD-CODE` |
| TC-16 | Negative — wrong admin PIN fallback    | CLIENT  | `/admin` (no env)    |
| TC-17 | Mobile sticky footer + responsiveness  | CLIENT  | `/`                  |
| TC-18 | Gallery route + lightbox               | CLIENT  | `/gallery`           |
| TC-19 | PWA — manifest + service worker        | CLIENT  | `/`                  |
| TC-20 | Cleanup                                | ERIC    | `/admin` + SQL       |

---

## 2. Test cases

### TC-01 — Home page renders & golden path links
**Steps**
1. Navigate to `${BASE_URL}/`.
2. Wait for `h1` containing "Eric" or hero CTA visible.
3. Assert these section landmarks are present (by `id` or visible text):
   - `nav` with phone `(916) 718-6977`
   - `#gallery-preview`
   - `#schedule` (Availability calendar)
   - `#quote` (Quote form section)
   - Reviews section
   - Footer with phone link
4. Click "Get a quote" CTA in nav/hero → page scrolls so the quote form is in viewport.
5. Click any `tel:` link → assert `href="tel:9167186977"`.

**Pass**: all assertions hold; zero console errors.

---

### TC-02 — Quote flow happy path
**Steps**
1. From `/`, scroll into `#quote`.
2. **Step 1 (Load):** click the "Hay / Ag" card. "Next" enables. Click Next.
3. **Step 2 (Trip):**
   - Type `Sacramento, CA` into "Pickup city". Wait 600ms; if a suggestion list appears, click the first item; otherwise leave the typed value.
   - Type `Reno, NV` into "Delivery city". Same selection rule.
   - Wait up to 3s for the miles strip `~### mi` to render. Capture the miles + ballpark `$L – $H`.
   - Click size chip `Full Load`, weight chip `40K-80K`, special chip `Tarping`.
   - Set date input to today + 3 days (`YYYY-MM-DD`).
   - Type "UAT note - automated run" into Notes.
   - Click Next.
4. **Step 3 (You):**
   - Name = `UAT Client {{ts}}`
   - Phone = `5550100000`
   - Email = `uat+{{ts}}@example.com`
   - Assert review box shows the load type, trip, miles, and ballpark.
   - Click "Send request".
5. Wait for the success card.
6. **Capture `TRACK_TOKEN`** from the visible `<code>` element (matches `^EZ-[A-Z0-9]{4}-[A-Z0-9]{4}$`).
7. Click "Copy link" → read clipboard, assert `${BASE_URL}/track/${TRACK_TOKEN}`.
8. Click "Open tracking" — should land on `/track/${TRACK_TOKEN}`.

**Pass**: success card shown, token captured, ballpark band non-zero, no error toast, network call to `supabase.co/rest/v1/quotes` returned 201.

**Failure modes to flag**: if Supabase insert fails the UI silently falls back to EmailJS/mailto — record this as a soft failure (Supabase wiring broken) even if the success card appears.

---

### TC-03 — Tracking lookup widget
**Steps**
1. On `/`, scroll to the TrackLookup section ("Track your load").
2. Type `${TRACK_TOKEN}` into the input. Submit.
3. Assert URL = `/track/${TRACK_TOKEN}`.
4. Go back to `/`. Assert the "Recent: <code>${TRACK_TOKEN}</code>" pill is visible (read from `localStorage.ez_last_token`).

**Pass**: navigation works, recent pill renders the same token.

---

### TC-04 — Track page initial state
On `/track/${TRACK_TOKEN}`:
1. Assert the header shows `${PICKUP} → ${DELIVERY}` and the token.
2. Assert price pill shows "Quote pending" (no quoted_low yet) **OR** the band saved in TC-02 if Supabase populated it.
3. Assert the timeline renders 10 step items, with the first step ("Request received") in `data-state="current"` or `done`.
4. Assert the "Messages with Eric" panel shows the empty-state copy, and the input field is enabled (status is non-terminal).
5. Type `Hi from UAT` and press Enter. Within 3s the message bubble appears with sender "You".

**Pass**: realtime echo of the just-sent message, no errors.

---

### TC-05 — Admin login (Supabase email auth)
**Steps**
1. Switch to ERIC context. Navigate to `/admin`.
2. Form should render email + password inputs (Supabase mode). If the fallback "PIN" form renders, env vars are missing — **abort with hard fail** and report.
3. Submit `${ERIC_EMAIL}` / `${ERIC_PASSWORD}`.
4. Within 5s, dashboard renders with "EZ Command" header and stat cards (Open / New / Today / Billed).

**Pass**: dashboard visible; sign-out icon present.

---

### TC-06 — Admin queue + selection + filters
**Steps**
1. On `/admin`, locate the queue card whose token matches `${TRACK_TOKEN}` (search box: paste the token).
2. Click the card. Detail panel renders with token, route, client phone, miles, "Quote pending" state, and the full status-pipeline button row.
3. Toggle filter to `Closed` — the test quote disappears. Toggle back to `Open` — it reappears.
4. Click the refresh icon — spinner animates, no errors.

**Pass**: all transitions work, console clean.

---

### TC-07 — Admin set quoted price
**Steps**
1. With the test quote selected, type `650-825` into the quoted-price input. Click "Save quote".
2. Assert detail row "Ballpark" updates to `$650 – $825` and status pill flips to `Quoted`.
3. In the CLIENT context, on the still-open `/track/${TRACK_TOKEN}` tab, verify within 5s that the price pill updates to `Quoted: $650 – $825` (Supabase realtime).

**Pass**: realtime sync within 5s; the `quotes` row reflects new values (verify via SQL spot check optional).

---

### TC-08 — Status pipeline & realtime
For each transition below, click the named status button in the admin pipeline and assert the CLIENT track-page timeline advances to the corresponding `current` step within 5s:

| Click on Admin       | Track page step that becomes `current` |
|----------------------|----------------------------------------|
| Reviewing            | Reviewing                              |
| Booked (accepted)    | Booked                                 |
| Scheduled            | Scheduled                              |
| En route to pickup   | En route to pickup                     |
| Loaded               | Loaded                                 |
| En route to delivery | En route to delivery                   |

After "En route to delivery", do NOT click Delivered yet — TC-12 handles that via POD upload.

**Pass**: every transition propagates within 5s; status_history grows by 6 rows.

---

### TC-09 — Availability calendar edit
**Steps**
1. On `/admin`, click an Availability button — set to `Limited`. Assert the home calendar (CLIENT context, on `/` reload) shows today's cell with the `Limited` chip.
2. Open the calendar component on Eric's view (admin doesn't currently render the editable calendar inline — open the home page in ERIC context where `canEdit` is **false**, so this sub-case verifies read-only rendering). Confirm clicking a cell does NOT open the editor.
3. **Note the gap**: the editable variant (`canEdit={true}`) is not currently mounted in any route. Log as a finding, do not fail.

**Cleanup**: set Availability back to `Available`.

**Pass**: read-only calendar reflects status; finding logged.

---

### TC-10 — Driver page login + queue
**Steps**
1. ERIC context → navigate to `/driver`.
2. If a sign-in card appears, submit `${ERIC_EMAIL}` / `${ERIC_PASSWORD}`. (Reuses the same Supabase session, but the page also accepts re-auth.)
3. Assert the active-load list contains the test quote.
4. Tap the test quote card — it becomes the active load with the orange "Next status" button visible.

**Pass**: queue loads, selection works, no console errors.

---

### TC-11 — Driver advance status & quick SMS
**Steps**
1. With the test load active, tap a Quick SMS chip (e.g., "On way — 30 min"). Assert the message appears in the message stream and on the CLIENT track page within 5s.
2. Type `Manual driver msg` in the input → Send. Same assertion.
3. The status was left at `en_route_delivery` after TC-08; do NOT advance from here yet.

**Pass**: outbound messages from driver appear on client track view in real time, marked as Eric.

---

### TC-12 — POD upload → delivered
**Steps**
1. In the **driver** view on the active load, tap the POD upload control. Provide a fixture PNG (`fixtures/pod.png`, ≤ 200KB). The `<input type="file" capture="environment">` accepts a programmatic file via Playwright `setInputFiles`.
2. Wait up to 10s for upload. Assert:
   - `quotes.pod_photo_url` is set (visible as "View POD" link).
   - Status pill flips to `Delivered`.
   - `quotes.delivered_at` is non-null.
3. CLIENT track page: assert the "Proof of delivery" card appears with a working "Open photo" link (HTTP 200 on HEAD).
4. Assert the "Leave a review" CTA now appears in the quick-actions row (visible only for `delivered` or `closed`).

**Pass**: image uploaded to public `pod` bucket; status terminal-bound; review CTA visible.

---

### TC-13 — Customer review submission
**Steps**
1. CLIENT context → click "Leave a review" → land on `/review/${TRACK_TOKEN}`.
2. Header should show pickup → delivery and load type (verified-customer kicker visible).
3. Click the 4th star (rating = 4).
4. Type body: `UAT review — automated. Smooth haul.`
5. Submit.
6. Assert the success card with check icon and "Thanks for the feedback" copy.

**Pass**: `reviews` row inserted with `published=false`, `verified=true`, `rating=4`.

---

### TC-14 — Reviews surface on home after publish
**Steps**
1. ERIC context → Supabase SQL Editor: `update public.reviews set published = true where client_name like 'UAT Client%';`
   *(There is no admin UI for review publish today — log as finding.)*
2. CLIENT context → reload `/` and scroll to the Reviews section.
3. Assert the UAT review body appears with a 4-star indicator and verified badge.

**Pass**: review visible. **Finding to flag**: missing admin "publish review" UI.

---

### TC-15 — Invalid tracking code
**Steps**
1. CLIENT context → `/track/EZ-NOPE-NOPE`.
2. Assert "Can't find that load" error card with "Call Eric" + "Back home" actions.

**Pass**: graceful error, no console exception.

---

### TC-16 — PIN fallback (run only if env stripping is feasible)
**Setup**: stop the dev server, blank `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local`, restart `npm run dev`. (Skip TC-16 if you cannot mutate env safely; report as not-run.)
**Steps**
1. Visit `/admin`. The PIN form should render with note "Supabase not configured — falling back to local PIN."
2. Type `WRONG` → Submit. Expect error "Wrong PIN".
3. Type `EZ2006` → Submit. Cockpit renders, but with the warning banner "Supabase not configured — live queue disabled."
**Cleanup**: restore env, restart dev.

**Pass**: gate behavior matches; warning banner visible.

---

### TC-17 — Mobile responsiveness + sticky footer
**Steps**
1. CLIENT context, viewport `390x844`.
2. Visit `/`. Scroll to the bottom — `MobileStickyFooter` should remain pinned with quick-call CTAs.
3. Verify nav collapses or is mobile-friendly (no horizontal scroll). Take screenshot.
4. Visit `/track/${TRACK_TOKEN}`. Confirm timeline + chat fit without overflow.

**Pass**: no horizontal scroll at 390px on `/`, `/track/:token`, `/admin`, `/driver`.

---

### TC-18 — Gallery + lightbox
**Steps**
1. From `/`, click the gallery preview link → `/gallery`.
2. Click any image → lightbox opens. Esc closes it.
3. Browser back → returns to `/`.

**Pass**: lightbox works, no broken images (all `<img>` `naturalWidth > 0`).

---

### TC-19 — PWA manifest + service worker
**Steps**
1. On `/` (production build, `npm run preview` on port 4173 if needed), open DevTools → Application.
2. Assert `manifest.webmanifest` resolves with a `name` and at least one icon.
3. Assert `sw.js` is registered and active. Reload offline → home page still serves precached shell.

**Pass**: SW active, offline shell loads.

---

### TC-20 — Cleanup
**Steps**
1. ERIC `/admin`: select the UAT quote → Delete (confirm). Assert it disappears from queue.
2. SQL: `delete from public.reviews where client_name like 'UAT Client%';`
3. Reset Availability to `Available`.
4. Sign out (admin and driver).

**Pass**: no test rows remain.

---

## 3. Reporting format

The agent must emit a JSON summary at the end:

```json
{
  "build": "<git sha>",
  "ran_at": "<ISO 8601>",
  "base_url": "...",
  "results": [
    { "id": "TC-01", "status": "pass", "duration_ms": 1234, "notes": "" },
    { "id": "TC-02", "status": "pass", "track_token": "EZ-XXXX-XXXX" }
  ],
  "findings": [
    "TC-09: editable AvailabilityCalendar (canEdit=true) is not mounted on any route.",
    "TC-14: no admin UI exists to publish a pending review — required SQL update."
  ],
  "console_errors": [],
  "screenshots_dir": "uat-artifacts/"
}
```

Plus a markdown summary table to stdout. Exit code 0 if all hard cases pass, 1 otherwise.

---

## 4. Known gaps the agent should flag (not fail on)

1. **Anon read-by-token policy is wide open** — `quotes` SELECT policy is `using (true)`. Any anon can `SELECT *` on the table without knowing a token. Recommend tightening to `using (token = current_setting('request.headers')::json->>'x-track-token')` or moving reads behind an RPC.
2. **Editable calendar not mounted.** `<AvailabilityCalendar canEdit />` exists but is not used anywhere.
3. **No admin UI to publish reviews** — manual SQL required.
4. **Bundle warning** — JS chunk is 666 KB (gzip 199 KB). Code-split candidate but non-blocking.
5. **EmailJS fallback can mask Supabase failures** in `QuoteForm` (silent path). UAT TC-02 explicitly checks the network call.
