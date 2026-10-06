/** Mensagens do login em português, a partir do código de erro do Supabase Auth (não do texto em inglês). */
export function mensagemDeErroLogin(e: { code?: string; message?: string }): string {
  const codigo = e.code ?? "";
  const texto = e.message ?? "";
  if (codigo === "email_address_invalid") return "Confira o e-mail digitado: ele não parece válido.";
  if (codigo === "email_address_not_authorized") return "O envio de e-mail ainda não está liberado para esse endereço. Tente com Google ou mais tarde.";
  if (codigo.startsWith("over_") || /rate limit/i.test(texto)) return "Muitos pedidos de código seguidos. Espere um minuto e tente de novo.";
  if (codigo === "otp_expired" || /expired|invalid/i.test(texto)) return "Código incorreto ou vencido. Confira os números ou peça um novo.";
  if (/provider is not enabled|unsupported provider/i.test(texto)) return "O login com Google ainda não está ativo. Use o seu e-mail.";
  return "Não deu certo agora. Tente de novo em instantes.";
}
