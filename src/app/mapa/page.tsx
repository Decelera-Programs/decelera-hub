import type { Metadata } from "next";
import { AccountMenu } from "@/components/AccountMenu";
import { SystemsMap } from "@/components/map/SystemsMap";
import { PageSwitcher } from "@/components/PageSwitcher";
import { daysAgoIso } from "@/lib/agents";
import { requireMember } from "@/lib/hub";
import { getEventCountsSince, getEventsSourceCounts } from "@/lib/supabase/agents";

export const metadata: Metadata = {
  title: "Mapa | Decelera Brain",
};

export const dynamic = "force-dynamic";

export default async function MapaPage() {
  const member = await requireMember();
  const since = daysAgoIso(7);
  // Solo los agentes que registran su actividad en el Brain; Maru (main) sale sin cifras.
  const [inbound, events, sources] = await Promise.all([
    getEventCountsSince("inbound-follow-up", since),
    getEventCountsSince("events", since),
    getEventsSourceCounts(since),
  ]);
  const counts = { "inbound-follow-up": inbound, events: { ...events, ...sources } };

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

        {/* Navegación en su propia columna de grid — ver proyectos/page.tsx por el mismo arreglo. */}
        <div className="hidden sm:flex sm:justify-self-center">
          <PageSwitcher />
        </div>

        <div className="justify-self-end">
          <AccountMenu user={user} />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1280px] min-w-0 flex-1 flex-col gap-5 overflow-y-auto [&>*]:shrink-0 px-4 py-6 sm:px-6 lg:px-10">
        <div className="aurora-light hub-reveal rounded-[20px] px-5 py-3 sm:px-6">
          <h1 className="page-title text-2xl tracking-tight text-[var(--text-primary)] sm:text-3xl">Mapa</h1>
          <p className="max-w-2xl text-xs text-[var(--text-secondary)]">
            Dónde viven los datos y qué mueve cada agente entre ellos. Pincha un agente o un sistema para ver solo
            sus flujos.
          </p>
        </div>
        <SystemsMap counts={counts} />
      </div>
    </div>
  );
}
