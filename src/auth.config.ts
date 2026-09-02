import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/** Dominios de Google Workspace autorizados para entrar al hub. */
const ALLOWED_DOMAINS = ["decelera.com", "decelerastartups.com"];

export function isAllowedEmail(email?: string | null): boolean {
  const domain = email?.split("@")[1]?.toLowerCase();
  return !!domain && ALLOWED_DOMAINS.includes(domain);
}

/**
 * Config base de NextAuth, sin dependencias de base de datos — se puede importar desde el edge
 * (p. ej. un futuro `proxy.ts`). El upsert en `hub.members` vive en `src/auth.ts`.
 * El provider Google lee `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` del entorno.
 */
export const authConfig = {
  providers: [Google],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  callbacks: {
    signIn({ profile }) {
      return isAllowedEmail(profile?.email);
    },
    authorized({ auth }) {
      return !!auth?.user;
    },
    jwt({ token, profile }) {
      if (profile) {
        token.email = profile.email ?? token.email;
        token.name = profile.name ?? token.name;
        token.picture = (profile as { picture?: string }).picture ?? null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        if (token.email) session.user.email = token.email;
        if (token.name) session.user.name = token.name;
        if (token.picture) session.user.image = token.picture as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
