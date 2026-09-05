"use client";

import type { User } from "@supabase/supabase-js";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  loadHaruData, removeDailyRecord, removeSchedule, removeTransaction,
  upsertDailyRecord, upsertDiary, upsertSchedule, upsertTransaction,
} from "../lib/haru-data";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";
import { occurrenceDates } from "../lib/recurrence";
import type { AppData, DailyRecord, EmotionDiary, Schedule, ScheduleStatus, Transaction, View } from "../lib/types";
import { AuthGate, SetupRequired } from "./components/auth-gate";
import { BrandLogo, NavButton } from "./components/common";
import { RecordModal, ScheduleModal, TransactionModal } from "./components/modals";
import { CalendarView, DiaryView, LedgerView, RecordsView, SettingsView, StatsView, TodayView } from "./components/views";
import { dateKey, expenseCategories, newId, pad } from "./components/ui-helpers";

const blankSchedule = (date: string, userId: string): Schedule => ({
  id: "", userId, title: "", date, startTime: "09:00", endTime: "10:00", place: "", address: "",
  actualDate: "", actualStartTime: "", actualEndTime: "", completedAt: null,
  people: "", expectedCost: 0, status: "planned", memo: "", isRecurring: false,
  repeatFrequency: null, repeatEndDate: null, seriesId: null,
});
const blankTransaction = (date: string, userId: string): Transaction => ({
  id: "", userId, type: "expense", amount: 0, date, category: expenseCategories[0], title: "", memo: "",
  source: "manual", fixed: false, repeatFrequency: null, repeatMonth: null, repeatDay: null,
  repeatEndDate: null, seriesId: null,
});
const blankRecord = (date: string, userId: string): DailyRecord => ({
  id: "", userId, date, time: new Date().toTimeString().slice(0, 5), title: "", content: "",
});

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [loadError, setLoadError] = useState("");
  const [view, setView] = useState<View>("today");
  const [selectedDate, setSelectedDate] = useState(dateKey());
  const [monthCursor, setMonthCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [scheduleDraft, setScheduleDraft] = useState<Schedule | null>(null);
  const [txDraft, setTxDraft] = useState<Transaction | null>(null);
  const [recordDraft, setRecordDraft] = useState<DailyRecord | null>(null);
  const [completingScheduleId, setCompletingScheduleId] = useState<string | null>(null);
  const [pendingCompletion, setPendingCompletion] = useState<Schedule | null>(null);
  const [actualScheduleId, setActualScheduleId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [editScheduleSeries, setEditScheduleSeries] = useState(false);
  const [editTransactionSeries, setEditTransactionSeries] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const client = getSupabase();
    if (!client) return;
    client.auth.getSession().then(({ data: sessionData }) => {
      setUser(sessionData.session?.user ?? null);
      setLoading(false);
    });
    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) setData(null);
      if (event === "PASSWORD_RECOVERY") {
        setView("settings");
        setToast("새 비밀번호를 설정해 주세요");
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    loadHaruData(user).then((next) => { if (alive) { setData(next); setLoadError(""); } })
      .catch((error: Error) => { if (alive) setLoadError(error.message); })
    return () => { alive = false; };
  }, [user]);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(timeout);
  }, [toast]);

  const notifyError = (error: unknown) => setToast(error instanceof Error ? error.message : "저장하지 못했어요");
  const daySchedules = useMemo(() => data?.schedules.filter((s) => s.date === selectedDate).sort((a, b) => a.startTime.localeCompare(b.startTime)) ?? [], [data, selectedDate]);
  const dayTransactions = useMemo(() => data?.transactions.filter((t) => t.date === selectedDate) ?? [], [data, selectedDate]);
  const dayRecords = useMemo(() => data?.dailyRecords.filter((r) => r.date === selectedDate).sort((a, b) => b.time.localeCompare(a.time)) ?? [], [data, selectedDate]);
  const dayDiary = data?.diaries.find((d) => d.date === selectedDate);
  const monthKey = `${monthCursor.getFullYear()}-${pad(monthCursor.getMonth() + 1)}`;
  const monthTransactions = data?.transactions.filter((t) => t.date.startsWith(monthKey)) ?? [];
  const income = monthTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const expense = monthTransactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const actualScheduleIds = new Set(data?.transactions.filter((transaction) => transaction.source === "schedule_actual" && transaction.scheduleId).map((transaction) => transaction.scheduleId) ?? []);
  const expected = data?.schedules.filter((s) => s.date.startsWith(monthKey) && s.status !== "cancelled" && !actualScheduleIds.has(s.id)).reduce((sum, s) => sum + s.expectedCost, 0) ?? 0;

  const changeDate = (date: string, nextView?: View) => {
    setSelectedDate(date);
    const parsed = new Date(`${date}T00:00:00`);
    setMonthCursor(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    if (nextView) setView(nextView);
  };
  const changeMobileView = (nextView: View) => {
    setView(nextView);
    setMobileMenuOpen(false);
  };

  const saveSchedule = async (event: FormEvent) => {
    event.preventDefault();
    if (!scheduleDraft?.title.trim() || !data) return;
    const item = { ...scheduleDraft, id: scheduleDraft.id || newId(), userId: data.user.id, expectedCost: Number(scheduleDraft.expectedCost) || 0 };
    try {
      if (completingScheduleId === item.id) {
        const actual = data.transactions.find((transaction) => transaction.source === "schedule_actual" && transaction.scheduleId === item.id);
        if (actual || item.expectedCost > 0) {
          setPendingCompletion({ ...item, status: "done" });
          setScheduleDraft(null);
          setActualScheduleId(item.id);
          setTxDraft(actual
            ? { ...actual, type: "expense", date: item.actualDate || item.date }
            : { ...blankTransaction(item.actualDate || item.date, data.user.id), title: item.title, scheduleId: item.id, source: "schedule_actual", amount: item.expectedCost });
          return;
        }
      }
      if (scheduleDraft.id && editScheduleSeries && item.seriesId) {
        const occurrences = data.schedules
          .filter((schedule) => schedule.seriesId === item.seriesId && schedule.date >= item.date)
          .map((schedule) => ({
            ...schedule,
            title: item.title, startTime: item.startTime, endTime: item.endTime,
            place: item.place, address: item.address, people: item.people,
            expectedCost: item.expectedCost, status: item.status, memo: item.memo,
            isRecurring: item.isRecurring, repeatFrequency: item.repeatFrequency,
            repeatEndDate: item.repeatEndDate,
          }));
        await Promise.all(occurrences.map(upsertSchedule));
        const replacements = new Map(occurrences.map((schedule) => [schedule.id, schedule]));
        setData((prev) => prev && ({ ...prev, schedules: prev.schedules.map((schedule) => replacements.get(schedule.id) ?? schedule) }));
        setScheduleDraft(null);
        setEditScheduleSeries(false);
        setToast("이 회차 이후의 반복 일정을 수정했어요");
        return;
      }
      if (!scheduleDraft.id && item.isRecurring && item.repeatFrequency && item.repeatEndDate) {
        const seriesId = newId();
        const dates = occurrenceDates(item.date, item.repeatFrequency, item.repeatEndDate);
        const occurrences = dates.map((date, index) => ({ ...item, id: index === 0 ? item.id : newId(), date, seriesId }));
        await Promise.all(occurrences.map(upsertSchedule));
        setData((prev) => prev && ({ ...prev, schedules: [...prev.schedules, ...occurrences] }));
        setScheduleDraft(null);
        setToast(`반복 일정 ${occurrences.length}개를 추가했어요`);
        return;
      }
      const completedItem = completingScheduleId === item.id
        ? { ...item, status: "done" as const, completedAt: new Date().toISOString() }
        : item;
      await upsertSchedule(completedItem);
      setData((prev) => prev && ({ ...prev, schedules: prev.schedules.some((s) => s.id === completedItem.id) ? prev.schedules.map((s) => s.id === completedItem.id ? completedItem : s) : [...prev.schedules, completedItem] }));
      setScheduleDraft(null);
      setCompletingScheduleId(null);
      setToast(completingScheduleId === item.id ? "실제 일정을 확인하고 완료했어요" : scheduleDraft.id ? "일정을 수정했어요" : "새 일정을 추가했어요");
    } catch (error) { notifyError(error); }
  };
  const deleteSchedule = async (id: string) => {
    try {
      await removeSchedule(id);
      setData((prev) => prev && ({ ...prev, schedules: prev.schedules.filter((s) => s.id !== id), transactions: prev.transactions.map((t) => t.scheduleId === id ? { ...t, scheduleId: undefined } : t), dailyRecords: prev.dailyRecords.map((r) => r.scheduleId === id ? { ...r, scheduleId: undefined } : r) }));
      setMenuId(null); setToast("일정을 삭제했어요. 실제 거래와 하루 기록은 유지돼요");
    } catch (error) { notifyError(error); }
  };
  const updateStatus = async (schedule: Schedule, status: ScheduleStatus) => {
    if (status === "done") {
      setCompletingScheduleId(schedule.id);
      setScheduleDraft({
        ...schedule,
        status: "done",
        actualDate: schedule.actualDate || schedule.date,
        actualStartTime: schedule.actualStartTime || schedule.startTime,
        actualEndTime: schedule.actualEndTime || schedule.endTime,
      });
      setMenuId(null);
      return;
    }
    try {
      const item = { ...schedule, status };
      await upsertSchedule(item);
      setData((prev) => prev && ({ ...prev, schedules: prev.schedules.map((s) => s.id === item.id ? item : s) }));
      setMenuId(null);
    } catch (error) { notifyError(error); }
  };
  const saveTransaction = async (event: FormEvent) => {
    event.preventDefault();
    if (!txDraft?.title.trim() || txDraft.amount <= 0 || !data) return;
    const sameScheduleTransaction = txDraft.source === "schedule_actual" && txDraft.scheduleId
      ? data.transactions.find((transaction) => transaction.scheduleId === txDraft.scheduleId && transaction.id !== txDraft.id)
      : undefined;
    const item = { ...txDraft, id: txDraft.id || sameScheduleTransaction?.id || newId(), userId: data.user.id, amount: Number(txDraft.amount) };
    const scheduleUpdate: Schedule | undefined = pendingCompletion && item.source === "schedule_actual" && pendingCompletion.id === item.scheduleId
      ? { ...pendingCompletion, status: "done" as const, completedAt: new Date().toISOString() }
      : undefined;
    try {
      if (txDraft.id && editTransactionSeries && item.seriesId) {
        const occurrences = data.transactions
          .filter((transaction) => transaction.seriesId === item.seriesId && transaction.date >= item.date)
          .map((transaction) => ({
            ...transaction,
            type: item.type, amount: item.amount, category: item.category, title: item.title,
            memo: item.memo, fixed: item.fixed, repeatFrequency: item.repeatFrequency,
            repeatMonth: item.repeatMonth, repeatDay: item.repeatDay, repeatEndDate: item.repeatEndDate,
          }));
        await Promise.all(occurrences.map(upsertTransaction));
        const replacements = new Map(occurrences.map((transaction) => [transaction.id, transaction]));
        setData((prev) => prev && ({ ...prev, transactions: prev.transactions.map((transaction) => replacements.get(transaction.id) ?? transaction) }));
        setTxDraft(null);
        setEditTransactionSeries(false);
        setToast("이 회차 이후의 반복 거래를 수정했어요");
        return;
      }
      if (!txDraft.id && item.fixed && item.repeatFrequency && item.repeatEndDate && item.source === "manual") {
        const seriesId = newId();
        const dates = occurrenceDates(item.date, item.repeatFrequency, item.repeatEndDate, item.repeatMonth, item.repeatDay);
        const occurrences = dates.map((date, index) => ({ ...item, id: index === 0 ? item.id : newId(), date, seriesId }));
        await Promise.all(occurrences.map(upsertTransaction));
        setData((prev) => prev && ({ ...prev, transactions: [...prev.transactions, ...occurrences] }));
        setTxDraft(null);
        setToast(`반복 거래 ${occurrences.length}개를 추가했어요`);
        return;
      }
      await Promise.all([upsertTransaction(item), scheduleUpdate ? upsertSchedule(scheduleUpdate) : Promise.resolve()]);
      setData((prev) => prev && ({
        ...prev,
        schedules: scheduleUpdate ? prev.schedules.map((schedule) => schedule.id === scheduleUpdate.id ? scheduleUpdate : schedule) : prev.schedules,
        transactions: prev.transactions.some((transaction) => transaction.id === item.id)
          ? prev.transactions.map((transaction) => transaction.id === item.id ? item : transaction)
          : [...prev.transactions, item],
      }));
      setTxDraft(null);
      setPendingCompletion(null);
      setCompletingScheduleId(null);
      setActualScheduleId(null);
      setToast(pendingCompletion ? "실제 일정과 지출을 확인하고 완료했어요" : "예상 지출을 실제 지출로 변경했어요");
    } catch (error) { notifyError(error); }
  };
  const deleteTransaction = async (id: string) => {
    try {
      await removeTransaction(id);
      setData((prev) => prev && ({
        ...prev,
        transactions: prev.transactions.filter((item) => item.id !== id),
      }));
    }
    catch (error) { notifyError(error); }
  };
  const saveDiary = async (draft: EmotionDiary) => {
    if (!data) return;
    const item = { ...draft, id: draft.id || newId(), userId: data.user.id };
    try {
      await upsertDiary(item);
      setData((prev) => prev && ({ ...prev, diaries: prev.diaries.some((d) => d.date === item.date) ? prev.diaries.map((d) => d.date === item.date ? item : d) : [...prev.diaries, item] }));
      setToast("오늘의 마음을 저장했어요");
    } catch (error) { notifyError(error); }
  };
  const saveRecord = async (event: FormEvent) => {
    event.preventDefault();
    if (!recordDraft?.title.trim() || !recordDraft.content.trim() || !data) return;
    const item = { ...recordDraft, id: recordDraft.id || newId(), userId: data.user.id };
    try {
      await upsertDailyRecord(item);
      setData((prev) => prev && ({ ...prev, dailyRecords: prev.dailyRecords.some((r) => r.id === item.id) ? prev.dailyRecords.map((r) => r.id === item.id ? item : r) : [...prev.dailyRecords, item] }));
      setRecordDraft(null); setToast("하루 기록을 저장했어요");
    } catch (error) { notifyError(error); }
  };
  const deleteRecord = async (id: string) => {
    try { await removeDailyRecord(id); setData((prev) => prev && ({ ...prev, dailyRecords: prev.dailyRecords.filter((r) => r.id !== id) })); }
    catch (error) { notifyError(error); }
  };
  const editActualExpense = (schedule: Schedule) => {
    const actual = data?.transactions.find((transaction) => transaction.source === "schedule_actual" && transaction.scheduleId === schedule.id);
    setActualScheduleId(schedule.id);
    setTxDraft(actual
      ? { ...actual, type: "expense" }
      : { ...blankTransaction(schedule.actualDate || schedule.date, schedule.userId), title: schedule.title, scheduleId: schedule.id, source: "schedule_actual", amount: schedule.expectedCost });
  };
  const closeScheduleModal = () => {
    setScheduleDraft(null);
    setCompletingScheduleId(null);
    setEditScheduleSeries(false);
  };
  const closeTransactionModal = () => {
    setTxDraft(null);
    setPendingCompletion(null);
    setCompletingScheduleId(null);
    setActualScheduleId(null);
    setEditTransactionSeries(false);
  };

  if (!isSupabaseConfigured) return <SetupRequired />;
  if (loading) return <main className="loading"><BrandLogo /><span>기록의 결을 펼치는 중…</span></main>;
  if (!user) return <AuthGate />;
  if (loadError) return <main className="loading error-state"><b>데이터를 불러오지 못했어요</b><span>{loadError}</span><button className="primary" onClick={() => location.reload()}>다시 시도</button></main>;
  if (!data) return <main className="loading">내 기록을 불러오는 중…</main>;

  return <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
    <aside className="sidebar">
      <button type="button" className="sidebar-toggle" aria-label={sidebarCollapsed ? "메뉴 펼치기" : "메뉴 접기"} title={sidebarCollapsed ? "메뉴 펼치기" : "메뉴 접기"} onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}>{sidebarCollapsed ? "›" : "‹"}</button>
      <button className="brand" onClick={() => setView("today")} aria-label="온결 오늘 화면으로 이동"><BrandLogo inverse /></button>
      <nav>
        <NavButton icon="⌂" label="오늘" active={view === "today"} onClick={() => { changeDate(dateKey()); setView("today"); }} />
        <NavButton icon="□" label="캘린더" active={view === "calendar"} onClick={() => setView("calendar")} />
        <NavButton icon="₩" label="가계부" active={view === "ledger"} onClick={() => setView("ledger")} />
        <NavButton icon="▥" label="통계" active={view === "stats"} onClick={() => setView("stats")} />
        <NavButton icon="✎" label="하루 기록" active={view === "records"} onClick={() => setView("records")} />
        <NavButton icon="♡" label="감정 일기" active={view === "diary"} onClick={() => setView("diary")} />
      </nav>
      <div className="sidebar-bottom">
        <NavButton icon="⚙" label="설정" active={view === "settings"} onClick={() => setView("settings")} />
        <div className="profile"><span>{data.user.name.slice(0, 1).toUpperCase()}</span><div><b>{data.user.name}</b><small>{data.user.email}</small></div></div>
      </div>
    </aside>

    <header className="mobile-topbar"><button className="mobile-brand" onClick={() => changeMobileView("today")} aria-label="온결 오늘 화면으로 이동"><BrandLogo /></button><button className="mobile-settings" aria-label="설정 열기" onClick={() => changeMobileView("settings")}>⚙</button></header>

    <main className="content">
      {view === "today" && <TodayView date={selectedDate} schedules={daySchedules} transactions={dayTransactions} diary={dayDiary} records={dayRecords} onAdd={() => setScheduleDraft(blankSchedule(selectedDate, data.user.id))} onEdit={setScheduleDraft} onMenu={setMenuId} menuId={menuId} onDelete={deleteSchedule} onStatus={updateStatus} onActual={editActualExpense} onDiary={() => setView("diary")} onRecords={() => setView("records")} />}
      {view === "calendar" && <CalendarView cursor={monthCursor} setCursor={setMonthCursor} data={data} selectedDate={selectedDate} onSelect={changeDate} onAdd={(date) => setScheduleDraft(blankSchedule(date, data.user.id))} onEdit={setScheduleDraft} onDelete={deleteSchedule} />}
      {view === "ledger" && <LedgerView cursor={monthCursor} setCursor={setMonthCursor} transactions={monthTransactions} schedules={data.schedules.filter((s) => s.date.startsWith(monthKey))} income={income} expense={expense} expected={expected} onAdd={() => { setActualScheduleId(null); setTxDraft(blankTransaction(selectedDate, data.user.id)); }} onEdit={(transaction) => { setActualScheduleId(null); setTxDraft(transaction); }} onDelete={deleteTransaction} />}
      {view === "stats" && <StatsView cursor={monthCursor} setCursor={setMonthCursor} data={data} />}
      {view === "records" && <RecordsView date={selectedDate} onDate={changeDate} records={dayRecords} schedules={daySchedules} onAdd={() => setRecordDraft(blankRecord(selectedDate, data.user.id))} onEdit={setRecordDraft} onDelete={deleteRecord} />}
      {view === "diary" && <DiaryView key={`${selectedDate}-${dayDiary?.id ?? "new"}`} date={selectedDate} onDate={changeDate} diary={dayDiary} schedules={daySchedules} transactions={dayTransactions} userId={data.user.id} onSave={saveDiary} onAddUnplanned={() => setScheduleDraft({ ...blankSchedule(selectedDate, data.user.id), status: "done" })} />}
      {view === "settings" && <SettingsView data={data} setData={setData} onToast={setToast} />}
    </main>

    <div className="mobile-nav">
      <NavButton icon="⌂" label="오늘" active={view === "today"} onClick={() => { changeDate(dateKey()); changeMobileView("today"); }} />
      <NavButton icon="□" label="캘린더" active={view === "calendar"} onClick={() => changeMobileView("calendar")} />
      <button className="mobile-add" aria-label="선택한 날짜에 일정 추가" onClick={() => { setMobileMenuOpen(false); setScheduleDraft(blankSchedule(selectedDate, data.user.id)); }}>＋</button>
      <NavButton icon="₩" label="가계부" active={view === "ledger"} onClick={() => changeMobileView("ledger")} />
      <NavButton icon="•••" label="더보기" active={mobileMenuOpen || ["stats", "records", "diary", "settings"].includes(view)} onClick={() => setMobileMenuOpen((open) => !open)} />
    </div>

    {mobileMenuOpen && <dialog open className="mobile-more-backdrop" aria-label="더보기 메뉴"><section className="mobile-more-sheet"><div><b>더보기</b><button aria-label="더보기 메뉴 닫기" onClick={() => setMobileMenuOpen(false)}>×</button></div><button onClick={() => changeMobileView("records")}><span>✎</span><b>하루 기록</b><small>작은 순간을 자유롭게 기록</small></button><button onClick={() => changeMobileView("diary")}><span>♡</span><b>감정 일기</b><small>하루의 감정과 강도 돌아보기</small></button><button onClick={() => changeMobileView("stats")}><span>▥</span><b>통계</b><small>일정, 지출, 감정 흐름 확인</small></button><button onClick={() => changeMobileView("settings")}><span>⚙</span><b>설정</b><small>계정과 데이터 관리</small></button></section></dialog>}

    {scheduleDraft && <ScheduleModal draft={scheduleDraft} setDraft={setScheduleDraft} completionMode={completingScheduleId === scheduleDraft.id} hasActualExpense={data.transactions.some((transaction) => transaction.source === "schedule_actual" && transaction.scheduleId === scheduleDraft.id)} editSeries={editScheduleSeries} setEditSeries={setEditScheduleSeries} onClose={closeScheduleModal} onSubmit={saveSchedule} />}
    {txDraft && <TransactionModal draft={txDraft} setDraft={setTxDraft} schedules={data.schedules.filter((s) => s.date === txDraft.date)} lockedScheduleId={actualScheduleId} editSeries={editTransactionSeries} setEditSeries={setEditTransactionSeries} onClose={closeTransactionModal} onSubmit={saveTransaction} />}
    {recordDraft && <RecordModal draft={recordDraft} setDraft={setRecordDraft} schedules={data.schedules.filter((s) => s.date === recordDraft.date)} onClose={() => setRecordDraft(null)} onSubmit={saveRecord} />}
    {toast && <div className="toast">{toast}</div>}
  </div>;
}
