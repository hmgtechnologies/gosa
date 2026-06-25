-- =====================================================================
-- School Connect — Voting Schema Add-on (Gen v7)
-- Already included in schema.sql. This file is for upgrades only.
-- Idempotent.
-- =====================================================================

-- Polls table (if not yet created)
create table if not exists public.polls (
  id uuid primary key default uuid_generate_v4(),
  title text not null, description text,
  type text default 'single_choice' check (type in ('single_choice','multiple_choice','yes_no','ranked')),
  candidates jsonb default '[]'::jsonb,
  opens_at timestamptz default now(),
  closes_at timestamptz,
  allow_multiple boolean default false,
  anonymous boolean default false,
  audience text default 'all',
  status text default 'open' check (status in ('draft','open','closed')),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now()
);
alter table public.polls enable row level security;

create table if not exists public.poll_votes (
  id uuid primary key default uuid_generate_v4(),
  poll_id uuid references public.polls(id) on delete cascade,
  candidate_id text not null,
  voter_id uuid references public.profiles(id) on delete cascade,
  voted_at timestamptz default now(),
  unique(poll_id, candidate_id, voter_id)
);
alter table public.poll_votes enable row level security;

-- RLS
drop policy if exists "polls_read"  on public.polls;
drop policy if exists "polls_write" on public.polls;
create policy "polls_read"  on public.polls for select using (auth.role() = 'authenticated');
create policy "polls_write" on public.polls for all using (public.is_staff(auth.uid()));

drop policy if exists "pv_read"   on public.poll_votes;
drop policy if exists "pv_insert" on public.poll_votes;
drop policy if exists "pv_update" on public.poll_votes;
create policy "pv_read"   on public.poll_votes for select using (auth.uid() = voter_id or public.is_staff(auth.uid()));
create policy "pv_insert" on public.poll_votes for insert with check (auth.uid() = voter_id);
create policy "pv_update" on public.poll_votes for update using (auth.uid() = voter_id);

-- Helper view: live results
create or replace view public.poll_results as
select p.id as poll_id, p.title,
       count(v.id) as total_votes,
       jsonb_agg(jsonb_build_object('candidate', v.candidate_id, 'votes', c)) as breakdown
from public.polls p
left join lateral (
  select candidate_id, count(*) as c
  from public.poll_votes where poll_id = p.id
  group by candidate_id
) v on true
group by p.id, p.title;

select 'Voting schema ready ✅' as status;
