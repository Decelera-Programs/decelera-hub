import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * La raíz del hub es "Preguntar" (/brain). Las Herramientas viven en /herramientas; los enlaces antiguos a la
 * raíz con parámetros (?abre=… / ?url=…) se reenvían allí para que sigan funcionando.
 */
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  if (sp.abre || sp.url) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      const val = Array.isArray(v) ? v[0] : v;
      if (val) qs.set(k, val);
    }
    redirect(`/herramientas?${qs.toString()}`);
  }
  redirect("/brain");
}
