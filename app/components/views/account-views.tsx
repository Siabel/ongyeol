"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import {
  deleteMyAccount,
  loadAppData,
  upsertDailyRecord,
  upsertDiary,
  upsertSchedule,
  upsertTransaction,
} from "../../../lib/app-data";
import { getSupabase } from "../../../lib/supabase";
import type { AppData, EmotionDiary } from "../../../lib/types";
import { PageHeader } from "../common";
import { dateKey, newId } from "../ui-helpers";

const LEGACY_STORE_KEY = "one-day-diary-v1";
function profileDate(value?: string) {
  if (!value) return "기록 없음";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export function ProfileView({
  data,
  setData,
  onToast,
  onOpenSettings,
}: {
  data: AppData;
  setData: (data: AppData) => void;
  onToast: (message: string) => void;
  onOpenSettings: () => void;
}) {
  const [nickname, setNickname] = useState(data.user.name);
  const [realName, setRealName] = useState(data.user.realName ?? "");
  const [saving, setSaving] = useState(false);
  const recordDates = new Set([
    ...data.schedules.map((item) => item.date),
    ...data.transactions.map((item) => item.date),
    ...data.diaries.map((item) => item.date),
    ...data.dailyRecords.map((item) => item.date),
  ]);
  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    const displayName = nickname.trim();
    const realNameValue = realName.trim();
    if (!displayName) return onToast("닉네임을 입력해 주세요");
    if (displayName.length > 30)
      return onToast("닉네임은 30자 이내로 입력해 주세요");
    if (realNameValue.length > 30)
      return onToast("실명은 30자 이내로 입력해 주세요");
    if (/[<>]/.test(displayName) || /[<>]/.test(realNameValue))
      return onToast("사용할 수 없는 문자가 포함되어 있어요");
    if (
      displayName === data.user.name &&
      realNameValue === (data.user.realName ?? "")
    )
      return onToast("변경된 정보가 없어요");
    setSaving(true);
    try {
      const { error } = await getSupabase()!.auth.updateUser({
        data: { display_name: displayName, real_name: realNameValue },
      });
      if (error) return onToast(error.message);
      setData({
        ...data,
        user: { ...data.user, name: displayName, realName: realNameValue },
      });
      onToast("프로필 정보를 변경했어요");
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : "프로필을 변경하지 못했어요",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader eyebrow="나의 작은다음" title="프로필" />
      <div className="profile-layout">
        <section className="profile-hero">
          <div className="profile-avatar" aria-hidden="true">
            {data.user.name.slice(0, 1).toUpperCase()}
          </div>
          <span className="profile-badge">PERSONAL ARCHIVE</span>
          <h2>{data.user.name}</h2>
          <p>나만의 작은 다음을 이어가는 기록</p>
          <div className="profile-counts">
            <span>
              <b>{data.schedules.length}</b>일정
            </span>
            <span>
              <b>{data.transactions.length}</b>거래
            </span>
            <span>
              <b>{data.diaries.length}</b>감정 일기
            </span>
            <span>
              <b>{data.dailyRecords.length}</b>하루 기록
            </span>
          </div>
        </section>
        <div className="profile-details">
          <section className="profile-card">
            <div className="section-title">
              <div>
                <h2>기본 정보</h2>
                <span>계정과 기록에 사용하는 정보</span>
              </div>
            </div>
            <form className="profile-name-form" onSubmit={saveProfile}>
              <label className="field">
                <span>닉네임</span>
                <input
                  value={nickname}
                  maxLength={30}
                  placeholder="작은다음에 표시할 이름"
                  onChange={(event) => setNickname(event.target.value)}
                />
              </label>
              <label className="field">
                <span>실명</span>
                <input
                  value={realName}
                  maxLength={30}
                  placeholder="선택 입력"
                  onChange={(event) => setRealName(event.target.value)}
                />
              </label>
              <button className="primary" disabled={saving}>
                {saving ? "저장 중…" : "변경사항 저장"}
              </button>
            </form>
            <div className="profile-account">
              <span>
                <small>로그인 이메일</small>
                <b>{data.user.email}</b>
              </span>
              <span>
                <small>작은다음을 시작한 날</small>
                <b>{profileDate(data.user.createdAt)}</b>
              </span>
              <span>
                <small>최근 로그인</small>
                <b>{profileDate(data.user.lastSignInAt)}</b>
              </span>
            </div>
          </section>
          <section className="profile-card profile-history">
            <div>
              <p>기록한 날짜</p>
              <strong>
                {recordDates.size}
                <small>일</small>
              </strong>
              <span>일정, 소비, 감정과 작은 순간을 남긴 날이에요.</span>
            </div>
            <button className="ghost" onClick={onOpenSettings}>
              계정 및 보안 설정
            </button>
          </section>
        </div>
      </div>
    </>
  );
}
export function SettingsView({
  data,
  setData,
  onToast,
}: {
  data: AppData;
  setData: (d: AppData) => void;
  onToast: (s: string) => void;
}) {
  const [hasLegacy, setHasLegacy] = useState(
    () =>
      typeof window !== "undefined" &&
      Boolean(localStorage.getItem(LEGACY_STORE_KEY)),
  );
  const [email, setEmail] = useState(data.user.email);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [deletePhrase, setDeletePhrase] = useState("");
  const download = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `jakda-backup-${dateKey()}.json`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  };
  const importData = async (source: Partial<AppData>) => {
    const schedules = (source.schedules ?? []).map((s) => ({
      ...s,
      id: newId(),
      userId: data.user.id,
      address: s.address ?? "",
      actualDate: s.actualDate ?? "",
      actualStartTime: s.actualStartTime ?? "",
      actualEndTime: s.actualEndTime ?? "",
      completedAt: s.completedAt ?? null,
      isRecurring: s.isRecurring ?? false,
      repeatFrequency: s.repeatFrequency ?? null,
      repeatEndDate: s.repeatEndDate ?? null,
      seriesId: null,
    }));
    const transactions = (source.transactions ?? []).map((t) => ({
      ...t,
      id: newId(),
      userId: data.user.id,
      memo: t.memo ?? "",
      source: t.source ?? "manual",
      scheduleId: undefined,
      repeatFrequency: t.repeatFrequency ?? null,
      repeatMonth: t.repeatMonth ?? null,
      repeatDay: t.repeatDay ?? null,
      repeatEndDate: t.repeatEndDate ?? null,
      seriesId: null,
    }));
    const diaries = (source.diaries ?? []).map((d) => {
      const legacy = d as EmotionDiary & {
        emotion?: string;
        intensity?: number;
      };
      return {
        ...d,
        id: newId(),
        userId: data.user.id,
        emotions: d.emotions?.length
          ? d.emotions
          : [
              {
                emotion: legacy.emotion ?? "calm",
                intensity: legacy.intensity ?? 3,
              },
            ],
      };
    });
    const records = (source.dailyRecords ?? []).map((r) => ({
      ...r,
      id: newId(),
      userId: data.user.id,
      scheduleId: undefined,
    }));
    await Promise.all([
      ...schedules.map(upsertSchedule),
      ...transactions.map(upsertTransaction),
      ...diaries.map(upsertDiary),
      ...records.map(upsertDailyRecord),
    ]);
    const refreshed = await loadAppData(
      (await getSupabase()!.auth.getUser()).data.user!,
    );
    setData(refreshed);
    onToast("기록을 계정으로 가져왔어요");
  };
  const restore = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await importData(JSON.parse(await file.text()));
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : "백업 파일을 읽지 못했어요",
      );
    }
  };
  const importLegacy = async () => {
    try {
      const raw = localStorage.getItem(LEGACY_STORE_KEY);
      if (!raw) return;
      await importData(JSON.parse(raw));
      localStorage.removeItem(LEGACY_STORE_KEY);
      setHasLegacy(false);
    } catch (error) {
      onToast(
        error instanceof Error
          ? error.message
          : "로컬 기록을 가져오지 못했어요",
      );
    }
  };
  const updateEmail = async (event: FormEvent) => {
    event.preventDefault();
    const client = getSupabase();
    if (!client || !email.trim() || email.trim() === data.user.email) return;
    const { error } = await client.auth.updateUser({ email: email.trim() });
    onToast(error ? error.message : "새 이메일의 확인 안내를 확인해 주세요");
  };
  const updatePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length < 8)
      return onToast("비밀번호는 8자 이상 입력해 주세요");
    if (password !== passwordConfirm)
      return onToast("비밀번호 확인이 일치하지 않아요");
    const { error } = await getSupabase()!.auth.updateUser({ password });
    if (!error) {
      setPassword("");
      setPasswordConfirm("");
    }
    onToast(error ? error.message : "비밀번호를 변경했어요");
  };
  const signOutOthers = async () => {
    const { error } = await getSupabase()!.auth.signOut({ scope: "others" });
    onToast(error ? error.message : "다른 기기의 세션을 종료했어요");
  };
  const deleteAccount = async () => {
    if (
      deletePhrase !== "계정 삭제" ||
      !window.confirm(
        "계정과 모든 기록을 영구 삭제할까요? 이 작업은 되돌릴 수 없습니다.",
      )
    )
      return;
    try {
      await deleteMyAccount();
      await getSupabase()!.auth.signOut({ scope: "local" });
    } catch (error) {
      onToast(
        error instanceof Error ? error.message : "계정을 삭제하지 못했어요",
      );
    }
  };
  return (
    <>
      <PageHeader eyebrow="나의 하루 관리" title="설정" />
      <div className="settings-grid">
        <section className="settings-card">
          <span className="settings-icon">⇩</span>
          <div>
            <h2>데이터 백업</h2>
            <p>
              현재 계정의 일정, 거래, 감정 일기, 하루 기록을 JSON 파일로
              내려받습니다.
            </p>
            <button className="primary" onClick={download}>
              백업 다운로드
            </button>
          </div>
        </section>
        <section className="settings-card">
          <span className="settings-icon">⇧</span>
          <div>
            <h2>데이터 가져오기</h2>
            <p>백업 파일의 기록을 현재 로그인한 계정에 추가합니다.</p>
            <label className="file-button">
              JSON 파일 선택
              <input type="file" accept="application/json" onChange={restore} />
            </label>
          </div>
        </section>
        {hasLegacy && (
          <section className="settings-card legacy-import">
            <span className="settings-icon">↻</span>
            <div>
              <h2>기존 로컬 기록 발견</h2>
              <p>
                이 브라우저에 저장되어 있던 예전 하루 기록을 현재 계정으로 옮길
                수 있어요.
              </p>
              <button className="primary" onClick={importLegacy}>
                내 계정으로 가져오기
              </button>
            </div>
          </section>
        )}
        <section className="settings-card account-card">
          <span className="settings-icon">@</span>
          <div>
            <h2>이메일 변경</h2>
            <p>
              로그인에 사용하는 이메일을 변경합니다. 설정에 따라 기존 이메일과
              새 이메일의 확인이 필요할 수 있어요.
            </p>
            <form className="account-form" onSubmit={updateEmail}>
              <label className="field">
                <span>새 이메일</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
              <button className="ghost">변경 요청</button>
            </form>
          </div>
        </section>
        <section className="settings-card account-card">
          <span className="settings-icon">＊</span>
          <div>
            <h2>비밀번호 변경</h2>
            <p>8자 이상의 새 비밀번호를 입력해 주세요.</p>
            <form className="account-form" onSubmit={updatePassword}>
              <label className="field">
                <span>새 비밀번호</span>
                <input
                  type="password"
                  minLength={8}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              <label className="field">
                <span>새 비밀번호 확인</span>
                <input
                  type="password"
                  minLength={8}
                  required
                  value={passwordConfirm}
                  onChange={(event) => setPasswordConfirm(event.target.value)}
                />
              </label>
              <button className="ghost">비밀번호 변경</button>
            </form>
          </div>
        </section>
        <section className="settings-card privacy">
          <span className="settings-icon">◎</span>
          <div>
            <h2>계정과 개인정보</h2>
            <p>
              <b>{data.user.email}</b> 계정으로 로그인되어 있습니다. 모든 기록은
              사용자 ID로 분리되고 데이터베이스 보안 정책으로 보호됩니다.
            </p>
            <div className="data-count">
              <span>
                일정 <b>{data.schedules.length}</b>
              </span>
              <span>
                거래 <b>{data.transactions.length}</b>
              </span>
              <span>
                감정 일기 <b>{data.diaries.length}</b>
              </span>
              <span>
                하루 기록 <b>{data.dailyRecords.length}</b>
              </span>
            </div>
            <div className="session-actions">
              <button className="ghost" onClick={signOutOthers}>
                다른 기기 로그아웃
              </button>
              <button
                className="text-button signout"
                onClick={() => getSupabase()?.auth.signOut({ scope: "local" })}
              >
                현재 기기 로그아웃
              </button>
            </div>
          </div>
        </section>
        <section className="settings-card danger-zone">
          <span className="settings-icon">!</span>
          <div>
            <h2>계정 삭제</h2>
            <p>
              계정과 일정, 거래, 감정 일기, 하루 기록을 모두 영구 삭제합니다.
              실행 전 <b>계정 삭제</b>를 입력해 주세요.
            </p>
            <div className="delete-account">
              <input
                aria-label="계정 삭제 확인 문구"
                placeholder="계정 삭제"
                value={deletePhrase}
                onChange={(event) => setDeletePhrase(event.target.value)}
              />
              <button
                disabled={deletePhrase !== "계정 삭제"}
                onClick={deleteAccount}
              >
                계정과 기록 삭제
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
