/* eslint-disable jsx-a11y/no-autofocus */
"use client";

import { FormEvent } from "react";
import type { DailyRecord, Schedule } from "../../../lib/types";
export function RecordModal({
  draft,
  setDraft,
  schedules,
  onClose,
  onSubmit,
}: {
  draft: DailyRecord;
  setDraft: (r: DailyRecord) => void;
  schedules: Schedule[];
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <div className="modal-backdrop">
      <form className="modal small" onSubmit={onSubmit}>
        <div className="modal-head">
          <div>
            <p>DAILY RECORD</p>
            <h2>{draft.id ? "하루 기록 수정" : "작은 순간 기록"}</h2>
          </div>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="form-grid">
          <label className="field">
            <span>날짜</span>
            <input
              type="date"
              required
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            />
          </label>
          <label className="field">
            <span>시간</span>
            <input
              type="time"
              value={draft.time}
              onChange={(e) => setDraft({ ...draft, time: e.target.value })}
            />
          </label>
          <label className="field full-span">
            <span>제목</span>
            <input
              autoFocus
              required
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="어떤 순간이었나요?"
            />
          </label>
          <label className="field full-span">
            <span>기록</span>
            <textarea
              rows={7}
              required
              value={draft.content}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              placeholder="감정에 구애받지 않고 자유롭게 적어보세요"
            />
          </label>
          <label className="field full-span">
            <span>관련 일정 (선택)</span>
            <select
              value={draft.scheduleId ?? ""}
              onChange={(e) =>
                setDraft({ ...draft, scheduleId: e.target.value || undefined })
              }
            >
              <option value="">연결하지 않음</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
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
