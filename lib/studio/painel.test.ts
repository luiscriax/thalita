import { describe, expect, it } from "vitest";
import { diasDaSemana, itensDoDia, resumoPedidos } from "./painel";

const agora = new Date("2026-11-10T12:00:00-03:00"); // terça
const r = (id: string, inicio: string, status: string, total = 20000, fim?: string) => ({
  id, inicio, fim: fim ?? new Date(new Date(inicio).getTime() + 150 * 60_000).toISOString(), status, valores: { total },
}) as never;

describe("resumoPedidos", () => {
  const lista = [
    r("a", "2026-11-12T10:00:00-03:00", "solicitada"),
    r("b", "2026-11-14T10:00:00-03:00", "aguardando_sinal", 30000),
    r("c", "2026-11-15T10:00:00-03:00", "confirmada", 50000),
    r("d", "2026-12-15T10:00:00-03:00", "confirmada", 70000),
    r("e", "2026-11-01T10:00:00-03:00", "realizada", 22000),
    r("f", "2026-11-20T10:00:00-03:00", "cancelada_cliente", 99000),
  ];
  it("conta o que pede ação da Thalita", () => {
    const s = resumoPedidos(lista, agora);
    expect(s.novos).toBe(1);
    expect(s.aguardandoSinal).toBe(1);
  });
  it("próximos 7 dias: só confirmadas", () => expect(resumoPedidos(lista, agora).proximos7dias).toBe(1));
  it("previsto no mês: confirmadas e realizadas do mês corrente (SP)", () => {
    expect(resumoPedidos(lista, agora).previstoMes).toBe(50000 + 22000);
  });
});

describe("agenda da semana", () => {
  it("semana começa na segunda (dia civil de SP)", () => {
    expect(diasDaSemana(agora)).toEqual(["2026-11-09", "2026-11-10", "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15"]);
  });
  it("itens do dia em ordem de horário, reservas e bloqueios juntos", () => {
    const reservas = [r("x", "2026-11-12T15:00:00-03:00", "confirmada"), r("y", "2026-11-12T08:00:00-03:00", "solicitada"), r("z", "2026-11-13T08:00:00-03:00", "confirmada")];
    const bloqueios = [{ id: "b", motivo: "Curso", inicio: "2026-11-12T11:00:00-03:00", fim: "2026-11-12T13:00:00-03:00" }];
    expect(itensDoDia("2026-11-12", reservas, bloqueios).map((i) => i.id)).toEqual(["y", "b", "x"]);
  });
  it("canceladas não ocupam a agenda", () => {
    expect(itensDoDia("2026-11-20", [r("f", "2026-11-20T10:00:00-03:00", "cancelada_cliente")], [])).toEqual([]);
  });
});
