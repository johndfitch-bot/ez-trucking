# EZ Trucking — Supabase wiring

## 0. Environment matrix

| Tier | Supabase project | `NOTIFICATIONS_ENABLED` | Twilio / Resend secrets | Use for |
|------|------------------|-------------------------|-------------------------|---------|
| **Local dev** | `ez-trucking-dev` | unset (defaults to `false`) | leave unset | `npm run dev` against test data |
| **Preview / UAT** | `ez-trucking-uat` (separate project) | unset (defaults to `false`) | leave unset | Vercel preview deployments, end-to-end UAT runs |
| **Production** | `ez-trucking-prod` | `true` (explicit) | live Twilio + Resend keys | `eztruckingllc.com` |

The kill switch is the single source of truth for whether outbound SMS/email
ever leaves the system. Edge functions default to `dry-run` (logs intent to the
function logs but performs no Twilio or Resend HTTP calls). **Set
`NOTIFICATIONS_ENABLED=true` only on the production project.**

## 1. Create a Supabase project (per tier)
Copy the URL + anon key into `.env.local` for that tier:
```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

## 2. Apply schema
Paste `supabase/schema.sql` into the Supabase SQL Editor (safe to re-run).

## 3. Apply migrations
After the base schema, apply each file in `supabase/migrations/` in order:
- `0001_harden_anon_reads.sql` — replaces wide anon SELECT policies on
  `quotes`/`status_history`/`messages` with token-scoped RPCs
  (`get_quote_with_thread`, `get_quote_for_review`). The web client prefers
  these RPCs and falls back to direct SELECT, so it is safe to apply this
  migration on a running deployment without coordinating a frontend deploy.

## 4. Storage bucket for PODs
SQL Editor — run:
```sql
insert into storage.buckets (id, name, public) values ('pod','pod', true) on conflict do nothing;
```
Then add a public read policy on the `pod` bucket and an insert policy for
authenticated users.

## 5. Edge Functions
```
supabase functions deploy notify-eric
supabase functions deploy notify-status
```

### Secrets — preview / UAT (no outbound traffic)
**Do not set `NOTIFICATIONS_ENABLED`.** The functions will dry-run.
```
supabase secrets set \
  SITE_URL=https://<preview-host> \
  SUPABASE_URL=https://<project>.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=...
```

### Secrets — production (real SMS + email)
```
supabase secrets set \
  NOTIFICATIONS_ENABLED=true \
  TWILIO_ACCOUNT_SID=AC... TWILIO_AUTH_TOKEN=... TWILIO_FROM=+1... \
  ERIC_PHONE=+19167186977 ERIC_EMAIL=1haytrucker1@gmail.com \
  RESEND_API_KEY=... SITE_URL=https://eztruckingllc.com \
  SUPABASE_URL=https://<project>.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=...
```

### Verify dry-run
After deploy, trigger a test webhook (e.g., insert a quote in dev) and check
Supabase function logs for lines starting with `[dry-run] SMS to=...`. No
Twilio API calls should appear.

## 6. Database Webhooks
In the Supabase dashboard → Database → Webhooks:
- **New load**: table `quotes`, event `INSERT` → `notify-eric`
- **Status change**: table `status_history`, event `INSERT` → `notify-status`

## 7. Create Eric's admin user
Authentication → Users → Invite user with his email. Password login for `/admin`
and `/driver`.

## 8. Vercel deploy
- The repo ships `vercel.json` with SPA rewrites (so `/track/:token`,
  `/admin`, `/driver`, `/review/:token` survive a hard refresh).
- Set the Vercel project env vars: `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY` (Preview = UAT project values, Production = prod
  project values). Optionally set the EmailJS keys for fallback parity.
