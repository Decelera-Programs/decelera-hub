import { AccountMenu } from "@/components/AccountMenu";
import { PageSwitcher } from "@/components/PageSwitcher";
import { StrategyDashboard } from "@/components/strategy/StrategyDashboard";
import { requireMember } from "@/lib/hub";
import type { OkrProject } from "@/lib/okr";
import { getOkrItems } from "@/lib/supabase/okr";
import { getProjects } from "@/lib/supabase/projects";

export const dynamic = "force-dynamic";

export default async function EstrategiaPage() {
  const member = await requireMember();
  const [items, projects] = await Promise.all([getOkrItems(), getProjects()]);

  const okrProjects: OkrProject[] = projects.map((p) => ({
    id: p.id,
    title: p.title,
    health: p.health,
    team: p.team,
    tasksDone: p.tasks.filter((t) => t.done).length,
    tasksTotal: p.tasks.length,
    endDate: p.endDate,
  }));

  const user = {
    name: member.full_name,
    email: member.email,
    avatarUrl: member.avatar_url,
    isAdmin: member.role === "admin",
    teams: member.teams,
  };

  // Fecha de hoy en Madrid (YYYY-MM-DD): el servidor corre en UTC y a medianoche daría el día anterior.
  const todayIso = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(new Date());

  return (
    <div className="ambient flex h-dvh flex-col overflow-hidden">
      <header className="glass hub-header relative z-20 grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-[var(--border)] px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 justify-self-start">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/decelera-mark.svg" alt="Decelera" className="h-6 w-6 shrink-0" />
          <div className="hidden items-baseline gap-1.5 lg:flex">
            <span className="text-sm font-bold tracking-tight text-[var(--text-primary)]">Decelera</span>
            <span className="text-sm font-normal tracking-tight text-[var(--text-muted)]">Brain</span>
          </div>
          <div className="min-w-0 sm:hidden">
            <PageSwitcher />
          </div>
        </div>
        <div className="hidden sm:flex sm:justify-self-center">
          <PageSwitcher />
        </div>
        <div className="justify-self-end">
          <AccountMenu user={user} />
        </div>
      </header>

      <StrategyDashboard items={items} projects={okrProjects} isAdmin={user.isAdmin} todayIso={todayIso} />
    </div>
  );
}
