-- 사용자별 데이터 접근 정책을 다시 확인하고 구성합니다.
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
