"use client";

import Image from "next/image";
import { useId, type ReactNode } from "react";
import { Icone, type NomeIcone } from "@/components/ui/icones";
import { SeloMarcado } from "@/components/ui/marca";
import { buscarPapel } from "@/lib/data/mock/catalogo";
import { buscarLook, tituloDaMake } from "@/lib/data/mock/looks";
import { formatarMoeda } from "@/lib/domain/formatar";
import type { Jornada } from "@/lib/jornada/estado";

/** Lembrete do que está sendo agendado (look + papel + preço do serviço). */
export function ResumoLook({ jornada, children }: { jornada: Jornada; children?: ReactNode }) {
  const look = buscarLook(jornada.lookId);
  const papel = buscarPapel(jornada.ocasiao, jornada.papel);
  if (!papel) return null;
  return (
    <div className="flex items-center gap-3 rounded-foto bg-nude p-3">
      <span className="relative h-16 w-13 shrink-0 overflow-hidden rounded-2xl bg-nude-2">
        {look && <Image src={look.imagem} alt="" fill sizes="52px" className="object-cover" />}
        {/* eslint-disable-next-line @next/next/no-img-element -- referência local da cliente (object URL) */}
        {!look && jornada.referencia && <img src={jornada.referencia} alt="" className="absolute inset-0 size-full object-cover" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 font-semibold leading-snug">{tituloDaMake(jornada.lookId)}</span>
        <span className="block truncate text-sm text-terra">{children ?? papel.titulo}</span>
      </span>
      <span className="tabular shrink-0 pr-2 font-semibold">{formatarMoeda(papel.servicoCentavos)}</span>
    </div>
  );
}

/** Opção grande de escolha única (funciona como rádio). */
export function OpcaoGrande({
  icone, titulo, descricao, marcada, onClick, extra,
}: { icone: NomeIcone; titulo: string; descricao: string; marcada: boolean; onClick: () => void; extra?: ReactNode }) {
  const id = useId();
  return (
    <button
      type="button"
      role="radio"
      aria-checked={marcada}
      aria-labelledby={`${id}-t`}
      aria-describedby={`${id}-d`}
      onClick={onClick}
      className={`flex w-full items-start gap-4 rounded-foto border p-5 text-left transition-colors active:scale-[0.99] ${
        marcada ? "border-cacau bg-nude" : "border-nude-2 bg-po [@media(hover:hover)]:hover:bg-nude/60"
      }`}
    >
      <span className={`grid size-11 shrink-0 place-items-center rounded-full ${marcada ? "bg-cacau text-cacau-fg" : "bg-nude text-cacau"}`}>
        <Icone nome={icone} />
      </span>
      <span className="min-w-0 flex-1">
        <span id={`${id}-t`} className="block text-lg font-semibold">{titulo}</span>
        <span id={`${id}-d`} className="mt-0.5 block text-sm text-terra">{descricao}</span>
        {extra && <span className="mt-2 inline-block rounded-full bg-sucesso/12 px-2.5 py-0.5 text-xs font-semibold text-sucesso">{extra}</span>}
      </span>
      <SeloMarcado marcado={marcada} className="self-center" />
    </button>
  );
}

/** Caixa de aceite: sempre começa desmarcada. */
export function CaixaAceite({ id, marcada, aoMudar, children }: { id: string; marcada: boolean; aoMudar: (v: boolean) => void; children: ReactNode }) {
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 py-1 text-sm">
      <input id={id} type="checkbox" checked={marcada} onChange={(e) => aoMudar(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg border-2 transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-champanhe ${
          marcada ? "border-cacau bg-cacau text-cacau-fg" : "border-terra/50"
        }`}
      >
        {marcada && <Icone nome="check" className="size-4" />}
      </span>
      <span className="leading-relaxed">{children}</span>
    </label>
  );
}

/** Linha de valor (rótulo à esquerda, valor à direita). */
export function LinhaValor({ rotulo, valor, forte }: { rotulo: ReactNode; valor: ReactNode; forte?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-1.5 ${forte ? "text-base font-semibold" : "text-sm"}`}>
      <dt className={forte ? "" : "text-terra"}>{rotulo}</dt>
      <dd className="tabular text-right">{valor}</dd>
    </div>
  );
}
