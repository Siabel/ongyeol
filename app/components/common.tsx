import type { ReactNode } from "react";
import { shiftDate } from "./ui-helpers";

export function BrandLogo({
  compact = false,
  inverse = false,
}: {
  compact?: boolean;
  inverse?: boolean;
}) {
  return (
    <span
      className={`brand-logo ${compact ? "compact" : ""} ${inverse ? "inverse" : ""}`}
      aria-label="작은다음, 작다"
    >
      <svg className="brand-symbol" viewBox="0 0 48 48" aria-hidden="true">
        <rect
          className="brand-frame"
          x="3"
          y="3"
          width="42"
          height="42"
          rx="14"
        />
        <path className="brand-path" d="M12 34.5h8v-9h8v-9h8" />
        <rect
          className="brand-step brand-step-one"
          x="10"
          y="30"
          width="9"
          height="9"
          rx="3"
        />
        <rect
          className="brand-step brand-step-two"
          x="20"
          y="21"
          width="9"
          height="9"
          rx="3"
        />
        <rect
          className="brand-step brand-step-three"
          x="30"
          y="12"
          width="9"
          height="9"
          rx="3"
        />
      </svg>
      {!compact && (
        <span className="brand-copy">
          <span className="brand-name-row">
            <strong>작다</strong>
            <em>JAKDA</em>
          </span>
          <small>작은 다음을 기록하다</small>
        </span>
      )}
    </span>
  );
}

export function NavButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`nav-button ${active ? "active" : ""}`}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <span>{icon}</span>
      <b>{label}</b>
    </button>
  );
}

export function PageHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {action}
    </header>
  );
}

export function DateNavigator({
  date,
  onDate,
}: {
  date: string;
  onDate: (date: string) => void;
}) {
  return (
    <div className="date-navigator">
      <button
        type="button"
        className="icon-button"
        aria-label="이전 날짜"
        onClick={() => onDate(shiftDate(date, -1))}
      >
        ‹
      </button>
      <input
        className="date-picker"
        aria-label="날짜 선택"
        type="date"
        value={date}
        onChange={(event) => onDate(event.target.value)}
      />
      <button
        type="button"
        className="icon-button"
        aria-label="다음 날짜"
        onClick={() => onDate(shiftDate(date, 1))}
      >
        ›
      </button>
    </div>
  );
}

export function Empty({
  icon,
  title,
  text,
  action,
  onClick,
}: {
  icon: string;
  title: string;
  text: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="empty-state">
      <span>{icon}</span>
      <h3>{title}</h3>
      <p>{text}</p>
      <button onClick={onClick}>{action} →</button>
    </div>
  );
}
