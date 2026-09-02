"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { signOutAction } from "@/app/actions";

export type AccountUser = {
  name: string | null;
  email: string;
  avatarUrl: string | null;
  isAdmin: boolean;
};

export function AccountMenu({ user }: { user: AccountUser }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const label = user.name ?? user.email.split("@")[0];

  return (
    <div ref={ref} className="relative flex w-[180px] justify-end">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 max-w-full items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-1)] pl-1 pr-2.5 text-sm font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--brand-water)]"
      >
        <Avatar user={user} size={26} />
        <span className="truncate">{label}</span>
        <span aria-hidden className="text-xs text-[var(--text-muted)]">
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-60 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-1)] shadow-md"
        >
          <div className="flex items-center gap-2.5 border-b border-[var(--border)] px-3 py-2.5">
            <Avatar user={user} size={32} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{label}</p>
              <p className="truncate text-xs text-[var(--text-muted)]">{user.email}</p>
            </div>
          </div>
          {user.isAdmin && (
            <a
              href="/admin"
              className="block px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--row-hover)] hover:text-[var(--text-primary)]"
            >
              Administración
            </a>
          )}
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full px-3 py-2 text-left text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--row-hover)] hover:text-[var(--text-primary)]"
            >
              Salir
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Avatar({ user, size }: { user: AccountUser; size: number }) {
  const [failed, setFailed] = useState(false);
  const initials = (user.name ?? user.email)
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

  if (user.avatarUrl && !failed) {
    return (
      <img
        src={user.avatarUrl}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="shrink-0 rounded-full"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full text-[11px] font-bold"
      style={{
        width: size,
        height: size,
        background: "var(--tile-1-bg)",
        color: "var(--tile-1-ink)",
      }}
    >
      {initials || "?"}
    </span>
  );
}
