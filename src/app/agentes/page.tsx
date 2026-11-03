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
    <div className="ambient flex h-screen flex-col overflow-hidden">
      <header className="glass hub-header relative z-20 flex h-14 shrink-0 items-center gap-3 border-b border-[var(--border)] px-3 sm:px-4">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/decelera-mark.svg" alt="Decelera" className="h-6 w-6" />
          <div className="hidden items-baseline gap-1.5 lg:flex">
            <span className="text-sm font-bold tracking-tight text-[var(--text-primary)]">Decelera</span>
            <span className="text-sm font-normal tracking-tight text-[var(--text-muted)]">Brain</span>
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

      <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-6 overflow-y-auto px-6 py-6 lg:px-10">
        <div className="aurora-light hub-reveal flex flex-wrap items-end justify-between gap-4 rounded-[20px] px-5 py-3 sm:px-6">
          <div>
            <h1 className="page-title text-2xl tracking-tight text-[var(--text-primary)] sm:text-3xl">Agentes</h1>
            <p className="max-w-xl text-xs text-[var(--text-secondary)]">
              Qué están haciendo los agentes automáticos de Decelera, en vivo.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map((s) => (
            <AgentPulseCard
              key={s.agentId}
              emoji={KNOWN_AGENTS.find((a) => a.id === s.agentId)?.emoji ?? "🤖"}
              label={s.label}
              health={s.health}
              lastRunAt={s.lastRunAt}
              lastRunStatus={s.lastRunStatus}
              runsToday={s.runsToday}
              eventsToday={s.eventsToday}
            />
          ))}
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
