import type { ReactNode } from "react";
import { Marca } from "@/components/ui/marca";
import { FotoPainel } from "./foto-painel";

type Props = {
  children: ReactNode;
  /** Cabeçalho do fluxo (voltar + etapa). */
  cabecalho?: ReactNode;
  /** Ação principal fixa na área do polegar. */
  rodape?: ReactNode;
  /** Foto editorial ao lado do fluxo em telas grandes (≥ 1024 px). */
  painel?: { imagem: string; foco?: string; legenda?: string };
  /** Tela de palco (modo escuro fixo). */
  palco?: boolean;
  /** Ocupa a altura da tela sem rolar (conteúdo flexível no meio). */
  cheia?: boolean;
};

/**
 * Estrutura de todas as telas do fluxo da cliente.
 * Celular: coluna inteira. Tablet: coluna de até 480 px centralizada. Computador: foto editorial à esquerda + coluna à direita.
 */
export function TelaFluxo({ children, cabecalho, rodape, painel, palco, cheia }: Props) {
  return (
    <div data-palco={palco || undefined} className="min-h-dvh bg-po text-cacau lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)]">
      {painel && (
        <aside className="relative hidden lg:block">
          <div className="sticky top-0 h-dvh overflow-hidden bg-[#1a110e]">
            <FotoPainel imagem={painel.imagem} foco={painel.foco} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1a110e]/80 via-transparent to-[#1a110e]/30" />
            <div className="absolute left-10 top-10 text-[#f6ece6] xl:left-12 xl:top-12">
              <Marca className="text-xl" />
            </div>
            {painel.legenda && <p className="absolute bottom-24 left-10 max-w-sm text-lg text-balance text-[#f6ece6]/90">{painel.legenda}</p>}
          </div>
        </aside>
      )}

      <div className={`relative mx-auto flex w-full max-w-[480px] flex-col px-5 lg:px-14 ${cheia ? "h-dvh" : "min-h-dvh"} ${painel ? "lg:max-w-none" : "lg:col-span-2 lg:max-w-[560px]"}`}>
        <div className="pt-[max(env(safe-area-inset-top),1rem)] lg:pt-10">{cabecalho}</div>
        <div className={`flex flex-col ${cheia ? "min-h-0 flex-1" : "flex-1"} ${rodape ? "pb-4" : "pb-[max(env(safe-area-inset-bottom),1.5rem)]"}`}>{children}</div>
        {rodape && (
          <div className="sticky bottom-0 -mx-5 bg-gradient-to-t from-po via-po to-transparent px-5 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-6 lg:-mx-14 lg:px-14 lg:pb-10">
            {rodape}
          </div>
        )}
      </div>
    </div>
  );
}
