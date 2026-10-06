"use client";

import { useState } from "react";
import { Icone } from "@/components/ui/icones";
import type { DiaDisponivel } from "@/lib/agendar/calculo";
import { FUSO } from "@/lib/domain/formatar";

const SEMANA = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];

function nomeMes(anoMes: string) {
  const t = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, month: "long", year: "numeric" }).format(new Date(`${anoMes}-15T12:00:00-03:00`));
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Calendário do mês para pular para datas distantes (noivas marcam com meses de antecedência). */
export function CalendarioMes({ dias, selecionado, aoEscolher }: { dias: DiaDisponivel[]; selecionado?: string; aoEscolher: (dia: string) => void }) {
  const meses = [...new Set(dias.map((d) => d.dia.slice(0, 7)))];
  const [i, setI] = useState(() => Math.max(0, meses.indexOf((selecionado ?? dias[0]?.dia ?? "").slice(0, 7))));
  const mes = meses[i];
  const doMes = new Map(dias.filter((d) => d.dia.startsWith(mes)).map((d) => [d.dia, d.horarios.length]));
  const primeiro = new Date(`${mes}-01T12:00:00-03:00`);
  const vazios = (primeiro.getUTCDay() + 6) % 7;
  const total = new Date(Date.UTC(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0)).getUTCDate();

  return (
    <div>
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setI(i - 1)} disabled={i === 0} aria-label="Mês anterior" className="grid size-11 place-items-center rounded-full disabled:opacity-30 [@media(hover:hover)]:hover:bg-nude">
          <Icone nome="voltar" />
        </button>
        <p className="font-semibold" aria-live="polite">{nomeMes(mes)}</p>
        <button type="button" onClick={() => setI(i + 1)} disabled={i === meses.length - 1} aria-label="Próximo mês" className="grid size-11 place-items-center rounded-full disabled:opacity-30 [@media(hover:hover)]:hover:bg-nude">
          <Icone nome="avancar" />
        </button>
      </div>
      <div className="mt-2 grid grid-cols-7 text-center text-xs text-terra" aria-hidden="true">
        {SEMANA.map((s) => <span key={s} className="py-1">{s}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: vazios }, (_, k) => <span key={`v${k}`} />)}
        {Array.from({ length: total }, (_, k) => {
          const dia = `${mes}-${String(k + 1).padStart(2, "0")}`;
          const livres = doMes.get(dia) ?? 0;
          const sim = dia === selecionado;
          return (
            <button
              key={dia}
              type="button"
              disabled={!livres}
              onClick={() => aoEscolher(dia)}
              aria-pressed={sim}
              aria-label={`${k + 1} de ${nomeMes(mes)}${livres ? `, ${livres} horários` : ", sem horário"}`}
              className={`tabular mx-auto grid size-11 place-items-center rounded-full text-sm transition-colors disabled:text-terra/35 ${
                sim ? "bg-cacau font-semibold text-cacau-fg" : livres ? "font-semibold [@media(hover:hover)]:hover:bg-nude" : ""
              }`}
            >
              <span className="relative">
                {k + 1}
                {!!livres && livres <= 3 && !sim && <span className="absolute -bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-champanhe" />}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-terra">Dias apagados não têm horário. O ponto dourado marca dias com poucos horários.</p>
    </div>
  );
}
