/* eslint-disable jsx-a11y/no-autofocus */
"use client";

import { FormEvent, useEffect, useState } from "react";
import type { DailyRecord, Schedule, ScheduleStatus, Transaction } from "../../lib/types";
import { dateWithParts, expenseCategories, formatTime, incomeCategories, pad, shiftDate, statusMap } from "./ui-helpers";

type PlaceResult = { id: string; name: string; address: string; roadAddress: string; category: string };
export function PlaceSearchField({ place, address, onChange }: { place: string; address: string; onChange: (place: string, address: string) => void }) {
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedPlaceName, setSelectedPlaceName] = useState(place);

  useEffect(() => {
    const query = place.trim();
    if (query.length < 2 || query === selectedPlaceName) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoadingPlaces(true);
      try {
        const response = await fetch(`/api/places?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const payload = await response.json() as { places?: PlaceResult[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "장소 검색에 실패했어요.");
        setResults(payload.places ?? []);
        setSearchError(payload.places?.length ? "" : "검색 결과가 없어요. 주소를 직접 입력할 수도 있어요.");
      } catch (error) {
        if (!controller.signal.aborted) setSearchError(error instanceof Error ? error.message : "장소 검색에 실패했어요.");
      } finally {
        if (!controller.signal.aborted) setLoadingPlaces(false);
      }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [place, selectedPlaceName]);

  const changePlace = (nextPlace: string) => {
    onChange(nextPlace, address);
    setSelectedPlaceName("");
    setResults([]);
    setLoadingPlaces(false);
    setSearchError("");
  };
  const selectPlace = (result: PlaceResult) => {
    onChange(result.name, result.address || result.roadAddress);
    setSelectedPlaceName(result.name);
    setResults([]);
    setSearchError("");
  };

  return <div className="field place-search-field">
    <span>장소명</span>
    <div className="place-search-input"><input value={place} onChange={(event) => changePlace(event.target.value)} placeholder="예: 서울숲" autoComplete="off" />{loadingPlaces && <i>검색 중</i>}</div>
    {results.length > 0 && <div className="place-results" role="listbox" aria-label="장소 검색 결과">{results.map((result) => <button type="button" role="option" aria-selected="false" key={result.id} onClick={() => selectPlace(result)}><b>{result.name}</b><span>{result.address || result.roadAddress}</span>{result.roadAddress && result.roadAddress !== result.address && <small>{result.roadAddress}</small>}</button>)}</div>}
    {searchError && <small className="place-search-message" aria-live="polite">{searchError}</small>}
  </div>;
}

export function TimePicker({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [hourValue, minuteValue] = formatTime(value || "09:00").split(":").map(Number);
  const period = hourValue >= 12 ? "PM" : "AM";
  const hour = hourValue % 12 || 12;
  const update = (nextPeriod: string, nextHour: number, nextMinute: number) => {
    const nextHour24 = nextHour % 12 + (nextPeriod === "PM" ? 12 : 0);
    onChange(`${pad(nextHour24)}:${pad(nextMinute)}`);
  };
  const setCurrentTime = () => {
    const now = new Date();
    onChange(`${pad(now.getHours())}:${pad(now.getMinutes())}`);
  };

  return <div className="field time-field">
    <span>{label}</span>
    <div className="time-picker">
      <select aria-label={`${label} 오전 오후`} value={period} onChange={(event) => update(event.target.value, hour, minuteValue)}>
        <option value="AM">오전</option><option value="PM">오후</option>
      </select>
      <select aria-label={`${label} 시`} value={hour} onChange={(event) => update(period, Number(event.target.value), minuteValue)}>
        {Array.from({ length: 12 }, (_, index) => index + 1).map((item) => <option key={item} value={item}>{item}시</option>)}
      </select>
      <select aria-label={`${label} 분`} value={minuteValue} onChange={(event) => update(period, hour, Number(event.target.value))}>
        {Array.from({ length: 60 }, (_, index) => index).map((item) => <option key={item} value={item}>{pad(item)}분</option>)}
      </select>
      <button type="button" className="clock-button" aria-label={`${label}에 현재 시간 반영`} title="현재 시간 반영" onClick={setCurrentTime}>◷</button>
    </div>
  </div>;
}

export function ScheduleModal({ draft, setDraft, completionMode, hasActualExpense, editSeries, setEditSeries, onClose, onSubmit }: { draft: Schedule; setDraft: (s: Schedule) => void; completionMode: boolean; hasActualExpense: boolean; editSeries: boolean; setEditSeries: (value: boolean) => void; onClose: () => void; onSubmit: (e: FormEvent) => void }) {
  const setRecurring = (isRecurring: boolean) => setDraft({
    ...draft,
    isRecurring,
    repeatFrequency: isRecurring ? (draft.repeatFrequency ?? "weekly") : null,
    repeatEndDate: isRecurring ? (draft.repeatEndDate ?? shiftDate(draft.date, 365)) : null,
  });
  return <div className="modal-backdrop"><form className="modal" onSubmit={onSubmit}>
    <div className="modal-head"><div><p>{completionMode ? "COMPLETE SCHEDULE" : "SCHEDULE"}</p><h2>{completionMode ? "실제 일정 확인" : draft.id ? "일정 수정" : "새 일정"}</h2>{completionMode && <span className="modal-description">예정 정보는 그대로 보존됩니다. 실제로 진행한 날짜와 시간을 확인해 주세요.</span>}</div><button type="button" onClick={onClose}>×</button></div>
    <div className="form-grid">
      <label className="field full-span"><span>일정 이름</span><input autoFocus required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
      <label className="field"><span>{completionMode ? "실제 날짜" : "예정 날짜"}</span><input type="date" required value={completionMode ? draft.actualDate : draft.date} onChange={(event) => setDraft(completionMode ? { ...draft, actualDate: event.target.value } : { ...draft, date: event.target.value })} /></label>
      <label className="field"><span>상태</span><select disabled={completionMode} value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as ScheduleStatus })}>{Object.entries(statusMap).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
      <TimePicker label={completionMode ? "실제 시작 시간" : "예정 시작 시간"} value={completionMode ? draft.actualStartTime : draft.startTime} onChange={(value) => setDraft(completionMode ? { ...draft, actualStartTime: value } : { ...draft, startTime: value })} />
      <TimePicker label={completionMode ? "실제 종료 시간" : "예정 종료 시간"} value={completionMode ? draft.actualEndTime : draft.endTime} onChange={(value) => setDraft(completionMode ? { ...draft, actualEndTime: value } : { ...draft, endTime: value })} />
      <PlaceSearchField place={draft.place} address={draft.address} onChange={(place, address) => setDraft({ ...draft, place, address })} />
      <label className="field"><span>주소</span><input value={draft.address} onChange={(event) => setDraft({ ...draft, address: event.target.value })} placeholder="검색 결과 선택 또는 직접 입력" /></label>
      <label className="field"><span>관련 인물</span><input value={draft.people} onChange={(event) => setDraft({ ...draft, people: event.target.value })} /></label>
      <label className="field"><span>{completionMode ? "예상 지출 확인" : "예상 지출"}</span><input type="number" min="0" value={draft.expectedCost} onChange={(event) => setDraft({ ...draft, expectedCost: Number(event.target.value) })} /></label>
      {!completionMode && <div className="fixed-section full-span schedule-repeat"><label className="check-field fixed-check"><input type="checkbox" checked={draft.isRecurring} onChange={(event) => setRecurring(event.target.checked)} /> 반복 일정</label>{draft.isRecurring && <div className="repeat-settings"><span>반복 주기</span><div className="repeat-frequency">{([['daily', '매일'], ['weekly', '매주'], ['monthly', '매월'], ['yearly', '매년']] as const).map(([value, label]) => <button type="button" key={value} className={draft.repeatFrequency === value ? "active" : ""} onClick={() => setDraft({ ...draft, repeatFrequency: value })}>{label}</button>)}</div><label className="field repeat-end"><span>반복 종료일</span><input type="date" required value={draft.repeatEndDate ?? ""} min={draft.date} onChange={(event) => setDraft({ ...draft, repeatEndDate: event.target.value })} /></label>{draft.seriesId && <label className="check-field series-check"><input type="checkbox" checked={editSeries} onChange={(event) => setEditSeries(event.target.checked)} /> 이 회차 이후 반복 일정 전체 수정</label>}</div>}</div>}
      <label className="field full-span"><span>메모</span><textarea rows={3} value={draft.memo} onChange={(event) => setDraft({ ...draft, memo: event.target.value })} /></label>
    </div>
    <div className="modal-actions"><button type="button" className="ghost" onClick={onClose}>취소</button><button className="primary">{completionMode && (draft.expectedCost > 0 || hasActualExpense) ? "다음: 실제 지출" : completionMode ? "완료로 변경" : "저장"}</button></div>
  </form></div>;
}

export function TransactionModal({ draft, setDraft, schedules, lockedScheduleId, editSeries, setEditSeries, onClose, onSubmit }: {
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
  const categoryOptions = draft.type === "expense" ? expenseCategories : incomeCategories;
  const visibleCategories = categoryOptions.includes(draft.category) ? categoryOptions : [...categoryOptions, draft.category];
  const changeType = (type: Transaction["type"]) => {
    const nextCategories = type === "expense" ? expenseCategories : incomeCategories;
    setDraft({ ...draft, type, category: nextCategories.includes(draft.category) ? draft.category : nextCategories[0] });
  };
  const setFixed = (fixed: boolean) => setDraft({
    ...draft,
    fixed,
    repeatFrequency: fixed ? (draft.repeatFrequency ?? "monthly") : null,
    repeatMonth: fixed ? (draft.repeatMonth ?? date.getMonth() + 1) : null,
    repeatDay: fixed ? (draft.repeatDay ?? date.getDate()) : null,
    repeatEndDate: fixed ? (draft.repeatEndDate ?? shiftDate(draft.date, 365)) : null,
  });

  return <div className="modal-backdrop">
    <form className="modal small" onSubmit={onSubmit}>
      <div className="modal-head"><div><p>TRANSACTION</p><h2>{draft.scheduleId ? draft.id ? "실제 지출 수정" : "실제 지출 입력" : draft.id ? "거래 수정" : "거래 기록"}</h2></div><button type="button" onClick={onClose}>×</button></div>
      <div className="type-toggle">
        <button type="button" className={draft.type === "expense" ? "active" : ""} onClick={() => changeType("expense")}>지출</button>
        <button type="button" disabled={Boolean(lockedScheduleId)} title={lockedScheduleId ? "일정의 실제 금액은 지출로 기록됩니다" : undefined} className={draft.type === "income" ? "active income" : ""} onClick={() => changeType("income")}>수입</button>
      </div>
      <div className="fixed-section">
        <label className="check-field fixed-check"><input type="checkbox" checked={draft.fixed} onChange={(event) => setFixed(event.target.checked)} /> 고정 항목</label>
        {draft.fixed && <div className="repeat-settings">
          <span>반복 주기</span>
          <div className="repeat-frequency">
            {([['yearly', '매년'], ['monthly', '매월'], ['weekly', '매주'], ['daily', '매일']] as const).map(([value, label]) => <button type="button" key={value} className={draft.repeatFrequency === value ? "active" : ""} onClick={() => setDraft({ ...draft, repeatFrequency: value })}>{label}</button>)}
          </div>
          {draft.repeatFrequency === "yearly" && <div className="repeat-date-row">
            <label><select value={draft.repeatMonth ?? 1} onChange={(event) => { const repeatMonth = Number(event.target.value); const repeatDay = draft.repeatDay ?? 1; setDraft({ ...draft, date: dateWithParts(date.getFullYear(), repeatMonth, repeatDay), repeatMonth, repeatDay }); }}>{Array.from({ length: 12 }, (_, index) => <option value={index + 1} key={index + 1}>{index + 1}월</option>)}</select></label>
            <label><select value={draft.repeatDay ?? 1} onChange={(event) => { const repeatDay = Number(event.target.value); setDraft({ ...draft, date: dateWithParts(date.getFullYear(), draft.repeatMonth ?? 1, repeatDay), repeatDay }); }}>{Array.from({ length: 31 }, (_, index) => <option value={index + 1} key={index + 1}>{index + 1}일</option>)}</select></label>
            <small>마다</small>
          </div>}
          {draft.repeatFrequency === "monthly" && <div className="repeat-date-row"><span>매월</span><label><select value={draft.repeatDay ?? 1} onChange={(event) => { const repeatDay = Number(event.target.value); setDraft({ ...draft, date: dateWithParts(date.getFullYear(), date.getMonth() + 1, repeatDay), repeatDay }); }}>{Array.from({ length: 31 }, (_, index) => <option value={index + 1} key={index + 1}>{index + 1}일</option>)}</select></label><small>마다</small></div>}
          {draft.repeatFrequency === "daily" && <p className="repeat-help">매일 반복되는 고정 항목으로 저장됩니다.</p>}
          {draft.repeatFrequency === "weekly" && <p className="repeat-help">선택한 날짜의 요일마다 반복됩니다.</p>}
          <label className="field repeat-end"><span>반복 종료일</span><input type="date" required value={draft.repeatEndDate ?? ""} min={draft.date} onChange={(event) => setDraft({ ...draft, repeatEndDate: event.target.value })} /></label>
          {draft.seriesId && <label className="check-field series-check"><input type="checkbox" checked={editSeries} onChange={(event) => setEditSeries(event.target.checked)} /> 이 회차 이후 반복 거래 전체 수정</label>}
        </div>}
      </div>
      <label className="field amount-field"><span>금액</span><input autoFocus type="number" min="1" required value={draft.amount || ""} onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value) })} /></label>
      <label className="field"><span>내용</span><input required value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
      <label className="field"><span>간단한 메모 (선택)</span><textarea rows={3} value={draft.memo} onChange={(event) => setDraft({ ...draft, memo: event.target.value })} placeholder="거래와 관련해 기억할 내용을 남겨보세요" /></label>
      <div className="form-grid">
        <label className="field"><span>날짜</span><input type="date" value={draft.date} onChange={(event) => { const nextDate = new Date(`${event.target.value}T00:00:00`); setDraft({ ...draft, date: event.target.value, repeatMonth: draft.fixed ? nextDate.getMonth() + 1 : draft.repeatMonth, repeatDay: draft.fixed ? nextDate.getDate() : draft.repeatDay }); }} /></label>
        <label className="field"><span>{draft.type === "expense" ? "지출 카테고리" : "수입 카테고리"}</span><select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value })}>{visibleCategories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label className="field full-span"><span>{lockedScheduleId ? "관련 일정 (고정)" : "관련 일정"}</span><select disabled={Boolean(lockedScheduleId)} value={draft.scheduleId ?? ""} onChange={(event) => setDraft({ ...draft, scheduleId: event.target.value || undefined })}><option value="">연결하지 않음</option>{schedules.map((schedule) => <option value={schedule.id} key={schedule.id}>{schedule.title}</option>)}</select></label>
      </div>
      <div className="modal-actions"><button type="button" className="ghost" onClick={onClose}>취소</button><button className="primary">저장</button></div>
    </form>
  </div>;
}

export function RecordModal({ draft, setDraft, schedules, onClose, onSubmit }: { draft: DailyRecord; setDraft: (r: DailyRecord) => void; schedules: Schedule[]; onClose: () => void; onSubmit: (e: FormEvent) => void }) {
  return <div className="modal-backdrop"><form className="modal small" onSubmit={onSubmit}><div className="modal-head"><div><p>DAILY RECORD</p><h2>{draft.id ? "하루 기록 수정" : "작은 순간 기록"}</h2></div><button type="button" onClick={onClose}>×</button></div><div className="form-grid"><label className="field"><span>날짜</span><input type="date" required value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></label><label className="field"><span>시간</span><input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })} /></label><label className="field full-span"><span>제목</span><input autoFocus required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="어떤 순간이었나요?" /></label><label className="field full-span"><span>기록</span><textarea rows={7} required value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} placeholder="감정에 구애받지 않고 자유롭게 적어보세요" /></label><label className="field full-span"><span>관련 일정 (선택)</span><select value={draft.scheduleId ?? ""} onChange={(e) => setDraft({ ...draft, scheduleId: e.target.value || undefined })}><option value="">연결하지 않음</option>{schedules.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label></div><div className="modal-actions"><button type="button" className="ghost" onClick={onClose}>취소</button><button className="primary">저장</button></div></form></div>;
}

