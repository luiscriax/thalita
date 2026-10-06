import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Renova a sessão do Supabase a cada pedido (o Next 16 chama este arquivo de proxy).
 * Não bloqueia rotas: o teste grátis funciona sem conta; cada área protegida confere a sessão no servidor.
 */
export async function proxy(request: NextRequest) {
  let resposta = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        resposta = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => resposta.cookies.set(name, value, options));
      },
    },
  });
  // Importante: não remover. Sem getClaims() a sessão não é renovada e a pessoa é deslogada.
  await supabase.auth.getClaims();
  return resposta;
}

export const config = {
  // Fora: arquivos estáticos, imagens, detector de rosto, ícones e o webhook da Stripe (corpo cru).
  matcher: ["/((?!_next/static|_next/image|mediapipe|marca|acervo|demo|api/stripe/webhook|favicon.ico|icon.png|apple-icon.png|manifest.webmanifest|opengraph-image.jpg|.*\\.(?:png|jpg|jpeg|svg|webp|wasm)$).*)"],
};
