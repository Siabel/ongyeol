import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const uiSourcePaths = [
  "app/page.tsx",
  "app/components/auth-gate.tsx",
  "app/components/common.tsx",
  "app/components/views.tsx",
  "app/components/modals.tsx",
  "app/components/ui-helpers.ts",
];
const readUiSource = async () => (
  await Promise.all(uiSourcePaths.map((path) => readFile(new URL(path, root), "utf8")))
).join("\n");

test("uses the Ongyeol brand across UI, metadata, and PWA assets", async () => {
  const [ui, layout, manifest, theme, favicon] = await Promise.all([
    readUiSource(),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/manifest.ts", root), "utf8"),
    readFile(new URL("app/ongyeol.css", root), "utf8"),
    readFile(new URL("public/favicon.svg", root), "utf8"),
  ]);
  assert.match(ui, /삶의 결을 잇는 기록/);
  assert.match(ui, /흩어진 하루를/);
  assert.match(layout, /온결 — 삶의 결을 잇는 기록/);
  assert.match(manifest, /short_name: "온결"/);
  assert.match(theme, /Ongyeol brand theme/);
  assert.match(favicon, /#376158/);
});
test("includes account, place, and daily-record flows", async () => {
  const [page, schema, envExample] = await Promise.all([
    readUiSource(),
    readFile(new URL("supabase/schema.sql", root), "utf8"),
    readFile(new URL(".env.example", root), "utf8"),
  ]);

  assert.match(page, /signUp/);
  assert.match(page, /signInWithPassword/);
  assert.match(page, /비밀번호 재확인/);
  assert.match(page, /values\.password !== values\.passwordConfirmation/);
  assert.match(page, /이미 가입되어 있는 이메일입니다/);
  assert.match(page, /비밀번호가 일치하지 않아요/);
  assert.match(page, /이름을 입력해 주세요/);
  assert.match(page, /resetPasswordForEmail/);
  assert.match(page, /result\.data\.user\.identities\?\.length === 0/);
  assert.match(page, /blockedSignupEmail/);
  assert.match(page, /인증 메일을 보냈습니다/);
  assert.match(page, /장소명/);
  assert.match(page, /하루 기록/);
  assert.match(schema, /enable row level security/i);
  assert.match(schema, /daily_records/);
  assert.match(envExample, /NEXT_PUBLIC_SUPABASE_URL/);
});

test("keeps actual transactions when a schedule is deleted", async () => {
  const schema = await readFile(new URL("supabase/schema.sql", root), "utf8");
  assert.match(schema, /schedule_id text references public\.schedules\(id\) on delete set null/i);
});

test("supports Korean holidays, minute-only times, and fixed recurrence", async () => {
  const [page, dataLayer, recurrenceSql] = await Promise.all([
    readUiSource(),
    readFile(new URL("lib/haru-data.ts", root), "utf8"),
    readFile(new URL("supabase/add-transaction-recurrence.sql", root), "utf8"),
  ]);
  assert.match(page, /@hyunbinseo\/holidays-kr\/all/);
  assert.match(page, /onEdit=\{setScheduleDraft\}/);
  assert.match(dataLayer, /start_time\?\.slice\(0, 5\)/);
  assert.match(recurrenceSql, /repeat_frequency/);
});

test("supports holiday names, multiple emotions, and explicit time dropdowns", async () => {
  const [page, schema, emotionSql] = await Promise.all([
    readUiSource(),
    readFile(new URL("supabase/schema.sql", root), "utf8"),
    readFile(new URL("supabase/add-multiple-emotions.sql", root), "utf8"),
  ]);
  assert.match(page, /className="day-heading"/);
  assert.match(page, /holidayName && <b>/);
  assert.match(page, /function TimePicker/);
  assert.match(page, /draft\.emotions\.map/);
  assert.match(schema, /emotions jsonb/i);
  assert.match(emotionSql, /jsonb_build_array/i);
});

test("converts estimated schedules to one editable actual expense", async () => {
  const [page, schema, migration] = await Promise.all([
    readUiSource(),
    readFile(new URL("supabase/schema.sql", root), "utf8"),
    readFile(new URL("supabase/add-planned-actual-recurrence-and-source.sql", root), "utf8"),
  ]);
  assert.match(page, /sameScheduleTransaction/);
  assert.match(page, /source === "schedule_actual"/);
  assert.match(page, /actualDate/);
  assert.match(page, /실제 지출 수정/);
  assert.match(page, /실제 일정 확인/);
  assert.match(page, /function DateNavigator/);
  assert.match(page, /현재 시간 반영/);
  assert.match(schema, /transactions_one_schedule_actual_idx/);
  assert.match(migration, /row_number\(\) over/);
});

test("keeps calendar cells fixed and supports server-side place search", async () => {
  const [page, styles, route, envExample] = await Promise.all([
    readUiSource(),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("app/api/places/route.ts", root), "utf8"),
    readFile(new URL(".env.example", root), "utf8"),
  ]);
  assert.match(page, /function PlaceSearchField/);
  assert.match(page, /title="현재 시간 반영"/);
  assert.match(styles, /height:112px/);
  assert.match(styles, /text-overflow:ellipsis/);
  assert.match(route, /local\/search\/keyword\.json/);
  assert.match(route, /KAKAO_REST_API_KEY/);
  assert.match(envExample, /KAKAO_REST_API_KEY/);
});

test("supports strongest calendar emotion, transaction notes, categories, and collapsible navigation", async () => {
  const [page, dataLayer, schema, memoSql, rlsSql] = await Promise.all([
    readUiSource(),
    readFile(new URL("lib/haru-data.ts", root), "utf8"),
    readFile(new URL("supabase/schema.sql", root), "utf8"),
    readFile(new URL("supabase/add-transaction-memo.sql", root), "utf8"),
    readFile(new URL("supabase/repair-rls-policies.sql", root), "utf8"),
  ]);
  assert.match(page, /strongestEmotion/);
  assert.match(page, /current\.intensity > strongest\.intensity/);
  assert.match(page, /expenseCategories/);
  assert.match(page, /incomeCategories/);
  assert.match(page, /간단한 메모/);
  assert.match(page, /sidebarCollapsed/);
  assert.match(page, /incomeCategories/);
  assert.match(dataLayer, /memo: item\.memo/);
  assert.match(schema, /memo text not null default ''/i);
  assert.match(memoSql, /add column if not exists memo/i);
  assert.match(rlsSql, /to authenticated/i);
});

test("supports recurrence, ledger analysis, statistics, and account management", async () => {
  const [page, schema, recurrence, accountSql] = await Promise.all([
    readUiSource(),
    readFile(new URL("supabase/schema.sql", root), "utf8"),
    readFile(new URL("lib/recurrence.ts", root), "utf8"),
    readFile(new URL("supabase/add-account-management.sql", root), "utf8"),
  ]);
  assert.match(page, /반복 일정/);
  assert.match(page, /반복 종료일/);
  assert.match(page, /이 회차 이후 반복 거래 전체 수정/);
  assert.match(page, /function StatsView/);
  assert.match(page, /거래 검색/);
  assert.match(page, /카테고리별 지출/);
  assert.match(page, /auth\.updateUser/);
  assert.match(page, /scope: "others"/);
  assert.match(page, /deleteMyAccount/);
  assert.match(schema, /repeat_end_date date/);
  assert.match(recurrence, /frequency === "weekly"/);
  assert.match(accountSql, /delete from auth\.users where id = \(select auth\.uid\(\)\)/i);
});

test("supports a responsive installable mobile web app", async () => {
  const [page, styles, layout, manifest, packageJson] = await Promise.all([
    readUiSource(),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/manifest.ts", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);
  assert.match(page, /mobile-more-sheet/);
  assert.match(page, /선택한 날짜에 일정 추가/);
  assert.match(page, /changeMobileView\("settings"\)/);
  assert.match(styles, /env\(safe-area-inset-bottom\)/);
  assert.match(styles, /max-height:92dvh/);
  assert.match(styles, /\.weekdays,\.calendar-grid \{ min-width:0/);
  assert.match(layout, /viewportFit: "cover"/);
  assert.match(layout, /manifest: "\/manifest\.webmanifest"/);
  assert.match(manifest, /display: "standalone"/);
  assert.match(page, /emailRedirectTo: window\.location\.origin/);
  assert.match(packageJson, /dev:mobile/);
});
test("includes a separate Vercel build path and required deployment variables", async () => {
  const [packageJson, viteConfig, vercelConfig, envExample] = await Promise.all([
    readFile(new URL("package.json", root), "utf8"),
    readFile(new URL("vite.config.ts", root), "utf8"),
    readFile(new URL("vercel.json", root), "utf8"),
    readFile(new URL(".env.example", root), "utf8"),
  ]);

  assert.match(packageJson, /build:vercel/);
  assert.match(packageJson, /"nitro"/);
  assert.match(viteConfig, /isVercelBuild/);
  assert.match(viteConfig, /nitro\/vite/);
  assert.match(vercelConfig, /npm run build:vercel/);
  assert.doesNotMatch(vercelConfig, /outputDirectory/);
  assert.match(envExample, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(envExample, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(envExample, /KAKAO_REST_API_KEY/);
});

test("provides a production-ready PWA shell and install experience", async () => {
  const [manager, serviceWorker, manifest, layout, vercelConfig] = await Promise.all([
    readFile(new URL("app/components/pwa-manager.tsx", root), "utf8"),
    readFile(new URL("public/sw.js", root), "utf8"),
    readFile(new URL("app/manifest.ts", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("vercel.json", root), "utf8"),
  ]);

  assert.match(manager, /beforeinstallprompt/);
  assert.match(manager, /navigator\.serviceWorker\.register\("\/sw\.js"/);
  assert.match(manager, /오프라인/);
  assert.match(manager, /SKIP_WAITING/);
  assert.match(serviceWorker, /ongyeol-shell-v1/);
  assert.match(serviceWorker, /request\.mode === "navigate"/);
  assert.match(serviceWorker, /url\.origin !== self\.location\.origin/);
  assert.match(manifest, /maskable-512\.png/);
  assert.match(manifest, /icon-192\.png/);
  assert.match(layout, /apple-touch-icon\.png/);
  assert.match(vercelConfig, /Service-Worker-Allowed/);
});

test("keeps mobile pages within the viewport and explains unsupported Android installation", async () => {
  const [page, styles, theme, manager] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/globals.css", root), "utf8"),
    readFile(new URL("app/ongyeol.css", root), "utf8"),
    readFile(new URL("app/components/pwa-manager.tsx", root), "utf8"),
  ]);

  assert.match(page, /className={`content view-\${view}`}/);
  assert.match(page, /view === "ledger" \? "거래 추가"/);
  assert.match(styles, /\.content,\.sidebar-collapsed \.content \{ width:100%; min-width:0; max-width:100%; margin-left:0/);
  assert.match(styles, /grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(theme, /\.content,\.sidebar-collapsed \.content \{ margin-left:0; \}/);
  assert.match(manager, /Chrome에서 열기/);
  assert.match(manager, /package=com\.android\.chrome/);
  assert.match(manager, /7일 동안 보지 않기/);
});
