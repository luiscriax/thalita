import { describe, expect, it } from "vitest";
import { escolherProvedor } from "./provedores";

describe("escolherProvedor (ADR 0001)", () => {
  it("com chave própria usa a API do Gemini", () => expect(escolherProvedor({ GEMINI_API_KEY: "x", NODE_ENV: "production" }).nome).toBe("gemini-api"));
  it("em desenvolvimento sem chave usa o Composio", () => expect(escolherProvedor({ NODE_ENV: "development" }).nome).toBe("composio"));
  it("Composio nunca em produção: sem chave cai no simulado", () => expect(escolherProvedor({ NODE_ENV: "production" }).nome).toBe("simulado"));
  it("dá para desligar o Composio em dev", () => expect(escolherProvedor({ NODE_ENV: "development", IA_COMPOSIO: "0" }).nome).toBe("simulado"));
});
