/* eslint-disable jsx-a11y/no-autofocus */
"use client";

import { FormEvent } from "react";
import type { Schedule, Transaction } from "../../../lib/types";
import {
  dateWithParts,
  expenseCategories,
  incomeCategories,
  shiftDate,
} from "../ui-helpers";
export function TransactionModal({
  draft,
  setDraft,
  schedules,
  lockedScheduleId,
  editSeries,
  setEditSeries,
  onClose,
  onSubmit,
}: {
  draft: Transaction;
  setDraft: (transaction: Transaction) => void;
  schedules: Schedule[];
  lockedScheduleId: string | null;
  editSeries: boolean;
  setEditSeries: (value: boolean) => void;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
}) {
  const date = new Date(`${draft.date}T00:00:00`);
  const categoryOptions =
    draft.type === "expense" ? expenseCategories : incomeCategories;
  const visibleCategories = categoryOptions.includes(draft.category)
    ? categoryOptions
    : [...categoryOptions, draft.category];
  const changeType = (type: Transaction["type"]) => {
    const nextCategories =
      type === "expense" ? expenseCategories : incomeCategories;
    setDraft({
      ...draft,
      type,
      category: nextCategories.includes(draft.category)
        ? draft.category
        : nextCategories[0],
    });
  };
  const setFixed = (fixed: boolean) =>
    setDraft({
      ...draft,
      fixed,
      repeatFrequency: fixed ? (draft.repeatFrequency ?? "monthly") : null,
      repeatMonth: fixed ? (draft.repeatMonth ?? date.getMonth() + 1) : null,
      repeatDay: fixed ? (draft.repeatDay ?? date.getDate()) : null,
      repeatEndDate: fixed
        ? (draft.repeatEndDate ?? shiftDate(draft.date, 365))
        : null,
    });

  return (
    <div className="modal-backdrop">
      <form className="modal small" onSubmit={onSubmit}>
        <div className="modal-head">
          <div>
            <p>TRANSACTION</p>
            <h2>
              {draft.scheduleId
                ? draft.id
                  ? "실제 지출 수정"
                  : "실제 지출 입력"
                : draft.id
                  ? "거래 수정"
                  : "거래 기록"}
            </h2>
          </div>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="type-toggle">
          <button
            type="button"
            className={draft.type === "expense" ? "active" : ""}
            onClick={() => changeType("expense")}
          >
            지출
          </button>
          <button
            type="button"
            disabled={Boolean(lockedScheduleId)}
            title={
              lockedScheduleId
                ? "일정의 실제 금액은 지출로 기록됩니다"
                : undefined
            }
            className={draft.type === "income" ? "active income" : ""}
            onClick={() => changeType("income")}
          >
            수입
          </button>
        </div>
        <div className="fixed-section">
          <label className="check-field fixed-check">
            <input
              type="checkbox"
              checked={draft.fixed}
              onChange={(event) => setFixed(event.target.checked)}
            />{" "}
            고정 항목
          </label>
          {draft.fixed && (
            <div className="repeat-settings">
              <span>반복 주기</span>
              <div className="repeat-frequency">
                {(
                  [
                    ["yearly", "매년"],
                    ["monthly", "매월"],
                    ["weekly", "매주"],
                    ["daily", "매일"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    className={draft.repeatFrequency === value ? "active" : ""}
                    onClick={() =>
                      setDraft({ ...draft, repeatFrequency: value })
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              {draft.repeatFrequency === "yearly" && (
                <div className="repeat-date-row">
                  <label>
                    <select
                      value={draft.repeatMonth ?? 1}
                      onChange={(event) => {
                        const repeatMonth = Number(event.target.value);
                        const repeatDay = draft.repeatDay ?? 1;
                        setDraft({
                          ...draft,
                          date: dateWithParts(
                            date.getFullYear(),
                            repeatMonth,
                            repeatDay,
                          ),
                          repeatMonth,
                          repeatDay,
                        });
                      }}
                    >
                      {Array.from({ length: 12 }, (_, index) => (
                        <option value={index + 1} key={index + 1}>
                          {index + 1}월
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <select
                      value={draft.repeatDay ?? 1}
                      onChange={(event) => {
                        const repeatDay = Number(event.target.value);
                        setDraft({
                          ...draft,
                          date: dateWithParts(
                            date.getFullYear(),
                            draft.repeatMonth ?? 1,
                            repeatDay,
                          ),
                          repeatDay,
                        });
                      }}
                    >
                      {Array.from({ length: 31 }, (_, index) => (
                        <option value={index + 1} key={index + 1}>
                          {index + 1}일
                        </option>
                      ))}
                    </select>
                  </label>
                  <small>마다</small>
                </div>
              )}
              {draft.repeatFrequency === "monthly" && (
                <div className="repeat-date-row">
                  <span>매월</span>
                  <label>
                    <select
                      value={draft.repeatDay ?? 1}
                      onChange={(event) => {
                        const repeatDay = Number(event.target.value);
                        setDraft({
                          ...draft,
                          date: dateWithParts(
                            date.getFullYear(),
                            date.getMonth() + 1,
                            repeatDay,
                          ),
                          repeatDay,
                        });
                      }}
                    >
                      {Array.from({ length: 31 }, (_, index) => (
                        <option value={index + 1} key={index + 1}>
                          {index + 1}일
                        </option>
                      ))}
                    </select>
                  </label>
                  <small>마다</small>
                </div>
              )}
              {draft.repeatFrequency === "daily" && (
                <p className="repeat-help">
                  매일 반복되는 고정 항목으로 저장됩니다.
                </p>
              )}
              {draft.repeatFrequency === "weekly" && (
                <p className="repeat-help">
                  선택한 날짜의 요일마다 반복됩니다.
                </p>
              )}
              <label className="field repeat-end">
                <span>반복 종료일</span>
                <input
                  type="date"
                  required
                  value={draft.repeatEndDate ?? ""}
                  min={draft.date}
                  onChange={(event) =>
                    setDraft({ ...draft, repeatEndDate: event.target.value })
                  }
                />
              </label>
              {draft.seriesId && (
                <label className="check-field series-check">
                  <input
                    type="checkbox"
                    checked={editSeries}
                    onChange={(event) => setEditSeries(event.target.checked)}
                  />{" "}
                  이 회차 이후 반복 거래 전체 수정
                </label>
              )}
            </div>
          )}
        </div>
        <label className="field amount-field">
          <span>금액</span>
          <input
            autoFocus
            type="number"
            min="1"
            required
            value={draft.amount || ""}
            onChange={(event) =>
              setDraft({ ...draft, amount: Number(event.target.value) })
            }
          />
        </label>
        <label className="field">
          <span>내용</span>
          <input
            required
            value={draft.title}
            onChange={(event) =>
              setDraft({ ...draft, title: event.target.value })
            }
          />
        </label>
        <label className="field">
          <span>간단한 메모 (선택)</span>
          <textarea
            rows={3}
            value={draft.memo}
            onChange={(event) =>
              setDraft({ ...draft, memo: event.target.value })
            }
            placeholder="거래와 관련해 기억할 내용을 남겨보세요"
          />
        </label>
        <div className="form-grid">
          <label className="field">
            <span>날짜</span>
            <input
              type="date"
              value={draft.date}
              onChange={(event) => {
                const nextDate = new Date(`${event.target.value}T00:00:00`);
                setDraft({
                  ...draft,
                  date: event.target.value,
                  repeatMonth: draft.fixed
                    ? nextDate.getMonth() + 1
                    : draft.repeatMonth,
                  repeatDay: draft.fixed ? nextDate.getDate() : draft.repeatDay,
                });
              }}
            />
          </label>
          <label className="field">
            <span>
              {draft.type === "expense" ? "지출 카테고리" : "수입 카테고리"}
            </span>
            <select
              value={draft.category}
              onChange={(event) =>
                setDraft({ ...draft, category: event.target.value })
              }
            >
              {visibleCategories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className="field full-span">
            <span>{lockedScheduleId ? "관련 일정 (고정)" : "관련 일정"}</span>
            <select
              disabled={Boolean(lockedScheduleId)}
              value={draft.scheduleId ?? ""}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  scheduleId: event.target.value || undefined,
                })
              }
            >
              <option value="">연결하지 않음</option>
              {schedules.map((schedule) => (
                <option value={schedule.id} key={schedule.id}>
                  {schedule.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="ghost" onClick={onClose}>
            취소
          </button>
          <button className="primary">저장</button>
        </div>
      </form>
    </div>
  );
}
