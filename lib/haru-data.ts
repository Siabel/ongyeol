import type { User } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";
import { AppData, DailyRecord, EmotionDiary, EmotionEntry, Schedule, Transaction, emptyAppData } from "./types";

const db = () => {
  const client = getSupabase();
  if (!client) throw new Error("Supabase 연결 정보가 없습니다.");
  return client;
};

const throwIfError = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

const jwtFutureError = (error: { code?: string; message?: string } | null) =>
  Boolean(error && (error.code === "PGRST303" || /jwt issued at future/i.test(error.message ?? "")));

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function diaryEmotions(row: Record<string, unknown>): EmotionEntry[] {
  if (Array.isArray(row.emotions) && row.emotions.length > 0) {
    return row.emotions
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((item) => ({ emotion: String(item.emotion), intensity: Number(item.intensity) || 1 }));
  }
  return [{ emotion: String(row.emotion ?? "calm"), intensity: Number(row.intensity) || 3 }];
}

export async function loadHaruData(user: User): Promise<AppData> {
  const client = db();
  const loadTables = () => Promise.all([
    client.from("schedules").select("*").order("date").order("start_time"),
    client.from("transactions").select("*").order("date", { ascending: false }),
    client.from("emotion_diaries").select("*").order("date", { ascending: false }),
    client.from("daily_records").select("*").order("date", { ascending: false }).order("record_time", { ascending: false }),
  ]);
  const retryDelays = [800, 1800, 3500, 6500];
  let result = await loadTables();
  for (const delay of retryDelays) {
    if (!result.some(({ error }) => jwtFutureError(error))) break;
    await wait(delay);
    result = await loadTables();
  }
  const [schedules, transactions, diaries, records] = result;
  if (result.some(({ error }) => jwtFutureError(error))) {
    throw new Error("로그인 정보의 시간 동기화가 지연되고 있어요. 잠시 후 다시 연결해 주세요.");
  }
  [schedules, transactions, diaries, records].forEach(({ error }) => throwIfError(error));

  const data = emptyAppData({
    id: user.id,
    email: user.email ?? "",
    name: String(user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? "나"),
    realName: String(user.user_metadata?.real_name ?? ""),
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at,
  });
  data.schedules = (schedules.data ?? []).map((r) => ({
    id: r.id, userId: r.user_id, title: r.title, date: r.date, startTime: r.start_time?.slice(0, 5) ?? "",
    endTime: r.end_time?.slice(0, 5) ?? "", actualDate: r.actual_date ?? "",
    actualStartTime: r.actual_start_time?.slice(0, 5) ?? "", actualEndTime: r.actual_end_time?.slice(0, 5) ?? "",
    completedAt: r.completed_at ?? null, place: r.place_name ?? "", address: r.address ?? "",
    people: r.people ?? "", expectedCost: Number(r.expected_cost), status: r.status, memo: r.memo ?? "",
    isRecurring: Boolean(r.is_recurring), repeatFrequency: r.repeat_frequency ?? null,
    repeatEndDate: r.repeat_end_date ?? null, seriesId: r.series_id ?? null,
  }));
  data.transactions = (transactions.data ?? []).map((r) => ({
    id: r.id, userId: r.user_id, type: r.type, amount: Number(r.amount), date: r.date,
    category: r.category, title: r.title, memo: r.memo ?? "",
    source: r.source ?? (r.schedule_id ? "schedule_actual" : "manual"), fixed: r.is_fixed,
    repeatFrequency: r.repeat_frequency ?? null,
    repeatMonth: r.repeat_month == null ? null : Number(r.repeat_month),
    repeatDay: r.repeat_day == null ? null : Number(r.repeat_day),
    repeatEndDate: r.repeat_end_date ?? null, seriesId: r.series_id ?? null,
    scheduleId: r.schedule_id ?? undefined,
  }));
  data.diaries = (diaries.data ?? []).map((r) => ({
    id: r.id, userId: r.user_id, date: r.date, emotions: diaryEmotions(r),
    cause: r.cause ?? "", note: r.note ?? "",
  }));
  data.dailyRecords = (records.data ?? []).map((r) => ({
    id: r.id, userId: r.user_id, date: r.date, time: r.record_time?.slice(0, 5) ?? "",
    title: r.title, content: r.content, scheduleId: r.schedule_id ?? undefined,
  }));
  return data;
}

export async function upsertSchedule(item: Schedule) {
  const { error } = await db().from("schedules").upsert({
    id: item.id, user_id: item.userId, title: item.title, date: item.date,
    start_time: item.startTime, end_time: item.endTime, place_name: item.place,
    actual_date: item.actualDate || null, actual_start_time: item.actualStartTime || null,
    actual_end_time: item.actualEndTime || null, completed_at: item.completedAt,
    address: item.address,
    people: item.people, expected_cost: item.expectedCost, status: item.status, memo: item.memo,
    is_recurring: item.isRecurring, repeat_frequency: item.isRecurring ? item.repeatFrequency : null,
    repeat_end_date: item.isRecurring ? item.repeatEndDate : null, series_id: item.seriesId,
  });
  throwIfError(error);
}

export async function removeSchedule(id: string) {
  const { error } = await db().from("schedules").delete().eq("id", id);
  throwIfError(error);
}

export async function upsertTransaction(item: Transaction) {
  const { error } = await db().from("transactions").upsert({
    id: item.id, user_id: item.userId, type: item.type, amount: item.amount, date: item.date,
    category: item.category, title: item.title, memo: item.memo, source: item.source,
    is_fixed: item.fixed, is_repeat: item.fixed,
    repeat_frequency: item.fixed ? item.repeatFrequency : null,
    repeat_month: item.fixed && item.repeatFrequency === "yearly" ? item.repeatMonth : null,
    repeat_day: item.fixed && item.repeatFrequency !== "daily" ? item.repeatDay : null,
    repeat_end_date: item.fixed ? item.repeatEndDate : null, series_id: item.seriesId,
    schedule_id: item.scheduleId ?? null,
  });
  throwIfError(error);
}

export async function removeTransaction(id: string) {
  const { error } = await db().from("transactions").delete().eq("id", id);
  throwIfError(error);
}

export async function upsertDiary(item: EmotionDiary) {
  const primary = item.emotions[0] ?? { emotion: "calm", intensity: 3 };
  const { error } = await db().from("emotion_diaries").upsert({
    id: item.id, user_id: item.userId, date: item.date, emotion: primary.emotion,
    intensity: primary.intensity, emotions: item.emotions, cause: item.cause, note: item.note,
  }, { onConflict: "user_id,date" });
  throwIfError(error);
}

export async function upsertDailyRecord(item: DailyRecord) {
  const { error } = await db().from("daily_records").upsert({
    id: item.id, user_id: item.userId, date: item.date, record_time: item.time || null,
    title: item.title, content: item.content, schedule_id: item.scheduleId ?? null,
  });
  throwIfError(error);
}

export async function removeDailyRecord(id: string) {
  const { error } = await db().from("daily_records").delete().eq("id", id);
  throwIfError(error);
}

export async function deleteMyAccount() {
  const { error } = await db().rpc("delete_my_account");
  throwIfError(error);
}
