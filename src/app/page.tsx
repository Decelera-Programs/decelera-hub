import { HubHome } from "@/components/HubHome";
import { hubApps } from "@/lib/apps";

export default function Page() {
  return <HubHome apps={hubApps} />;
}
