"use client";

import { useState } from "react";
import type {
  DailyRecord,
  EmotionDiary,
  Schedule,
  Transaction,
} from "../../../lib/types";
import { DateNavigator, Empty, PageHeader } from "../common";
import {
  displayDate,
  emotions,
  formatTime,
  money,
  statusMap,
} from "../ui-helpers";
export function RecordsView({
  date,
  onDate,
  records,
  schedules,
  onAdd,
  onEdit,
  onDelete,
}: {
  date: string;
  onDate: (d: string) => void;
  records: DailyRecord[];
  schedules: Schedule[];
  onAdd: () => void;
  onEdit: (r: DailyRecord) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      <PageHeader
        eyebrow="작은 순간까지"
        title="하루 기록"
        action={
          <div className="header-actions">
            <DateNavigator date={date} onDate={onDate} />
            <button className="primary" onClick={onAdd}>
              ＋ 기록 추가
            </button>
          </div>
        }
      />
      <div className="records-layout">
        <section>
          <div className="section-title">
            <div>
              <h2>{displayDate(date, true)}</h2>
              <span>감정과 상관없이 자유롭게 남기는 기록</span>
            </div>
          </div>
          {records.length === 0 && (
            <Empty
              icon="✎"
              title="아직 하루 기록이 없어요"
              text="먹은 것, 떠오른 생각, 우연히 만난 장면처럼 작은 순간을 남겨보세요."
              action="첫 기록 쓰기"
              onClick={onAdd}
            />
          )}
          {records.map((record) => (
            <article className="record-card" key={record.id}>
              <time>{record.time || "하루"}</time>
              <div>
                <h3>{record.title}</h3>
                <p>{record.content}</p>
                {record.scheduleId && (
                  <small>
                    연결 일정 ·{" "}
                    {schedules.find((s) => s.id === record.scheduleId)?.title ??
                      "삭제된 일정"}
                  </small>
                )}
                <div className="record-actions">
                  <button onClick={() => onEdit(record)}>수정</button>
                  <button onClick={() => onDelete(record.id)}>삭제</button>
                </div>
              </div>
            </article>
          ))}
        </section>
        <aside className="record-guide">
          <p>하루 기록은</p>
          <h2>감정 일기와 달라요</h2>
          <span>
            감정 일기는 하루의 대표 감정과 원인을 돌아보는 공간이고, 하루 기록은
            시간대별로 여러 개 작성할 수 있는 자유로운 메모예요.
          </span>
          <ul>
            <li>점심에 먹은 음식</li>
            <li>기억하고 싶은 대화</li>
            <li>갑자기 떠오른 생각</li>
            <li>일정 중 있었던 세부 내용</li>
          </ul>
        </aside>
      </div>
    </>
  );
}

export function DiaryView({
  date,
  onDate,
  diary,
  schedules,
  transactions,
  userId,
  onSave,
  onAddUnplanned,
}: {
  date: string;
  onDate: (d: string) => void;
  diary?: EmotionDiary;
  schedules: Schedule[];
  transactions: Transaction[];
  userId: string;
  onSave: (d: EmotionDiary) => void;
  onAddUnplanned: () => void;
}) {
  const [draft, setDraft] = useState<EmotionDiary>(
    diary ?? {
      id: "",
      userId,
      date,
      emotions: [{ emotion: "calm", intensity: 3 }],
      cause: "",
      note: "",
    },
  );
  const spent = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const toggleEmotion = (emotion: string) =>
    setDraft((current) => ({
      ...current,
      emotions: current.emotions.some((entry) => entry.emotion === emotion)
        ? current.emotions.filter((entry) => entry.emotion !== emotion)
        : [...current.emotions, { emotion, intensity: 3 }],
    }));
  const setIntensity = (emotion: string, intensity: number) =>
    setDraft((current) => ({
      ...current,
      emotions: current.emotions.map((entry) =>
        entry.emotion === emotion ? { ...entry, intensity } : entry,
      ),
    }));

  return (
    <>
      <PageHeader
        eyebrow="마음의 결"
        title="감정 일기"
        action={<DateNavigator date={date} onDate={onDate} />}
      />
      <div className="diary-layout">
        <form
          className="diary-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (draft.emotions.length) onSave({ ...draft, date });
          }}
        >
          <p className="step-label">STEP 01</p>
          <h2>오늘 느낀 감정을 모두 골라보세요</h2>
          <div className="emotion-picker">
            {emotions.map((emotion) => {
              const selected = draft.emotions.some(
                (entry) => entry.emotion === emotion.value,
              );
              return (
                <button
                  type="button"
                  key={emotion.value}
                  aria-pressed={selected}
                  className={selected ? "selected" : ""}
                  style={{ "--emotion": emotion.color } as React.CSSProperties}
                  onClick={() => toggleEmotion(emotion.value)}
                >
                  <span>{emotion.emoji}</span>
                  <b>{emotion.label}</b>
                </button>
              );
            })}
          </div>
          {draft.emotions.length > 0 ? (
            <div className="emotion-intensity-list">
              {draft.emotions.map((entry) => {
                const meta = emotions.find(
                  (emotion) => emotion.value === entry.emotion,
                );
                return (
                  <div className="emotion-intensity-row" key={entry.emotion}>
                    <label>
                      <span>
                        {meta?.emoji} {meta?.label}
                      </span>
                      <b>강도 {entry.intensity}/5</b>
                    </label>
                    <input
                      aria-label={`${meta?.label ?? entry.emotion} 감정 강도`}
                      type="range"
                      min="1"
                      max="5"
                      value={entry.intensity}
                      onChange={(event) =>
                        setIntensity(entry.emotion, Number(event.target.value))
                      }
                    />
                    <div>
                      <span>은은하게</span>
                      <span>아주 강하게</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="emotion-empty-hint">
              한 가지 이상의 감정을 선택해 주세요.
            </p>
          )}
          <p className="step-label">STEP 02</p>
          <label className="field">
            <span>이 감정들은 어디에서 왔나요?</span>
            <textarea
              rows={3}
              value={draft.cause}
              onChange={(e) => setDraft({ ...draft, cause: e.target.value })}
              placeholder="상황, 사람, 생각을 적어보세요"
            />
          </label>
          <label className="field">
            <span>하루를 돌아보며</span>
            <textarea
              rows={6}
              value={draft.note}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
              placeholder="오늘의 마음을 짧게 정리해보세요"
            />
          </label>
          <button
            className="primary save-diary"
            disabled={!draft.emotions.length}
          >
            감정 일기 저장
          </button>
        </form>
        <aside className="day-context">
          <p>DAY CONTEXT</p>
          <h2>{displayDate(date)}</h2>
          <div className="context-summary">
            <span>
              <b>{schedules.length}</b> 일정
            </span>
            <span>
              <b>{money(spent)}</b> 지출
            </span>
          </div>
          <div className="check-list">
            {schedules.map((s) => (
              <div key={s.id}>
                <span className={`check ${s.status}`}>
                  {s.status === "done"
                    ? "✓"
                    : s.status === "cancelled"
                      ? "×"
                      : ""}
                </span>
                <div>
                  <b>{s.title}</b>
                  <small>
                    {formatTime(s.startTime)} · {statusMap[s.status]}
                  </small>
                </div>
              </div>
            ))}
          </div>
          <button className="text-button" onClick={onAddUnplanned}>
            ＋ 예정에 없던 활동 추가
          </button>
        </aside>
      </div>
    </>
  );
}
