-- Supabase SQL Editor에서 한 번 실행하세요.
create extension if not exists pgcrypto;

create table if not exists public.schedules (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  actual_date date,
  actual_start_time time,
  actual_end_time time,
  completed_at timestamptz,
  place_name text not null default '',
  address text not null default '',
  people text not null default '',
  expected_cost bigint not null default 0 check (expected_cost >= 0),
  status text not null default 'planned' check (status in ('planned','done','partial','cancelled')),
  memo text not null default '',
  is_recurring boolean not null default false,
  repeat_frequency text check (repeat_frequency in ('yearly','monthly','weekly','daily')),
  repeat_end_date date,
  series_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  schedule_id text references public.schedules(id) on delete set null,
  type text not null check (type in ('income','expense')),
  amount bigint not null check (amount > 0),
  date date not null,
  category text not null,
  title text not null,
  memo text not null default '',
  source text not null default 'manual' check (source in ('manual','schedule_actual')),
  is_fixed boolean not null default false,
  is_repeat boolean not null default false,
  repeat_frequency text check (repeat_frequency in ('yearly','monthly','weekly','daily')),
  repeat_month smallint check (repeat_month between 1 and 12),
  repeat_day smallint check (repeat_day between 1 and 31),
  repeat_end_date date,
  series_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.emotion_diaries (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  emotion text not null,
  intensity smallint not null check (intensity between 1 and 5),
  emotions jsonb not null default '[]'::jsonb,
  cause text not null default '',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists public.daily_records (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  schedule_id text references public.schedules(id) on delete set null,
  date date not null,
  record_time time,
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists schedules_user_date_idx on public.schedules(user_id, date);
create index if not exists transactions_user_date_idx on public.transactions(user_id, date);
create unique index if not exists transactions_one_schedule_actual_idx on public.transactions(schedule_id) where source = 'schedule_actual' and schedule_id is not null;
create index if not exists emotion_diaries_user_date_idx on public.emotion_diaries(user_id, date);
create index if not exists daily_records_user_date_idx on public.daily_records(user_id, date);

alter table public.schedules enable row level security;
alter table public.transactions enable row level security;
alter table public.emotion_diaries enable row level security;
alter table public.daily_records enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array['schedules','transactions','emotion_diaries','daily_records'] loop
    execute format('drop policy if exists "owners manage own rows" on public.%I', table_name);
    execute format(
      'create policy "owners manage own rows" on public.%I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      table_name
    );
  end loop;
end $$;

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from auth.users where id = (select auth.uid());
end;
$$;

revoke all on function public.delete_my_account() from public;
revoke all on function public.delete_my_account() from anon;
grant execute on function public.delete_my_account() to authenticated;
