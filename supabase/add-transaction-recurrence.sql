-- 기존 schema.sql을 이미 실행한 프로젝트에서 한 번 실행하세요.
alter table public.transactions
  add column if not exists repeat_frequency text,
  add column if not exists repeat_month smallint,
  add column if not exists repeat_day smallint;

alter table public.transactions
  drop constraint if exists transactions_repeat_frequency_check,
  drop constraint if exists transactions_repeat_month_check,
  drop constraint if exists transactions_repeat_day_check;

alter table public.transactions
  add constraint transactions_repeat_frequency_check
    check (repeat_frequency in ('yearly','monthly','daily')),
  add constraint transactions_repeat_month_check
    check (repeat_month between 1 and 12),
  add constraint transactions_repeat_day_check
    check (repeat_day between 1 and 31);
