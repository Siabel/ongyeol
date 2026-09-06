"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { deleteMyAccount, loadHaruData, upsertDailyRecord, upsertDiary, upsertSchedule, upsertTransaction } from "../../lib/haru-data";
import { getSupabase } from "../../lib/supabase";
import type { AppData, DailyRecord, EmotionDiary, Schedule, ScheduleStatus, Transaction } from "../../lib/types";
import { DateNavigator, Empty, PageHeader } from "./common";
import { dateKey, displayDate, emotions, formatTime, koreanHolidays, mapHref, money, newId, pad, statusMap, strongestEmotion } from "./ui-helpers";

const LEGACY_STORE_KEY = "one-day-diary-v1";
export function TodayView({ date, schedules, transactions, diary, records, onAdd, onEdit, onMenu, menuId, onDelete, onStatus, onActual, onDiary, onRecords }: { date: string; schedules: Schedule[]; transactions: Transaction[]; diary?: EmotionDiary; records: DailyRecord[]; onAdd: () => void; onEdit: (s: Schedule) => void; onMenu: (id: string | null) => void; menuId: string | null; onDelete: (id: string) => void; onStatus: (s: Schedule, status: ScheduleStatus) => void; onActual: (s: Schedule) => void; onDiary: () => void; onRecords: () => void }) {
  const total = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const diaryEmotions = diary?.emotions.map((entry) => ({ ...entry, meta: emotions.find((emotion) => emotion.value === entry.emotion) })) ?? [];
  return <>
    <PageHeader eyebrow={displayDate(date, true)} title="오늘의 흐름" action={<button className="primary" onClick={onAdd}>＋ 일정 추가</button>} />
    <section className="summary-strip"><div><small>오늘 일정</small><strong>{schedules.length}<em>개</em></strong><p>{schedules.filter((s) => s.status === "done").length}개 완료했어요</p></div><div><small>오늘 지출</small><strong>{money(total)}</strong><p>{transactions.filter((t) => t.type === "expense").length}건의 지출</p></div><button className="emotion-summary" onClick={onDiary}><small>오늘의 감정</small>{diaryEmotions.length ? <><strong>{diaryEmotions.map(({ meta }) => meta?.emoji).join(" ")} {diaryEmotions.map(({ meta }) => meta?.label).filter(Boolean).join(", ")}</strong><p>{diaryEmotions.map(({ intensity }) => `강도 ${intensity}`).join(" · ")} · 기록 보기 →</p></> : <><strong>아직 비어 있어요</strong><p>지금 마음 기록하기 →</p></>}</button></section>
    <div className="two-column"><section><div className="section-title"><div><h2>오늘의 일정</h2><span>{schedules.length}개의 약속과 할 일</span></div></div><div className="timeline">
      {schedules.length === 0 && <Empty icon="☼" title="아직 일정이 없어요" text="오늘 하고 싶은 일을 가볍게 적어보세요." action="첫 일정 만들기" onClick={onAdd} />}
      {schedules.map((s) => {
        const actual = transactions.find((transaction) => transaction.source === "schedule_actual" && transaction.scheduleId === s.id);
        const shownTime = s.status === "done" && s.actualStartTime ? s.actualStartTime : s.startTime;
        return <article className={`schedule-card ${s.status}`} key={s.id}><time>{formatTime(shownTime)}</time><div className="time-line"><i /></div><div className="schedule-body"><div className="schedule-top"><span className={`status ${s.status}`}>{statusMap[s.status]}</span><button className="more" onClick={() => onMenu(menuId === s.id ? null : s.id)}>•••</button></div><h3>{s.title}</h3><p>{[s.place && `⌖ ${s.place}`, s.people && `◌ ${s.people}`].filter(Boolean).join(" · ") || s.memo || "세부 정보 없음"}</p>{s.status === "done" && s.actualDate && <small className="actual-schedule-meta">실제 {displayDate(s.actualDate)} · {formatTime(s.actualStartTime)}–{formatTime(s.actualEndTime)}</small>}{mapHref(s) && <a className="map-link" href={mapHref(s)} target="_blank" rel="noreferrer">지도에서 보기 ↗</a>}<div className="cost-row"><span>{actual ? `예상 ${money(s.expectedCost)} · 실제 ${money(actual.amount)}` : `예상 ${money(s.expectedCost)}`}</span><button onClick={() => onActual(s)}>{actual ? "실제 지출 수정" : "실제 지출 입력"}</button></div>{menuId === s.id && <div className="context-menu"><button onClick={() => onStatus(s, "done")}>✓ 완료</button><button onClick={() => onStatus(s, "partial")}>◐ 일부 완료</button><button onClick={() => onStatus(s, "cancelled")}>× 취소</button><button onClick={() => onEdit(s)}>수정</button><button className="danger" onClick={() => onDelete(s.id)}>삭제</button></div>}</div></article>;
      })}
    </div></section><aside className="right-panel"><section className="reflection-card"><p>DAILY RECORD</p><h2>{records[0]?.title ?? "오늘의 작은 순간"}</h2><blockquote>{records[0]?.content ?? "큰 일정 사이에 있었던 생각과 순간도 자유롭게 남겨보세요."}</blockquote><button onClick={onRecords}>{records.length ? `기록 ${records.length}개 보기` : "하루 기록 쓰기"}<span>→</span></button></section><section className="mini-ledger"><div className="section-title"><div><h2>오늘의 지출</h2><span>일정과 연결된 소비</span></div></div>{transactions.length === 0 ? <p className="muted">아직 기록된 거래가 없어요.</p> : transactions.map((t) => <div className="tx-mini" key={t.id}><span>{t.category.slice(0, 1)}</span><div><b>{t.title}</b><small>{t.category}{t.scheduleId ? " · 일정 연결" : ""}</small></div><strong className={t.type}>{t.type === "expense" ? "−" : "+"}{money(t.amount)}</strong></div>)}</section></aside></div>
  </>;
}

export function CalendarView({ cursor, setCursor, data, selectedDate, onSelect, onAdd, onEdit, onDelete }: {
  cursor: Date;
  setCursor: (date: Date) => void;
  data: AppData;
  selectedDate: string;
  onSelect: (date: string) => void;
  onAdd: (date: string) => void;
  onEdit: (schedule: Schedule) => void;
  onDelete: (id: string) => void;
}) {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const cells = [
    ...Array(new Date(year, month, 1).getDay()).fill(null),
    ...Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, index) => index + 1),
  ];
  const holidays = koreanHolidays[`y${year}`] ?? {};
  const selectedSchedules = data.schedules.filter((schedule) => schedule.date === selectedDate);
  const diary = data.diaries.find((item) => item.date === selectedDate);
  const recordCount = data.dailyRecords.filter((record) => record.date === selectedDate).length;
  const dayExpense = data.transactions
    .filter((transaction) => transaction.date === selectedDate && transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return <>
    <PageHeader
      eyebrow="한눈에 보는 기록"
      title={`${year}년 ${month + 1}월`}
      action={<div className="header-actions">
        <button className="icon-button" onClick={() => setCursor(new Date(year, month - 1, 1))}>‹</button>
        <button className="ghost" onClick={() => setCursor(new Date())}>이번 달</button>
        <button className="icon-button" onClick={() => setCursor(new Date(year, month + 1, 1))}>›</button>
      </div>}
    />
    <div className="calendar-layout">
      <section className="calendar-card">
        <div className="weekdays">{["일", "월", "화", "수", "목", "금", "토"].map((day) => <b key={day}>{day}</b>)}</div>
        <div className="calendar-grid">{cells.map((day, index) => {
          if (!day) return <div className="day-cell empty-day" key={`empty-${index}`} />;
          const key = `${year}-${pad(month + 1)}-${pad(day)}`;
          const schedules = data.schedules.filter((schedule) => schedule.date === key);
          const dayEmotion = strongestEmotion(data.diaries.find((diaryItem) => diaryItem.date === key));
          const hasRecord = data.dailyRecords.some((record) => record.date === key);
          const holidayName = holidays[key]?.join(", ");
          const isSunday = new Date(year, month, day).getDay() === 0;
          return <button
            key={key}
            className={`day-cell ${key === selectedDate ? "selected" : ""} ${key === dateKey() ? "today" : ""} ${holidayName || isSunday ? "holiday" : ""}`}
            onClick={() => onSelect(key)}
            aria-label={holidayName ? `${key} ${holidayName}` : key}
          >
            <div className="day-heading"><span>{day}</span>{holidayName && <b>{holidayName}</b>}</div>
            {dayEmotion && <i title={dayEmotion.label}>{dayEmotion.emoji}</i>}
            <div className="day-schedules">{schedules.slice(0, 2).map((schedule) => <small key={schedule.id} className={schedule.status}>{formatTime(schedule.startTime)} {schedule.title}</small>)}</div>
            {hasRecord && <em>✎</em>}
          </button>;
        })}</div>
      </section>
      <aside className="date-detail">
        <p>{displayDate(selectedDate)}</p>
        <h2>{strongestEmotion(diary)?.emoji ?? "선택한 날"}</h2>
        <div className="detail-stat"><span>일정</span><b>{selectedSchedules.length}개</b></div>
        <div className="detail-stat"><span>하루 기록</span><b>{recordCount}개</b></div>
        <div className="detail-stat"><span>지출</span><b>{money(dayExpense)}</b></div>
        <div className="detail-list">
          {selectedSchedules.length === 0 && <p className="muted">이 날짜에는 일정이 없어요.</p>}
          {selectedSchedules.map((schedule) => <div className="detail-schedule" key={schedule.id}>
            <time>{formatTime(schedule.startTime)}</time>
            <span>{schedule.title}<small>{schedule.place || statusMap[schedule.status]}</small></span>
            <div className="detail-actions">
              <button onClick={() => onEdit(schedule)}>수정</button>
              <button onClick={() => onDelete(schedule.id)}>삭제</button>
            </div>
          </div>)}
        </div>
        <button className="primary full" onClick={() => onAdd(selectedDate)}>＋ 이 날짜에 일정 추가</button>
      </aside>
    </div>
  </>;
}

function repeatLabel(transaction: Transaction) {
  if (!transaction.fixed) return "변동";
  if (transaction.repeatFrequency === "yearly") return `매년 ${transaction.repeatMonth}월 ${transaction.repeatDay}일`;
  if (transaction.repeatFrequency === "monthly") return `매월 ${transaction.repeatDay}일`;
  if (transaction.repeatFrequency === "weekly") return "매주";
  if (transaction.repeatFrequency === "daily") return "매일";
  return "고정";
}

export function LedgerView({ cursor, setCursor, transactions, schedules, income, expense, expected, onAdd, onEdit, onDelete }: { cursor: Date; setCursor: (d: Date) => void; transactions: Transaction[]; schedules: Schedule[]; income: number; expense: number; expected: number; onAdd: () => void; onEdit: (t: Transaction) => void; onDelete: (id: string) => void }) {
  const year = cursor.getFullYear(), month = cursor.getMonth();
  const [typeFilter, setTypeFilter] = useState<"all" | Transaction["type"]>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [query, setQuery] = useState("");
  const categories = [...new Set(transactions.map((transaction) => transaction.category))].sort();
  const normalizedQuery = query.trim().toLocaleLowerCase("ko");
  const filtered = transactions.filter((transaction) =>
    (typeFilter === "all" || transaction.type === typeFilter)
    && (categoryFilter === "all" || transaction.category === categoryFilter)
    && (!normalizedQuery || `${transaction.title} ${transaction.memo} ${transaction.category}`.toLocaleLowerCase("ko").includes(normalizedQuery))
  );
  const categoryTotals = Object.entries(filtered.filter((transaction) => transaction.type === "expense").reduce<Record<string, number>>((totals, transaction) => {
    totals[transaction.category] = (totals[transaction.category] ?? 0) + transaction.amount;
    return totals;
  }, {})).sort(([, a], [, b]) => b - a);
  const maxCategory = categoryTotals[0]?.[1] ?? 1;
  const actualScheduleIds = new Set(transactions.filter((transaction) => transaction.source === "schedule_actual" && transaction.scheduleId).map((transaction) => transaction.scheduleId));
  const expectedSchedules = schedules.filter((schedule) => schedule.status !== "cancelled" && schedule.expectedCost > 0 && !actualScheduleIds.has(schedule.id));
  const scheduleActual = transactions.filter((transaction) => transaction.source === "schedule_actual").reduce((sum, transaction) => sum + transaction.amount, 0);
  const plannedAll = schedules.filter((schedule) => schedule.status !== "cancelled").reduce((sum, schedule) => sum + schedule.expectedCost, 0);

  return <>
    <PageHeader eyebrow="돈의 흐름" title={`${year}년 ${month + 1}월 가계부`} action={<div className="header-actions"><button className="icon-button" onClick={() => setCursor(new Date(year, month - 1, 1))}>‹</button><button className="primary" onClick={onAdd}>＋ 거래 추가</button><button className="icon-button" onClick={() => setCursor(new Date(year, month + 1, 1))}>›</button></div>} />
    <section className="money-summary"><div><small>이번 달 수입</small><strong className="income">+ {money(income)}</strong></div><div className="expense-total"><small>이번 달 지출</small><strong>− {money(expense)}</strong><p>아직 남은 예상 지출 {money(expected)}</p></div><div className="balance"><small>남은 금액</small><strong>{money(income - expense)}</strong><p>일정 예상 {money(plannedAll)} · 실제 {money(scheduleActual)}</p></div></section>
    <section className="ledger-tools" aria-label="거래 검색과 필터"><input aria-label="거래 검색" placeholder="내용, 메모, 카테고리 검색" value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="수입 지출 필터" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}><option value="all">수입·지출 전체</option><option value="expense">지출만</option><option value="income">수입만</option></select><select aria-label="카테고리 필터" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}><option value="all">모든 카테고리</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></section>
    <div className="ledger-grid"><section><div className="section-title"><div><h2>거래 내역</h2><span>{filtered.length}건 · 실제로 발생한 금액</span></div></div>{filtered.length === 0 && <Empty icon="₩" title="조건에 맞는 거래가 없어요" text="필터를 바꾸거나 새 거래를 기록해 보세요." action="거래 기록하기" onClick={onAdd} />}{[...filtered].sort((a, b) => b.date.localeCompare(a.date)).map((transaction) => <article className="transaction-row" key={transaction.id}><time><b>{Number(transaction.date.slice(-2))}</b><small>{new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(new Date(`${transaction.date}T00:00:00`))}</small></time><span className="category-icon">{transaction.category.slice(0, 1)}</span><div><h3>{transaction.title}</h3><p>{transaction.category} · {repeatLabel(transaction)}{transaction.source === "schedule_actual" ? " · 일정 실제 지출" : transaction.scheduleId ? " · 일정 연결" : ""}</p>{transaction.memo && <small className="transaction-memo">{transaction.memo}</small>}</div><strong className={transaction.type}>{transaction.type === "expense" ? "−" : "+"}{money(transaction.amount)}</strong><button onClick={() => onEdit(transaction)}>수정</button><button className="delete-inline" onClick={() => onDelete(transaction.id)}>×</button></article>)}</section>
      <aside className="ledger-insights"><section className="expected-list"><div className="section-title"><div><h2>예상 지출</h2><span>실제 지출 전 · 취소 일정 제외</span></div></div>{expectedSchedules.length === 0 && <p className="muted">남아 있는 예상 지출이 없어요.</p>}{expectedSchedules.map((schedule) => <div key={schedule.id}><span><b>{schedule.title}</b><small>{displayDate(schedule.date)} · {statusMap[schedule.status]}</small></span><strong>{money(schedule.expectedCost)}</strong></div>)}</section><section className="category-summary"><div className="section-title"><div><h2>카테고리별 지출</h2><span>현재 필터 기준</span></div></div>{categoryTotals.length === 0 && <p className="muted">표시할 지출이 없어요.</p>}{categoryTotals.map(([category, total]) => <div key={category}><p><span>{category}</span><b>{money(total)}</b></p><i><span style={{ width: `${Math.max(5, total / maxCategory * 100)}%` }} /></i></div>)}</section></aside>
    </div>
  </>;
}

export function StatsView({ cursor, setCursor, data }: { cursor: Date; setCursor: (date: Date) => void; data: AppData }) {
  const year = cursor.getFullYear(), month = cursor.getMonth();
  const prefix = `${year}-${pad(month + 1)}`;
  const transactions = data.transactions.filter((transaction) => transaction.date.startsWith(prefix));
  const schedules = data.schedules.filter((schedule) => schedule.date.startsWith(prefix));
  const diaries = data.diaries.filter((diary) => diary.date.startsWith(prefix));
  const expense = transactions.filter((transaction) => transaction.type === "expense").reduce((sum, transaction) => sum + transaction.amount, 0);
  const income = transactions.filter((transaction) => transaction.type === "income").reduce((sum, transaction) => sum + transaction.amount, 0);
  const activeSchedules = schedules.filter((schedule) => schedule.status !== "cancelled");
  const completedSchedules = activeSchedules.filter((schedule) => schedule.status === "done");
  const completionRate = activeSchedules.length ? Math.round(completedSchedules.length / activeSchedules.length * 100) : 0;
  const planned = activeSchedules.reduce((sum, schedule) => sum + schedule.expectedCost, 0);
  const actual = transactions.filter((transaction) => transaction.source === "schedule_actual").reduce((sum, transaction) => sum + transaction.amount, 0);
  const categories = Object.entries(transactions.filter((transaction) => transaction.type === "expense").reduce<Record<string, number>>((totals, transaction) => {
    totals[transaction.category] = (totals[transaction.category] ?? 0) + transaction.amount;
    return totals;
  }, {})).sort(([, a], [, b]) => b - a);
  const maxCategory = categories[0]?.[1] ?? 1;
  const emotionStats = emotions.map((emotion) => {
    const entries = diaries.flatMap((diary) => diary.emotions.filter((entry) => entry.emotion === emotion.value));
    return { ...emotion, count: entries.length, average: entries.length ? entries.reduce((sum, entry) => sum + entry.intensity, 0) / entries.length : 0 };
  }).filter((emotion) => emotion.count > 0).sort((a, b) => b.count - a.count || b.average - a.average);
  const diaryDates = new Set(diaries.map((diary) => diary.date));
  const diaryDaySpend = transactions.filter((transaction) => diaryDates.has(transaction.date) && transaction.type === "expense").reduce((sum, transaction) => sum + transaction.amount, 0);
  const averageDiarySpend = diaries.length ? Math.round(diaryDaySpend / diaries.length) : 0;

  return <><PageHeader eyebrow="한 달 돌아보기" title={`${year}년 ${month + 1}월 통계`} action={<div className="header-actions"><button className="icon-button" onClick={() => setCursor(new Date(year, month - 1, 1))}>‹</button><button className="icon-button" onClick={() => setCursor(new Date(year, month + 1, 1))}>›</button></div>} />
    <section className="stats-cards"><div><small>일정 완료율</small><strong>{completionRate}%</strong><p>{completedSchedules.length}/{activeSchedules.length}개 완료</p></div><div><small>수입과 지출</small><strong className={income - expense >= 0 ? "income" : ""}>{money(income - expense)}</strong><p>수입 {money(income)} · 지출 {money(expense)}</p></div><div><small>일정 비용 차이</small><strong>{money(actual - planned)}</strong><p>예상 {money(planned)} · 실제 {money(actual)}</p></div><div><small>일기 쓴 날 평균 지출</small><strong>{money(averageDiarySpend)}</strong><p>감정 일기 {diaries.length}일 기준</p></div></section>
    <div className="stats-grid"><section className="stats-panel"><div className="section-title"><div><h2>카테고리별 지출</h2><span>많이 쓴 순서</span></div></div>{categories.length === 0 && <p className="muted">이번 달 지출이 없어요.</p>}{categories.map(([category, total]) => <div className="stats-bar" key={category}><p><span>{category}</span><b>{money(total)}</b></p><i><span style={{ width: `${Math.max(4, total / maxCategory * 100)}%` }} /></i></div>)}</section><section className="stats-panel"><div className="section-title"><div><h2>감정 흐름</h2><span>기록 횟수와 평균 강도</span></div></div>{emotionStats.length === 0 && <p className="muted">이번 달 감정 일기가 없어요.</p>}{emotionStats.map((emotion) => <div className="emotion-stat" key={emotion.value}><span>{emotion.emoji}</span><div><b>{emotion.label}</b><small>{emotion.count}회 기록</small></div><strong>{emotion.average.toFixed(1)}/5</strong></div>)}</section></div>
  </>;
}

export function RecordsView({ date, onDate, records, schedules, onAdd, onEdit, onDelete }: { date: string; onDate: (d: string) => void; records: DailyRecord[]; schedules: Schedule[]; onAdd: () => void; onEdit: (r: DailyRecord) => void; onDelete: (id: string) => void }) {
  return <><PageHeader eyebrow="작은 순간까지" title="하루 기록" action={<div className="header-actions"><DateNavigator date={date} onDate={onDate} /><button className="primary" onClick={onAdd}>＋ 기록 추가</button></div>} /><div className="records-layout"><section><div className="section-title"><div><h2>{displayDate(date, true)}</h2><span>감정과 상관없이 자유롭게 남기는 기록</span></div></div>{records.length === 0 && <Empty icon="✎" title="아직 하루 기록이 없어요" text="먹은 것, 떠오른 생각, 우연히 만난 장면처럼 작은 순간을 남겨보세요." action="첫 기록 쓰기" onClick={onAdd} />}{records.map((record) => <article className="record-card" key={record.id}><time>{record.time || "하루"}</time><div><h3>{record.title}</h3><p>{record.content}</p>{record.scheduleId && <small>연결 일정 · {schedules.find((s) => s.id === record.scheduleId)?.title ?? "삭제된 일정"}</small>}<div className="record-actions"><button onClick={() => onEdit(record)}>수정</button><button onClick={() => onDelete(record.id)}>삭제</button></div></div></article>)}</section><aside className="record-guide"><p>하루 기록은</p><h2>감정 일기와 달라요</h2><span>감정 일기는 하루의 대표 감정과 원인을 돌아보는 공간이고, 하루 기록은 시간대별로 여러 개 작성할 수 있는 자유로운 메모예요.</span><ul><li>점심에 먹은 음식</li><li>기억하고 싶은 대화</li><li>갑자기 떠오른 생각</li><li>일정 중 있었던 세부 내용</li></ul></aside></div></>;
}

export function DiaryView({ date, onDate, diary, schedules, transactions, userId, onSave, onAddUnplanned }: { date: string; onDate: (d: string) => void; diary?: EmotionDiary; schedules: Schedule[]; transactions: Transaction[]; userId: string; onSave: (d: EmotionDiary) => void; onAddUnplanned: () => void }) {
  const [draft, setDraft] = useState<EmotionDiary>(diary ?? { id: "", userId, date, emotions: [{ emotion: "calm", intensity: 3 }], cause: "", note: "" });
  const spent = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const toggleEmotion = (emotion: string) => setDraft((current) => ({
    ...current,
    emotions: current.emotions.some((entry) => entry.emotion === emotion)
      ? current.emotions.filter((entry) => entry.emotion !== emotion)
      : [...current.emotions, { emotion, intensity: 3 }],
  }));
  const setIntensity = (emotion: string, intensity: number) => setDraft((current) => ({
    ...current,
    emotions: current.emotions.map((entry) => entry.emotion === emotion ? { ...entry, intensity } : entry),
  }));

  return <>
    <PageHeader eyebrow="마음의 결" title="감정 일기" action={<DateNavigator date={date} onDate={onDate} />} />
    <div className="diary-layout">
      <form className="diary-form" onSubmit={(event) => { event.preventDefault(); if (draft.emotions.length) onSave({ ...draft, date }); }}>
        <p className="step-label">STEP 01</p>
        <h2>오늘 느낀 감정을 모두 골라보세요</h2>
        <div className="emotion-picker">{emotions.map((emotion) => {
          const selected = draft.emotions.some((entry) => entry.emotion === emotion.value);
          return <button type="button" key={emotion.value} aria-pressed={selected} className={selected ? "selected" : ""} style={{ "--emotion": emotion.color } as React.CSSProperties} onClick={() => toggleEmotion(emotion.value)}><span>{emotion.emoji}</span><b>{emotion.label}</b></button>;
        })}</div>
        {draft.emotions.length > 0 ? <div className="emotion-intensity-list">{draft.emotions.map((entry) => {
          const meta = emotions.find((emotion) => emotion.value === entry.emotion);
          return <div className="emotion-intensity-row" key={entry.emotion}><label><span>{meta?.emoji} {meta?.label}</span><b>강도 {entry.intensity}/5</b></label><input aria-label={`${meta?.label ?? entry.emotion} 감정 강도`} type="range" min="1" max="5" value={entry.intensity} onChange={(event) => setIntensity(entry.emotion, Number(event.target.value))} /><div><span>은은하게</span><span>아주 강하게</span></div></div>;
        })}</div> : <p className="emotion-empty-hint">한 가지 이상의 감정을 선택해 주세요.</p>}
        <p className="step-label">STEP 02</p>
        <label className="field"><span>이 감정들은 어디에서 왔나요?</span><textarea rows={3} value={draft.cause} onChange={(e) => setDraft({ ...draft, cause: e.target.value })} placeholder="상황, 사람, 생각을 적어보세요" /></label>
        <label className="field"><span>하루를 돌아보며</span><textarea rows={6} value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="오늘의 마음을 짧게 정리해보세요" /></label>
        <button className="primary save-diary" disabled={!draft.emotions.length}>감정 일기 저장</button>
      </form>
      <aside className="day-context"><p>DAY CONTEXT</p><h2>{displayDate(date)}</h2><div className="context-summary"><span><b>{schedules.length}</b> 일정</span><span><b>{money(spent)}</b> 지출</span></div><div className="check-list">{schedules.map((s) => <div key={s.id}><span className={`check ${s.status}`}>{s.status === "done" ? "✓" : s.status === "cancelled" ? "×" : ""}</span><div><b>{s.title}</b><small>{formatTime(s.startTime)} · {statusMap[s.status]}</small></div></div>)}</div><button className="text-button" onClick={onAddUnplanned}>＋ 예정에 없던 활동 추가</button></aside>
    </div>
  </>;
}

function profileDate(value?: string) {
  if (!value) return "기록 없음";
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
}

export function ProfileView({ data, setData, onToast, onOpenSettings }: { data: AppData; setData: (data: AppData) => void; onToast: (message: string) => void; onOpenSettings: () => void }) {
  const [name, setName] = useState(data.user.name);
  const [saving, setSaving] = useState(false);
  const recordDates = new Set([
    ...data.schedules.map((item) => item.date),
    ...data.transactions.map((item) => item.date),
    ...data.diaries.map((item) => item.date),
    ...data.dailyRecords.map((item) => item.date),
  ]);
  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    const displayName = name.trim();
    if (!displayName) return onToast("이름을 입력해 주세요");
    if (displayName.length > 30) return onToast("이름은 30자 이내로 입력해 주세요");
    if (/[<>]/.test(displayName)) return onToast("이름에 사용할 수 없는 문자가 포함되어 있어요");
    if (displayName === data.user.name) return onToast("변경된 이름이 없어요");
    setSaving(true);
    try {
      const { error } = await getSupabase()!.auth.updateUser({ data: { display_name: displayName } });
      if (error) return onToast(error.message);
      setData({ ...data, user: { ...data.user, name: displayName } });
      onToast("프로필 이름을 변경했어요");
    } catch (error) {
      onToast(error instanceof Error ? error.message : "프로필을 변경하지 못했어요");
    } finally {
      setSaving(false);
    }
  };

  return <><PageHeader eyebrow="나의 온결" title="프로필" /><div className="profile-layout">
    <section className="profile-hero"><div className="profile-avatar" aria-hidden="true">{data.user.name.slice(0, 1).toUpperCase()}</div><span className="profile-badge">PERSONAL ARCHIVE</span><h2>{data.user.name}</h2><p>{data.user.email}</p><div className="profile-counts"><span><b>{data.schedules.length}</b>일정</span><span><b>{data.transactions.length}</b>거래</span><span><b>{data.diaries.length}</b>감정 일기</span><span><b>{data.dailyRecords.length}</b>하루 기록</span></div></section>
    <div className="profile-details"><section className="profile-card"><div className="section-title"><div><h2>기본 정보</h2><span>기록에 표시되는 나의 이름</span></div></div><form className="profile-name-form" onSubmit={saveProfile}><label className="field"><span>이름</span><input value={name} maxLength={30} onChange={(event) => setName(event.target.value)} /></label><button className="primary" disabled={saving}>{saving ? "저장 중…" : "변경사항 저장"}</button></form><div className="profile-account"><span><small>로그인 이메일</small><b>{data.user.email}</b></span><span><small>온결을 시작한 날</small><b>{profileDate(data.user.createdAt)}</b></span><span><small>최근 로그인</small><b>{profileDate(data.user.lastSignInAt)}</b></span></div></section>
    <section className="profile-card profile-history"><div><p>기록한 날짜</p><strong>{recordDates.size}<small>일</small></strong><span>일정, 소비, 감정과 작은 순간을 남긴 날이에요.</span></div><button className="ghost" onClick={onOpenSettings}>계정 및 보안 설정</button></section></div>
  </div></>;
}
export function SettingsView({ data, setData, onToast }: { data: AppData; setData: (d: AppData) => void; onToast: (s: string) => void }) {
  const [hasLegacy, setHasLegacy] = useState(() => typeof window !== "undefined" && Boolean(localStorage.getItem(LEGACY_STORE_KEY)));
  const [email, setEmail] = useState(data.user.email);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [deletePhrase, setDeletePhrase] = useState("");
  const download = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const anchor = document.createElement("a"); anchor.href = URL.createObjectURL(blob); anchor.download = `ongyeol-backup-${dateKey()}.json`; anchor.click(); URL.revokeObjectURL(anchor.href);
  };
  const importData = async (source: Partial<AppData>) => {
    const schedules = (source.schedules ?? []).map((s) => ({
      ...s, id: newId(), userId: data.user.id, address: s.address ?? "",
      actualDate: s.actualDate ?? "", actualStartTime: s.actualStartTime ?? "", actualEndTime: s.actualEndTime ?? "",
      completedAt: s.completedAt ?? null, isRecurring: s.isRecurring ?? false,
      repeatFrequency: s.repeatFrequency ?? null, repeatEndDate: s.repeatEndDate ?? null, seriesId: null,
    }));
    const transactions = (source.transactions ?? []).map((t) => ({
      ...t, id: newId(), userId: data.user.id, memo: t.memo ?? "", source: t.source ?? "manual",
      scheduleId: undefined, repeatFrequency: t.repeatFrequency ?? null, repeatMonth: t.repeatMonth ?? null,
      repeatDay: t.repeatDay ?? null, repeatEndDate: t.repeatEndDate ?? null, seriesId: null,
    }));
    const diaries = (source.diaries ?? []).map((d) => {
      const legacy = d as EmotionDiary & { emotion?: string; intensity?: number };
      return {
        ...d,
        id: newId(),
        userId: data.user.id,
        emotions: d.emotions?.length ? d.emotions : [{ emotion: legacy.emotion ?? "calm", intensity: legacy.intensity ?? 3 }],
      };
    });
    const records = (source.dailyRecords ?? []).map((r) => ({ ...r, id: newId(), userId: data.user.id, scheduleId: undefined }));
    await Promise.all([...schedules.map(upsertSchedule), ...transactions.map(upsertTransaction), ...diaries.map(upsertDiary), ...records.map(upsertDailyRecord)]);
    const refreshed = await loadHaruData((await getSupabase()!.auth.getUser()).data.user!); setData(refreshed); onToast("기록을 계정으로 가져왔어요");
  };
  const restore = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file) return;
    try { await importData(JSON.parse(await file.text())); } catch (error) { onToast(error instanceof Error ? error.message : "백업 파일을 읽지 못했어요"); }
  };
  const importLegacy = async () => {
    try { const raw = localStorage.getItem(LEGACY_STORE_KEY); if (!raw) return; await importData(JSON.parse(raw)); localStorage.removeItem(LEGACY_STORE_KEY); setHasLegacy(false); }
    catch (error) { onToast(error instanceof Error ? error.message : "로컬 기록을 가져오지 못했어요"); }
  };
  const updateEmail = async (event: FormEvent) => {
    event.preventDefault();
    const client = getSupabase();
    if (!client || !email.trim() || email.trim() === data.user.email) return;
    const { error } = await client.auth.updateUser({ email: email.trim() });
    onToast(error ? error.message : "새 이메일의 확인 안내를 확인해 주세요");
  };
  const updatePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8) return onToast("비밀번호는 8자 이상 입력해 주세요");
    if (password !== passwordConfirm) return onToast("비밀번호 확인이 일치하지 않아요");
    const { error } = await getSupabase()!.auth.updateUser({ password });
    if (!error) { setPassword(""); setPasswordConfirm(""); }
    onToast(error ? error.message : "비밀번호를 변경했어요");
  };
  const signOutOthers = async () => {
    const { error } = await getSupabase()!.auth.signOut({ scope: "others" });
    onToast(error ? error.message : "다른 기기의 세션을 종료했어요");
  };
  const deleteAccount = async () => {
    if (deletePhrase !== "계정 삭제" || !window.confirm("계정과 모든 기록을 영구 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) return;
    try { await deleteMyAccount(); await getSupabase()!.auth.signOut({ scope: "local" }); }
    catch (error) { onToast(error instanceof Error ? error.message : "계정을 삭제하지 못했어요"); }
  };
  return <><PageHeader eyebrow="나의 하루 관리" title="설정" /><div className="settings-grid">
    <section className="settings-card"><span className="settings-icon">⇩</span><div><h2>데이터 백업</h2><p>현재 계정의 일정, 거래, 감정 일기, 하루 기록을 JSON 파일로 내려받습니다.</p><button className="primary" onClick={download}>백업 다운로드</button></div></section>
    <section className="settings-card"><span className="settings-icon">⇧</span><div><h2>데이터 가져오기</h2><p>백업 파일의 기록을 현재 로그인한 계정에 추가합니다.</p><label className="file-button">JSON 파일 선택<input type="file" accept="application/json" onChange={restore} /></label></div></section>
    {hasLegacy && <section className="settings-card legacy-import"><span className="settings-icon">↻</span><div><h2>기존 로컬 기록 발견</h2><p>이 브라우저에 저장되어 있던 예전 하루 기록을 현재 계정으로 옮길 수 있어요.</p><button className="primary" onClick={importLegacy}>내 계정으로 가져오기</button></div></section>}
    <section className="settings-card account-card"><span className="settings-icon">@</span><div><h2>이메일 변경</h2><p>로그인에 사용하는 이메일을 변경합니다. 설정에 따라 기존 이메일과 새 이메일의 확인이 필요할 수 있어요.</p><form className="account-form" onSubmit={updateEmail}><label className="field"><span>새 이메일</span><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label><button className="ghost">변경 요청</button></form></div></section>
    <section className="settings-card account-card"><span className="settings-icon">＊</span><div><h2>비밀번호 변경</h2><p>8자 이상의 새 비밀번호를 입력해 주세요.</p><form className="account-form" onSubmit={updatePassword}><label className="field"><span>새 비밀번호</span><input type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label><label className="field"><span>새 비밀번호 확인</span><input type="password" minLength={8} required value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.target.value)} /></label><button className="ghost">비밀번호 변경</button></form></div></section>
    <section className="settings-card privacy"><span className="settings-icon">◎</span><div><h2>계정과 개인정보</h2><p><b>{data.user.email}</b> 계정으로 로그인되어 있습니다. 모든 기록은 사용자 ID로 분리되고 데이터베이스 보안 정책으로 보호됩니다.</p><div className="data-count"><span>일정 <b>{data.schedules.length}</b></span><span>거래 <b>{data.transactions.length}</b></span><span>감정 일기 <b>{data.diaries.length}</b></span><span>하루 기록 <b>{data.dailyRecords.length}</b></span></div><div className="session-actions"><button className="ghost" onClick={signOutOthers}>다른 기기 로그아웃</button><button className="text-button signout" onClick={() => getSupabase()?.auth.signOut({ scope: "local" })}>현재 기기 로그아웃</button></div></div></section>
    <section className="settings-card danger-zone"><span className="settings-icon">!</span><div><h2>계정 삭제</h2><p>계정과 일정, 거래, 감정 일기, 하루 기록을 모두 영구 삭제합니다. 실행 전 <b>계정 삭제</b>를 입력해 주세요.</p><div className="delete-account"><input aria-label="계정 삭제 확인 문구" placeholder="계정 삭제" value={deletePhrase} onChange={(event) => setDeletePhrase(event.target.value)} /><button disabled={deletePhrase !== "계정 삭제"} onClick={deleteAccount}>계정과 기록 삭제</button></div></div></section>
  </div></>;
}

