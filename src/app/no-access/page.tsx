import type { Metadata } from "next";
import { auth } from "@/auth";
import { signOutAction } from "@/app/actions";

export const metadata: Metadata = { title: "Sin acceso · Decelera Hub" };

export default async function NoAccessPage() {
  const session = await auth();

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-[var(--page)] via-[var(--page)] to-[color-mix(in_srgb,var(--brand-water)_10%,var(--page))] px-6">
      <div className="card flex w-full max-w-sm flex-col items-center gap-6 p-8 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/decelera-mark.svg" alt="Decelera" className="h-9 w-9" />
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
            Sin acceso
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            {session?.user?.email ? (
              <>
                <strong>{session.user.email}</strong> no tiene acceso al Hub todavía. Habla con el
                equipo de Decelera para que te den de alta.
              </>
            ) : (
              "Tu cuenta no tiene acceso al Hub. Habla con el equipo de Decelera."
            )}
          </p>
        </div>

        <form action={signOutAction} className="w-full">
          <button
            type="submit"
            className="flex h-10 w-full items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-5 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            Cambiar de cuenta
          </button>
        </form>
      </div>
    </main>
  );
}
