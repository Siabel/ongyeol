-- 기존 schema.sql을 이미 실행한 프로젝트에서 한 번 실행하세요.
alter table public.schedules
  drop column if exists latitude,
  drop column if exists longitude;
