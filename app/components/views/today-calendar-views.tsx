"use client";

import { useState } from "react";
import type {
  AppData,
  DailyRecord,
  EmotionDiary,
  Schedule,
  ScheduleStatus,
  Transaction,
} from "../../../lib/types";
import { Empty, PageHeader } from "../common";
import { DayScheduler } from "../day-scheduler";
import {
  dateKey,
  displayDate,
  emotions,
  formatTime,
  koreanHolidays,
  mapHref,
  money,
  pad,
  statusMap,
  strongestEmotion,
} from "../ui-helpers";
export function TodayView({
  date,
  schedules,
  transactions,
  diary,
  records,
  onAdd,
  onEdit,
  onMenu,
  menuId,
  onDelete,
  onStatus,
  onActual,
  onDiary,
  onRecords,
}: {
  date: string;
  schedules: Schedule[];
  transactions: Transaction[];
  diary?: EmotionDiary;
  records: DailyRecord[];
  onAdd: () => void;
  onEdit: (s: Schedule) => void;
  onMenu: (id: string | null) => void;
  menuId: string | null;
  onDelete: (id: string) => void;
  onStatus: (s: Schedule, status: ScheduleStatus) => void;
  onActual: (s: Schedule) => void;
  onDiary: () => void;
  onRecords: () => void;
}) {
  const total = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const diaryEmotions =
    diary?.emotions.map((entry) => ({
      ...entry,
      meta: emotions.find((emotion) => emotion.value === entry.emotion),
    })) ?? [];
  return (
    <>
      <PageHeader
        eyebrow={displayDate(date, true)}
        title="오늘의 흐름"
        action={
          <button className="primary" onClick={onAdd}>
            ＋ 일정 추가
          </button>
        }
      />
      <section className="summary-strip">
        <div>
          <small>오늘 일정</small>
          <strong>
            {schedules.length}
            <em>개</em>
          </strong>
          <p>
            {schedules.filter((s) => s.status === "done").length}개 완료했어요
          </p>
        </div>
        <div>
          <small>오늘 지출</small>
          <strong>{money(total)}</strong>
          <p>
            {transactions.filter((t) => t.type === "expense").length}건의 지출
          </p>
        </div>
        <button className="emotion-summary" onClick={onDiary}>
          <small>오늘의 감정</small>
          {diaryEmotions.length ? (
            <>
              <strong>
                {diaryEmotions.map(({ meta }) => meta?.emoji).join(" ")}{" "}
                {diaryEmotions
                  .map(({ meta }) => meta?.label)
                  .filter(Boolean)
                  .join(", ")}
              </strong>
              <p>
                {diaryEmotions
                  .map(({ intensity }) => `강도 ${intensity}`)
                  .join(" · ")}{" "}
                · 기록 보기 →
              </p>
            </>
          ) : (
            <>
              <strong>아직 비어 있어요</strong>
              <p>지금 마음 기록하기 →</p>
            </>
          )}
        </button>
      </section>
      <div className="two-column">
        <section>
          <div className="section-title">
            <div>
              <h2>오늘의 일정</h2>
              <span>{schedules.length}개의 약속과 할 일</span>
            </div>
          </div>
          <div className="timeline">
            {schedules.length === 0 && (
              <Empty
                icon="☼"
                title="아직 일정이 없어요"
                text="오늘 하고 싶은 일을 가볍게 적어보세요."
                action="첫 일정 만들기"
                onClick={onAdd}
              />
            )}
            {schedules.map((s) => {
              const actual = transactions.find(
                (transaction) =>
                  transaction.source === "schedule_actual" &&
                  transaction.scheduleId === s.id,
              );
              const shownTime =
                s.status === "done" && s.actualStartTime
                  ? s.actualStartTime
                  : s.startTime;
              return (
                <article
                  className={`schedule-card ${s.status} ${menuId === s.id ? "menu-open" : ""}`}
                  key={s.id}
                >
                  <time>{formatTime(shownTime)}</time>
                  <div className="time-line">
                    <i />
                  </div>
                  <div className="schedule-body">
                    <div className="schedule-top">
                      <span className={`status ${s.status}`}>
                        {statusMap[s.status]}
                      </span>
                      <button
                        className="more"
                        aria-label={`${s.title} 일정 메뉴`}
                        aria-expanded={menuId === s.id}
                        onClick={() => onMenu(menuId === s.id ? null : s.id)}
                      >
                        •••
                      </button>
                    </div>
                    <h3>{s.title}</h3>
                    <p>
                      {[s.place && `⌖ ${s.place}`, s.people && `◌ ${s.people}`]
                        .filter(Boolean)
                        .join(" · ") ||
                        s.memo ||
                        "세부 정보 없음"}
                    </p>
                    {s.status === "done" && s.actualDate && (
                      <small className="actual-schedule-meta">
                        실제 {displayDate(s.actualDate)} ·{" "}
                        {formatTime(s.actualStartTime)}–
                        {formatTime(s.actualEndTime)}
                      </small>
                    )}
                    {mapHref(s) && (
                      <a
                        className="map-link"
                        href={mapHref(s)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        지도에서 보기 ↗
                      </a>
                    )}
                    <div className="cost-row">
                      <span>
                        {actual
                          ? `예상 ${money(s.expectedCost)} · 실제 ${money(actual.amount)}`
                          : `예상 ${money(s.expectedCost)}`}
                      </span>
                      <button onClick={() => onActual(s)}>
                        {actual ? "실제 지출 수정" : "실제 지출 입력"}
                      </button>
                    </div>
                    {menuId === s.id && (
                      <div className="context-menu">
                        <button onClick={() => onStatus(s, "done")}>
                          ✓ 완료
                        </button>
                        <button onClick={() => onStatus(s, "partial")}>
                          ◐ 일부 완료
                        </button>
                        <button onClick={() => onStatus(s, "cancelled")}>
                          × 취소
                        </button>
                        <button onClick={() => onEdit(s)}>수정</button>
                        <button
                          className="danger"
                          onClick={() => onDelete(s.id)}
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
        <aside className="right-panel">
          <section className="reflection-card">
            <p>DAILY RECORD</p>
            <h2>{records[0]?.title ?? "오늘의 작은 순간"}</h2>
            <blockquote>
              {records[0]?.content ??
                "큰 일정 사이에 있었던 생각과 순간도 자유롭게 남겨보세요."}
            </blockquote>
            <button onClick={onRecords}>
              {records.length
                ? `기록 ${records.length}개 보기`
                : "하루 기록 쓰기"}
              <span>→</span>
            </button>
          </section>
          <section className="mini-ledger">
            <div className="section-title">
              <div>
                <h2>오늘의 지출</h2>
                <span>일정과 연결된 소비</span>
              </div>
            </div>
            {transactions.length === 0 ? (
              <p className="muted">아직 기록된 거래가 없어요.</p>
            ) : (
              transactions.map((t) => (
                <div className="tx-mini" key={t.id}>
                  <span>{t.category.slice(0, 1)}</span>
                  <div>
                    <b>{t.title}</b>
                    <small>
                      {t.category}
                      {t.scheduleId ? " · 일정 연결" : ""}
                    </small>
                  </div>
                  <strong className={t.type}>
                    {t.type === "expense" ? "−" : "+"}
                    {money(t.amount)}
                  </strong>
                </div>
              ))
            )}
          </section>
        </aside>
      </div>
    </>
  );
}

export function CalendarView({
  cursor,
  setCursor,
  data,
  selectedDate,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
}: {
  cursor: Date;
  setCursor: (date: Date) => void;
  data: AppData;
  selectedDate: string;
  onSelect: (date: string) => void;
  onAdd: (date: string, startTime?: string, endTime?: string) => void;
  onEdit: (schedule: Schedule) => void;
  onDelete: (id: string) => void;
}) {
  const [mode, setMode] = useState<"month" | "day">("month");
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const cells = [
    ...Array(new Date(year, month, 1).getDay()).fill(null),
    ...Array.from(
      { length: new Date(year, month + 1, 0).getDate() },
      (_, index) => index + 1,
    ),
  ];
  const holidays = koreanHolidays[`y${year}`] ?? {};
  const selectedSchedules = data.schedules.filter(
    (schedule) => schedule.date === selectedDate,
  );
  const diary = data.diaries.find((item) => item.date === selectedDate);
  const recordCount = data.dailyRecords.filter(
    (record) => record.date === selectedDate,
  ).length;
  const dayExpense = data.transactions
    .filter(
      (transaction) =>
        transaction.date === selectedDate && transaction.type === "expense",
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const moveSelectedDate = (amount: number) => {
    const next = new Date(`${selectedDate}T12:00:00`);
    next.setDate(next.getDate() + amount);
    onSelect(dateKey(next));
  };

  return (
    <>
      <PageHeader
        eyebrow={mode === "month" ? "한눈에 보는 기록" : "오늘을 설계하는 시간"}
        title={mode === "month" ? `${year}년 ${month + 1}월` : "일간 스케줄러"}
        action={
          <div className="header-actions">
            <div className="calendar-mode" aria-label="캘린더 보기 방식">
              <button
                className={mode === "month" ? "active" : ""}
                onClick={() => setMode("month")}
              >
                월간
              </button>
              <button
                className={mode === "day" ? "active" : ""}
                onClick={() => setMode("day")}
              >
                일간
              </button>
            </div>
            {mode === "month" ? (
              <>
                <button
                  className="icon-button"
                  aria-label="이전 달"
                  onClick={() => setCursor(new Date(year, month - 1, 1))}
                >
                  ‹
                </button>
                <button className="ghost" onClick={() => setCursor(new Date())}>
                  이번 달
                </button>
                <button
                  className="icon-button"
                  aria-label="다음 달"
                  onClick={() => setCursor(new Date(year, month + 1, 1))}
                >
                  ›
                </button>
              </>
            ) : (
              <>
                <button
                  className="icon-button"
                  aria-label="이전 날짜"
                  onClick={() => moveSelectedDate(-1)}
                >
                  ‹
                </button>
                <button className="ghost" onClick={() => onSelect(dateKey())}>
                  오늘
                </button>
                <button
                  className="icon-button"
                  aria-label="다음 날짜"
                  onClick={() => moveSelectedDate(1)}
                >
                  ›
                </button>
              </>
            )}
          </div>
        }
      />
      {mode === "day" ? (
        <DayScheduler
          date={selectedDate}
          schedules={selectedSchedules}
          onAdd={onAdd}
          onEdit={onEdit}
        />
      ) : (
        <div className="calendar-layout">
          <section className="calendar-card">
            <div className="weekdays">
              {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                <b key={day}>{day}</b>
              ))}
            </div>
            <div className="calendar-grid">
              {cells.map((day, index) => {
                if (!day)
                  return (
                    <div
                      className="day-cell empty-day"
                      key={`empty-${index}`}
                    />
                  );
                const key = `${year}-${pad(month + 1)}-${pad(day)}`;
                const schedules = data.schedules.filter(
                  (schedule) => schedule.date === key,
                );
                const dayEmotion = strongestEmotion(
                  data.diaries.find((diaryItem) => diaryItem.date === key),
                );
                const hasRecord = data.dailyRecords.some(
                  (record) => record.date === key,
                );
                const holidayName = holidays[key]?.join(", ");
                const isSunday = new Date(year, month, day).getDay() === 0;
                return (
                  <button
                    key={key}
                    className={`day-cell ${key === selectedDate ? "selected" : ""} ${key === dateKey() ? "today" : ""} ${holidayName || isSunday ? "holiday" : ""}`}
                    onClick={() => onSelect(key)}
                    aria-label={holidayName ? `${key} ${holidayName}` : key}
                  >
                    <div className="day-heading">
                      <span>{day}</span>
                      {holidayName && <b>{holidayName}</b>}
                    </div>
                    {dayEmotion && (
                      <i title={dayEmotion.label}>{dayEmotion.emoji}</i>
                    )}
                    <div className="day-schedules">
                      {schedules.slice(0, 2).map((schedule) => (
                        <small key={schedule.id} className={schedule.status}>
                          {formatTime(schedule.startTime)} {schedule.title}
                        </small>
                      ))}
                    </div>
                    {hasRecord && <em>✎</em>}
                  </button>
                );
              })}
            </div>
          </section>
          <aside className="date-detail">
            <p>{displayDate(selectedDate)}</p>
            <h2>{strongestEmotion(diary)?.emoji ?? "선택한 날"}</h2>
            <div className="detail-stat">
              <span>일정</span>
              <b>{selectedSchedules.length}개</b>
            </div>
            <div className="detail-stat">
              <span>하루 기록</span>
              <b>{recordCount}개</b>
            </div>
            <div className="detail-stat">
              <span>지출</span>
              <b>{money(dayExpense)}</b>
            </div>
            <div className="detail-list">
              {selectedSchedules.length === 0 && (
                <p className="muted">이 날짜에는 일정이 없어요.</p>
              )}
              {selectedSchedules.map((schedule) => (
                <div className="detail-schedule" key={schedule.id}>
                  <time>{formatTime(schedule.startTime)}</time>
                  <span>
                    {schedule.title}
                    <small>
                      {schedule.place || statusMap[schedule.status]}
                    </small>
                  </span>
                  <div className="detail-actions">
                    <button onClick={() => onEdit(schedule)}>수정</button>
                    <button onClick={() => onDelete(schedule.id)}>삭제</button>
                  </div>
                </div>
              ))}
            </div>
            <button
              className="primary full"
              onClick={() => onAdd(selectedDate)}
            >
              ＋ 이 날짜에 일정 추가
            </button>
          </aside>
        </div>
      )}
    </>
  );
}
