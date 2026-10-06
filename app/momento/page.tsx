"use client";

import { useRouter } from "next/navigation";
import { TelaFluxo } from "@/components/layout/tela-fluxo";
import { CabecalhoFluxo } from "@/components/ui/cabecalho-fluxo";
import { EscolhaFoto } from "@/components/ui/escolha-foto";
import { Botao } from "@/components/ui/marca";
import { OCASIOES } from "@/lib/data/mock/catalogo";
import { useJornada } from "@/lib/jornada/jornada";

export default function Momento() {
  const router = useRouter();
  const { jornada, atualizar } = useJornada();
  const escolhida = jornada.ocasiao;
  // No computador, a foto grande acompanha a ocasião escolhida.
  const daOcasiao = OCASIOES.find((o) => o.id === escolhida);

  return (
    <TelaFluxo
      painel={{ imagem: daOcasiao?.imagem ?? "/acervo/marca/abertura-v2.jpg", foco: daOcasiao?.foco, legenda: "Cada momento pede uma make. Escolha o seu." }}
      cabecalho={<CabecalhoFluxo etapa={1} voltarPara="/" />}
      rodape={
        <Botao disabled={!escolhida} onClick={() => router.push("/papel")}>
          Continuar
        </Botao>
      }
    >
      <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight lg:mt-10 lg:text-3xl">Para qual momento é a sua make?</h1>
      <p className="mt-2 text-sm text-terra">Fotos de inspiração criadas com IA.</p>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:gap-4">
        {OCASIOES.map((o, i) => (
          <EscolhaFoto
            key={o.id}
            titulo={o.titulo}
            imagem={o.imagem}
            foco={o.foco}
            prioridade={i < 4}
            selecionada={escolhida === o.id}
            onClick={() => atualizar({ ocasiao: o.id })}
            className={i === OCASIOES.length - 1 ? "col-span-2 !aspect-[4/3]" : ""}
          />
        ))}
      </div>
    </TelaFluxo>
  );
}
