"use client";

import { createContext, useContext } from "react";
import type { HubApp } from "@/lib/apps";

/** Algo que el workspace puede abrir: una tarjeta del hub o un enlace suelto (widget/carpeta). */
export type OpenTarget =
  | { kind: "card"; card: HubApp }
  | { kind: "url"; href: string; title: string };

type WorkspaceCtx = {
  /** Abre en el panel si se puede embeber; si no, en pestaña nueva. */
  open: (target: OpenTarget) => void;
};

const Ctx = createContext<WorkspaceCtx | null>(null);

export const WorkspaceProvider = Ctx.Provider;

export function useWorkspace(): WorkspaceCtx {
  return (
    useContext(Ctx) ?? {
      open: (t) => {
        if (t.kind === "url") window.open(t.href, "_blank", "noopener,noreferrer");
      },
    }
  );
}
