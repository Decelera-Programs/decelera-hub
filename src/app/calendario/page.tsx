import type { Metadata } from "next";
import { AccountMenu } from "@/components/AccountMenu";
import { CalendarView } from "@/components/events/CalendarView";
import { PageSwitcher } from "@/components/PageSwitcher";
import { isView, madrid } from "@/lib/events";
import { requireMember } from "@/lib/hub";
import { getCalendarEvents } from "@/lib/supabase/events";

export const metadata: Metadata = {
  title: "Calendario | Decelera Brain",
};

export const dynamic = "force-dynamic";

export default async function CalendarioPage({ searchParams }: { searchParams: Promise<{ vista?: string }> }) {
  const member = await requireMember();
  const { vista } = await searchParams;
  const events = await getCalendarEvents();
  const today = madrid(new Date().toISOString()).day;

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

        {/* Navegación en su propia columna de grid — ver proyectos/page.tsx por el mismo arreglo. */}
        <div className="hidden sm:flex sm:justify-self-center">
          <PageSwitcher />
        </div>

        <div className="justify-self-end">
          <AccountMenu user={user} />
        </div>
      </header>

      <CalendarView
        events={events}
        today={today}
        me={{ id: member.id, name: member.full_name, email: member.email, avatarUrl: member.avatar_url }}
        initialView={isView(vista) ? vista : "mes"}
      />
    </div>
  );
}
