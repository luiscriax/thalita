import { describe, expect, it } from "vitest";
import { destinoAposEntrar, destinoSeguro } from "./destino";

const origem = "http://localhost:3000";

describe("destinoSeguro (para onde ir depois de entrar)", () => {
  it("caminho interno passa", () => expect(destinoSeguro("/agendar/resumo", origem)).toBe("/agendar/resumo"));
  it("mantém a busca", () => expect(destinoSeguro("/reservas?aba=anteriores", origem)).toBe("/reservas?aba=anteriores"));
  it("URL completa do próprio app vira caminho", () => expect(destinoSeguro("http://localhost:3000/inicio", origem)).toBe("/inicio"));
  it("site externo cai no início", () => expect(destinoSeguro("https://golpe.com/roubar", origem)).toBe("/inicio"));
  it("barra dupla (protocolo relativo) cai no início", () => expect(destinoSeguro("//golpe.com", origem)).toBe("/inicio"));
  it("barra invertida cai no início", () => expect(destinoSeguro("/\\golpe.com", origem)).toBe("/inicio"));
  it("vazio cai no início", () => expect(destinoSeguro(null, origem)).toBe("/inicio"));
});

describe("destinoAposEntrar (a Thalita cai direto no Studio)", () => {
  it("profissional sem destino específico vai para o Studio", () => {
    expect(destinoAposEntrar("/inicio", true)).toBe("/studio");
  });
  it("profissional que veio de um link específico continua indo para ele", () => {
    expect(destinoAposEntrar("/studio/reservas/abc", true)).toBe("/studio/reservas/abc");
    expect(destinoAposEntrar("/agendar/resumo", true)).toBe("/agendar/resumo");
  });
  it("cliente segue para onde ia", () => {
    expect(destinoAposEntrar("/inicio", false)).toBe("/inicio");
    expect(destinoAposEntrar("/agendar/resumo", false)).toBe("/agendar/resumo");
  });
});
