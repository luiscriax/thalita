"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PaginaStudio } from "@/components/studio/partes";
import { Folha } from "@/components/ui/folha";
import { Icone } from "@/components/ui/icones";
import { Interruptor } from "@/components/ui/interruptor";
import { Botao, Campo, Chip } from "@/components/ui/marca";
import { descreverServico } from "@/lib/data/mock/catalogo";
import { PROFISSIONAL } from "@/lib/data/mock/profissional";
import { usePedidos } from "@/lib/dados/use-pedidos";
import { BLOQUEIOS, type Bloqueio, type ReservaMock } from "@/lib/data/mock/reservas";
import { FUSO, formatarHora } from "@/lib/domain/formatar";
import { diasDaSemana, itensDoDia } from "@/lib/studio/painel";
import { STATUS_STUDIO } from "@/lib/studio/status";

const NOMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const ORDEM = [1, 2, 3, 4, 5, 6, 0];
const MOTIVOS = ["Folga", "Curso", "Viagem", "Compromisso"];
const SEMANA_MS = 7 * 86_400_000;

function cabecalhoDia(dia: string) {
  const d = new Date(`${dia}T12:00:00-03:00`);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, ...o }).format(d).replace(".", "");
  return { semana: f({ weekday: "short" }), numero: f({ day: "numeric" }), mes: f({ month: "long" }) };
}

/** Reservas e bloqueios de um dia. */
function ItensDoDia({ dia, reservas, bloqueios, aoTirar }: { dia: string; reservas: ReservaMock[]; bloqueios: Bloqueio[]; aoTirar: (id: string) => void }) {
    const itens = itensDoDia(dia, reservas, bloqueios);
    if (!itens.length) return <p className="py-3 text-center text-xs text-terra/70">Livre</p>;
    return (
      <ul className="space-y-2">
        {itens.map((i) =>
          i.tipo === "reserva" ? (
            <li key={i.id}>
              <Link href={`/studio/reservas/${i.id}`} className={`block rounded-2xl border-l-4 bg-po p-3 text-sm shadow-sm ${i.status === "confirmada" ? "border-sucesso" : "border-alerta"}`}>
                <span className="tabular block text-xs text-terra">{formatarHora(i.inicio)} a {formatarHora(i.fim)}</span>
                <span className="block font-semibold leading-snug [overflow-wrap:anywhere]">{reservas.find((r) => r.id === i.id)?.cliente.nome}</span>
                <span className="line-clamp-2 block text-xs text-terra">{descreverServico(reservas.find((r) => r.id === i.id)?.ocasiao, reservas.find((r) => r.id === i.id)?.papel)}</span>
                <span className="mt-1 block text-xs font-medium">{STATUS_STUDIO[i.status].texto}</span>
              </Link>
            </li>
          ) : (
            <li key={i.id} className="rounded-2xl bg-[repeating-linear-gradient(135deg,var(--nude-2)_0_6px,transparent_6px_12px)] p-3 text-sm">
              <span className="tabular block text-xs text-terra">{formatarHora(i.inicio)} a {formatarHora(i.fim)}</span>
              <span className="flex items-start justify-between gap-1">
                <span className="min-w-0 font-medium leading-snug [overflow-wrap:anywhere]">{i.motivo}</span>
                <button type="button" onClick={() => aoTirar(i.id)} aria-label={`Tirar bloqueio ${i.motivo}`} className="grid size-8 shrink-0 place-items-center rounded-full bg-po/80">
                  <Icone nome="fechar" className="size-4" />
                </button>
              </span>
            </li>
          ),
        )}
      </ul>
    );
}

export default function Agenda() {
  const { pedidos: reservas } = usePedidos();
  const [hoje] = useState(() => new Date());
  const [deslocamento, setDeslocamento] = useState(0);
  const semana = diasDaSemana(new Date(hoje.getTime() + deslocamento * SEMANA_MS));
  const diaHoje = diasDaSemana(hoje).find((d) => d === new Intl.DateTimeFormat("en-CA", { timeZone: FUSO }).format(hoje));
  const [diaMovel, setDiaMovel] = useState<string>(diaHoje ?? semana[0]);
  const diaSelecionado = semana.includes(diaMovel) ? diaMovel : semana[0];

  const [bloqueios, setBloqueios] = useState<Bloqueio[]>(BLOQUEIOS);
  const [demoBloqueios, setDemoBloqueios] = useState(true);
  useEffect(() => {
    let ativo = true;
    fetch("/api/studio/bloqueios")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { demo: boolean; bloqueios?: Bloqueio[] } | null) => {
        if (!ativo || !d || d.demo) return;
        setDemoBloqueios(false);
        setBloqueios(d.bloqueios ?? []);
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);
  const [horarios, setHorarios] = useState(() =>
    Object.fromEntries(ORDEM.map((d) => {
      const j = PROFISSIONAL.disponibilidade.find((x) => x.diaSemana === d);
      return [d, { ativo: !!j, inicio: j?.inicio ?? "08:00", fim: j?.fim ?? "21:00" }];
    })) as Record<number, { ativo: boolean; inicio: string; fim: string }>,
  );
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState({ motivo: "Folga", dia: "", inteiro: true, inicio: "08:00", fim: "12:00" });

  const primeiro = cabecalhoDia(semana[0]);
  const ultimo = cabecalhoDia(semana[6]);
  const titulo = primeiro.mes === ultimo.mes ? `${primeiro.numero} a ${ultimo.numero} de ${ultimo.mes}` : `${primeiro.numero} de ${primeiro.mes} a ${ultimo.numero} de ${ultimo.mes}`;

  const tirar = (id: string) => {
    setBloqueios((b) => b.filter((x) => x.id !== id));
    if (!demoBloqueios) void fetch(`/api/studio/bloqueios?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  };

  function adicionarBloqueio() {
    const ini = form.inteiro ? "00:00" : form.inicio;
    const fim = form.inteiro ? "23:59" : form.fim; // dia inteiro cobre até a última make (21h + 2h30)
    const novoBloqueio = { motivo: form.motivo, inicio: new Date(`${form.dia}T${ini}:00-03:00`).toISOString(), fim: new Date(`${form.dia}T${fim}:00-03:00`).toISOString() };
    setNovo(false);
    if (demoBloqueios) return setBloqueios((b) => [...b, { id: `b${Date.now()}`, ...novoBloqueio }]);
    void fetch("/api/studio/bloqueios", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(novoBloqueio) })
      .then((r) => (r.ok ? (r.json() as Promise<Bloqueio>) : null))
      .then((b) => b && setBloqueios((lista) => [...lista, b]));
  }

  return (
    <PaginaStudio
      titulo="Agenda"
      subtitulo={titulo}
      acao={<Botao className="!min-h-11 !w-auto" onClick={() => { setForm({ motivo: "Folga", dia: "", inteiro: true, inicio: "08:00", fim: "12:00" }); setNovo(true); }}><Icone nome="mais" />Bloquear horário</Botao>}
    >
      <Link href="/studio/configuracoes#google-agenda" className="mb-4 flex w-fit items-center gap-2 rounded-full bg-sucesso/12 px-3 py-1.5 text-xs font-medium text-sucesso">
        <span className="size-2 rounded-full bg-sucesso" aria-hidden="true" />
        Sincronizada com o Google Agenda
      </Link>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setDeslocamento(deslocamento - 1)} aria-label="Semana anterior" className="grid size-11 place-items-center rounded-full border border-nude-2"><Icone nome="voltar" /></button>
        <button type="button" onClick={() => setDeslocamento(deslocamento + 1)} aria-label="Próxima semana" className="grid size-11 place-items-center rounded-full border border-nude-2"><Icone nome="avancar" /></button>
        {deslocamento !== 0 && <Chip onClick={() => setDeslocamento(0)}>Hoje</Chip>}
      </div>

      {/* Celular e tablet: escolhe o dia e vê a lista. */}
      <div className="mt-4 lg:hidden">
        <div role="radiogroup" aria-label="Dia" className="grid grid-cols-7 gap-1">
          {semana.map((d) => {
            const c = cabecalhoDia(d);
            const n = itensDoDia(d, reservas, bloqueios).filter((i) => i.tipo === "reserva").length;
            const sim = d === diaSelecionado;
            return (
              <button key={d} type="button" role="radio" aria-checked={sim} onClick={() => setDiaMovel(d)} className={`flex flex-col items-center rounded-2xl py-2 ${sim ? "bg-cacau text-cacau-fg" : ""}`}>
                <span className={`text-xs ${sim ? "" : "text-terra"}`}>{c.semana}</span>
                <span className="tabular text-lg font-semibold">{c.numero}</span>
                <span className={`size-1.5 rounded-full ${n ? "bg-champanhe" : "bg-transparent"}`} aria-hidden="true" />
              </button>
            );
          })}
        </div>
        <div className="mt-4 rounded-foto bg-nude/60 p-3">
          {horarios[new Date(`${diaSelecionado}T12:00:00-03:00`).getUTCDay()].ativo ? (
            <ItensDoDia dia={diaSelecionado} reservas={reservas} bloqueios={bloqueios} aoTirar={tirar} />
          ) : (
            <p className="py-3 text-center text-xs text-terra/70">Folga</p>
          )}
        </div>
      </div>

      {/* Computador: semana inteira. */}
      <div className="mt-4 hidden grid-cols-7 gap-2 lg:grid">
        {semana.map((d) => {
          const c = cabecalhoDia(d);
          const trabalho = horarios[new Date(`${d}T12:00:00-03:00`).getUTCDay()];
          return (
            <div key={d} className={`min-h-64 rounded-foto p-2 ${d === diaHoje && deslocamento === 0 ? "bg-nude" : "bg-nude/50"}`}>
              <p className="px-1 pb-2 text-sm"><span className="text-terra">{c.semana}</span> <span className="tabular font-semibold">{c.numero}</span></p>
              {trabalho.ativo ? <ItensDoDia dia={d} reservas={reservas} bloqueios={bloqueios} aoTirar={tirar} /> : <p className="py-3 text-center text-xs text-terra/70">Folga</p>}
            </div>
          );
        })}
      </div>

      <section className="mt-10" aria-labelledby="horarios">
        <h2 id="horarios" className="text-lg font-semibold">Horários de trabalho</h2>
        <p className="mt-1 text-sm text-terra">Horários em que a make pode começar (o último é o horário final). As clientes só veem horários livres, já descontando 2h30 de make, 30 min de folga em domicílio e os compromissos do seu Google Agenda.</p>
        <div className="mt-4 divide-y divide-nude-2 overflow-hidden rounded-foto bg-nude/60">
          {ORDEM.map((d) => {
            const h = horarios[d];
            return (
              <div key={d} className="flex flex-wrap items-center gap-x-4 gap-y-2 pr-4">
                <div className="min-w-48 flex-1"><Interruptor titulo={NOMES[d]} ligado={h.ativo} aoMudar={(v) => setHorarios({ ...horarios, [d]: { ...h, ativo: v } })} /></div>
                {h.ativo ? (
                  <div className="flex items-center gap-2 pb-3 pl-4 text-sm sm:pb-0 sm:pl-0">
                    <input type="time" aria-label={`${NOMES[d]}, início`} value={h.inicio} step={1800} onChange={(e) => setHorarios({ ...horarios, [d]: { ...h, inicio: e.target.value } })} className="tabular min-h-11 rounded-campo bg-po px-3" />
                    <span className="text-terra">até</span>
                    <input type="time" aria-label={`${NOMES[d]}, fim`} value={h.fim} step={1800} onChange={(e) => setHorarios({ ...horarios, [d]: { ...h, fim: e.target.value } })} className="tabular min-h-11 rounded-campo bg-po px-3" />
                  </div>
                ) : (
                  <span className="pb-3 pl-4 text-sm text-terra sm:pb-0 sm:pl-0">Folga</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <Folha aberta={novo} aoFechar={() => setNovo(false)} titulo="Bloquear horário">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-terra">Motivo</legend>
          <div className="flex flex-wrap gap-2">{MOTIVOS.map((m) => <Chip key={m} ativo={form.motivo === m} onClick={() => setForm({ ...form, motivo: m })}>{m}</Chip>)}</div>
        </fieldset>
        <div className="mt-4 space-y-3">
          <Campo id="bloq-dia" rotulo="Dia" type="date" value={form.dia} onChange={(e) => setForm({ ...form, dia: e.target.value })} />
          <div className="overflow-hidden rounded-foto bg-nude/60"><Interruptor titulo="Dia inteiro" ligado={form.inteiro} aoMudar={(v) => setForm({ ...form, inteiro: v })} /></div>
          {!form.inteiro && (
            <div className="grid grid-cols-2 gap-3">
              <Campo id="bloq-ini" rotulo="Das" type="time" step={1800} value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} />
              <Campo id="bloq-fim" rotulo="Até" type="time" step={1800} value={form.fim} onChange={(e) => setForm({ ...form, fim: e.target.value })} />
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-terra">Pedidos já feitos nesse período continuam valendo. Só novos horários deixam de aparecer.</p>
        <div className="mt-5">
          <Botao disabled={!form.dia || (!form.inteiro && form.fim <= form.inicio)} onClick={adicionarBloqueio}>Bloquear</Botao>
        </div>
      </Folha>
    </PaginaStudio>
  );
}
