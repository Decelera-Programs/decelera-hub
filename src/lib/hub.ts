import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hubDb } from "@/lib/supabase/hub";

export type Member = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "member" | "admin";
  is_active: boolean;
};

/**
 * Miembro correspondiente a la sesión actual, o `null` si no hay sesión / el email no está en
 * `hub.members` / está desactivado. `cache()` deduplica dentro de un mismo render.
 */
export const getMember = cache(async (): Promise<Member | null> => {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return null;

  const { data } = await hubDb
    .from("members")
    .select("id, email, full_name, avatar_url, role, is_active")
    .eq("email", email)
    .maybeSingle();

  return data && data.is_active ? (data as Member) : null;
});

/** Como `getMember` pero redirige: a `/login` si no hay sesión, a `/no-access` si no es miembro activo. */
export async function requireMember(): Promise<Member> {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  const member = await getMember();
  if (!member) redirect("/no-access");
  return member;
}

export async function requireAdmin(): Promise<Member> {
  const member = await requireMember();
  if (member.role !== "admin") redirect("/no-access");
  return member;
}
