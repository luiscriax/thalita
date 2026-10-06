import type { Metadata } from "next";
import Link from "next/link";
import { CONTROLADOR } from "@/lib/legal/controlador";
import { DOCUMENTOS, type Slug } from "@/lib/legal/documentos";
import { Marca } from "@/components/ui/marca";

const OUTROS: { slug: Slug; rotulo: string }[] = [
  { slug: "sua-foto", rotulo: "Como sua foto é tratada" },
  { slug: "privacidade", rotulo: "Privacidade" },
  { slug: "termos", rotulo: "Termos de uso" },
  { slug: "cookies", rotulo: "Cookies" },
];

export function metadadosLegais(slug: Slug): Metadata {
  const d = DOCUMENTOS[slug];
  return { title: `${d.titulo} · ${CONTROLADOR.marca}`, description: d.descricao };
}

export function PaginaLegal({ slug }: { slug: Slug }) {
  const d = DOCUMENTOS[slug];
  return (
    <main className="mx-auto max-w-2xl px-5 pb-16 pt-[max(env(safe-area-inset-top),1.25rem)]">
      <div className="flex items-center justify-between">
        <Link href="/" aria-label="Voltar para o início" className="-ml-2 grid size-11 place-items-center rounded-full active:bg-nude">
          <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
            <path d="m15 5-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <Marca className="text-xl" />
      </div>

      {CONTROLADOR.provisorio && (
        <p role="note" className="mt-5 rounded-campo bg-nude p-3 text-sm text-alerta">
          Rascunho: dados da empresa provisórios e texto ainda sem revisão jurídica.
        </p>
      )}

      <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight">{d.titulo}</h1>
      <p className="mt-1 text-sm text-terra">Atualizado em {d.atualizado}</p>
      <p className="mt-5 rounded-campo bg-nude p-4 text-base">{d.resumo}</p>

      <div className="mt-8 space-y-8">
        {d.secoes.map((s) => (
          <section key={s.titulo}>
            <h2 className="text-lg font-semibold">{s.titulo}</h2>
            <div className="mt-2 space-y-3 text-base leading-relaxed text-cacau/90">
              {s.paragrafos.map((p) => (
                <p key={p.slice(0, 40)}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <nav aria-label="Outros documentos" className="mt-12 border-t border-nude-2 pt-6">
        <ul className="flex flex-wrap gap-x-5 gap-y-3 text-sm">
          {OUTROS.filter((o) => o.slug !== slug).map((o) => (
            <li key={o.slug}>
              <Link href={`/${o.slug}`} className="text-terra underline underline-offset-4">
                {o.rotulo}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-xs text-terra">
          {CONTROLADOR.razaoSocial} · CNPJ {CONTROLADOR.cnpj} · {CONTROLADOR.endereco} · {CONTROLADOR.email}
        </p>
      </nav>
    </main>
  );
}
