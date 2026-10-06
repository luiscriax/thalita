import { NextResponse } from "next/server";
import { garantirCliente } from "@/lib/auth/cadastro";
import { destinoAposEntrar, destinoSeguro } from "@/lib/auth/destino";
import { supabaseServidor } from "@/lib/supabase/servidor";

/** Volta do link do e-mail (PKCE) e do Google: troca o código pela sessão. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const destino = destinoSeguro(searchParams.get("next"), origin);
  if (code) {
    const supabase = await supabaseServidor();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const { profissional } = await garantirCliente(supabase, data.user);
      return NextResponse.redirect(`${origin}${destinoAposEntrar(destino, profissional)}`);
    }
  }
  return NextResponse.redirect(`${origin}/entrar?erro=link`);
}
