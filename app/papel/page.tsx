"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TelaFluxo } from "@/components/layout/tela-fluxo";
import { CabecalhoFluxo } from "@/components/ui/cabecalho-fluxo";
import { Botao, SeloMarcado } from "@/components/ui/marca";
import { buscarOcasiao } from "@/lib/data/mock/catalogo";
import { formatarMoeda } from "@/lib/domain/formatar";
import { useJornada } from "@/lib/jornada/jornada";
import { useCatalogo } from "@/lib/catalogo/use-catalogo";

export default function Papel() {
  const router = useRouter();
  const { jornada, atualizar } = useJornada();
  const ocasiao = buscarOcasiao(jornada.ocasiao);
  const catalogo = useCatalogo();

  // Sem ocasião escolhida (link direto ou sessão nova): volta para o começo do fluxo.
  useEffect(() => {
    const t = setTimeout(() => !jornada.ocasiao && router.replace("/momento"), 400);
    return () => clearTimeout(t);
  }, [jornada.ocasiao, router]);

  return (
    <TelaFluxo
      painel={ocasiao && { imagem: ocasiao.imagem, foco: ocasiao.foco, legenda: ocasiao.titulo }}
      cabecalho={<CabecalhoFluxo etapa={1} voltarPara="/momento" />}
      rodape={
        <Botao disabled={!jornada.papel} onClick={() => router.push("/estilo")}>
          Continuar
        </Botao>
      }
    >
      <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight lg:mt-10 lg:text-3xl">
        {ocasiao ? `${ocasiao.titulo}: qual é o seu papel?` : "Qual é o seu papel?"}
      </h1>
      <p className="mt-2 text-sm text-terra">Cada papel tem um cuidado e um preço diferente.</p>

      <ul className="mt-6 space-y-3">
        {ocasiao?.papeis.filter((p) => catalogo.ativo(ocasiao.id, p.id)).map((p) => {
          const sim = jornada.papel === p.id;
          return (
            <li key={p.id}>
              <button
                type="button"
                aria-pressed={sim}
                onClick={() => atualizar({ papel: p.id })}
                className={`flex w-full items-center gap-4 rounded-foto border p-5 text-left transition-colors active:scale-[0.99] ${
                  sim ? "border-cacau bg-nude" : "border-nude-2 bg-po [@media(hover:hover)]:hover:bg-nude/60"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold">{p.titulo}</span>
                  <span className="mt-1 block text-sm text-terra">{p.descricao}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-xs text-terra">a partir de</span>
                  <span className="tabular block font-semibold">{formatarMoeda(catalogo.preco(ocasiao.id, p.id) ?? p.servicoCentavos)}</span>
                </span>
                <SeloMarcado marcado={sim} />
              </button>
            </li>
          );
        })}
      </ul>
    </TelaFluxo>
  );
}
