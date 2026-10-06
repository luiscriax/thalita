"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icone, type NomeIcone } from "@/components/ui/icones";
import { Marca } from "@/components/ui/marca";

const ITENS: { href: string; rotulo: string; icone: NomeIcone }[] = [
  { href: "/studio", rotulo: "Pedidos", icone: "pedidos" },
  { href: "/studio/agenda", rotulo: "Agenda", icone: "calendario" },
  { href: "/studio/acervo", rotulo: "Acervo", icone: "acervo" },
  { href: "/studio/servicos", rotulo: "Serviços", icone: "pincel" },
  { href: "/studio/configuracoes", rotulo: "Ajustes", icone: "ajustes" },
];

function ativo(atual: string, href: string) {
  if (href === "/studio") return atual === "/studio" || atual.startsWith("/studio/reservas");
  return atual === href || atual.startsWith(`${href}/`);
}

/** Barra lateral (tablet/computador) e barra inferior (celular) do studio. */
export function NavegacaoStudio() {
  const atual = usePathname();
  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-nude-2 bg-nude/40 px-4 py-8 md:flex">
        <Link href="/studio" className="px-3">
          <Marca className="text-[1.0625rem]" />
          <span className="mt-1 block text-xs text-terra">Studio</span>
        </Link>
        <nav aria-label="Studio" className="mt-8 flex flex-col gap-1">
          {ITENS.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              aria-current={ativo(atual, i.href) ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-full px-3 text-sm font-medium transition-colors ${ativo(atual, i.href) ? "bg-cacau text-cacau-fg" : "text-cacau [@media(hover:hover)]:hover:bg-nude"}`}
            >
              <Icone nome={i.icone} />
              {i.rotulo}
            </Link>
          ))}
        </nav>
        <Link href="/" className="mt-auto flex min-h-11 items-center gap-3 rounded-full px-3 text-sm text-terra [@media(hover:hover)]:hover:bg-nude">
          <Icone nome="olho" />
          Ver o app como cliente
        </Link>
      </aside>

      <nav aria-label="Studio" className="fixed inset-x-0 bottom-0 z-30 border-t border-nude-2 bg-po/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="grid grid-cols-5">
          {ITENS.map((i) => {
            const sim = ativo(atual, i.href);
            return (
              <li key={i.href}>
                <Link
                  href={i.href}
                  aria-current={sim ? "page" : undefined}
                  className={`flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium ${sim ? "text-cacau" : "text-terra"}`}
                >
                  <span className={`grid h-7 w-11 place-items-center rounded-full ${sim ? "bg-nude" : ""}`}>
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
