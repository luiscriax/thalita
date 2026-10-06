// Controle de uso da IA (servidor): limite por dia e registro de custo em uso_ia.
import { createHmac } from "node:crypto";
import { supabaseAdmin, supabaseServidor } from "@/lib/supabase/servidor";
import { limiteDeSimulacoes, podeSimular } from "./limite";

/** Custo estimado de uma simulação (docs/pesquisa/custos-ia.md): ≈ R$ 0,43. */
export const CUSTO_SIMULACAO_CENTAVOS = 43;

function ipDoPedido(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "desconhecido";
}

/** Impressão do IP (HMAC com a chave do servidor): conta o uso sem guardar o IP. */
function chaveDoAparelho(request: Request, segredo: string): string {
  return createHmac("sha256", segredo).update(ipDoPedido(request)).digest("hex").slice(0, 32);
}

export type Verificacao = { ok: true; registrar: () => Promise<void> } | { ok: false; status: number; erro: string; precisaEntrar: boolean };

export async function verificarUsoIA(request: Request): Promise<Verificacao> {
  const producao = process.env.NODE_ENV === "production";
  // Só no computador de desenvolvimento: testar sem limite (produção ignora).
  if (!producao && process.env.IA_SEM_LIMITE === "1") return { ok: true, registrar: async () => {} };
  const segredo = process.env.SUPABASE_SECRET_KEY;
  if (!segredo) {
    return producao ? { ok: false, status: 503, erro: "Simulação indisponível no momento.", precisaEntrar: false } : { ok: true, registrar: async () => {} };
  }
  const admin = supabaseAdmin();
  const { data: sessao } = await (await supabaseServidor()).auth.getUser();
  const userId = sessao.user?.id ?? null;
  const chave = chaveDoAparelho(request, segredo);
  const desde = new Date(Date.now() - 86_400_000).toISOString();

  const consulta = admin.from("uso_ia").select("id", { count: "exact", head: true }).eq("tipo", "simulacao").gte("criado_em", desde);
  const { count, error } = await (userId ? consulta.eq("user_id", userId) : consulta.eq("chave_hash", chave));
  if (error) {
    console.error("[uso_ia]", error.message);
    return producao ? { ok: false, status: 503, erro: "Simulação indisponível no momento.", precisaEntrar: false } : { ok: true, registrar: async () => {} };
  }
  let comReserva = false;
  if (userId) {
    const { data: cli } = await admin.from("clientes").select("id").eq("user_id", userId).maybeSingle();
    if (cli) {
      const { count: n } = await admin.from("reservas").select("id", { count: "exact", head: true }).eq("cliente_id", cli.id).in("status", ["solicitada", "aguardando_sinal", "confirmada"]);
      comReserva = (n ?? 0) > 0;
    }
  }
  const usadasHoje = count ?? 0;
  if (!podeSimular({ usadasHoje, logada: !!userId, comReserva })) {
    return userId
      ? { ok: false, status: 429, erro: `Você já fez as ${limiteDeSimulacoes({ logada: true, comReserva })} simulações de hoje. Amanhã libera mais.`, precisaEntrar: false }
      : { ok: false, status: 429, erro: "O teste grátis é uma simulação por dia. Entre com o seu e-mail para continuar testando.", precisaEntrar: true };
  }
  return {
    ok: true,
    registrar: async () => {
      await admin.from("uso_ia").insert({ user_id: userId, chave_hash: chave, tipo: "simulacao", custo_centavos: CUSTO_SIMULACAO_CENTAVOS });
    },
  };
}
