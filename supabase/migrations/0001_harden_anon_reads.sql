-- 0001_harden_anon_reads.sql
-- Replaces the wide `using (true)` anon SELECT policies with a security-definer
-- RPC that returns a quote + its history + messages only when caller provides
-- the matching token. The client prefers this RPC and falls back to direct
-- SELECT if the function is missing, so this migration can be applied safely
-- on a running deployment.
--
-- Apply order:
--   1. Deploy client code that calls get_quote_with_thread (already shipped).
--   2. Apply this migration in the SQL Editor.
--   3. Verify /track/:token still works for a known token.
--
-- Reversible: see bottom of file.

-- 1. RPC: returns quote + history + messages by token.
create or replace function public.get_quote_with_thread(p_token text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'quote', to_jsonb(q.*),
    'history', coalesce((
      select jsonb_agg(to_jsonb(h.*) order by h.at)
      from public.status_history h
      where h.quote_id = q.id
    ), '[]'::jsonb),
    'messages', coalesce((
      select jsonb_agg(to_jsonb(m.*) order by m.at)
      from public.messages m
      where m.quote_id = q.id
    ), '[]'::jsonb)
  )
  from public.quotes q
  where q.token = p_token
  limit 1;
$$;

revoke all on function public.get_quote_with_thread(text) from public;
grant execute on function public.get_quote_with_thread(text) to anon, authenticated;

-- 2. RPC for review form: minimal quote shape needed to render review page.
create or replace function public.get_quote_for_review(p_token text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select to_jsonb(q.*) - 'client_phone' - 'client_email' - 'ip_hint' - 'user_agent'
  from public.quotes q
  where q.token = p_token
  limit 1;
$$;

revoke all on function public.get_quote_for_review(text) from public;
grant execute on function public.get_quote_for_review(text) to anon, authenticated;

-- 3. Tighten anon SELECT policies. Anon can no longer enumerate the tables;
--    they must go through the RPCs (which are filtered by token).
drop policy if exists "anon read by token" on public.quotes;
drop policy if exists "anon read status history" on public.status_history;
drop policy if exists "anon read messages" on public.messages;

-- Anon may still INSERT quotes (web form) and INSERT 'client' messages.
-- Authenticated (Eric) policies remain unchanged.

-- 4. Sanity grants. RLS still applies; these are object-level grants.
grant insert on public.quotes to anon;
grant insert on public.messages to anon;

-- ---------------------------------------------------------------------------
-- Rollback (paste into SQL editor if you need to revert):
--
-- drop function if exists public.get_quote_with_thread(text);
-- drop function if exists public.get_quote_for_review(text);
-- create policy "anon read by token" on public.quotes
--   for select to anon using (true);
-- create policy "anon read status history" on public.status_history
--   for select to anon using (true);
-- create policy "anon read messages" on public.messages
--   for select to anon using (true);
