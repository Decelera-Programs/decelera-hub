/* eslint-disable @next/next/no-img-element */
import { AccountMenu } from "@/components/AccountMenu";
import { PageSwitcher } from "@/components/PageSwitcher";
import { requireMember } from "@/lib/hub";

export const dynamic = "force-dynamic";

export default async function ProyectosPage() {
  const member = await requireMember();
  const user = {
    name: member.full_name,
    email: member.email,
    avatarUrl: member.avatar_url,
    isAdmin: member.role === "admin",
    teams: member.teams,
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--page)]">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface-1)] px-3 sm:px-4">
        <div className="flex items-center gap-2">
          <img src="/decelera-mark.svg" alt="Decelera" className="h-6 w-6" />
          <div className="hidden items-baseline gap-1.5 lg:flex">
            <span className="text-sm font-bold tracking-tight text-[var(--text-primary)]">Decelera</span>
            <span className="text-sm font-normal tracking-tight text-[var(--text-muted)]">Hub</span>
          </div>
        </div>
        <PageSwitcher />
        <div className="flex-1" />
        <AccountMenu user={user} />
      </header>

      <main className="grid flex-1 place-items-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Gestor de proyectos
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Próximamente — Kanban y Gantt.</p>
        </div>
      </main>
    </div>
  );
}
