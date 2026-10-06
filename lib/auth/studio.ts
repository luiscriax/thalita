import { supabaseAdmin, supabaseServidor } from "@/lib/supabase/servidor";

export type AcessoStudio = { tipo: "liberado"; demo: boolean } | { tipo: "entrar" } | { tipo: "negado" };

/**
 * Quem pode abrir o Studio: só a conta ligada à profissional (profissionais.user_id).
 * Exceção de demonstração: apenas em desenvolvimento e com STUDIO_DEMO=1 (produção nunca abre sem login).
 */
export async function acessoAoStudio(): Promise<AcessoStudio> {
  if (process.env.NODE_ENV === "development" && process.env.STUDIO_DEMO === "1") return { tipo: "liberado", demo: true };
  const supabase = await supabaseServidor();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return { tipo: "entrar" };
  const { data: prof } = await supabaseAdmin().from("profissionais").select("id").eq("user_id", id).maybeSingle();
  return prof ? { tipo: "liberado", demo: false } : { tipo: "negado" };
}
