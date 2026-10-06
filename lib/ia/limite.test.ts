import { describe, expect, it } from "vitest";
import { limiteDeSimulacoes, podeSimular } from "./limite";

describe("limite de simulações por dia (PRD 7.1)", () => {
  it("sem conta: 1 por aparelho/IP", () => expect(limiteDeSimulacoes({ logada: false, comReserva: false })).toBe(1));
  it("com conta: 5", () => expect(limiteDeSimulacoes({ logada: true, comReserva: false })).toBe(5));
  it("com reserva: 5 + 10", () => expect(limiteDeSimulacoes({ logada: true, comReserva: true })).toBe(15));
  it("libera até o limite e bloqueia depois", () => {
    expect(podeSimular({ usadasHoje: 0, logada: false, comReserva: false })).toBe(true);
    expect(podeSimular({ usadasHoje: 1, logada: false, comReserva: false })).toBe(false);
    expect(podeSimular({ usadasHoje: 4, logada: true, comReserva: false })).toBe(true);
    expect(podeSimular({ usadasHoje: 5, logada: true, comReserva: false })).toBe(false);
  });
});
