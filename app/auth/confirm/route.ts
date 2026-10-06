import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { garantirCliente } from "@/lib/auth/cadastro";
import { destinoAposEntrar, destinoSeguro } from "@/lib/auth/destino";
import { supabaseServidor } from "@/lib/supabase/servidor";

/** Link do e-mail no modelo com token_hash (usado quando o e-mail próprio estiver ligado). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const tipo = searchParams.get("type") as EmailOtpType | null;
  const destino = destinoSeguro(searchParams.get("next"), origin);
  if (tokenHash && tipo) {
    const supabase = await supabaseServidor();
    const { data, error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    if (!error && data.user) {
      const { profissional } = await garantirCliente(supabase, data.user);
      return NextResponse.redirect(`${origin}${destinoAposEntrar(destino, profissional)}`);
    }
  }
  return NextResponse.redirect(`${origin}/entrar?erro=link`);
}
