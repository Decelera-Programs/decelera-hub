import NextAuth from "next-auth";
import { authConfig, isAllowedEmail } from "@/auth.config";
import { hubDb } from "@/lib/supabase/hub";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    /**
     * Puerta de dominio + alta/actualización del miembro. Nunca escribe `role` ni `is_active`,
     * así que los cambios que haga un admin persisten; las filas nuevas cogen los defaults del
     * schema (`member` / `true`).
     */
    async signIn({ profile }) {
      const email = profile?.email?.toLowerCase();
      if (!isAllowedEmail(email)) return false;

      const { error } = await hubDb.from("members").upsert(
        {
          email,
          full_name: profile?.name ?? null,
          avatar_url: (profile as { picture?: string } | undefined)?.picture ?? null,
          last_login_at: new Date().toISOString(),
        },
        { onConflict: "email" },
      );

      if (error) {
        console.error("hub.members upsert failed:", error.message);
        return false;
      }
      return true;
    },
  },
});
