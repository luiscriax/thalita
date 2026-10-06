import type { ReactNode } from "react";

/** Moldura das telas do studio (ferramenta de trabalho: densa, clara, sem decoração). */
export function PaginaStudio({ titulo, subtitulo, acao, voltar, children }: { titulo: string; subtitulo?: ReactNode; acao?: ReactNode; voltar?: ReactNode; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-6xl px-5 pb-10 pt-[max(env(safe-area-inset-top),1rem)] md:px-8 md:pt-8">
      {voltar}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight lg:text-3xl">{titulo}</h1>
          {subtitulo && <p className="mt-1 text-sm text-terra">{subtitulo}</p>}
        </div>
        {acao}
      </div>
      <div className="mt-6">{children}</div>
    </main>
  );
}

export function Cartao({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-foto bg-nude/60 p-4 md:p-5 ${className}`}>{children}</section>;
}
