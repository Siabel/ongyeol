import type { RepeatFrequency } from "./types";

const toDate = (value: string) => new Date(`${value}T12:00:00`);
const key = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

function nextDate(current: Date, frequency: RepeatFrequency, anchorMonth: number, anchorDay: number) {
  const next = new Date(current);
  if (frequency === "daily") next.setDate(next.getDate() + 1);
  if (frequency === "weekly") next.setDate(next.getDate() + 7);
  if (frequency === "monthly") {
    next.setDate(1);
    next.setMonth(next.getMonth() + 1);
    next.setDate(Math.min(anchorDay, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
  }
  if (frequency === "yearly") {
    next.setDate(1);
    next.setFullYear(next.getFullYear() + 1);
    next.setMonth(anchorMonth - 1);
    next.setDate(Math.min(anchorDay, new Date(next.getFullYear(), anchorMonth, 0).getDate()));
  }
  return next;
}

export function occurrenceDates(start: string, frequency: RepeatFrequency, end: string, repeatMonth?: number | null, repeatDay?: number | null) {
  const dates: string[] = [];
  let cursor = toDate(start);
  const endDate = toDate(end);
  const anchorMonth = repeatMonth ?? cursor.getMonth() + 1;
  const anchorDay = repeatDay ?? cursor.getDate();
  while (cursor <= endDate && dates.length < 400) {
    dates.push(key(cursor));
    cursor = nextDate(cursor, frequency, anchorMonth, anchorDay);
  }
  return dates;
}
