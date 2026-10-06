"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CaixaAceite, OpcaoGrande } from "@/components/agendar/partes";
import { TelaFluxo } from "@/components/layout/tela-fluxo";
import { CabecalhoFluxo } from "@/components/ui/cabecalho-fluxo";
import { Aviso, Botao, Campo } from "@/components/ui/marca";
import { buscarLook } from "@/lib/data/mock/looks";
import { ehMenorNaData } from "@/lib/domain/idade";
import { useJornada } from "@/lib/jornada/jornada";

function diaSP(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

export default function Quem() {
  const router = useRouter();
  const { jornada, atualizar } = useJornada();
  const look = buscarLook(jornada.lookId);
  const [propria, setPropria] = useState<boolean | undefined>(jornada.pessoa?.propria);
  const [nome, setNome] = useState(jornada.pessoa?.nome ?? "");
  const [nascimento, setNascimento] = useState(jornada.pessoa?.nascimento ?? "");
  const [responsavel, setResponsavel] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => !jornada.modo && router.replace("/agendar/onde"), 400);
    return () => clearTimeout(t);
  }, [jornada.modo, router]);

  const dataValida = /^\d{4}-\d{2}-\d{2}$/.test(nascimento) && nascimento < new Date().toISOString().slice(0, 10) && nascimento > "1900-01-01";
  const menor = propria === false && dataValida && !!jornada.inicio && ehMenorNaData(nascimento, diaSP(jornada.inicio));
  const primeiroNome = nome.trim().split(/\s+/)[0];

  const pronto = propria === true || (propria === false && nome.trim().length >= 2 && dataValida && (!menor || responsavel));

  function continuar() {
    atualizar({
      pessoa: propria ? { propria: true } : { propria: false, nome: nome.trim(), nascimento },
      consentimentos: { ...jornada.consentimentos, responsavel: menor ? true : undefined },
    });
    router.push("/agendar/resumo");
  }

  return (
    <TelaFluxo
      painel={look && { imagem: look.imagem, legenda: "Pode ser para você ou para alguém especial." }}
      cabecalho={<CabecalhoFluxo etapa={4} voltarPara="/agendar/onde" />}
      rodape={<Botao disabled={!pronto} onClick={continuar}>Continuar</Botao>}
    >
      <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight lg:mt-10 lg:text-3xl">A make é para quem?</h1>

      <div role="radiogroup" aria-label="Pessoa atendida" className="mt-6 space-y-3">
        <OpcaoGrande icone="usuario" titulo="Para mim" descricao="A make é sua." marcada={propria === true} onClick={() => setPropria(true)} />
        <OpcaoGrande icone="looks" titulo="Para outra pessoa" descricao="Filha, mãe, amiga ou um presente para alguém." marcada={propria === false} onClick={() => setPropria(false)} />
      </div>

      {propria === true && (
        <p className="mt-4 text-sm text-terra">
          Ao continuar, você confirma que tem 18 anos ou mais. Se a make for para alguém menor de idade, a pessoa responsável faz o pedido em &quot;Para outra pessoa&quot;.
        </p>
      )}

      {propria === false && (
        <div className="mt-6 space-y-4">
          <Campo id="nome" rotulo="Nome da pessoa" autoComplete="off" value={nome} onChange={(e) => setNome(e.target.value.slice(0, 60))} placeholder="Nome e sobrenome" />
          <Campo
            id="nascimento"
            rotulo="Data de nascimento"
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            value={nascimento}
            onChange={(e) => setNascimento(e.target.value)}
            ajuda="Para saber se precisamos da autorização de uma pessoa responsável."
          />
          {menor && (
            <div className="space-y-3">
              <Aviso tom="alerta" titulo={`${primeiroNome || "A pessoa"} vai ter menos de 18 anos no dia`}>
                Nesse caso, quem faz o pedido precisa ser a pessoa responsável e autorizar o atendimento.
              </Aviso>
              <CaixaAceite id="responsavel" marcada={responsavel} aoMudar={setResponsavel}>
                Sou a pessoa responsável legal por {primeiroNome || "ela"} e autorizo a maquiagem e o uso da foto para a simulação, como explicado em{" "}
                <Link href="/sua-foto" className="underline underline-offset-4">Sua foto</Link>.
              </CaixaAceite>
            </div>
          )}
        </div>
      )}
    </TelaFluxo>
  );
}
