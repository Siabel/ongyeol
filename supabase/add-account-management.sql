-- 로그인한 사용자가 자기 계정과 연결 기록만 삭제할 수 있는 함수입니다.
-- public 스키마를 검색하지 않도록 고정하고 auth.uid()와 동일한 행만 삭제합니다.
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
