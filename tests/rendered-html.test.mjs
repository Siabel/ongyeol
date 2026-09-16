import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const compact = (source) => source.replace(/\s+/g, "");
const uiSourcePaths = [
  "app/page.tsx",
  "app/components/auth-gate.tsx",
  "app/components/common.tsx",
  "app/components/day-scheduler.tsx",
  "app/components/views/account-views.tsx",
  "app/components/views/ledger-stats-views.tsx",
  "app/components/views/records-diary-views.tsx",
  "app/components/views/today-calendar-views.tsx",
  "app/components/modals/record-modal.tsx",
  "app/components/modals/schedule-modal.tsx",
  "app/components/modals/transaction-modal.tsx",
  "app/components/ui-helpers.ts",
];
const styleSourcePaths = [
  "app/globals.css",
  "app/theme.css",
  "app/styles/application.css",
  "app/styles/foundation.css",
  "app/styles/brand.css",
  "app/styles/readability.css",
  "app/styles/responsive.css",
];
const readUiSource = async () =>
  (
    await Promise.all(
      uiSourcePaths.map((path) => readFile(new URL(path, root), "utf8")),
    )
  ).join("\n");
const readStyleSource = async () =>
  (
    await Promise.all(
      styleSourcePaths.map((path) => readFile(new URL(path, root), "utf8")),
    )
  ).join("\n");

test("uses the Jakda brand across UI, metadata, and PWA assets", async () => {
  const [ui, layout, manifest, theme, favicon] = await Promise.all([
    readUiSource(),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/manifest.ts", root), "utf8"),
    readStyleSource(),
    readFile(new URL("public/favicon.svg", root), "utf8"),
  ]);
  assert.match(ui, /작은 다음을 기록하다/);
  assert.match(ui, /오늘의 한 칸이/);
  assert.match(layout, /작은다음 — 오늘의 한 칸이 다음을 만들어요/);
  assert.match(manifest, /short_name: "작다"/);
  assert.match(theme, /Brand tokens/);
  assert.match(theme, /Text hierarchy and contrast/);
  assert.match(theme, /--orange: #e87932/);
  assert.match(theme, /\.auth-story \.brand-copy em/);
  assert.match(theme, /color: #ffd19f/);
  assert.match(favicon, /#4658A6/);
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
  assert.match(page, /닉네임을 입력해 주세요/);
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
  assert.match(
    schema,
    /schedule_id text references public\.schedules\(id\) on delete set null/i,
  );
});

test("supports Korean holidays, minute-only times, and fixed recurrence", async () => {
  const [page, dataLayer, recurrenceSql] = await Promise.all([
    readUiSource(),
    readFile(new URL("lib/app-data.ts", root), "utf8"),
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
    readFile(
      new URL("supabase/add-planned-actual-recurrence-and-source.sql", root),
      "utf8",
    ),
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
    readStyleSource(),
    readFile(new URL("app/api/places/route.ts", root), "utf8"),
    readFile(new URL(".env.example", root), "utf8"),
  ]);
  assert.match(page, /function PlaceSearchField/);
  assert.match(page, /title="현재 시간 반영"/);
  assert.ok(compact(styles).includes("height:112px"));
  assert.ok(compact(styles).includes("text-overflow:ellipsis"));
  assert.match(route, /local\/search\/keyword\.json/);
  assert.match(route, /KAKAO_REST_API_KEY/);
  assert.match(envExample, /KAKAO_REST_API_KEY/);
});

test("supports strongest calendar emotion, transaction notes, categories, and collapsible navigation", async () => {
  const [page, dataLayer, schema, memoSql, rlsSql] = await Promise.all([
    readUiSource(),
    readFile(new URL("lib/app-data.ts", root), "utf8"),
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
  assert.match(
    accountSql,
    /delete from auth\.users where id = \(select auth\.uid\(\)\)/i,
  );
});

test("supports a responsive installable mobile web app", async () => {
  const [page, styles, layout, manifest, packageJson] = await Promise.all([
    readUiSource(),
    readStyleSource(),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/manifest.ts", root), "utf8"),
    readFile(new URL("package.json", root), "utf8"),
  ]);
  assert.match(page, /mobile-more-sheet/);
  assert.match(page, /선택한 날짜에 일정 추가/);
  assert.match(page, /changeMobileView\("settings"\)/);
  assert.ok(compact(styles).includes("env(safe-area-inset-bottom)"));
  assert.ok(compact(styles).includes("max-height:92dvh"));
  assert.ok(compact(styles).includes(".weekdays,.calendar-grid{min-width:0"));
  assert.match(layout, /viewportFit: "cover"/);
  assert.match(layout, /manifest: "\/manifest\.webmanifest"/);
  assert.match(manifest, /display: "standalone"/);
  assert.match(page, /emailRedirectTo: window\.location\.origin/);
  assert.match(packageJson, /dev:mobile/);
});
test("includes a separate Vercel build path and required deployment variables", async () => {
  const [packageJson, viteConfig, vercelConfig, envExample] = await Promise.all(
    [
      readFile(new URL("package.json", root), "utf8"),
      readFile(new URL("vite.config.ts", root), "utf8"),
      readFile(new URL("vercel.json", root), "utf8"),
      readFile(new URL(".env.example", root), "utf8"),
    ],
  );

  assert.match(packageJson, /build:vercel/);
  assert.match(packageJson, /"nitro"/);
  assert.match(viteConfig, /command === "build" \? \[nitro\(\)\] : \[\]/);
  assert.match(viteConfig, /nitro\/vite/);
  assert.match(vercelConfig, /npm run build:vercel/);
  assert.doesNotMatch(vercelConfig, /outputDirectory/);
  assert.match(envExample, /NEXT_PUBLIC_SUPABASE_URL/);
  assert.match(envExample, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(envExample, /KAKAO_REST_API_KEY/);
});

test("provides a production-ready PWA shell and install experience", async () => {
  const [manager, serviceWorker, manifest, layout, vercelConfig] =
    await Promise.all([
      readFile(new URL("app/components/pwa-manager.tsx", root), "utf8"),
      readFile(new URL("public/sw.js", root), "utf8"),
      readFile(new URL("app/manifest.ts", root), "utf8"),
      readFile(new URL("app/layout.tsx", root), "utf8"),
      readFile(new URL("vercel.json", root), "utf8"),
    ]);

  assert.match(manager, /beforeinstallprompt/);
  assert.ok(compact(manager).includes('.register("/sw.js"'));
  assert.match(manager, /오프라인/);
  assert.match(manager, /SKIP_WAITING/);
  assert.match(serviceWorker, /jakda-shell-v1/);
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
    readStyleSource(),
    readStyleSource(),
    readFile(new URL("app/components/pwa-manager.tsx", root), "utf8"),
  ]);

  assert.match(page, /className={`content view-\${view}`}/);
  assert.ok(compact(page).includes('view==="ledger"?"거래추가"'));
  assert.ok(
    compact(styles).includes(
      ".content,.sidebar-collapsed.content{width:100%;min-width:0;max-width:100%;margin-left:0",
    ),
  );
  assert.ok(
    compact(styles).includes("grid-template-columns:repeat(5,minmax(0,1fr))"),
  );
  assert.ok(
    compact(theme).includes(
      ".content,.sidebar-collapsed.content{margin-left:0;}",
    ),
  );
  assert.match(manager, /Chrome에서 열기/);
  assert.match(manager, /package=com\.android\.chrome/);
  assert.match(manager, /7일 동안 보지 않기/);
});
test("provides a separate profile page backed by Supabase user metadata", async () => {
  const [page, views, types, dataLayer, styles] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/components/views/account-views.tsx", root), "utf8"),
    readFile(new URL("lib/types.ts", root), "utf8"),
    readFile(new URL("lib/app-data.ts", root), "utf8"),
    readStyleSource(),
  ]);
  assert.match(types, /"profile"/);
  assert.match(page, /프로필 열기/);
  assert.match(page, /<ProfileView/);
  assert.match(views, /function ProfileView/);
  assert.match(views, /display_name: displayName/);
  assert.match(views, /real_name: realNameValue/);
  assert.match(views, /<span>닉네임<\/span>/);
  assert.match(views, /<span>실명<\/span>/);
  assert.match(dataLayer, /createdAt: user\.created_at/);
  assert.match(dataLayer, /realName: String\(user\.user_metadata\?\.real_name/);
  assert.match(styles, /\.profile-layout/);
});

test("adds a day planner that reuses schedule data", async () => {
  const [page, views, scheduler, styles] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(
      new URL("app/components/views/today-calendar-views.tsx", root),
      "utf8",
    ),
    readFile(new URL("app/components/day-scheduler.tsx", root), "utf8"),
    readStyleSource(),
  ]);
  assert.match(views, /mode === "day"/);
  assert.match(views, /<DayScheduler/);
  assert.match(scheduler, /DAY PLANNER/);
  assert.match(scheduler, /positionSchedules/);
  assert.match(scheduler, /이 시간에 일정 추가/);
  assert.match(page, /startTime: startTime \?\? "09:00"/);
  assert.match(styles, /\.day-scheduler/);
  assert.match(styles, /\.scheduler-event/);
});

test("prevents duplicate schedule submissions and invalid time ranges", async () => {
  const [page, modals, styles] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/components/modals/schedule-modal.tsx", root), "utf8"),
    readStyleSource(),
  ]);
  assert.match(page, /scheduleSaveLock\.current/);
  assert.match(page, /selectedEndTime <= selectedStartTime/);
  assert.match(modals, /invalidTimeRange/);
  assert.ok(compact(modals).includes("[0,10,20,30,40,50,minuteValue]"));
  assert.ok(compact(modals).includes("disabled={invalidTimeRange||saving}"));
  assert.ok(
    compact(styles).includes(
      ".sidebar-collapsed.brand-copy{display:none!important;}",
    ),
  );
});

test("keeps schedule deletion reachable from edit and today menus", async () => {
  const [page, views, modals, styles] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(
      new URL("app/components/views/today-calendar-views.tsx", root),
      "utf8",
    ),
    readFile(new URL("app/components/modals/schedule-modal.tsx", root), "utf8"),
    readStyleSource(),
  ]);
  assert.match(page, /deleteScheduleFromModal/);
  assert.ok(compact(page).includes("onDelete={scheduleDraft.id"));
  assert.match(modals, /className="modal-delete"/);
  assert.match(views, /menu-open/);
  assert.match(views, /aria-expanded=\{menuId === s\.id\}/);
  assert.match(styles, /\.schedule-card\.menu-open/);
  assert.ok(compact(styles).includes(".context-menu{z-index:30;top:-8px"));
  assert.ok(compact(styles).includes(".sidebar:after{display:none;}"));
});

test("retries the transient Supabase JWT clock error before showing a friendly recovery state", async () => {
  const [page, dataLayer] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("lib/app-data.ts", root), "utf8"),
  ]);
  assert.match(dataLayer, /PGRST303/);
  assert.match(dataLayer, /jwt issued at future/i);
  assert.match(dataLayer, /retryDelays = \[800, 1800, 3500, 6500\]/);
  assert.match(page, /dataLoadRevision/);
  assert.match(page, /다시 연결/);
});
