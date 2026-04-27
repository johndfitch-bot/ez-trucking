# EZ Trucking — Supabase wiring

## 1. Create a Supabase project
Copy the URL + anon key into `.env.local`:
```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

## 2. Apply schema
Paste `supabase/schema.sql` into the Supabase SQL Editor (safe to re-run).

## 3. Storage bucket for PODs
SQL Editor → run:
```sql
insert into storage.buckets (id, name, public) values ('pod','pod', true) on conflict do nothing;
```

Then add a public read policy on the `pod` bucket and an insert policy for authenticated users.

## 4. Edge Functions
```
supabase functions deploy notify-eric
supabase functions deploy notify-status
```
Set secrets:
```
supabase secrets set TWILIO_ACCOUNT_SID=AC... TWILIO_AUTH_TOKEN=... TWILIO_FROM=+1... \
  ERIC_PHONE=+19167186977 ERIC_EMAIL=1haytrucker1@gmail.com \
  RESEND_API_KEY=... SITE_URL=https://eztruckingllc.com \
  SUPABASE_URL=https://<project>.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=...
```

## 5. Database Webhooks
In the Supabase dashboard → Database → Webhooks:
- **New load**: table `quotes`, event `INSERT` → `notify-eric`
- **Status change**: table `status_history`, event `INSERT` → `notify-status`

## 6. Create Eric's admin user
Authentication → Users → Invite user with his email. Password login for /admin and /driver.
