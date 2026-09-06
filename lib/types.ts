export type View = "today" | "calendar" | "ledger" | "stats" | "records" | "diary" | "profile" | "settings";
export type ScheduleStatus = "planned" | "done" | "partial" | "cancelled";
export type TransactionType = "income" | "expense";
export type RepeatFrequency = "yearly" | "monthly" | "weekly" | "daily";
export type TransactionSource = "manual" | "schedule_actual";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
  lastSignInAt?: string;
};

export type Schedule = {
  id: string;
  userId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  actualDate: string;
  actualStartTime: string;
  actualEndTime: string;
  completedAt: string | null;
  place: string;
  address: string;
  people: string;
  expectedCost: number;
  status: ScheduleStatus;
  memo: string;
  isRecurring: boolean;
  repeatFrequency: RepeatFrequency | null;
  repeatEndDate: string | null;
  seriesId: string | null;
};

export type Transaction = {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  date: string;
  category: string;
  title: string;
  memo: string;
  source: TransactionSource;
  fixed: boolean;
  repeatFrequency: RepeatFrequency | null;
  repeatMonth: number | null;
  repeatDay: number | null;
  repeatEndDate: string | null;
  seriesId: string | null;
  scheduleId?: string;
};

export type EmotionEntry = {
  emotion: string;
  intensity: number;
};

export type EmotionDiary = {
  id: string;
  userId: string;
  date: string;
  emotions: EmotionEntry[];
  cause: string;
  note: string;
};

export type DailyRecord = {
  id: string;
  userId: string;
  date: string;
  time: string;
  title: string;
  content: string;
  scheduleId?: string;
};

export type AppData = {
  version: 2;
  user: AppUser;
  schedules: Schedule[];
  transactions: Transaction[];
  diaries: EmotionDiary[];
  dailyRecords: DailyRecord[];
};

export function emptyAppData(user: AppUser): AppData {
  return { version: 2, user, schedules: [], transactions: [], diaries: [], dailyRecords: [] };
}
