# 작은다음

일정, 실제 활동, 감정, 하루 기록과 수입·지출을 연결해 관리하는 개인 기록 서비스입니다.

## 주요 기능

- 월간 캘린더와 일간 스케줄러
- 예정 일정과 실제 수행 결과 구분
- 일정 예상 지출과 실제 거래 연결
- 날짜별 복수 감정 및 강도 기록
- 자유 형식의 하루 기록
- 월별 가계부와 통계
- 사용자별 데이터 분리, 백업 및 복원
- 모바일 화면과 PWA 설치

## 기술 구성

- React 19, TypeScript
- Vinext, Vite, Nitro
- Supabase Auth, PostgreSQL, Row Level Security
- Vercel
- NAVER API HUB 지역 검색 API

Vinext는 현재의 `app` 라우팅 구조와 서버 전용 장소 검색 API를 유지하면서 Vite 기반으로 개발하기 위해 사용합니다. 브라우저에 노출하면 안 되는 NAVER API HUB 인증 정보는 `app/api/places/route.ts`에서만 사용합니다.

## 로컬 실행

Node.js 22.13 이상이 필요합니다.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

기본 개발 주소는 `http://localhost:3000`입니다. 같은 네트워크의 휴대폰에서 확인할 때는 다음 명령을 사용합니다.

```powershell
npm run dev:mobile
```

모바일 개발 서버는 3002 포트를 사용합니다.

## 환경 변수

`.env.local`에 다음 값을 설정합니다.

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NAVER_API_HUB_CLIENT_ID=
NAVER_API_HUB_CLIENT_SECRET=
```

- Supabase의 URL과 publishable key는 브라우저에서 인증 및 데이터 요청에 사용합니다.
- NAVER API HUB의 Client ID와 Client Secret은 장소 검색 서버 라우트에서만 사용합니다.
- 두 NAVER 인증 변수에는 `NEXT_PUBLIC_` 접두사를 붙이지 않습니다.
- 실제 키가 들어 있는 `.env.local`은 Git에 올리지 않습니다.

## 데이터베이스

Supabase SQL Editor에서 아래 마이그레이션을 순서대로 적용합니다.

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_daily_records_and_schedule_actuals.sql`
3. `supabase/migrations/003_schedule_place.sql`
4. `supabase/migrations/004_multiple_emotions.sql`
5. `supabase/migrations/005_recurring_transactions_and_memos.sql`
6. `supabase/migrations/006_profiles.sql`

모든 사용자 데이터 테이블은 Row Level Security 정책으로 소유자별 접근을 제한합니다.

## 확인 명령

```powershell
npm run lint
npm run build
npm test
```

## Vercel 배포

운영 주소는 `https://jakda.vercel.app`입니다. Vercel 프로젝트에는 로컬과 같은 네 환경 변수를 설정하고 Build Command는 `npm run build:vercel`을 사용합니다. Supabase Authentication의 Site URL과 Redirect URLs에도 운영 주소를 등록해야 이메일 인증과 비밀번호 복구가 운영 도메인으로 돌아옵니다.

운영 배포는 `release` 브랜치를 기준으로 합니다. 기능 개발은 `feat/*`, 오류 수정은 `fix/*` 브랜치에서 진행하고 검증이 끝난 변경만 `release`에 반영합니다. `master`는 운영 배포 트리거로 사용하지 않습니다.

문제 해결 과정과 재발 방지 기준은 [`trouble_shooting.md`](./trouble_shooting.md)에 기록합니다.

## 프로젝트 구조

```text
app/                  화면, 컴포넌트, API 라우트
lib/                  Supabase 연동과 공통 데이터 타입
public/               PWA 아이콘과 정적 파일
supabase/migrations/  데이터베이스 스키마 변경 이력
tests/                주요 회귀 테스트
```
