import { redirect } from "next/navigation";

/** El Mapa vive ahora como pestaña de Agentes; se mantiene la ruta para no romper enlaces. */
export default function MapaPage() {
  redirect("/agentes");
}
