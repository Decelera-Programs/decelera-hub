import { Suspense } from "react";
import { HubHome } from "@/components/HubHome";
import {
  getCards,
  getSections,
  getSubfolders,
  requireMember,
} from "@/lib/hub";

export const dynamic = "force-dynamic";

export default async function Page() {
  const member = await requireMember();
  const [sections, subfolders, cards] = await Promise.all([
    getSections(),
    getSubfolders(),
    getCards(member.id, member.role === "admin"),
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
      />
    </Suspense>
  );
}
