"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icone, type NomeIcone } from "@/components/ui/icones";
import { Marca } from "@/components/ui/marca";

const ITENS: { href: string; rotulo: string; icone: NomeIcone }[] = [
  { href: "/inicio", rotulo: "Início", icone: "casa" },
  { href: "/makes", rotulo: "Minhas makes", icone: "looks" },
  { href: "/reservas", rotulo: "Reservas", icone: "calendario" },
  { href: "/conta", rotulo: "Conta", icone: "usuario" },
];

const ativo = (atual: string, href: string) => atual === href || atual.startsWith(`${href}/`);

/** Barra inferior (celular e tablet) e barra superior (computador) da área da cliente. */
export function NavegacaoCliente() {
  const atual = usePathname();
  return (
    <>
      <header className="sticky top-0 z-30 hidden border-b border-nude-2 bg-po/90 backdrop-blur lg:block">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-8">
          <Link href="/inicio" aria-label="Início">
            <Marca />
          </Link>
          <nav aria-label="Principal" className="flex gap-1">
            {ITENS.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                aria-current={ativo(atual, i.href) ? "page" : undefined}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${ativo(atual, i.href) ? "bg-cacau text-cacau-fg" : "text-terra [@media(hover:hover)]:hover:bg-nude"}`}
              >
                {i.rotulo}
              </Link>
            ))}
          </nav>
          <Link href="/momento" className="rounded-full bg-cacau px-5 py-2.5 text-sm font-semibold text-cacau-fg">
            Testar uma make
          </Link>
        </div>
      </header>

      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-nude-2 bg-po/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-4">
          {ITENS.map((i) => {
            const sim = ativo(atual, i.href);
            return (
              <li key={i.href}>
                <Link
                  href={i.href}
                  aria-current={sim ? "page" : undefined}
                  className={`flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium ${sim ? "text-cacau" : "text-terra"}`}
                >
                  <span className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${sim ? "bg-nude" : ""}`}>
                    <Icone nome={i.icone} className="size-[22px]" />
                  </span>
                  {i.rotulo}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
