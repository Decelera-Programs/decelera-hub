export function Empty({ children = "Sin evaluaciones aún" }: { children?: string }) {
  return (
    <p
      role="status"
      className="rounded-xl border border-dashed border-[var(--border)] px-4 py-5 text-center text-sm text-[var(--text-muted)]"
    >
      {children}
    </p>
  );
}
