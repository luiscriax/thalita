"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icone } from "@/components/ui/icones";
import { TelaFluxo } from "@/components/layout/tela-fluxo";
import { CabecalhoFluxo } from "@/components/ui/cabecalho-fluxo";
import { Botao, Chip } from "@/components/ui/marca";
import { ESTILOS, LOOKS, buscarLook, type Estilo } from "@/lib/data/mock/looks";
import { useJornada } from "@/lib/jornada/jornada";

export default function EstiloPage() {
  const router = useRouter();
  const { jornada, atualizar } = useJornada();
  const [filtro, setFiltro] = useState<Estilo | "todos">("todos");
  const trilho = useRef<HTMLDivElement>(null);
  // A assinatura da Thalita (Soft Glam) abre o carrossel.
  const ordenados = [...LOOKS.filter((l) => l.estilo === "soft-glam"), ...LOOKS.filter((l) => l.estilo !== "soft-glam")];
  const looks = filtro === "todos" ? ordenados : LOOKS.filter((l) => l.estilo === filtro);
  const atual = buscarLook(jornada.lookId) ?? looks[0];

  // O look visível no carrossel vira a escolha.
  useEffect(() => {
    const raiz = trilho.current;
    if (!raiz) return;
    // Cada aviso traz só os cards que mudaram; guarda a visibilidade de todos e escolhe o mais visível.
    const visibilidade = new Map<string, number>();
    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) visibilidade.set(e.target.getAttribute("data-look")!, e.isIntersecting ? e.intersectionRatio : 0);
        const [id, fracao] = [...visibilidade].sort((x, y) => y[1] - x[1])[0] ?? [];
        if (id && fracao >= 0.6) atualizar({ lookId: id });
      },
      { root: raiz, threshold: [0, 0.25, 0.5, 0.6, 0.75, 0.9, 1] },
    );
    raiz.querySelectorAll("[data-look]").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [filtro, atualizar]);

  const estilo = ESTILOS.find((e) => e.id === atual?.estilo);
  const indiceAtual = Math.max(0, looks.findIndex((l) => l.id === atual?.id));

  /** Centraliza a make `i` no carrossel; o observador acima a torna a escolhida. */
  function irPara(i: number) {
    const raiz = trilho.current;
    const card = raiz?.querySelectorAll<HTMLElement>("[data-look]")[i];
    if (!raiz || !card) return;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    raiz.scrollTo({ left: card.offsetLeft - (raiz.clientWidth - card.clientWidth) / 2, behavior: reduzir ? "auto" : "smooth" });
  }

  return (
    <TelaFluxo
      painel={atual && { imagem: atual.imagem, legenda: `${estilo?.titulo}: ${estilo?.resumo}` }}
      cabecalho={<CabecalhoFluxo etapa={2} voltarPara="/papel" />}
      rodape={
        <Botao disabled={!atual} onClick={() => router.push("/ver-em-mim")}>
          Ver em mim
        </Botao>
      }
    >
      <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight lg:mt-10 lg:text-3xl">Escolha o seu estilo</h1>

      <div className="sem-barra -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0" role="group" aria-label="Filtrar por estilo">
        <Chip ativo={filtro === "todos"} onClick={() => setFiltro("todos")}>
          Todos
        </Chip>
        {ESTILOS.map((e) => (
          <Chip key={e.id} ativo={filtro === e.id} onClick={() => setFiltro(e.id)}>
            {e.titulo}
          </Chip>
        ))}
        <Chip onClick={() => router.push("/estilo/referencia")}>
          <span className="flex items-center gap-1.5"><Icone nome="enviar" className="size-4" />Minha referência</span>
        </Chip>
      </div>

      <div className="relative">
      {/* py-1.5: o contorno da make escolhida fica 4 px fora do card e seria cortado pela rolagem. */}
      <div
        ref={trilho}
        className="sem-barra relative -mx-5 mt-3.5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-5 py-1.5 [touch-action:pan-x_pan-y] lg:-mx-14 lg:px-14"
        aria-label="Makes"
      >
        {looks.map((l, i) => (
          <article key={l.id} data-look={l.id} className="w-[78%] shrink-0 snap-center sm:w-[60%]">
            <button
              type="button"
              onClick={() => irPara(i)}
              aria-label={`Escolher ${l.titulo}`}
              aria-pressed={atual?.id === l.id}
              className={`relative block aspect-[4/5] w-full overflow-hidden rounded-foto bg-nude-2 ${atual?.id === l.id ? "ring-2 ring-champanhe ring-offset-2 ring-offset-po" : ""}`}
            >
              <Image src={l.imagem} alt={`Make ${l.titulo}`} fill priority={i < 2} sizes="(max-width: 480px) 78vw, 320px" className="object-cover" />
              <span className="absolute left-3 top-3 rounded-full bg-[#2b1a15]/55 px-2.5 py-1 text-[0.6875rem] text-[#f6ece6] backdrop-blur">
                Inspiração com IA
              </span>
            </button>
            <h2 className="mt-3 font-semibold">{l.titulo}</h2>
            <p className="text-sm text-terra">{l.descricao}</p>
          </article>
        ))}
      </div>
        {/* Com mouse não há como arrastar o carrossel: setas para passar as makes. */}
        {looks.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => irPara(indiceAtual - 1)}
              disabled={indiceAtual === 0}
              aria-label="Make anterior"
              className="absolute left-0 top-[38%] hidden size-11 -translate-x-1/2 place-items-center rounded-full bg-po text-cacau shadow-flutuante transition-opacity disabled:opacity-0 [@media(hover:hover)]:grid [@media(hover:hover)]:hover:bg-nude"
            >
              <Icone nome="voltar" />
            </button>
            <button
              type="button"
              onClick={() => irPara(indiceAtual + 1)}
              disabled={indiceAtual === looks.length - 1}
              aria-label="Próxima make"
              className="absolute right-0 top-[38%] hidden size-11 translate-x-1/2 place-items-center rounded-full bg-po text-cacau shadow-flutuante transition-opacity disabled:opacity-0 [@media(hover:hover)]:grid [@media(hover:hover)]:hover:bg-nude"
            >
              <Icone nome="avancar" />
            </button>
          </>
        )}
      </div>

      {atual && (
        <dl className="mt-5 grid grid-cols-3 gap-3 rounded-foto bg-nude p-4 text-sm">
          {(["pele", "olhos", "boca"] as const).map((k) => (
            <div key={k}>
              <dt className="text-xs text-terra">{k === "pele" ? "Pele" : k === "olhos" ? "Olhos" : "Boca"}</dt>
              <dd className="mt-0.5 font-medium leading-snug">{atual.detalhes[k]}</dd>
            </div>
          ))}
        </dl>
      )}

      <Link
        href="/estilo/referencia"
        className="mt-4 flex items-center gap-4 rounded-foto border border-dashed border-terra/40 p-4 [@media(hover:hover)]:hover:bg-nude/60"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-nude"><Icone nome="enviar" /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Viu uma make que amou?</span>
          <span className="block text-sm text-terra">Envie a foto de referência e veja essa make em você.</span>
        </span>
        <Icone nome="avancar" className="size-5 shrink-0 text-terra" />
      </Link>
    </TelaFluxo>
  );
}
