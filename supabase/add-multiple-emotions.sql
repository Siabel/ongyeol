-- 기존 schema.sql을 이미 실행한 프로젝트에서 한 번 실행하세요.
alter table public.emotion_diaries
  add column if not exists emotions jsonb not null default '[]'::jsonb;

update public.emotion_diaries
set emotions = jsonb_build_array(
  jsonb_build_object('emotion', emotion, 'intensity', intensity)
)
where emotions = '[]'::jsonb;
