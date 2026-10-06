"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { BarraEtapa } from "./marca";
import { Icone } from "./icones";

export const ETAPAS = ["Momento", "Estilo", "Ver em mim", "Agendar"] as const;

/** Voltar + barra de etapa. `voltarPara` usa link; sem ele, volta no histórico. */
export function CabecalhoFluxo({ etapa, voltarPara, direita }: { etapa?: number; voltarPara?: string; direita?: ReactNode }) {
  const router = useRouter();
  const classe = "-ml-2 grid size-11 shrink-0 place-items-center rounded-full active:bg-nude [@media(hover:hover)]:hover:bg-nude";
  return (
    <div className="flex items-center gap-4">
      {voltarPara ? (
        <Link href={voltarPara} aria-label="Voltar" className={classe}>
          <Icone nome="voltar" className="size-6" />
        </Link>
      ) : (
        <button type="button" onClick={() => router.back()} aria-label="Voltar" className={classe}>
          <Icone nome="voltar" className="size-6" />
        </button>
      )}
      {etapa !== undefined && (
        <div className="flex-1">
          <BarraEtapa atual={etapa} total={ETAPAS.length} />
          <p className="sr-only">
            Etapa {etapa} de {ETAPAS.length}: {ETAPAS[etapa - 1]}
          </p>
        </div>
      )}
      {direita}
    </div>
  );
}
