"use client";

import { useState } from "react";
import type { AppData, Schedule, Transaction } from "../../../lib/types";
import { Empty, PageHeader } from "../common";
import { displayDate, emotions, money, pad, statusMap } from "../ui-helpers";
function repeatLabel(transaction: Transaction) {
  if (!transaction.fixed) return "변동";
  if (transaction.repeatFrequency === "yearly")
    return `매년 ${transaction.repeatMonth}월 ${transaction.repeatDay}일`;
  if (transaction.repeatFrequency === "monthly")
    return `매월 ${transaction.repeatDay}일`;
  if (transaction.repeatFrequency === "weekly") return "매주";
  if (transaction.repeatFrequency === "daily") return "매일";
  return "고정";
}

export function LedgerView({
  cursor,
  setCursor,
  transactions,
  schedules,
  income,
  expense,
  expected,
  onAdd,
  onEdit,
  onDelete,
}: {
  cursor: Date;
  setCursor: (d: Date) => void;
  transactions: Transaction[];
  schedules: Schedule[];
  income: number;
  expense: number;
  expected: number;
  onAdd: () => void;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
}) {
  const year = cursor.getFullYear(),
    month = cursor.getMonth();
  const [typeFilter, setTypeFilter] = useState<"all" | Transaction["type"]>(
    "all",
  );
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [query, setQuery] = useState("");
  const categories = [
    ...new Set(transactions.map((transaction) => transaction.category)),
  ].sort();
  const normalizedQuery = query.trim().toLocaleLowerCase("ko");
  const filtered = transactions.filter(
    (transaction) =>
      (typeFilter === "all" || transaction.type === typeFilter) &&
      (categoryFilter === "all" || transaction.category === categoryFilter) &&
      (!normalizedQuery ||
        `${transaction.title} ${transaction.memo} ${transaction.category}`
          .toLocaleLowerCase("ko")
          .includes(normalizedQuery)),
  );
  const categoryTotals = Object.entries(
    filtered
      .filter((transaction) => transaction.type === "expense")
      .reduce<Record<string, number>>((totals, transaction) => {
        totals[transaction.category] =
          (totals[transaction.category] ?? 0) + transaction.amount;
        return totals;
      }, {}),
  ).sort(([, a], [, b]) => b - a);
  const maxCategory = categoryTotals[0]?.[1] ?? 1;
  const actualScheduleIds = new Set(
    transactions
      .filter(
        (transaction) =>
          transaction.source === "schedule_actual" && transaction.scheduleId,
      )
      .map((transaction) => transaction.scheduleId),
  );
  const expectedSchedules = schedules.filter(
    (schedule) =>
      schedule.status !== "cancelled" &&
      schedule.expectedCost > 0 &&
      !actualScheduleIds.has(schedule.id),
  );
  const scheduleActual = transactions
    .filter((transaction) => transaction.source === "schedule_actual")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const plannedAll = schedules
    .filter((schedule) => schedule.status !== "cancelled")
    .reduce((sum, schedule) => sum + schedule.expectedCost, 0);

  return (
    <>
      <PageHeader
        eyebrow="돈의 흐름"
        title={`${year}년 ${month + 1}월 가계부`}
        action={
          <div className="header-actions">
            <button
              className="icon-button"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
            >
              ‹
            </button>
            <button className="primary" onClick={onAdd}>
              ＋ 거래 추가
            </button>
            <button
              className="icon-button"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
            >
              ›
            </button>
          </div>
        }
      />
      <section className="money-summary">
        <div>
          <small>이번 달 수입</small>
          <strong className="income">+ {money(income)}</strong>
        </div>
        <div className="expense-total">
          <small>이번 달 지출</small>
          <strong>− {money(expense)}</strong>
          <p>아직 남은 예상 지출 {money(expected)}</p>
        </div>
        <div className="balance">
          <small>남은 금액</small>
          <strong>{money(income - expense)}</strong>
          <p>
            일정 예상 {money(plannedAll)} · 실제 {money(scheduleActual)}
          </p>
        </div>
      </section>
      <section className="ledger-tools" aria-label="거래 검색과 필터">
        <input
          aria-label="거래 검색"
          placeholder="내용, 메모, 카테고리 검색"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          aria-label="수입 지출 필터"
          value={typeFilter}
          onChange={(event) =>
            setTypeFilter(event.target.value as typeof typeFilter)
          }
        >
          <option value="all">수입·지출 전체</option>
          <option value="expense">지출만</option>
          <option value="income">수입만</option>
        </select>
        <select
          aria-label="카테고리 필터"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
        >
          <option value="all">모든 카테고리</option>
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
      </section>
      <div className="ledger-grid">
        <section>
          <div className="section-title">
            <div>
              <h2>거래 내역</h2>
              <span>{filtered.length}건 · 실제로 발생한 금액</span>
            </div>
          </div>
          {filtered.length === 0 && (
            <Empty
              icon="₩"
              title="조건에 맞는 거래가 없어요"
              text="필터를 바꾸거나 새 거래를 기록해 보세요."
              action="거래 기록하기"
              onClick={onAdd}
            />
          )}
          {[...filtered]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((transaction) => (
              <article className="transaction-row" key={transaction.id}>
                <time>
                  <b>{Number(transaction.date.slice(-2))}</b>
                  <small>
                    {new Intl.DateTimeFormat("ko-KR", {
                      weekday: "short",
                    }).format(new Date(`${transaction.date}T00:00:00`))}
                  </small>
                </time>
                <span className="category-icon">
                  {transaction.category.slice(0, 1)}
                </span>
                <div>
                  <h3>{transaction.title}</h3>
                  <p>
                    {transaction.category} · {repeatLabel(transaction)}
                    {transaction.source === "schedule_actual"
                      ? " · 일정 실제 지출"
                      : transaction.scheduleId
                        ? " · 일정 연결"
                        : ""}
                  </p>
                  {transaction.memo && (
                    <small className="transaction-memo">
                      {transaction.memo}
                    </small>
                  )}
                </div>
                <strong className={transaction.type}>
                  {transaction.type === "expense" ? "−" : "+"}
                  {money(transaction.amount)}
                </strong>
                <button onClick={() => onEdit(transaction)}>수정</button>
                <button
                  className="delete-inline"
                  onClick={() => onDelete(transaction.id)}
                >
                  ×
                </button>
              </article>
            ))}
        </section>
        <aside className="ledger-insights">
          <section className="expected-list">
            <div className="section-title">
              <div>
                <h2>예상 지출</h2>
                <span>실제 지출 전 · 취소 일정 제외</span>
              </div>
            </div>
            {expectedSchedules.length === 0 && (
              <p className="muted">남아 있는 예상 지출이 없어요.</p>
            )}
            {expectedSchedules.map((schedule) => (
              <div key={schedule.id}>
                <span>
                  <b>{schedule.title}</b>
                  <small>
                    {displayDate(schedule.date)} · {statusMap[schedule.status]}
                  </small>
                </span>
                <strong>{money(schedule.expectedCost)}</strong>
              </div>
            ))}
          </section>
          <section className="category-summary">
            <div className="section-title">
              <div>
                <h2>카테고리별 지출</h2>
                <span>현재 필터 기준</span>
              </div>
            </div>
            {categoryTotals.length === 0 && (
              <p className="muted">표시할 지출이 없어요.</p>
            )}
            {categoryTotals.map(([category, total]) => (
              <div key={category}>
                <p>
                  <span>{category}</span>
                  <b>{money(total)}</b>
                </p>
                <i>
                  <span
                    style={{
                      width: `${Math.max(5, (total / maxCategory) * 100)}%`,
                    }}
                  />
                </i>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </>
  );
}

export function StatsView({
  cursor,
  setCursor,
  data,
}: {
  cursor: Date;
  setCursor: (date: Date) => void;
  data: AppData;
}) {
  const year = cursor.getFullYear(),
    month = cursor.getMonth();
  const prefix = `${year}-${pad(month + 1)}`;
  const transactions = data.transactions.filter((transaction) =>
    transaction.date.startsWith(prefix),
  );
  const schedules = data.schedules.filter((schedule) =>
    schedule.date.startsWith(prefix),
  );
  const diaries = data.diaries.filter((diary) => diary.date.startsWith(prefix));
  const expense = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const activeSchedules = schedules.filter(
    (schedule) => schedule.status !== "cancelled",
  );
  const completedSchedules = activeSchedules.filter(
    (schedule) => schedule.status === "done",
  );
  const completionRate = activeSchedules.length
    ? Math.round((completedSchedules.length / activeSchedules.length) * 100)
    : 0;
  const planned = activeSchedules.reduce(
    (sum, schedule) => sum + schedule.expectedCost,
    0,
  );
  const actual = transactions
    .filter((transaction) => transaction.source === "schedule_actual")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const categories = Object.entries(
    transactions
      .filter((transaction) => transaction.type === "expense")
      .reduce<Record<string, number>>((totals, transaction) => {
        totals[transaction.category] =
          (totals[transaction.category] ?? 0) + transaction.amount;
        return totals;
      }, {}),
  ).sort(([, a], [, b]) => b - a);
  const maxCategory = categories[0]?.[1] ?? 1;
  const emotionStats = emotions
    .map((emotion) => {
      const entries = diaries.flatMap((diary) =>
        diary.emotions.filter((entry) => entry.emotion === emotion.value),
      );
      return {
        ...emotion,
        count: entries.length,
        average: entries.length
          ? entries.reduce((sum, entry) => sum + entry.intensity, 0) /
            entries.length
          : 0,
      };
    })
    .filter((emotion) => emotion.count > 0)
    .sort((a, b) => b.count - a.count || b.average - a.average);
  const diaryDates = new Set(diaries.map((diary) => diary.date));
  const diaryDaySpend = transactions
    .filter(
      (transaction) =>
        diaryDates.has(transaction.date) && transaction.type === "expense",
    )
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const averageDiarySpend = diaries.length
    ? Math.round(diaryDaySpend / diaries.length)
    : 0;

  return (
    <>
      <PageHeader
        eyebrow="한 달 돌아보기"
        title={`${year}년 ${month + 1}월 통계`}
        action={
          <div className="header-actions">
            <button
              className="icon-button"
              onClick={() => setCursor(new Date(year, month - 1, 1))}
            >
              ‹
            </button>
            <button
              className="icon-button"
              onClick={() => setCursor(new Date(year, month + 1, 1))}
            >
              ›
            </button>
          </div>
        }
      />
      <section className="stats-cards">
        <div>
          <small>일정 완료율</small>
          <strong>{completionRate}%</strong>
          <p>
            {completedSchedules.length}/{activeSchedules.length}개 완료
          </p>
        </div>
        <div>
          <small>수입과 지출</small>
          <strong className={income - expense >= 0 ? "income" : ""}>
            {money(income - expense)}
          </strong>
          <p>
            수입 {money(income)} · 지출 {money(expense)}
          </p>
        </div>
        <div>
          <small>일정 비용 차이</small>
          <strong>{money(actual - planned)}</strong>
          <p>
            예상 {money(planned)} · 실제 {money(actual)}
          </p>
        </div>
        <div>
          <small>일기 쓴 날 평균 지출</small>
          <strong>{money(averageDiarySpend)}</strong>
          <p>감정 일기 {diaries.length}일 기준</p>
        </div>
      </section>
      <div className="stats-grid">
        <section className="stats-panel">
          <div className="section-title">
            <div>
              <h2>카테고리별 지출</h2>
              <span>많이 쓴 순서</span>
            </div>
          </div>
          {categories.length === 0 && (
            <p className="muted">이번 달 지출이 없어요.</p>
          )}
          {categories.map(([category, total]) => (
            <div className="stats-bar" key={category}>
              <p>
                <span>{category}</span>
                <b>{money(total)}</b>
              </p>
              <i>
                <span
                  style={{
                    width: `${Math.max(4, (total / maxCategory) * 100)}%`,
                  }}
                />
              </i>
            </div>
          ))}
        </section>
        <section className="stats-panel">
          <div className="section-title">
            <div>
              <h2>감정 흐름</h2>
              <span>기록 횟수와 평균 강도</span>
            </div>
          </div>
          {emotionStats.length === 0 && (
            <p className="muted">이번 달 감정 일기가 없어요.</p>
          )}
          {emotionStats.map((emotion) => (
            <div className="emotion-stat" key={emotion.value}>
              <span>{emotion.emoji}</span>
              <div>
                <b>{emotion.label}</b>
                <small>{emotion.count}회 기록</small>
              </div>
              <strong>{emotion.average.toFixed(1)}/5</strong>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
