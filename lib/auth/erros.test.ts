import { describe, expect, it } from "vitest";
import { mensagemDeErroLogin } from "./erros";

describe("mensagemDeErroLogin", () => {
  it("e-mail inválido fala do e-mail, não do código", () =>
    expect(mensagemDeErroLogin({ code: "email_address_invalid", message: 'Email address "x" is invalid' })).toMatch(/e-mail/i));
  it("e-mail fora da equipe (servidor de e-mail padrão)", () =>
    expect(mensagemDeErroLogin({ code: "email_address_not_authorized", message: "Email address not authorized" })).toMatch(/ainda não/i));
  it("muitos pedidos", () => expect(mensagemDeErroLogin({ code: "over_email_send_rate_limit", message: "rate limit" })).toMatch(/Espere/));
  it("código vencido ou errado", () => expect(mensagemDeErroLogin({ code: "otp_expired", message: "Token has expired or is invalid" })).toMatch(/Código incorreto ou vencido/));
  it("Google desligado", () => expect(mensagemDeErroLogin({ code: "validation_failed", message: "Unsupported provider: provider is not enabled" })).toMatch(/Google/));
  it("desconhecido: mensagem genérica", () => expect(mensagemDeErroLogin({ message: "boom" })).toMatch(/Tente de novo/));
});
