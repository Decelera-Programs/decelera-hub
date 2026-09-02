import { HubHome } from "@/components/HubHome";
import { hubApps } from "@/lib/apps";
import { requireMember } from "@/lib/hub";

export const dynamic = "force-dynamic";

export default async function Page() {
  const member = await requireMember();

  return (
    <HubHome
      apps={hubApps}
      member={{
        name: member.full_name,
        email: member.email,
        avatarUrl: member.avatar_url,
        isAdmin: member.role === "admin",
      }}
    />
  );
}
