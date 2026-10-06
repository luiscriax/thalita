"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { Esqueleto } from "@/components/ui/estados";

const assinar = () => () => {};

/**
 * Renderiza só no aparelho. Para telas que dependem de "agora" (agenda, prazos, "há 40 min"):
 * evita que o HTML pré-renderizado mostre a data do servidor e gere diferença na hidratação.
 */
export function SoNoCliente({ children }: { children: ReactNode }) {
  const noCliente = useSyncExternalStore(assinar, () => true, () => false);
  if (noCliente) return children;
  return (
    <div role="status" aria-label="Carregando" className="mx-auto w-full max-w-2xl space-y-4 px-5 pt-10">
      <Esqueleto className="h-8 w-1/2" />
      <Esqueleto className="h-4 w-3/4" />
      <Esqueleto className="h-40 w-full !rounded-foto" />
      <Esqueleto className="h-24 w-full !rounded-foto" />
    </div>
  );
}
