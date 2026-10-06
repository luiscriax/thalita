"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icone } from "@/components/ui/icones";
import { Monograma } from "@/components/ui/monograma";
import { BolinhaCor, Botao } from "@/components/ui/marca";
import { CarregandoLista } from "@/components/ui/estados";
import { useBriefDoPedido } from "@/lib/dados/use-brief-pedido";
import { usePedidos } from "@/lib/dados/use-pedidos";
import { descreverServico } from "@/lib/data/mock/catalogo";
import { ROTULOS_BRIEF, ROTULOS_LEITURA, comAcento } from "@/lib/data/mock/brief";
import { buscarLook } from "@/lib/data/mock/looks";
import { formatarDataCurta, formatarHora } from "@/lib/domain/formatar";

const PARTES = [
  { chave: "pele", titulo: "Pele" },
  { chave: "olhos", titulo: "Olhos" },
  { chave: "boca", titulo: "Boca" },
] as const;

/**
 * Ficha da make em A4 para salvar em PDF (ou imprimir) pelo próprio navegador: sem biblioteca extra.
 * Na tela é a prévia com o botão; na impressão some tudo que não é a ficha.
 */
export default function FichaDaMake() {
  const { id } = useParams<{ id: string }>();
  const { pedidos, carregando, demo } = usePedidos();
  const reserva = pedidos.find((r) => r.id === id);
  const { brief, notas, fotos, carregouReal } = useBriefDoPedido(id, { demo, carregando, notasExemplo: reserva?.notas });
  const folha = useRef<HTMLElement>(null);
  const [pronta, setPronta] = useState(false);

  // Só libera o botão depois que as fotos carregam (senão o PDF sai sem elas).
  useEffect(() => {
    if (!carregouReal || !folha.current) return;
    const imgs = [...folha.current.querySelectorAll("img")];
    let ativo = true;
    Promise.all(imgs.map((i) => (i.complete ? null : new Promise((ok) => ((i.onload = ok), (i.onerror = ok)))))).then(() => ativo && setPronta(true));
    return () => {
      ativo = false;
    };
  }, [carregouReal, fotos.length, brief]);

  if (carregando || !carregouReal) return <main className="p-8"><CarregandoLista linhas={3} rotulo="Preparando a ficha" /></main>;
  if (!reserva || !brief) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <h1 className="font-display text-2xl font-semibold">Ficha indisponível</h1>
        <p className="mt-2 text-terra">Este pedido não tem Beauty Brief. Ele é gerado quando a cliente autoriza você a ver a simulação.</p>
        <Link href={`/studio/reservas/${id}`} className="mt-6 inline-flex min-h-11 items-center underline underline-offset-4">Voltar ao pedido</Link>
      </main>
    );
  }

  const look = buscarLook(reserva.lookId);
  const quando = `${formatarDataCurta(reserva.inicio)} às ${formatarHora(reserva.inicio)}`;
  const onde = reserva.modo === "domicilio" ? reserva.endereco : "No espaço da Thalita";

  return (
    <div className="bg-nude/40 print:bg-white">
      {/* Barra só da tela: some na impressão. */}
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-nude-2 bg-po/95 px-5 py-3 backdrop-blur print:hidden">
        <Link href={`/studio/reservas/${id}`} className="-ml-2 inline-flex min-h-11 items-center gap-1 pr-3 text-sm text-terra">
          <Icone nome="voltar" className="size-5" />Pedido
        </Link>
        <div className="ml-auto w-full max-w-60">
          <Botao carregando={!pronta} onClick={() => window.print()}>
            <Icone nome="enviar" />
            Salvar em PDF
          </Botao>
        </div>
      </div>

      <article ref={folha} className="ficha mx-auto my-6 w-full max-w-[210mm] p-5 sm:p-[14mm] shadow-flutuante print:my-0 print:max-w-none print:p-0 print:shadow-none">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6 print:flex-row print:items-end print:justify-between border-b border-[var(--ficha-linha)] pb-4">
          <div className="flex items-center gap-3">
            <Monograma className="h-10 text-[var(--ficha-ouro)]" />
            <div>
              <p className="font-marca text-xl leading-none">Thalita Mariano</p>
              <p className="mt-1 text-[0.6875rem] uppercase tracking-[0.18em] text-[var(--ficha-suave)]">Ficha da make</p>
            </div>
          </div>
          <dl className="text-xs leading-relaxed sm:text-right print:text-right">
            <dt className="sr-only">Cliente</dt>
            <dd className="text-sm font-semibold">{reserva.pessoa.nome}</dd>
            <dt className="sr-only">Serviço</dt>
            <dd>{descreverServico(reserva.ocasiao, reserva.papel)}</dd>
            <dt className="sr-only">Quando e onde</dt>
            <dd>{quando} · {onde}</dd>
          </dl>
        </header>

        <section className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-[auto_minmax(0,1fr)] print:grid-cols-[auto_minmax(0,1fr)] [break-inside:avoid]">
          {fotos.length > 0 && (
            <div className="flex gap-2">
              {fotos.map((f) => (
                <figure key={f.tipo} className="w-[32mm]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- link assinado temporário do storage privado */}
                  <img src={f.src} alt={f.rotulo} className="aspect-[4/5] w-full rounded-lg object-cover" />
                  <figcaption className="mt-1 text-center text-[0.6875rem] text-[var(--ficha-suave)]">{f.rotulo}</figcaption>
                </figure>
              ))}
            </div>
          )}
          <div className="min-w-0 self-center">
            <p className="text-[0.6875rem] uppercase tracking-[0.14em] text-[var(--ficha-suave)]">{look?.titulo ?? "Make"} · intensidade {comAcento(brief.intensidade)}</p>
            <p className="mt-1 font-display text-xl font-semibold leading-snug">{brief.resumo_do_look}</p>
            {brief.contexto && <p className="mt-1.5 text-xs leading-snug">{brief.contexto}</p>}
          </div>
        </section>

        <section className="mt-6 [break-inside:avoid]">
          <h2 className="ficha-titulo">Paleta</h2>
          <ul className="mt-3 grid grid-cols-1 gap-x-5 gap-y-3 min-[400px]:grid-cols-2 sm:grid-cols-3 print:grid-cols-3">
            {brief.paleta.map((c) => (
              <li key={c.hex + c.uso} className="flex min-w-0 items-center gap-2.5 [break-inside:avoid]">
                <BolinhaCor cor={c.hex} className="size-9" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold leading-tight">{c.nome_da_cor}</p>
                  <p className="text-[0.6875rem] leading-tight text-[var(--ficha-suave)]">{c.uso} · <span className="uppercase">{c.hex}</span></p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {brief.leitura && (
          <section className="mt-6 [break-inside:avoid]">
            <h2 className="ficha-titulo">Leitura do rosto <span className="font-normal normal-case tracking-normal">· confiança {comAcento(brief.leitura.confianca)}</span></h2>
            <dl className="mt-2 grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2 print:grid-cols-2">
              {(Object.entries(ROTULOS_LEITURA) as [keyof typeof ROTULOS_LEITURA, string][]).map(([k, r]) =>
                brief.leitura?.[k] ? (
                  <div key={k} className="[break-inside:avoid]">
                    <dt className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--ficha-suave)]">{r}</dt>
                    <dd className="text-xs leading-snug">{brief.leitura[k]}</dd>
                  </div>
                ) : null,
              )}
            </dl>
          </section>
        )}

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3 print:grid-cols-3">
          {PARTES.map(({ chave, titulo }) => {
            const rotulos = ROTULOS_BRIEF[chave] as Record<string, string>;
            const valores = brief[chave] as Record<string, string>;
            return (
              <section key={chave} className="min-w-0">
                <h2 className="ficha-titulo">{titulo}</h2>
                <dl className="mt-2 space-y-2">
                  {Object.entries(rotulos).filter(([k]) => valores[k]).map(([k, r]) => (
                    <div key={k} className="[break-inside:avoid]">
                      <dt className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--ficha-suave)]">{r}</dt>
                      <dd className="text-xs leading-snug">{valores[k]}</dd>
                    </div>
                  ))}
                  {chave === "olhos" && (
                    <div className="[break-inside:avoid]">
                      <dt className="text-[0.6875rem] font-semibold uppercase tracking-wide text-[var(--ficha-suave)]">Sobrancelhas</dt>
                      <dd className="text-xs leading-snug">{brief.sobrancelhas}</dd>
                    </div>
                  )}
                </dl>
              </section>
            );
          })}
        </div>

        {(!!brief.ordem_de_execucao?.length || !!brief.adaptacao?.length) && (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 print:grid-cols-2 [break-inside:avoid]">
            {!!brief.ordem_de_execucao?.length && (
              <section>
                <h2 className="ficha-titulo">Ordem de execução</h2>
                <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-snug">
                  {brief.ordem_de_execucao.map((passo, i) => <li key={i}>{passo}</li>)}
                </ol>
              </section>
            )}
            {!!brief.adaptacao?.length && (
              <section>
                <h2 className="ficha-titulo">O que foi adaptado</h2>
                <ul className="mt-2 space-y-1.5">
                  {brief.adaptacao.map((a, i) => (
                    <li key={i} className="text-xs leading-snug"><span className="font-semibold">{a.parte}:</span> {a.o_que_mudou} <span className="text-[var(--ficha-suave)]">({a.por_que})</span></li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 print:grid-cols-2 [break-inside:avoid]">
          <section>
            <h2 className="ficha-titulo">Conferir no dia</h2>
            <ul className="mt-2 space-y-1.5">
              {brief.confirmar_pessoalmente.map((item) => (
                <li key={item} className="flex gap-2 text-xs leading-snug">
                  <span aria-hidden="true" className="mt-0.5 size-3 shrink-0 rounded-sm border border-[var(--ficha-suave)]" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="ficha-titulo">Fixação</h2>
            <p className="mt-2 text-xs leading-snug">{brief.duracao_e_fixacao}</p>
            {(brief.observacoes_para_a_profissional || notas) && (
              <>
                <h2 className="ficha-titulo mt-4">Observações</h2>
                {brief.observacoes_para_a_profissional && <p className="mt-2 text-xs leading-snug">{brief.observacoes_para_a_profissional}</p>}
                {notas && <p className="mt-1 text-xs leading-snug"><span className="font-semibold">Suas notas:</span> {notas}</p>}
              </>
            )}
          </section>
        </div>

        <footer className="mt-8 border-t border-[var(--ficha-linha)] pt-3 text-[0.625rem] leading-relaxed text-[var(--ficha-suave)]">
          Ficha gerada com IA a partir da simulação aprovada pela cliente e revisada pela Thalita. Cores aproximadas pela tela. Documento de uso interno: contém
          dados e fotos da cliente, usados só para preparar este atendimento.
        </footer>
      </article>
    </div>
  );
}
