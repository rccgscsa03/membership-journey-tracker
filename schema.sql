-- SCSA Membership Journey Tracker — database setup
-- Run once in the Supabase SQL editor (Dashboard → SQL Editor → New query → paste → Run).
-- Safe to re-run: every statement checks before it creates.

-- ─────────────────────────────────────────────────────────────
-- 1. Staff list: the only people who may sign in
-- ─────────────────────────────────────────────────────────────
create table if not exists public.staff (
  email      text primary key check (email = lower(email)),
  full_name  text not null default '',
  role       text not null check (role in ('pastor','leader','viewer')),
  added_at   timestamptz not null default now()
);

-- The signed-in person's role, or null if they are not on the staff list.
-- security definer so it can read staff even where RLS would hide rows.
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.staff where email = lower(coalesce(auth.jwt() ->> 'email', ''))
$$;
revoke all on function public.my_role() from public;
grant execute on function public.my_role() to authenticated;

-- Refuse to create a login for any email that is not on the staff list.
-- (Email-link sign-in creates the account on first use; this stops strangers.)
create or replace function public.only_staff_can_sign_up() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.staff where email = lower(new.email)) then
    raise exception 'This email is not on the Salvation Center staff list.';
  end if;
  return new;
end $$;
drop trigger if exists only_staff_can_sign_up on auth.users;
create trigger only_staff_can_sign_up before insert on auth.users
  for each row execute function public.only_staff_can_sign_up();

-- ─────────────────────────────────────────────────────────────
-- 2. Members and their follow-up
-- ─────────────────────────────────────────────────────────────
create table if not exists public.members (
  id               text primary key default ('m' || substr(md5(random()::text || clock_timestamp()::text), 1, 12)),
  name             text not null,
  joined           date,
  milestones       jsonb not null default '{}'::jsonb,  -- membership, baptism, lifeCenter, workers, placement, serving, lead → 'YYYY-MM-DD'
  track            text not null default '' check (track in ('','A','B','C','M','D1','D2')),
  owner            text not null default '',
  phone            text not null default '',
  ft_status        text not null default 'active' check (ft_status in ('active','pastor','handoff','released','moved','lowtouch','closed')),
  ft_start         date,
  ft_extend        integer not null default 0,
  next_contact     date,
  attempts         integer not null default 0,
  last_contact     date,
  contact_log      jsonb not null default '[]'::jsonb,   -- [{d:'YYYY-MM-DD', kind:'reached'|...}]
  notes            text not null default '',
  low_touch_since  date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  updated_by       text not null default ''
);
create index if not exists members_name_idx on public.members (lower(name));

create or replace function public.touch_member() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.jwt() ->> 'email', new.updated_by);
  return new;
end $$;
drop trigger if exists touch_member on public.members;
create trigger touch_member before insert or update on public.members
  for each row execute function public.touch_member();

-- ─────────────────────────────────────────────────────────────
-- 3. Pastor's notes: the pastor role only, nobody else
-- ─────────────────────────────────────────────────────────────
create table if not exists public.pastor_notes (
  member_id   text primary key references public.members(id) on delete cascade,
  body        text not null default '',
  updated_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- 4. Row-level security
-- ─────────────────────────────────────────────────────────────
alter table public.staff        enable row level security;
alter table public.members      enable row level security;
alter table public.pastor_notes enable row level security;

-- staff: everyone on staff sees the list; only the pastor changes it
drop policy if exists staff_read  on public.staff;
drop policy if exists staff_write on public.staff;
create policy staff_read  on public.staff for select to authenticated using (public.my_role() is not null);
create policy staff_write on public.staff for all    to authenticated using (public.my_role() = 'pastor') with check (public.my_role() = 'pastor');

-- members: all staff read; pastor and leaders add and edit; only the pastor deletes
drop policy if exists members_read   on public.members;
drop policy if exists members_insert on public.members;
drop policy if exists members_update on public.members;
drop policy if exists members_delete on public.members;
create policy members_read   on public.members for select to authenticated using (public.my_role() in ('pastor','leader','viewer'));
create policy members_insert on public.members for insert to authenticated with check (public.my_role() in ('pastor','leader'));
create policy members_update on public.members for update to authenticated using (public.my_role() in ('pastor','leader')) with check (public.my_role() in ('pastor','leader'));
create policy members_delete on public.members for delete to authenticated using (public.my_role() = 'pastor');

-- pastor_notes: pastor only, for every action
drop policy if exists pastor_notes_all on public.pastor_notes;
create policy pastor_notes_all on public.pastor_notes for all to authenticated
  using (public.my_role() = 'pastor') with check (public.my_role() = 'pastor');

-- Nothing is readable without signing in
revoke all on public.staff, public.members, public.pastor_notes from anon;
grant select, insert, update, delete on public.staff, public.members, public.pastor_notes to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 5. Live updates (other people's edits appear without reloading)
-- ─────────────────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'members') then
    alter publication supabase_realtime add table public.members;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'pastor_notes') then
    alter publication supabase_realtime add table public.pastor_notes;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────
-- 6. Upgrade (2026-10-06): allow the M (Member) follow-up track on databases created before it existed
-- ─────────────────────────────────────────────────────────────
alter table public.members drop constraint if exists members_track_check;
alter table public.members add constraint members_track_check check (track in ('','A','B','C','M','D1','D2'));

-- 7. Upgrade: add the "Moved out of town" status (safe to run more than once)
alter table public.members drop constraint if exists members_ft_status_check;
alter table public.members add constraint members_ft_status_check check (ft_status in ('active','pastor','handoff','released','moved','lowtouch','closed'));
