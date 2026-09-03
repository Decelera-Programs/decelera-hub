import { HubHome } from "@/components/HubHome";
import { hubApps } from "@/lib/apps";
import { getFolders, getWidgets, requireMember } from "@/lib/hub";

export const dynamic = "force-dynamic";

export default async function Page() {
  const member = await requireMember();
  const [folders, widgets] = await Promise.all([
    getFolders(member.id),
    getWidgets(member.id),
  ]);

  return (
    <HubHome
      apps={hubApps}
      member={{
        name: member.full_name,
        email: member.email,
        avatarUrl: member.avatar_url,
        isAdmin: member.role === "admin",
      }}
      folders={folders}
      widgets={widgets}
    />
  );
}
