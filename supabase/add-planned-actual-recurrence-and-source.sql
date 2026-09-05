-- 예정·실제 일정 분리, 반복 시리즈, 일정 실제 지출 출처를 추가합니다.
alter table public.schedules
  add column if not exists actual_date date,
  add column if not exists actual_start_time time,
  add column if not exists actual_end_time time,
  add column if not exists completed_at timestamptz,
  add column if not exists is_recurring boolean not null default false,
  add column if not exists repeat_frequency text,
  add column if not exists repeat_end_date date,
  add column if not exists series_id text;

alter table public.transactions
  add column if not exists memo text not null default '',
  add column if not exists source text not null default 'manual',
  add column if not exists is_fixed boolean not null default false,
  add column if not exists is_repeat boolean not null default false,
  add column if not exists repeat_frequency text,
  add column if not exists repeat_month smallint,
  add column if not exists repeat_day smallint,
  add column if not exists repeat_end_date date,
  add column if not exists series_id text;

alter table public.schedules drop constraint if exists schedules_repeat_frequency_check;
alter table public.schedules add constraint schedules_repeat_frequency_check
  check (repeat_frequency in ('yearly','monthly','weekly','daily'));

alter table public.transactions drop constraint if exists transactions_repeat_frequency_check;
alter table public.transactions add constraint transactions_repeat_frequency_check
  check (repeat_frequency in ('yearly','monthly','weekly','daily'));

alter table public.transactions drop constraint if exists transactions_source_check;
alter table public.transactions add constraint transactions_source_check
  check (source in ('manual','schedule_actual'));

-- 기존 일정 연결 거래 중 첫 거래만 일정 실제 지출로 분류하고 나머지는 직접 입력으로 보존합니다.
with ranked as (
  select id, row_number() over (partition by schedule_id order by created_at, id) as position
  from public.transactions
  where schedule_id is not null and type = 'expense'
)
update public.transactions as transaction
set source = case when ranked.position = 1 then 'schedule_actual' else 'manual' end
from ranked
where transaction.id = ranked.id;

create unique index if not exists transactions_one_schedule_actual_idx
  on public.transactions(schedule_id)
  where source = 'schedule_actual' and schedule_id is not null;
