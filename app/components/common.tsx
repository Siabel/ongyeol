import type { ReactNode } from "react";
import { shiftDate } from "./ui-helpers";

export function BrandLogo({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  return <span className={`brand-logo ${compact ? "compact" : ""} ${inverse ? "inverse" : ""}`} aria-label="온결">
    <svg className="brand-symbol" viewBox="0 0 48 48" aria-hidden="true">
      <path className="brand-orbit" d="M37.5 15.2C33.7 8.6 24.9 6 17.7 9.4C10.4 12.8 7 21.3 9.8 28.8C12.7 36.5 21.2 40.6 29 38.2C33.4 36.8 36.7 33.7 38.4 29.8" />
      <path className="brand-thread" d="M13.2 31.4C18.8 25.7 24.6 23.2 31.1 24.1C35 24.7 38.1 26.7 40.5 30" />
      <circle className="brand-dot" cx="39.8" cy="30.1" r="2.8" />
    </svg>
    {!compact && <span className="brand-copy"><strong>온결</strong><small>삶의 결을 잇는 기록</small></span>}
  </span>;
}

export function NavButton({ icon, label, active, onClick }: { icon: string; label: string; active: boolean; onClick: () => void }) {
  return <button className={`nav-button ${active ? "active" : ""}`} aria-label={label} title={label} onClick={onClick}><span>{icon}</span><b>{label}</b></button>;
}

export function PageHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return <header className="page-header"><div><p>{eyebrow}</p><h1>{title}</h1></div>{action}</header>;
}

export function DateNavigator({ date, onDate }: { date: string; onDate: (date: string) => void }) {
  return <div className="date-navigator">
    <button type="button" className="icon-button" aria-label="이전 날짜" onClick={() => onDate(shiftDate(date, -1))}>‹</button>
    <input className="date-picker" aria-label="날짜 선택" type="date" value={date} onChange={(event) => onDate(event.target.value)} />
    <button type="button" className="icon-button" aria-label="다음 날짜" onClick={() => onDate(shiftDate(date, 1))}>›</button>
  </div>;
}

export function Empty({ icon, title, text, action, onClick }: { icon: string; title: string; text: string; action: string; onClick: () => void }) {
  return <div className="empty-state"><span>{icon}</span><h3>{title}</h3><p>{text}</p><button onClick={onClick}>{action} →</button></div>;
}