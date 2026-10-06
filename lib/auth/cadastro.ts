import type { SupabaseClient, User } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/servidor";

/**
 * Garante o cadastro de cliente da pessoa que acabou de entrar (gravado com a sessão dela; o RLS confere).
 * Devolve se a conta é a da profissional, para mandá-la direto ao Studio.
 */
export async function garantirCliente(supabase: SupabaseClient, user: User): Promise<{ profissional: boolean }> {
  const nome = (user.user_metadata?.full_name as string | undefined) ?? user.email?.split("@")[0] ?? "Cliente";
  await supabase.from("clientes").upsert({ user_id: user.id, email: user.email, nome }, { onConflict: "user_id", ignoreDuplicates: true });
  await vincularProfissional(user);
  const { data: prof } = await supabaseAdmin().from("profissionais").select("id").eq("user_id", user.id).maybeSingle();
  return { profissional: !!prof };
}

/**
 * Se o e-mail for o da profissional (PROFISSIONAL_EMAIL), liga a conta à vitrine dela.
 * Só preenche quando ainda não há dona: ninguém "toma" o studio de outra pessoa.
 */
async function vincularProfissional(user: User) {
  const email = process.env.PROFISSIONAL_EMAIL?.trim().toLowerCase();
  if (!email || user.email?.toLowerCase() !== email || !user.email_confirmed_at) return;
  await supabaseAdmin().from("profissionais").update({ user_id: user.id }).eq("slug", process.env.PROFISSIONAL_SLUG ?? "thalita-mariano").is("user_id", null);
}
