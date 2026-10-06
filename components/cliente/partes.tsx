"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Icone, type NomeIcone } from "@/components/ui/icones";
import type { TomStatus } from "@/lib/cliente/reservas";

/** Moldura das telas da área da cliente: voltar opcional, título e coluna de leitura. */
export function PaginaCliente({
  titulo, subtitulo, voltarPara, acao, largura = "estreita", children,
}: { titulo: string; subtitulo?: ReactNode; voltarPara?: string; acao?: ReactNode; largura?: "estreita" | "larga"; children: ReactNode }) {
  return (
    <main className={`mx-auto w-full px-5 pb-10 pt-[max(env(safe-area-inset-top),1rem)] lg:px-8 lg:pt-10 ${largura === "larga" ? "max-w-5xl" : "max-w-2xl"}`}>
      {voltarPara && (
        <Link href={voltarPara} aria-label="Voltar" className="-ml-2 grid size-11 place-items-center rounded-full active:bg-nude [@media(hover:hover)]:hover:bg-nude">
          <Icone nome="voltar" className="size-6" />
        </Link>
      )}
      <div className={`flex items-end justify-between gap-4 ${voltarPara ? "mt-2" : "mt-4 lg:mt-0"}`}>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight lg:text-3xl">{titulo}</h1>
          {subtitulo && <p className="mt-1 text-sm text-terra">{subtitulo}</p>}
        </div>
        {acao}
      </div>
      <div className="mt-6">{children}</div>
    </main>
  );
}

const TONS: Record<TomStatus, string> = {
  sucesso: "bg-sucesso/12 text-sucesso",
  alerta: "bg-alerta/12 text-alerta",
  erro: "bg-erro/12 text-erro",
  neutro: "bg-nude-2/70 text-terra",
};

export function SeloStatus({ tom, children }: { tom: TomStatus; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${TONS[tom]}`}>{children}</span>;
}

/** Abas em pílula (controle segmentado). */
export function Abas<T extends string>({ opcoes, valor, aoMudar, rotulo }: { opcoes: { id: T; texto: string }[]; valor: T; aoMudar: (v: T) => void; rotulo: string }) {
  return (
    <div role="tablist" aria-label={rotulo} className="grid auto-cols-fr grid-flow-col gap-1 rounded-full bg-nude p-1">
      {opcoes.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={valor === o.id}
          onClick={() => aoMudar(o.id)}
          className={`min-h-10 rounded-full px-4 text-sm font-medium transition-colors ${valor === o.id ? "bg-po text-cacau shadow-flutuante" : "text-terra"}`}
        >
          {o.texto}
        </button>
      ))}
    </div>
  );
}

/** Linha de menu (lista de ajustes). */
export function LinhaMenu({ href, icone, titulo, detalhe, externo }: { href: string; icone: NomeIcone; titulo: string; detalhe?: string; externo?: boolean }) {
  return (
    <Link
      href={href}
      target={externo ? "_blank" : undefined}
      rel={externo ? "noreferrer" : undefined}
      className="flex min-h-14 items-center gap-4 px-4 py-3 [@media(hover:hover)]:hover:bg-nude/60"
    >
      <Icone nome={icone} className="size-5 shrink-0 text-terra" />
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{titulo}</span>
        {detalhe && <span className="block truncate text-sm text-terra">{detalhe}</span>}
      </span>
      <Icone nome="avancar" className="size-5 shrink-0 text-terra/70" />
    </Link>
  );
}

export function GrupoMenu({ titulo, children }: { titulo?: string; children: ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      {titulo && <h2 className="mb-2 px-1 text-sm font-medium text-terra">{titulo}</h2>}
      <div className="divide-y divide-nude-2 overflow-hidden rounded-foto bg-nude/60">{children}</div>
    </section>
  );
}
