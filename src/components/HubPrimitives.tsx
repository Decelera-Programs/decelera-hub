import { CATEGORY_TINT, STATUS_LABEL, type AppCategory, type AppStatus } from "@/lib/apps";

export function SearchIcon({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.8" />
      <path d="M13.5 13.5 17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconTile({
  category,
  initial,
  size = 42,
}: {
  category: AppCategory;
  initial: string;
  size?: number;
}) {
  const t = CATEGORY_TINT[category];
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-xl font-bold"
      style={{ width: size, height: size, fontSize: size * 0.35, background: t.bg, color: t.ink }}
    >
      {initial}
    </span>
  );
}

const STATUS_STYLE: Record<AppStatus, { bg: string; ink: string }> = {
  live: { bg: "var(--pill-good-bg)", ink: "var(--status-good)" },
  beta: { bg: "var(--warning-bg)", ink: "var(--warning-fg)" },
  soon: { bg: "var(--pill-neutral-bg)", ink: "var(--text-muted)" },
};

export function StatusPill({ status }: { status: AppStatus }) {
  const s = STATUS_STYLE[status];
  return (
    <span
      className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em]"
      style={{ background: s.bg, color: s.ink }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--text-muted)] ${className}`}>
      {children}
    </span>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  shortcut = false,
  className = "",
  inputRef,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  shortcut?: boolean;
  className?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface-1)] px-3.5 shadow-sm ${className}`}
    >
      <span className="text-[var(--text-muted)]">
        <SearchIcon />
      </span>
      <label className="sr-only" htmlFor="hub-search">
        Buscar herramientas
      </label>
      <input
        id="hub-search"
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
      />
      {shortcut && (
        <span className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--text-muted)]">
          ⌘K
        </span>
      )}
    </div>
  );
}
