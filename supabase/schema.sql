-- EZ Trucking LLC — Supabase schema
-- Apply with: supabase db push  OR  paste into SQL Editor.
-- Safe to re-run.

create extension if not exists pgcrypto;

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status text not null default 'new',
  load_type text not null,
  load_size text,
  weight text,
  special text[] default '{}',
  pickup_city text not null,
  delivery_city text not null,
  pickup_lat double precision,
  pickup_lng double precision,
  delivery_lat double precision,
  delivery_lng double precision,
  miles_estimate numeric,
  needed_on date,
  notes text,
  quoted_low numeric,
  quoted_high numeric,
  final_price numeric,
  client_name text not null,
  client_phone text not null,
  client_email text,
  ip_hint text,
  user_agent text,
  source text default 'web',
  pod_photo_url text,
  pod_signature text,
  delivered_at timestamptz
);

create index if not exists quotes_status_created_idx on public.quotes (status, created_at desc);
create index if not exists quotes_token_idx on public.quotes (token);
create index if not exists quotes_phone_idx on public.quotes (client_phone);

create table if not exists public.status_history (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  at timestamptz not null default now(),
  from_status text,
  to_status text not null,
  note text,
  actor text default 'system'
);
create index if not exists status_history_quote_idx on public.status_history (quote_id, at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  at timestamptz not null default now(),
  sender text not null check (sender in ('client','eric','system')),
  body text not null,
  channel text default 'web',
  read_by_client boolean default false,
  read_by_eric boolean default false
);
create index if not exists messages_quote_idx on public.messages (quote_id, at desc);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid references public.quotes(id) on delete set null,
  created_at timestamptz not null default now(),
  client_name text not null,
  rating int not null check (rating between 1 and 5),
  body text not null,
  load_type text,
  published boolean default false,
  verified boolean default false
);
create index if not exists reviews_published_idx on public.reviews (published, created_at desc);

create table if not exists public.availability (
  day date primary key,
  status text not null default 'available' check (status in ('available','limited','booked','off')),
  note text,
  updated_at timestamptz not null default now()
);

create table if not exists public.driver_state (
  id int primary key default 1,
  status text not null default 'available',
  current_lat double precision,
  current_lng double precision,
  current_city text,
  last_seen_at timestamptz default now(),
  message text
);
insert into public.driver_state (id, status) values (1, 'available') on conflict (id) do nothing;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists quotes_touch on public.quotes;
create trigger quotes_touch before update on public.quotes
for each row execute function public.touch_updated_at();

-- Log every status change
create or replace function public.log_status_change()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    insert into public.status_history (quote_id, from_status, to_status)
    values (new.id, old.status, new.status);
  elsif (tg_op = 'INSERT') then
    insert into public.status_history (quote_id, from_status, to_status)
    values (new.id, null, new.status);
  end if;
  return new;
end; $$;

drop trigger if exists quotes_status_log on public.quotes;
create trigger quotes_status_log after insert or update of status on public.quotes
for each row execute function public.log_status_change();

-- RLS
alter table public.quotes enable row level security;
alter table public.status_history enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.availability enable row level security;
alter table public.driver_state enable row level security;

-- Anonymous clients can create a quote and read/update their own by token
drop policy if exists "anon create quote" on public.quotes;
create policy "anon create quote" on public.quotes
  for insert to anon with check (true);

drop policy if exists "anon read by token" on public.quotes;
create policy "anon read by token" on public.quotes
  for select to anon using (true);

-- Eric (authenticated) has full access
drop policy if exists "auth full quotes" on public.quotes;
create policy "auth full quotes" on public.quotes for all to authenticated using (true) with check (true);

drop policy if exists "anon read status history" on public.status_history;
create policy "anon read status history" on public.status_history for select to anon using (true);
drop policy if exists "auth full history" on public.status_history;
create policy "auth full history" on public.status_history for all to authenticated using (true) with check (true);

drop policy if exists "anon read messages" on public.messages;
create policy "anon read messages" on public.messages for select to anon using (true);
drop policy if exists "anon insert client messages" on public.messages;
create policy "anon insert client messages" on public.messages for insert to anon with check (sender = 'client');
drop policy if exists "auth full messages" on public.messages;
create policy "auth full messages" on public.messages for all to authenticated using (true) with check (true);

drop policy if exists "anon read reviews" on public.reviews;
create policy "anon read reviews" on public.reviews for select to anon using (published = true);
drop policy if exists "anon submit review" on public.reviews;
create policy "anon submit review" on public.reviews for insert to anon with check (published = false);
drop policy if exists "auth full reviews" on public.reviews;
create policy "auth full reviews" on public.reviews for all to authenticated using (true) with check (true);

drop policy if exists "anon read availability" on public.availability;
create policy "anon read availability" on public.availability for select to anon using (true);
drop policy if exists "auth full availability" on public.availability;
create policy "auth full availability" on public.availability for all to authenticated using (true) with check (true);

drop policy if exists "anon read driver state" on public.driver_state;
create policy "anon read driver state" on public.driver_state for select to anon using (true);
drop policy if exists "auth full driver state" on public.driver_state;
create policy "auth full driver state" on public.driver_state for all to authenticated using (true) with check (true);

-- Realtime
alter publication supabase_realtime add table public.quotes;
alter publication supabase_realtime add table public.status_history;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.driver_state;

-- Storage bucket for PODs (run once in UI or via CLI):
-- insert into storage.buckets (id, name, public) values ('pod','pod', true) on conflict do nothing;
