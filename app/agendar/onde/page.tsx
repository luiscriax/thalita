"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { OpcaoGrande, ResumoLook } from "@/components/agendar/partes";
import { TelaFluxo } from "@/components/layout/tela-fluxo";
import { CabecalhoFluxo } from "@/components/ui/cabecalho-fluxo";
import { Icone } from "@/components/ui/icones";
import { Aviso, Botao, Campo } from "@/components/ui/marca";
import { deslocamentoPorCep } from "@/lib/agendar/calculo";
import { useAgenda } from "@/lib/agendar/use-agenda";
import { buscarLook } from "@/lib/data/mock/looks";
import { PROFISSIONAL } from "@/lib/data/mock/profissional";
import { horariosLivres } from "@/lib/domain/agenda";
import { formatarDataCurta, formatarHora, formatarMoeda } from "@/lib/domain/formatar";
import { mascaraCep } from "@/lib/domain/mascaras";
import { useJornada } from "@/lib/jornada/jornada";

function diaSP(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
}

export default function Onde() {
  const router = useRouter();
  const { jornada, atualizar } = useJornada();
  const look = buscarLook(jornada.lookId);
  const [cep, setCep] = useState(jornada.cep ?? "");
  const [complemento, setComplemento] = useState(jornada.endereco ?? "");
  const [agora] = useState(() => new Date());
  const agenda = useAgenda(30);
  const modo = jornada.modo;
  // CEP real (BrasilAPI) pelo servidor, com o mesmo cálculo da cobrança; sem conexão, a tabela de exemplo.
  type Desl = { tipo: "invalido" | "desconhecido" } | { tipo: "taxa"; centavos: number; km: number | null; endereco: { logradouro: string; bairro: string; cidade: string; uf: string } } | { tipo: "orcamento"; km: number | null; endereco: { logradouro: string; bairro: string; cidade: string; uf: string } };
  const [consulta, setConsulta] = useState<{ cep: string; resultado: Desl } | null>(null);
  const [buscando, setBuscando] = useState(() => !!jornada.cep);
  const consultar = (d: string, valor: string) =>
    fetch(`/api/cep?cep=${d}`)
      .then((r) => r.json() as Promise<Desl>)
      .catch(() => deslocamentoPorCep(valor) as Desl)
      .then((resultado) => setConsulta({ cep: d, resultado }))
      .finally(() => setBuscando(false));
  function buscarCep(valor: string) {
    const d = valor.replace(/\D/g, "");
    if (d.length !== 8) return;
    setBuscando(true);
    void consultar(d, valor);
  }
  useEffect(() => {
    // Só na abertura da tela, para o CEP já escolhido antes.
    if (jornada.cep) void consultar(jornada.cep.replace(/\D/g, ""), jornada.cep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const desl = modo === "domicilio" && consulta && consulta.cep === cep.replace(/\D/g, "") ? consulta.resultado : null;

  useEffect(() => {
    const t = setTimeout(() => !jornada.inicio && router.replace("/agendar/quando"), 400);
    return () => clearTimeout(t);
  }, [jornada.inicio, router]);

  // Em domicílio a Thalita precisa de 30 min de folga antes e depois: o horário pode deixar de caber.
  const cabe =
    modo !== "domicilio" ||
    !jornada.inicio ||
    horariosLivres({
      dia: diaSP(jornada.inicio),
      disponibilidade: agenda.disponibilidade,
      ocupados: agenda.ocupados,
      duracaoMin: 150,
      modo: "domicilio",
      agora,
    }).includes(jornada.inicio);

  const pronto = modo === "no_espaco" || (modo === "domicilio" && cabe && (desl?.tipo === "taxa" || desl?.tipo === "orcamento") && complemento.trim().length > 0);

  function continuar() {
    if (modo === "domicilio" && desl && "endereco" in desl) {
      atualizar({
        cep,
        endereco: complemento.trim(),
        deslocamento: { tipo: desl.tipo, centavos: desl.tipo === "taxa" ? desl.centavos : undefined, km: desl.km, ...desl.endereco },
      });
    } else atualizar({ cep: undefined, endereco: undefined, deslocamento: undefined });
    router.push("/agendar/quem");
  }

  return (
    <TelaFluxo
      painel={look && { imagem: look.imagem, legenda: "No espaço ou na sua casa. Você escolhe." }}
      cabecalho={<CabecalhoFluxo etapa={4} voltarPara="/agendar/quando" />}
      rodape={<Botao disabled={!pronto} onClick={continuar}>Continuar</Botao>}
    >
      <div className="mt-5 lg:mt-10">
        <ResumoLook jornada={jornada}>{jornada.inicio && `${formatarDataCurta(jornada.inicio)} às ${formatarHora(jornada.inicio)}`}</ResumoLook>
      </div>

      <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight lg:text-3xl">Onde vai ser a make?</h1>

      <div role="radiogroup" aria-label="Local do atendimento" className="mt-6 space-y-3">
        <OpcaoGrande
          icone="local"
          titulo="No espaço da Thalita"
          descricao={`${PROFISSIONAL.espaco.bairro}, ${PROFISSIONAL.cidadeBase}. O endereço completo chega com a confirmação.`}
          marcada={modo === "no_espaco"}
          onClick={() => atualizar({ modo: "no_espaco" })}
          extra="Sem taxa"
        />
        <OpcaoGrande
          icone="casa"
          titulo="No meu endereço"
          descricao="A Thalita leva tudo até você. A taxa depende da distância."
          marcada={modo === "domicilio"}
          onClick={() => atualizar({ modo: "domicilio" })}
        />
      </div>

      {modo === "domicilio" && (
        <div className="mt-6 space-y-4">
          <Campo
            id="cep"
            rotulo="CEP"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            value={cep}
            onChange={(e) => {
              const v = mascaraCep(e.target.value);
              setCep(v);
              buscarCep(v);
            }}
            erro={desl?.tipo === "desconhecido" ? "Não encontramos esse CEP. Confira os números." : undefined}
            ajuda={buscando ? "Buscando o endereço…" : !desl ? "Só para calcular o deslocamento." : undefined}
          />
          <a
            href="https://buscacepinter.correios.com.br/app/endereco/index.php"
            target="_blank"
            rel="noreferrer"
            className="-mt-2 inline-flex min-h-11 items-center text-sm text-terra underline underline-offset-4"
          >
            Não sei o meu CEP
          </a>

          {(desl?.tipo === "taxa" || desl?.tipo === "orcamento") && (
            <div className="rounded-foto bg-nude p-4" aria-live="polite">
              <div className="flex items-start gap-3">
                <Icone nome="local" className="mt-0.5 size-5 shrink-0 text-terra" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{desl.endereco.logradouro}</p>
                  <p className="text-sm text-terra">
                    {desl.endereco.bairro}, {desl.endereco.cidade} ({desl.endereco.uf})
                  </p>
                </div>
                {desl.tipo === "taxa" && (
                  <p className="tabular shrink-0 text-right">
                    <span className="block text-xs text-terra">deslocamento</span>
                    <span className="font-semibold">{formatarMoeda(desl.centavos)}</span>
                  </p>
                )}
              </div>
              {desl.tipo === "orcamento" && (
                <p className="mt-3 border-t border-nude-2 pt-3 text-sm text-alerta">
                  Fica fora da área de atendimento padrão. Seu pedido vira um orçamento: a Thalita responde com o valor do deslocamento antes de qualquer pagamento.
                </p>
              )}
            </div>
          )}

          {(desl?.tipo === "taxa" || desl?.tipo === "orcamento") && (
            <Campo
              id="complemento"
              rotulo="Número e complemento"
              autoComplete="address-line2"
              placeholder="Ex.: 820, apto 52"
              value={complemento}
              onChange={(e) => setComplemento(e.target.value.slice(0, 80))}
            />
          )}

          {!cabe && (
            <Aviso tom="alerta" titulo="Esse horário fica apertado com o deslocamento">
              Em domicílio a Thalita precisa de um tempo para chegar e montar tudo. Escolha outro horário ou faça no espaço.
            </Aviso>
          )}
          {!cabe && (
            <Botao variante="secundario" onClick={() => router.push("/agendar/quando")}>Escolher outro horário</Botao>
          )}
        </div>
      )}
    </TelaFluxo>
  );
}
