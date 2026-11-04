import { AccountMenu } from "@/components/AccountMenu";
import { PageSwitcher } from "@/components/PageSwitcher";
import { ProjectsBoard } from "@/components/projects/ProjectsBoard";
import { requireMember } from "@/lib/hub";
import { getMemberOptions, getProjectColumns, getProjects } from "@/lib/supabase/projects";

export const dynamic = "force-dynamic";

export default async function ProyectosPage() {
  const member = await requireMember();
  const [columns, projects, members] = await Promise.all([
    getProjectColumns(),
    getProjects(),
    getMemberOptions(),
  ]);

  const user = {
    name: member.full_name,
    email: member.email,
    avatarUrl: member.avatar_url,
    isAdmin: member.role === "admin",
    teams: member.teams,
  };

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
          <div className="sm:hidden">
            <PageSwitcher />
          </div>
        </div>

        {/* Navegación de páginas, en su propia columna de grid — antes vivía en un overlay
            `absolute inset-0` sobre toda la cabecera, que se solapaba con el logo/AccountMenu y
            escondía la pastilla en cuanto había 3 páginas en vez de 2 (2026-11-03, operator: "el
            cartelito que dice agentes se oculta... problema en general con el zoom y los tamaños" —
            mismo patrón roto en HubHome.tsx y esta página, arreglado en las tres a la vez). */}
        <div className="hidden sm:flex sm:justify-self-center">
          <PageSwitcher />
        </div>

        <div className="justify-self-end">
          <AccountMenu user={user} />
        </div>
      </header>

      <ProjectsBoard
        columns={columns}
        projects={projects}
        members={members}
        currentMemberId={member.id}
      />
    </div>
  );
}
