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
    <div className="flex h-screen flex-col overflow-hidden bg-[var(--page)]">
      <header className="relative flex h-14 shrink-0 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface-1)] px-3 sm:px-4">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/decelera-mark.svg" alt="Decelera" className="h-6 w-6" />
          <div className="hidden items-baseline gap-1.5 lg:flex">
            <span className="text-sm font-bold tracking-tight text-[var(--text-primary)]">Decelera</span>
            <span className="text-sm font-normal tracking-tight text-[var(--text-muted)]">Hub</span>
          </div>
        </div>

        <div className="sm:hidden">
          <PageSwitcher />
        </div>
        <div className="pointer-events-none absolute inset-0 hidden items-center justify-center sm:flex">
          <div className="pointer-events-auto">
            <PageSwitcher />
          </div>
        </div>

        <div className="flex-1" />
        <AccountMenu user={user} />
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
