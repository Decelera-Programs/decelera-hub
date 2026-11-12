import { AccountMenu } from "@/components/AccountMenu";
import { PageSwitcher } from "@/components/PageSwitcher";
import { BitacoraBoard } from "@/components/bitacora/BitacoraBoard";
import { requireMember } from "@/lib/hub";
import { getLogEntries, getProjectOptions } from "@/lib/supabase/bitacora";
import { getMemberOptions } from "@/lib/supabase/projects";

export const dynamic = "force-dynamic";

export default async function BitacoraPage() {
  const member = await requireMember();
  const [entries, projects, members] = await Promise.all([
    getLogEntries(),
    getProjectOptions(),
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

      <BitacoraBoard
        entries={entries}
        projects={projects}
        members={members}
        currentMemberId={member.id}
        myTeams={member.teams}
      />
    </div>
  );
}
