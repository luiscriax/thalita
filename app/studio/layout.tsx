import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NavegacaoStudio } from "@/components/layout/navegacao-studio";
import { SoNoCliente } from "@/components/layout/so-no-cliente";
import { Marca } from "@/components/ui/marca";
import { acessoAoStudio } from "@/lib/auth/studio";

export const metadata: Metadata = { title: "Studio", robots: { index: false } };

export default async function LayoutStudio({ children }: { children: React.ReactNode }) {
  const acesso = await acessoAoStudio();
  if (acesso.tipo === "entrar") redirect("/entrar?next=/studio");
  if (acesso.tipo === "negado") {
    return (
      <main data-palco className="flex min-h-dvh flex-col items-center justify-center bg-po px-6 text-center text-cacau">
        <Marca className="text-xl" />
        <h1 className="mt-10 font-display text-2xl font-semibold">Esta área é só da profissional</h1>
        <p className="mt-2 max-w-xs text-sm text-terra">Você entrou como cliente. Suas makes e reservas ficam no início.</p>
        <Link href="/inicio" className="mt-8 flex min-h-12 w-full max-w-xs items-center justify-center rounded-full bg-cacau font-semibold text-cacau-fg">Ir para o início</Link>
      </main>
    );
  }
  return (
    <div className="flex min-h-dvh bg-po text-cacau">
      <div className="contents print:hidden">
        <NavegacaoStudio />
      </div>
      <div className="min-w-0 flex-1 pb-24 md:pb-0 print:pb-0">
        {acesso.demo && <p className="bg-alerta/15 print:hidden px-4 py-2 text-center text-xs font-medium text-alerta">Modo demonstração (só no computador de desenvolvimento): dados de exemplo, sem login.</p>}
        <SoNoCliente>{children}</SoNoCliente>
      </div>
    </div>
  );
}
