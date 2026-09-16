/* eslint-disable jsx-a11y/no-autofocus */
"use client";

import { FormEvent, useEffect, useState } from "react";
import type { Schedule, ScheduleStatus } from "../../../lib/types";
import { formatTime, pad, shiftDate, statusMap } from "../ui-helpers";

type PlaceResult = {
  id: string;
  name: string;
  address: string;
  roadAddress: string;
  category: string;
};

export function PlaceSearchField({
  place,
  address,
  onChange,
}: {
  place: string;
  address: string;
  onChange: (place: string, address: string) => void;
}) {
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
        const response = await fetch(
          `/api/places?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as {
          places?: PlaceResult[];
          error?: string;
        };
        if (!response.ok)
          throw new Error(payload.error ?? "장소 검색에 실패했어요.");
        setResults(payload.places ?? []);
        setSearchError(
          payload.places?.length
            ? ""
            : "검색 결과가 없어요. 주소를 직접 입력할 수도 있어요.",
        );
      } catch (error) {
        if (!controller.signal.aborted)
          setSearchError(
            error instanceof Error ? error.message : "장소 검색에 실패했어요.",
          );
      } finally {
        if (!controller.signal.aborted) setLoadingPlaces(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
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

  return (
    <div className="field place-search-field">
      <span>장소명</span>
      <div className="place-search-input">
        <input
          value={place}
          onChange={(event) => changePlace(event.target.value)}
          placeholder="예: 서울숲"
          autoComplete="off"
        />
        {loadingPlaces && <i>검색 중</i>}
      </div>
      {results.length > 0 && (
        <div
          className="place-results"
          role="listbox"
          aria-label="장소 검색 결과"
        >
          {results.map((result) => (
            <button
              type="button"
              role="option"
              aria-selected="false"
              key={result.id}
              onClick={() => selectPlace(result)}
            >
              <b>{result.name}</b>
              <span>{result.address || result.roadAddress}</span>
              {result.roadAddress && result.roadAddress !== result.address && (
                <small>{result.roadAddress}</small>
              )}
            </button>
          ))}
        </div>
      )}
      {searchError && (
        <small className="place-search-message" aria-live="polite">
          {searchError}
        </small>
      )}
    </div>
  );
}

export function TimePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [hourValue, minuteValue] = formatTime(value || "09:00")
    .split(":")
    .map(Number);
  const minuteOptions = [...new Set([0, 10, 20, 30, 40, 50, minuteValue])].sort(
    (a, b) => a - b,
  );
  const period = hourValue >= 12 ? "PM" : "AM";
  const hour = hourValue % 12 || 12;
  const update = (nextPeriod: string, nextHour: number, nextMinute: number) => {
    const nextHour24 = (nextHour % 12) + (nextPeriod === "PM" ? 12 : 0);
    onChange(`${pad(nextHour24)}:${pad(nextMinute)}`);
  };
  const setCurrentTime = () => {
    const now = new Date();
    onChange(
      `${pad(now.getHours())}:${pad(Math.floor(now.getMinutes() / 10) * 10)}`,
    );
  };

  return (
    <div className="field time-field">
      <span>{label}</span>
      <div className="time-picker">
        <select
          aria-label={`${label} 오전 오후`}
          value={period}
          onChange={(event) => update(event.target.value, hour, minuteValue)}
        >
          <option value="AM">오전</option>
          <option value="PM">오후</option>
        </select>
        <select
          aria-label={`${label} 시`}
          value={hour}
          onChange={(event) =>
            update(period, Number(event.target.value), minuteValue)
          }
        >
          {Array.from({ length: 12 }, (_, index) => index + 1).map((item) => (
            <option key={item} value={item}>
              {item}시
            </option>
          ))}
        </select>
        <select
          aria-label={`${label} 분`}
          value={minuteValue}
          onChange={(event) => update(period, hour, Number(event.target.value))}
        >
          {minuteOptions.map((item) => (
            <option key={item} value={item}>
              {pad(item)}분
            </option>
          ))}
        </select>
        <button
          type="button"
          className="clock-button"
          aria-label={`${label}에 현재 시간 반영`}
          title="현재 시간 반영"
          onClick={setCurrentTime}
        >
          ◷
        </button>
      </div>
    </div>
  );
}

export function ScheduleModal({
  draft,
  setDraft,
  completionMode,
  hasActualExpense,
  editSeries,
  setEditSeries,
  saving,
  onClose,
  onDelete,
  onSubmit,
}: {
  draft: Schedule;
  setDraft: (s: Schedule) => void;
  completionMode: boolean;
  hasActualExpense: boolean;
  editSeries: boolean;
  setEditSeries: (value: boolean) => void;
  saving: boolean;
  onClose: () => void;
  onDelete?: () => void;
  onSubmit: (e: FormEvent) => void;
}) {
  const selectedStartTime = completionMode
    ? draft.actualStartTime
    : draft.startTime;
  const selectedEndTime = completionMode ? draft.actualEndTime : draft.endTime;
  const invalidTimeRange = Boolean(
    selectedStartTime &&
    selectedEndTime &&
    selectedEndTime <= selectedStartTime,
  );
  const setRecurring = (isRecurring: boolean) =>
    setDraft({
      ...draft,
      isRecurring,
      repeatFrequency: isRecurring ? (draft.repeatFrequency ?? "weekly") : null,
      repeatEndDate: isRecurring
        ? (draft.repeatEndDate ?? shiftDate(draft.date, 365))
        : null,
    });
  return (
    <div className="modal-backdrop">
      <form className="modal" onSubmit={onSubmit}>
        <div className="modal-head">
          <div>
            <p>{completionMode ? "COMPLETE SCHEDULE" : "SCHEDULE"}</p>
            <h2>
              {completionMode
                ? "실제 일정 확인"
                : draft.id
                  ? "일정 수정"
                  : "새 일정"}
            </h2>
            {completionMode && (
              <span className="modal-description">
                예정 정보는 그대로 보존됩니다. 실제로 진행한 날짜와 시간을
                확인해 주세요.
              </span>
            )}
          </div>
          <button type="button" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="form-grid">
          <label className="field full-span">
            <span>일정 이름</span>
            <input
              autoFocus
              required
              value={draft.title}
              onChange={(event) =>
                setDraft({ ...draft, title: event.target.value })
              }
            />
          </label>
          <label className="field">
            <span>{completionMode ? "실제 날짜" : "예정 날짜"}</span>
            <input
              type="date"
              required
              value={completionMode ? draft.actualDate : draft.date}
              onChange={(event) =>
                setDraft(
                  completionMode
                    ? { ...draft, actualDate: event.target.value }
                    : { ...draft, date: event.target.value },
                )
              }
            />
          </label>
          <label className="field">
            <span>상태</span>
            <select
              disabled={completionMode}
              value={draft.status}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  status: event.target.value as ScheduleStatus,
                })
              }
            >
              {Object.entries(statusMap).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <TimePicker
            label={completionMode ? "실제 시작 시간" : "예정 시작 시간"}
            value={completionMode ? draft.actualStartTime : draft.startTime}
            onChange={(value) =>
              setDraft(
                completionMode
                  ? { ...draft, actualStartTime: value }
                  : { ...draft, startTime: value },
              )
            }
          />
          <TimePicker
            label={completionMode ? "실제 종료 시간" : "예정 종료 시간"}
            value={completionMode ? draft.actualEndTime : draft.endTime}
            onChange={(value) =>
              setDraft(
                completionMode
                  ? { ...draft, actualEndTime: value }
                  : { ...draft, endTime: value },
              )
            }
          />
          {invalidTimeRange && (
            <p className="time-range-error full-span" role="alert">
              종료 시간은 시작 시간보다 늦어야 해요.
            </p>
          )}
          <PlaceSearchField
            place={draft.place}
            address={draft.address}
            onChange={(place, address) =>
              setDraft({ ...draft, place, address })
            }
          />
          <label className="field">
            <span>주소</span>
            <input
              value={draft.address}
              onChange={(event) =>
                setDraft({ ...draft, address: event.target.value })
              }
              placeholder="검색 결과 선택 또는 직접 입력"
            />
          </label>
          <label className="field">
            <span>관련 인물</span>
            <input
              value={draft.people}
              onChange={(event) =>
                setDraft({ ...draft, people: event.target.value })
              }
            />
          </label>
          <label className="field">
            <span>{completionMode ? "예상 지출 확인" : "예상 지출"}</span>
            <input
              type="number"
              min="0"
              value={draft.expectedCost}
              onChange={(event) =>
                setDraft({ ...draft, expectedCost: Number(event.target.value) })
              }
            />
          </label>
          {!completionMode && (
            <div className="fixed-section full-span schedule-repeat">
              <label className="check-field fixed-check">
                <input
                  type="checkbox"
                  checked={draft.isRecurring}
                  onChange={(event) => setRecurring(event.target.checked)}
                />{" "}
                반복 일정
              </label>
              {draft.isRecurring && (
                <div className="repeat-settings">
                  <span>반복 주기</span>
                  <div className="repeat-frequency">
                    {(
                      [
                        ["daily", "매일"],
                        ["weekly", "매주"],
                        ["monthly", "매월"],
                        ["yearly", "매년"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        type="button"
                        key={value}
                        className={
                          draft.repeatFrequency === value ? "active" : ""
                        }
                        onClick={() =>
                          setDraft({ ...draft, repeatFrequency: value })
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <label className="field repeat-end">
                    <span>반복 종료일</span>
                    <input
                      type="date"
                      required
                      value={draft.repeatEndDate ?? ""}
                      min={draft.date}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          repeatEndDate: event.target.value,
                        })
                      }
                    />
                  </label>
                  {draft.seriesId && (
                    <label className="check-field series-check">
                      <input
                        type="checkbox"
                        checked={editSeries}
                        onChange={(event) =>
                          setEditSeries(event.target.checked)
                        }
                      />{" "}
                      이 회차 이후 반복 일정 전체 수정
                    </label>
                  )}
                </div>
              )}
            </div>
          )}
          <label className="field full-span">
            <span>메모</span>
            <textarea
              rows={3}
              value={draft.memo}
              onChange={(event) =>
                setDraft({ ...draft, memo: event.target.value })
              }
            />
          </label>
        </div>
        <div className="modal-actions">
          {onDelete && (
            <button
              type="button"
              className="modal-delete"
              disabled={saving}
              onClick={onDelete}
            >
              일정 삭제
            </button>
          )}
          <button type="button" className="ghost" onClick={onClose}>
            취소
          </button>
          <button className="primary" disabled={invalidTimeRange || saving}>
            {saving
              ? "저장 중…"
              : completionMode && (draft.expectedCost > 0 || hasActualExpense)
                ? "다음: 실제 지출"
                : completionMode
                  ? "완료로 변경"
                  : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}
