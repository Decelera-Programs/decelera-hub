import { HubHome } from "@/components/HubHome";
import { getCards, getFolders, getSections, getWidgets, requireMember } from "@/lib/hub";

export const dynamic = "force-dynamic";

export default async function Page() {
  const member = await requireMember();
  const [sections, cards, folders, widgets] = await Promise.all([
    getSections(),
    getCards(),
    getFolders(member.id),
    getWidgets(member.id),
  ]);

  return (
    <HubHome
      sections={sections}
      apps={cards}
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
