import type { Metadata } from "next";
import { AccountMenu } from "@/components/AccountMenu";
import { ActivityFeed } from "@/components/agents/ActivityFeed";
import { AgentPulseCard } from "@/components/agents/AgentPulseCard";
import { FlowDiagram } from "@/components/agents/FlowDiagram";
import { MetricsRow } from "@/components/agents/MetricsRow";
import { PendingApprovalsPanel } from "@/components/agents/PendingApprovalsPanel";
import { PageSwitcher } from "@/components/PageSwitcher";
import { daysAgoIso, KNOWN_AGENTS } from "@/lib/agents";
import { requireMember } from "@/lib/hub";
import { getAgentSummaries, getEventCountsSince, getPendingApprovals, getRecentEvents } from "@/lib/supabase/agents";

export const metadata: Metadata = {
  title: "Agentes | Decelera Brain",
};

export const dynamic = "force-dynamic";

export default async function AgentesPage() {
  const member = await requireMember();
  const sevenDaysAgo = daysAgoIso(7);

  const [summaries, events, pendingLists, countsEntries] = await Promise.all([
    getAgentSummaries(),
    getRecentEvents(),
    Promise.all(KNOWN_AGENTS.map((a) => getPendingApprovals(a.id))),
    Promise.all(KNOWN_AGENTS.map(async (a) => [a.id, await getEventCountsSince(a.id, sevenDaysAgo)] as const)),
  ]);

  const pendingApprovals = pendingLists.flat();
  const countsByAgent = Object.fromEntries(countsEntries);

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

        {/* Navegación en su propia columna de grid — ver proyectos/page.tsx por el mismo arreglo y
            por qué (2026-11-03, operator: "el cartelito que dice agentes se oculta"). */}
        <div className="hidden sm:flex sm:justify-self-center">
          <PageSwitcher />
        </div>

        <div className="justify-self-end">
          <AccountMenu user={user} />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1180px] min-w-0 flex-1 flex-col gap-6 overflow-y-auto [&>*]:shrink-0 px-4 py-6 sm:px-6 lg:px-10">
        <div className="aurora-light hub-reveal flex flex-wrap items-end justify-between gap-4 rounded-[20px] px-5 py-3 sm:px-6">
          <div>
            <h1 className="page-title text-2xl tracking-tight text-[var(--text-primary)] sm:text-3xl">Agentes</h1>
            <p className="max-w-xl text-xs text-[var(--text-secondary)]">
              Qué están haciendo los agentes automáticos de Decelera, en vivo.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map((s) => {
            const meta = KNOWN_AGENTS.find((a) => a.id === s.agentId);
            return (
              <AgentPulseCard
                key={s.agentId}
                emoji={meta?.emoji ?? "🤖"}
                label={s.label}
                description={meta?.description ?? ""}
                vpsPath={meta?.vpsPath ?? ""}
                health={s.health}
                lastRunAt={s.lastRunAt}
                lastRunStatus={s.lastRunStatus}
                runsToday={s.runsToday}
                eventsToday={s.eventsToday}
              />
            );
          })}
        </div>

        {pendingApprovals.length > 0 && <PendingApprovalsPanel items={pendingApprovals} />}

        {KNOWN_AGENTS.map((a) => (
          <MetricsRow key={a.id} counts={countsByAgent[a.id] ?? {}} />
        ))}

        {KNOWN_AGENTS.map((a) => (
          <FlowDiagram key={a.id} agentId={a.id} label={a.label} counts={countsByAgent[a.id] ?? {}} />
        ))}

        <ActivityFeed events={events} />
      </div>
    </div>
  );
}
