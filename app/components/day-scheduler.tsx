"use client";

import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import type { Schedule } from "../../lib/types";
import { dateKey, displayDate, formatTime, statusMap } from "./ui-helpers";

const HOUR_HEIGHT = 64;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

type PositionedSchedule = {
  schedule: Schedule;
  start: number;
  end: number;
  lane: number;
  lanes: number;
};

const toMinutes = (time: string) => {
  const [hour = 0, minute = 0] = time.split(":").map(Number);
  return Math.min(24 * 60, Math.max(0, hour * 60 + minute));
};

const timeAt = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

function positionSchedules(schedules: Schedule[]): PositionedSchedule[] {
  const entries = schedules
    .map((schedule) => {
      const start = toMinutes(schedule.startTime);
      const rawEnd = toMinutes(schedule.endTime);
      return { schedule, start, end: Math.max(start + 15, rawEnd), lane: 0, lanes: 1 };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  let group: PositionedSchedule[] = [];
  let active: PositionedSchedule[] = [];
  let groupEnd = -1;
  const finishGroup = () => {
    const laneCount = Math.max(1, ...group.map((entry) => entry.lane + 1));
    group.forEach((entry) => { entry.lanes = laneCount; });
  };

  entries.forEach((entry) => {
    if (group.length && entry.start >= groupEnd) {
      finishGroup();
      group = [];
      active = [];
      groupEnd = -1;
    }
    active = active.filter((item) => item.end > entry.start);
    const occupied = new Set(active.map((item) => item.lane));
    let lane = 0;
    while (occupied.has(lane)) lane += 1;
    entry.lane = lane;
    active.push(entry);
    group.push(entry);
    groupEnd = Math.max(groupEnd, entry.end);
  });
  if (group.length) finishGroup();
  return entries;
}

function durationLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}분`;
  return rest ? `${hours}시간 ${rest}분` : `${hours}시간`;
}

export function DayScheduler({ date, schedules, onAdd, onEdit }: {
  date: string;
  schedules: Schedule[];
  onAdd: (date: string, startTime?: string, endTime?: string) => void;
  onEdit: (schedule: Schedule) => void;
}) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const positioned = useMemo(() => positionSchedules(schedules), [schedules]);
  const plannedMinutes = schedules
    .filter((schedule) => schedule.status !== "cancelled")
    .reduce((sum, schedule) => sum + Math.max(0, toMinutes(schedule.endTime) - toMinutes(schedule.startTime)), 0);
  const completed = schedules.filter((schedule) => schedule.status === "done").length;
  const now = new Date();
  const isToday = date === dateKey(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const initialHour = isToday ? Math.max(0, currentMinutes / 60 - 2) : 6;
    timeline.scrollTop = initialHour * HOUR_HEIGHT;
  }, [date, isToday, currentMinutes]);

  return <section className="day-scheduler">
    <div className="scheduler-intro">
      <div><p>DAY PLANNER</p><h2>{displayDate(date, true)}</h2></div>
      <button className="primary" onClick={() => onAdd(date)}>＋ 일정 추가</button>
    </div>
    <div className="scheduler-summary" aria-label="선택한 날짜의 일정 요약">
      <span><small>예정된 일정</small><b>{schedules.length}개</b></span>
      <span><small>계획한 시간</small><b>{durationLabel(plannedMinutes)}</b></span>
      <span><small>완료</small><b>{completed}개</b></span>
    </div>
    <div className="scheduler-scroll" ref={timelineRef}>
      <div className="scheduler-canvas" style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}>
        <div className="scheduler-hours">
          {HOURS.map((hour) => <button
            type="button"
            className="scheduler-hour"
            key={hour}
            style={{ height: `${HOUR_HEIGHT}px` }}
            onClick={() => onAdd(date, timeAt(hour), hour === 23 ? "23:50" : timeAt(hour + 1))}
            aria-label={`${timeAt(hour)}에 일정 추가`}
          ><time>{timeAt(hour)}</time><span>이 시간에 일정 추가</span></button>)}
        </div>
        <div className="scheduler-events">
          {positioned.map(({ schedule, start, end, lane, lanes }) => {
            const style = {
              "--event-top": `${(start / 60) * HOUR_HEIGHT}px`,
              "--event-height": `${Math.max(40, ((end - start) / 60) * HOUR_HEIGHT - 4)}px`,
              "--event-left": `${(lane / lanes) * 100}%`,
              "--event-width": `${100 / lanes}%`,
            } as CSSProperties;
            return <button type="button" className={`scheduler-event ${schedule.status}`} style={style} key={schedule.id} onClick={() => onEdit(schedule)}>
              <span>{formatTime(schedule.startTime)}–{formatTime(schedule.endTime)}</span>
              <b>{schedule.title}</b>
              <small>{schedule.place || statusMap[schedule.status]}</small>
            </button>;
          })}
        </div>
        {isToday ? <div className="scheduler-now" style={{ top: `${(currentMinutes / 60) * HOUR_HEIGHT}px` }}><i /><span>지금</span></div> : null}
      </div>
    </div>
  </section>;
}
