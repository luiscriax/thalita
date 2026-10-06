import type { StatusReserva } from "@/lib/domain/reserva";

const DIA = 86_400_000;
const OFFSET_SP = "-03:00";

type ReservaBase = { id: string; inicio: string; fim: string; status: StatusReserva; valores: { total: number } };
type BloqueioBase = { id: string; motivo: string; inicio: string; fim: string };

function diaSP(d: Date | string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));
}

/** Números do topo do painel de pedidos. */
export function resumoPedidos(lista: ReservaBase[], agora: Date) {
  const mes = diaSP(agora).slice(0, 7);
  const t = agora.getTime();
  return {
    novos: lista.filter((r) => r.status === "solicitada" || r.status === "orcamento").length,
    aguardandoSinal: lista.filter((r) => r.status === "aguardando_sinal").length,
    proximos7dias: lista.filter((r) => r.status === "confirmada" && new Date(r.inicio).getTime() >= t && new Date(r.inicio).getTime() < t + 7 * DIA).length,
    previstoMes: lista
      .filter((r) => (r.status === "confirmada" || r.status === "realizada") && diaSP(r.inicio).slice(0, 7) === mes)
      .reduce((soma, r) => soma + r.valores.total, 0),
  };
}

/** Os 7 dias civis (SP) da semana de `referencia`, de segunda a domingo. */
export function diasDaSemana(referencia: Date): string[] {
  const hoje = diaSP(referencia);
  const meioDia = new Date(`${hoje}T12:00:00${OFFSET_SP}`);
  const desdeSegunda = (meioDia.getUTCDay() + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => diaSP(new Date(meioDia.getTime() + (i - desdeSegunda) * DIA)));
}

export type ItemAgenda =
  | ({ tipo: "reserva" } & ReservaBase)
  | ({ tipo: "bloqueio" } & BloqueioBase);

const FORA_DA_AGENDA: StatusReserva[] = ["cancelada_cliente", "cancelada_profissional", "expirada"];

/** Reservas que ocupam horário e bloqueios de um dia, em ordem de início. */
export function itensDoDia<R extends ReservaBase>(dia: string, reservas: R[], bloqueios: BloqueioBase[]) {
  const doDia = (x: { inicio: string }) => diaSP(x.inicio) === dia;
  return [
    ...reservas.filter((r) => doDia(r) && !FORA_DA_AGENDA.includes(r.status)).map((r) => ({ ...r, tipo: "reserva" as const })),
    ...bloqueios.filter(doDia).map((b) => ({ ...b, tipo: "bloqueio" as const })),
  ].sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
}
