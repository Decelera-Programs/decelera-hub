import { Suspense } from "react";
import { HubHome } from "@/components/HubHome";
import {
  getCards,
  getFolders,
  getSections,
  getSubfolders,
  getWidgets,
  requireMember,
} from "@/lib/hub";

export const dynamic = "force-dynamic";

export default async function Page() {
  const member = await requireMember();
  const [sections, subfolders, cards, folders, widgets] = await Promise.all([
    getSections(),
    getSubfolders(),
    getCards(),
    getFolders(member.id),
    getWidgets(member.id),
  ]);

  return (
    <Suspense>
      <HubHome
        sections={sections}
        subfolders={subfolders}
        apps={cards}
        member={{
          name: member.full_name,
          email: member.email,
          avatarUrl: member.avatar_url,
          isAdmin: member.role === "admin",
          teams: member.teams,
        }}
        folders={folders}
        widgets={widgets}
      />
    </Suspense>
  );
}
