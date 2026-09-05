"use client";

import { FormEvent, useState } from "react";
import { getSupabase } from "../../lib/supabase";
import { BrandLogo } from "./common";

type AuthMode = "login" | "signup" | "recovery";
type FieldName = "name" | "email" | "password" | "passwordConfirmation";
type FieldErrors = Partial<Record<FieldName, string>>;
type Notice = { kind: "error" | "success"; text: string } | null;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const invalidNamePattern = /[<>]/;

function authErrorMessage(message: string) {
  if (/user already registered/i.test(message)) return "이미 가입되어 있는 이메일입니다. 로그인하거나 비밀번호 찾기를 이용해 주세요.";
  if (/invalid login credentials/i.test(message)) return "이메일 또는 비밀번호가 올바르지 않아요.";
  if (/email not confirmed/i.test(message)) return "이메일 인증이 완료되지 않았어요. 받은 메일의 인증 링크를 확인해 주세요.";
  if (/password.*at least|weak password/i.test(message)) return "비밀번호가 보안 기준을 충족하지 않아요. 6자 이상으로 입력해 주세요.";
  if (/rate limit|too many requests/i.test(message)) return "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.";
  if (/email address not authorized/i.test(message)) return "현재 메일 발송 설정에서 허용되지 않은 이메일이에요. 관리자에게 문의해 주세요.";
  if (/failed to fetch|fetch failed|network/i.test(message)) return "로그인 서버에 연결할 수 없어요. 잠시 후 다시 시도하거나 Supabase 연결 설정을 확인해 주세요.";
  return message;
}

function validate(mode: AuthMode, values: { name: string; email: string; password: string; passwordConfirmation: string }) {
  const errors: FieldErrors = {};
  const name = values.name.trim();
  const email = values.email.trim();

  if (mode === "signup") {
    if (!name) errors.name = "이름을 입력해 주세요.";
    else if (name.length > 30) errors.name = "이름은 30자 이내로 입력해 주세요.";
    else if (invalidNamePattern.test(name)) errors.name = "이름에 사용할 수 없는 문자가 포함되어 있어요.";
  }
  if (!email) errors.email = "이메일을 입력해 주세요.";
  else if (!emailPattern.test(email)) errors.email = "올바른 이메일 형식으로 입력해 주세요.";

  if (mode !== "recovery") {
    if (!values.password) errors.password = "비밀번호를 입력해 주세요.";
    else if (values.password.length < 6) errors.password = "비밀번호는 6자 이상이어야 해요.";
  }
  if (mode === "signup") {
    if (!values.passwordConfirmation) errors.passwordConfirmation = "비밀번호를 한 번 더 입력해 주세요.";
    else if (values.password !== values.passwordConfirmation) errors.passwordConfirmation = "비밀번호가 일치하지 않아요.";
  }
  return errors;
}

export function SetupRequired() {
  return <main className="auth-page"><section className="auth-stage"><aside className="auth-story"><BrandLogo inverse /><div><p>ONE FLOW, YOUR STORY</p><h2>흩어진 하루를<br />하나의 결로 이어요.</h2><span>일정과 감정, 소비와 작은 순간까지.</span></div></aside><section className="auth-card setup-card"><div className="auth-card-mark">설정</div><p className="auth-kicker">SUPABASE SETUP</p><h1>데이터 저장소를 연결해 주세요</h1><p>회원가입과 사용자별 기록 저장 기능은 준비되어 있습니다. 프로젝트 루트의 <code>.env.local</code>에 Supabase 프로젝트 URL과 Publishable Key를 입력하면 로그인 화면이 열립니다.</p><div className="setup-code"><span>NEXT_PUBLIC_SUPABASE_URL=...</span><span>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...</span></div><small>키를 입력한 뒤 개발 서버를 다시 시작해 주세요. 비밀키인 service_role 키는 넣지 마세요.</small></section></section></main>;
}

export function AuthGate() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);
  const [blockedSignupEmail, setBlockedSignupEmail] = useState("");

  const changeMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setPassword("");
    setPasswordConfirmation("");
    setErrors({});
    setNotice(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setNotice(null);
    const normalizedEmail = email.trim().toLowerCase();
    if (mode === "signup" && blockedSignupEmail === normalizedEmail) {
      setNotice({ kind: "error", text: "이미 가입되어 있는 이메일입니다. 로그인하거나 비밀번호 찾기를 이용해 주세요." });
      return;
    }
    const nextErrors = validate(mode, { name, email, password, passwordConfirmation });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const client = getSupabase();
    if (!client) {
      setNotice({ kind: "error", text: "데이터 저장소 설정을 확인해 주세요." });
      return;
    }

    setBusy(true);
    try {
      if (mode === "recovery") {
        const { error } = await client.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/?reset-password=true`,
        });
        if (error) setNotice({ kind: "error", text: authErrorMessage(error.message) });
        else setNotice({ kind: "success", text: "비밀번호 변경 메일을 요청했어요. 가입된 이메일이라면 잠시 후 메일이 도착합니다." });
        return;
      }

      const result = mode === "login"
        ? await client.auth.signInWithPassword({ email: normalizedEmail, password })
        : await client.auth.signUp({
            email: normalizedEmail,
            password,
            options: {
              data: { display_name: name.trim() },
              emailRedirectTo: window.location.origin,
            },
          });

      const duplicateSignup = mode === "signup" && (
        Boolean(result.error && /user already registered/i.test(result.error.message)) ||
        Boolean(!result.error && result.data.user && result.data.user.identities?.length === 0)
      );
      if (duplicateSignup) {
        setBlockedSignupEmail(normalizedEmail);
        setNotice({ kind: "error", text: "이미 가입되어 있는 이메일입니다. 로그인하거나 비밀번호 찾기를 이용해 주세요." });
      } else if (result.error) {
        setNotice({ kind: "error", text: authErrorMessage(result.error.message) });
      } else if (mode === "signup" && !result.data.session) {
        setNotice({ kind: "success", text: "인증 메일을 보냈습니다. 이메일 인증 후 로그인해 주세요." });
      }
    } catch (error) {
      console.error("[auth] Supabase request failed", error);
      setNotice({ kind: "error", text: "로그인 서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요." });
    } finally {
      setBusy(false);
    }
  };

  const title = mode === "login" ? "다시 만나요" : mode === "signup" ? "나만의 온결을 시작해요" : "비밀번호를 다시 설정해요";
  const description = mode === "login"
    ? "기록은 로그인한 계정에 안전하게 이어집니다."
    : mode === "signup"
      ? "계정을 만들면 모든 기록이 사용자별로 분리되어 저장됩니다."
      : "가입한 이메일로 비밀번호 변경 링크를 보내드릴게요.";

  return <main className="auth-page"><section className="auth-stage"><aside className="auth-story"><BrandLogo inverse /><div><p>ONE FLOW, YOUR STORY</p><h2>흩어진 하루를<br />하나의 결로 이어요.</h2><span>일정과 감정, 소비와 작은 순간까지.</span></div><small>오늘의 모든 조각은 결국 나를 이루는 결이 됩니다.</small></aside><section className="auth-card"><div className="auth-card-mark">온</div><p className="auth-kicker">PRIVATE LIFE ARCHIVE</p><h1>{title}</h1><p>{description}</p><form onSubmit={submit} noValidate>
    {mode === "signup" && <label className="field"><span>이름</span><input value={name} onChange={(event) => { setName(event.target.value); setErrors((current) => ({ ...current, name: undefined })); }} placeholder="기록에 표시할 이름" maxLength={30} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-error" : undefined} />{errors.name && <small id="name-error" className="field-error">{errors.name}</small>}</label>}
    <label className="field"><span>이메일</span><input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setBlockedSignupEmail(""); setErrors((current) => ({ ...current, email: undefined })); }} autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} />{errors.email && <small id="email-error" className="field-error">{errors.email}</small>}</label>
    {mode !== "recovery" && <label className="field"><span>비밀번호</span><input type="password" value={password} onChange={(event) => { setPassword(event.target.value); setErrors((current) => ({ ...current, password: undefined })); }} autoComplete={mode === "login" ? "current-password" : "new-password"} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "password-error" : undefined} />{errors.password && <small id="password-error" className="field-error">{errors.password}</small>}</label>}
    {mode === "signup" && <label className="field"><span>비밀번호 재확인</span><input type="password" value={passwordConfirmation} onChange={(event) => { setPasswordConfirmation(event.target.value); setErrors((current) => ({ ...current, passwordConfirmation: undefined })); }} autoComplete="new-password" aria-invalid={Boolean(errors.passwordConfirmation)} aria-describedby={errors.passwordConfirmation ? "password-confirmation-error" : undefined} />{errors.passwordConfirmation && <small id="password-confirmation-error" className="field-error">{errors.passwordConfirmation}</small>}</label>}
    {notice && <p className={`form-message ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"} aria-live="polite">{notice.text}</p>}
    <button type="submit" className="primary full" disabled={busy || (mode === "signup" && blockedSignupEmail === email.trim().toLowerCase())}>{busy ? "처리 중…" : mode === "login" ? "로그인" : mode === "signup" ? "회원가입" : "변경 메일 받기"}</button>
  </form>
  {mode === "login" && <button type="button" className="auth-secondary" onClick={() => changeMode("recovery")}>비밀번호를 잊으셨나요?</button>}
  <button type="button" className="auth-switch" onClick={() => changeMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "처음인가요? 회원가입" : "로그인으로 돌아가기"}</button></section></section></main>;
}