"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarioMes } from "@/components/agendar/calendario-mes";
import { RodaHorarios } from "@/components/agendar/roda-horarios";
import { TelaFluxo } from "@/components/layout/tela-fluxo";
import { CabecalhoFluxo } from "@/components/ui/cabecalho-fluxo";
import { Folha } from "@/components/ui/folha";
import { Icone } from "@/components/ui/icones";
import { Botao } from "@/components/ui/marca";
import { agendaDosDias } from "@/lib/agendar/calculo";
import { useAgenda } from "@/lib/agendar/use-agenda";
import { buscarPapel } from "@/lib/data/mock/catalogo";
import { buscarLook } from "@/lib/data/mock/looks";
import { PROFISSIONAIS, PROFISSIONAL } from "@/lib/data/mock/profissional";
import { FUSO, formatarHora } from "@/lib/domain/formatar";
import { useJornada } from "@/lib/jornada/jornada";

/** Noivas marcam com meses de antecedência (docs/pesquisa/agendamento-referencias.md). */
const JANELA_DIAS = 180;

function partesDia(dia: string) {
  const d = new Date(`${dia}T12:00:00-03:00`);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, ...o }).format(d).replace(".", "");
  return { semana: f({ weekday: "short" }), numero: f({ day: "numeric" }), mes: f({ month: "short" }), mesLongo: f({ month: "long" }), longo: f({ weekday: "long" }) };
}

export default function Quando() {
  const router = useRouter();
  const { jornada, atualizar } = useJornada();
  const papel = buscarPapel(jornada.ocasiao, jornada.papel);
  const look = buscarLook(jornada.lookId);
  // "Agora" fixado na montagem: a lista não muda enquanto a cliente escolhe.
  const [agora] = useState(() => new Date());
  const [mesAberto, setMesAberto] = useState(false);
  const agenda = useAgenda(JANELA_DIAS + 1);
  const faixa = useRef<HTMLDivElement>(null);

  const dias = useMemo(
    () =>
      agendaDosDias({
        agora,
        dias: JANELA_DIAS,
        duracaoMin: papel?.duracaoMin ?? 150,
        modo: jornada.modo ?? "no_espaco",
        ocupados: agenda.ocupados,
        disponibilidade: agenda.disponibilidade,
      }),
    [agora, papel?.duracaoMin, jornada.modo, agenda],
  );
  // O dia segue o horário guardado na jornada (que só é restaurada depois de montar a tela).
  const [dia, setDia] = useState<string>();
  const diaDaJornada = jornada.inicio && dias.find((d) => d.horarios.includes(jornada.inicio!))?.dia;
  const diaAtual = dias.find((d) => d.dia === (dia ?? diaDaJornada) && d.horarios.length) ?? dias.find((d) => d.horarios.length);
  const horarios = useMemo(() => diaAtual?.horarios ?? [], [diaAtual]);
  // Na roda sempre há um horário no meio: o escolhido, ou o primeiro livre do dia.
  const escolhido = jornada.inicio && horarios.includes(jornada.inicio) ? jornada.inicio : horarios[0];
  const aoMudarHorario = useCallback((h: string) => atualizar({ inicio: h }), [atualizar]);

  useEffect(() => {
    const t = setTimeout(() => !jornada.papel && router.replace("/momento"), 400);
    return () => clearTimeout(t);
  }, [jornada.papel, router]);

  // A faixa centraliza o dia escolhido: na hora ao abrir (ex.: voltou do resumo com data em dezembro), com animação depois.
  const posicionou = useRef(false);
  useEffect(() => {
    const el = faixa.current;
    const chip = el?.querySelector<HTMLElement>("[aria-checked='true']");
    if (!el || !chip) return;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: chip.offsetLeft - (el.clientWidth - chip.clientWidth) / 2, behavior: posicionou.current && !reduzir ? "smooth" : "auto" });
    posicionou.current = true;
  }, [diaAtual?.dia]);

  /** Troca o dia mantendo a mesma hora, se ela estiver livre no novo dia. */
  function irPara(d: string) {
    setDia(d);
    const novos = dias.find((x) => x.dia === d)?.horarios ?? [];
    const mesmaHora = escolhido && novos.find((h) => formatarHora(h) === formatarHora(escolhido));
    atualizar({ inicio: mesmaHora || novos[0] });
  }

  const info = diaAtual && partesDia(diaAtual.dia);
  const temHorario = dias.some((d) => d.horarios.length);

  return (
    <TelaFluxo
      painel={look && { imagem: look.imagem, legenda: "Escolha o dia e o horário. A Thalita confirma com você." }}
      cabecalho={<CabecalhoFluxo etapa={4} voltarPara="/ver-em-mim/resultado" />}
      rodape={
        <Botao
          disabled={!escolhido}
          onClick={() => {
            atualizar({ inicio: escolhido });
            router.push("/agendar/onde");
          }}
        >
          Continuar
        </Botao>
      }
    >
      {/* Com uma só profissional, é uma linha; com equipe, vira o primeiro seletor (docs/pesquisa/agendamento-referencias.md). */}
      <p className="mt-5 flex items-center gap-3 lg:mt-10">
        <span className="relative size-10 shrink-0 overflow-hidden rounded-full bg-nude-2 ring-2 ring-champanhe ring-offset-2 ring-offset-po">
          <Image src={PROFISSIONAL.foto} alt="" fill sizes="40px" className="object-cover object-[50%_25%]" />
        </span>
        <span className="text-sm text-terra">
          Com <span className="font-semibold text-cacau">{PROFISSIONAL.nomeCompleto}</span>
          {PROFISSIONAIS.length > 1 && <span className="sr-only"> (profissional)</span>}
        </span>
      </p>

      <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight text-balance lg:text-3xl">Quando é o seu momento?</h1>

      {!temHorario ? (
        <div className="mt-6 rounded-foto bg-nude p-5">
          <p className="font-semibold">A agenda dos próximos meses está cheia.</p>
          <p className="mt-1 text-sm text-terra">Fale com a Thalita: às vezes abre uma vaga ou dá para encaixar.</p>
        </div>
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between">
            <h2 className="text-sm font-medium capitalize text-terra" aria-live="polite">{info?.mesLongo}</h2>
            <button type="button" onClick={() => setMesAberto(true)} className="flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-cacau [@media(hover:hover)]:hover:bg-nude/60">
              <Icone nome="calendario" className="size-5 text-terra" />
              Ver mês
            </button>
          </div>

          <div ref={faixa} role="radiogroup" aria-label="Dia" className="sem-barra -mx-5 mt-2 flex snap-x scroll-px-5 gap-2 overflow-x-auto px-5 pb-1 lg:-mx-14 lg:scroll-px-14 lg:px-14">
            {dias.map((d) => {
              const p = partesDia(d.dia);
              const sim = d.dia === diaAtual?.dia;
              const livre = d.horarios.length > 0;
              return (
                <button
                  key={d.dia}
                  data-dia={d.dia}
                  type="button"
                  role="radio"
                  aria-checked={sim}
                  disabled={!livre}
                  aria-label={`${p.longo}, ${p.numero} de ${p.mes}${!livre ? ", sem horário" : ""}`}
                  onClick={() => irPara(d.dia)}
                  className={`flex w-14 shrink-0 snap-start flex-col items-center rounded-2xl py-3 transition-colors disabled:opacity-30 ${
                    sim ? "bg-cacau text-cacau-fg" : "[@media(hover:hover)]:enabled:hover:bg-nude/60"
                  }`}
                >
                  <span className={`text-xs ${sim ? "" : "text-terra"}`}>{p.semana}</span>
                  <span className="tabular mt-1 text-xl font-semibold">{p.numero}</span>
                </button>
              );
            })}
          </div>

          <h2 className="mt-8 text-sm font-medium text-terra">Horário</h2>
          <div className="mt-3">
            <RodaHorarios key={diaAtual?.dia} horarios={horarios} valor={escolhido} aoMudar={aoMudarHorario} rotulo={info ? `Horário em ${info.longo}, ${info.numero} de ${info.mes}` : "Horário"} />
          </div>
        </>
      )}

      <Folha aberta={mesAberto} aoFechar={() => setMesAberto(false)} titulo="Escolha o dia">
        <CalendarioMes
          dias={dias}
          selecionado={diaAtual?.dia}
          aoEscolher={(d) => {
            setMesAberto(false);
            irPara(d);
          }}
        />
      </Folha>
    </TelaFluxo>
  );
}
