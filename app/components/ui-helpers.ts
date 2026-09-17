import * as holidayPresets from "@hyunbinseo/holidays-kr/all";
import type { EmotionDiary, Schedule, ScheduleStatus } from "../../lib/types";

export const emotions = [
  { value: "joy", emoji: "😊", label: "기쁨", color: "#F4B73E" },
  { value: "calm", emoji: "😌", label: "평온", color: "#6CAD8F" },
  { value: "tired", emoji: "😮‍💨", label: "피곤", color: "#8C91A3" },
  { value: "sad", emoji: "😔", label: "슬픔", color: "#7188B5" },
  { value: "angry", emoji: "😤", label: "화남", color: "#D96B5F" },
];
export const statusMap: Record<ScheduleStatus, string> = {
  planned: "예정",
  done: "완료",
  partial: "일부 완료",
  cancelled: "취소",
};
export const expenseCategories = [
  "식비",
  "교통",
  "생활",
  "주거",
  "문화",
  "건강",
  "교육",
  "쇼핑",
  "기타 지출",
];
export const incomeCategories = [
  "급여",
  "용돈",
  "사업 소득",
  "상여",
  "이자",
  "배당",
  "환급",
  "중고 판매",
  "기타 수입",
];
export const koreanHolidays = holidayPresets as unknown as Record<
  string,
  Record<string, readonly string[]>
>;
export const pad = (value: number) => String(value).padStart(2, "0");
export const dateKey = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const newId = () => crypto.randomUUID();
export const money = (value: number) =>
  `${new Intl.NumberFormat("ko-KR").format(value)}원`;
export const formatTime = (value: string) => value.slice(0, 5);
export const shiftDate = (date: string, amount: number) => {
  const next = new Date(`${date}T12:00:00`);
  next.setDate(next.getDate() + amount);
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
};
export const dateWithParts = (year: number, month: number, day: number) => {
  const safeDay = Math.min(day, new Date(year, month, 0).getDate());
  return `${year}-${pad(month)}-${pad(safeDay)}`;
};
export const displayDate = (date: string, withYear = false) =>
  new Intl.DateTimeFormat(
    "ko-KR",
    withYear
      ? { year: "numeric", month: "long", day: "numeric", weekday: "long" }
      : { month: "long", day: "numeric", weekday: "short" },
  ).format(new Date(`${date}T00:00:00`));
export const mapHref = (schedule: Schedule) => {
  const query = [schedule.place, schedule.address].filter(Boolean).join(" ");
  return query
    ? `https://map.naver.com/p/search/${encodeURIComponent(query)}`
    : "";
};
export const strongestEmotion = (diary?: EmotionDiary) => {
  const [first, ...rest] = diary?.emotions ?? [];
  const entry = first
    ? rest.reduce(
        (strongest, current) =>
          current.intensity > strongest.intensity ? current : strongest,
        first,
      )
    : undefined;
  return entry
    ? emotions.find((emotion) => emotion.value === entry.emotion)
    : undefined;
};
