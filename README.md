# 온결 — 삶의 결을 잇는 기록

일정, 장소, 실제 지출, 감정 일기와 일반 하루 기록을 연결해 관리하는 개인 다이어리입니다. 인증과 데이터 저장은 Supabase Auth/PostgreSQL을 사용하며 모든 데이터는 사용자 ID와 RLS 정책으로 분리됩니다.

## Supabase 로컬 연결

1. Supabase에서 새 프로젝트를 만듭니다.
2. SQL Editor에서 `supabase/schema.sql` 전체를 한 번 실행합니다.
3. `.env.example`을 복사해 `.env.local`을 만들고 프로젝트 URL과 Publishable Key를 입력합니다.
4. 개발 서버를 다시 시작합니다.

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

`service_role` 키는 브라우저 환경 변수에 절대 넣지 마세요. 이메일 확인 없이 로컬에서 바로 가입을 시험하려면 Supabase Authentication 설정에서 Confirm email을 임시로 끌 수 있습니다.

## 장소 자동 검색

일정의 장소명 자동 검색은 Kakao Map REST API를 사용합니다.

1. Kakao Developers에서 앱을 만들고 **Kakao Map → 사용 설정**을 켭니다.
2. **앱 → 플랫폼 키 → REST API 키**를 복사합니다.
3. `.env.local`에 아래 값을 추가한 뒤 개발 서버를 다시 시작합니다.

```env
KAKAO_REST_API_KEY=발급받은_REST_API_키
```

이 키는 서버에서만 사용되므로 `NEXT_PUBLIC_` 접두사를 붙이지 않습니다. 키가 없어도 장소명과 주소는 기존처럼 직접 입력할 수 있습니다. 나중에 Vercel로 배포할 때는 같은 이름의 환경 변수를 Vercel 프로젝트 설정에 추가하면 됩니다.

이미 초기 스키마를 실행한 프로젝트라면 기능 변경 후 다음 파일도 SQL Editor에서 각각 한 번 실행합니다.

- `supabase/remove-schedule-coordinates.sql`: 일정의 위도·경도 열 제거
- `supabase/add-transaction-recurrence.sql`: 매년·매월·매일 반복 고정 거래 필드 추가
- `supabase/add-multiple-emotions.sql`: 하루에 여러 감정과 감정별 강도를 저장하는 필드 추가
- `supabase/add-transaction-memo.sql`: 수입·지출 거래의 간단한 메모 필드 추가
- `supabase/add-planned-actual-recurrence-and-source.sql`: 예정·실제 일정 분리, 반복 일정·거래, 일정 실제 지출 1건 제한 추가
- `supabase/add-account-management.sql`: 로그인한 사용자의 계정 및 연결 기록 삭제 기능 추가

이번 확장 기능을 적용할 때는 위 두 신규 SQL 파일을 순서대로 실행하면 됩니다. 첫 번째 파일은 기존 일정 연결 거래를 삭제하지 않고 첫 거래만 일정 실제 지출로 분류하며, 나머지 거래는 일반 연결 거래로 보존합니다.

수입 저장 중 `new row violates row-level security policy` 오류가 계속 발생한다면 `supabase/repair-rls-policies.sql`을 한 번 실행해 사용자별 접근 정책을 다시 구성합니다. 현재 앱에서는 수입 거래가 일정의 예상 지출을 수정하지 않도록 분리되어 있습니다.

## 실행

```bash
npm install
npm run dev
npm run dev:mobile
npm run build
```

이 저장소의 설정만으로 자동 배포되지는 않습니다. 아래 Vercel 준비 절차를 사용자가 직접 진행해야 실제 서비스가 공개됩니다.

## 기술 구조와 vinext

- **React**: 화면과 사용자 상호작용을 만드는 UI 라이브러리입니다.
- **TypeScript**: React 코드에 타입 검사를 추가합니다.
- **Vite**: 개발 서버와 빌드를 담당합니다.
- **vinext**: Vite 위에서 Next.js와 비슷한 app 라우팅, 레이아웃, 메타데이터, 서버 API 경로를 사용할 수 있게 합니다.
- **Nitro**: vinext의 서버 기능을 Vercel이 실행할 수 있는 형태로 출력합니다.

온결 서비스가 반드시 vinext를 필요로 하는 것은 아닙니다. 단순한 브라우저 전용 React 앱이라면 React + TypeScript + Vite만으로도 충분합니다. 다만 현재 프로젝트는 app/api/places/route.ts의 카카오 장소 검색처럼 서버에서만 비밀 키를 사용하는 API가 있고, 이미 app 구조로 완성되어 있어 전체를 다시 만드는 대신 vinext를 유지했습니다.

## Vercel 배포 준비

Vercel용 빌드는 로컬 미리보기용 Cloudflare/Sites 설정과 분리되어 있습니다.

    npm install
    npm run build:vercel

Vercel 프로젝트에는 다음 환경 변수를 **Production**, **Preview**, **Development** 환경에 등록합니다.

    NEXT_PUBLIC_SUPABASE_URL=Supabase 프로젝트 URL
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=Supabase Publishable Key
    KAKAO_REST_API_KEY=Kakao REST API Key

vercel.json에 빌드 명령이 설정되어 있습니다. Nitro가 Vercel Build Output API 형식의 .vercel/output을 생성하므로 Vercel에서 Output Directory를 별도로 덮어쓰지 마세요.

배포 순서는 다음과 같습니다.

1. GitHub에 비공개 저장소를 만들고 이 프로젝트를 push합니다.
2. Vercel에서 **Add New → Project**를 누르고 해당 GitHub 저장소를 선택합니다.
3. 위의 환경 변수 3개를 등록합니다.
4. **Deploy**를 눌러 첫 배포를 실행합니다.
5. 배포 주소가 만들어지면 Supabase의 **Authentication → URL Configuration**에서 Site URL을 실제 Vercel 주소로 바꿉니다.
6. Redirect URLs에는 실제 주소와 Preview 주소 패턴을 등록한 뒤 회원가입, 로그인, 장소 검색, 기록 저장을 확인합니다.

Supabase Preview Redirect URL 예시는 https://*-내-Vercel-팀.vercel.app/** 입니다. 실제 팀 slug에 맞게 입력하세요. .env.local은 Git에 포함되지 않으므로 비밀 키는 저장소에 올라가지 않습니다.

## 모바일 웹앱

화면 폭 760px 이하에서는 모바일 전용 상단바, 5개 하단 메뉴, 더보기 메뉴와 바텀시트 입력 화면이 적용됩니다. 캘린더는 가로 스크롤 없이 한 화면에 표시되며 기기의 홈 화면 추가를 위한 웹앱 manifest와 안전 영역 설정도 포함되어 있습니다.

같은 Wi-Fi에 연결된 휴대폰에서 로컬로 사용하려면 PC에서 `npm run dev:mobile`을 실행하고, 화면에 표시되는 Network 주소(예: `http://192.168.0.10:3002`)를 휴대폰 브라우저에서 엽니다. PC가 켜져 있고 개발 서버가 실행 중이어야 합니다. Windows 방화벽 안내가 나오면 개인 네트워크 접근만 허용하세요.

휴대폰에서 새 회원가입의 이메일 확인 링크까지 사용하려면 Supabase의 **Authentication → URL Configuration → Redirect URLs**에 해당 Network 주소를 추가합니다. PC의 내부 IP가 바뀌면 주소도 함께 갱신해야 합니다.

## 기존 설명

A clean full-stack starter running on
[vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and
Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

Signed-in visitors receive both `oai-authenticated-user-id` and `oai-authenticated-user-email`. Private Sites require every visitor to sign in; public Sites may also have anonymous visitors, for whom neither header is present.

The user ID is stable for the same user on the same Site and different across Sites. Email and name are intended for display or contact purposes.

SIWC-authenticated workspace sites may also receive
`oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty
`name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by
`oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs
optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send
  anonymous visitors through Sign in with ChatGPT.
- Use `chatGPTSignInPath(returnTo)` and `chatGPTSignOutPath(returnTo)` for
  browser links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in
  or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because
  they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the
OAuth cookies, and identity header injection. Do not implement app routes for
those reserved paths. Routes that do not import and call the helper remain
anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the
Sites hosting platform's access policy controls for workspace-wide restrictions,
or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write
actions tied to the current ChatGPT user. Leave public content anonymous.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
