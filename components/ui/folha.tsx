"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icone } from "./icones";

/**
 * Folha inferior no celular; diálogo central a partir de 768 px.
 * Acessível: foco vai para dentro ao abrir e volta ao sair, Esc fecha, foco preso, arrastar para baixo fecha.
 */
export function Folha({ aberta, aoFechar, titulo, children }: { aberta: boolean; aoFechar: () => void; titulo: string; children: ReactNode }) {
  const caixa = useRef<HTMLDivElement>(null);
  const idTitulo = useId();
  const arraste = useRef<{ y: number; dy: number } | null>(null);
  // Quem usa a folha passa `aoFechar` como função nova a cada render; guardada aqui para o efeito
  // abaixo rodar só ao abrir/fechar (senão cada letra digitada devolvia o foco ao botão Fechar).
  const fechar = useRef(aoFechar);
  useEffect(() => {
    fechar.current = aoFechar;
  });

  useEffect(() => {
    if (!aberta) return;
    const anterior = document.activeElement as HTMLElement | null;
    const focaveis = () =>
      Array.from(caixa.current?.querySelectorAll<HTMLElement>("button, a[href], input, textarea, select, [tabindex]:not([tabindex='-1'])") ?? []);
    // Foco na própria folha (não no Fechar nem num campo, que abriria o teclado do celular sozinho).
    caixa.current?.focus({ preventScroll: true });
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar.current();
      if (e.key !== "Tab") return;
      const lista = focaveis();
      if (!lista.length) return;
      const [primeiro, ultimo] = [lista[0], lista[lista.length - 1]];
      if (e.shiftKey && (document.activeElement === primeiro || document.activeElement === caixa.current)) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeiro.focus();
      }
    };
    document.addEventListener("keydown", tecla);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = overflow;
      anterior?.focus();
    };
  }, [aberta]);

  if (!aberta) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center md:items-center">
      <button type="button" aria-label="Fechar" tabIndex={-1} onClick={aoFechar} className="folha-fundo absolute inset-0 bg-[#1a110e]/50" />
      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        tabIndex={-1}
        className="folha-entrada outline-none relative max-h-[90dvh] w-full overflow-y-auto rounded-t-folha bg-po px-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-3 text-cacau shadow-flutuante md:max-w-md md:rounded-folha md:pb-6"
      >
        <div
          className="mx-auto mb-3 flex h-6 w-16 touch-none items-center justify-center md:hidden"
          onPointerDown={(e) => {
            arraste.current = { y: e.clientY, dy: 0 };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!arraste.current || !caixa.current) return;
            arraste.current.dy = Math.max(0, e.clientY - arraste.current.y);
            caixa.current.style.transform = `translateY(${arraste.current.dy}px)`;
          }}
          onPointerUp={() => {
            if (arraste.current && arraste.current.dy > 90) aoFechar();
            else if (caixa.current) caixa.current.style.transform = "";
            arraste.current = null;
          }}
        >
          <span className="h-1 w-10 rounded-full bg-nude-2" />
        </div>
        <div className="flex items-start justify-between gap-4">
          <h2 id={idTitulo} className="font-display text-xl font-semibold tracking-tight">
            {titulo}
          </h2>
          <button type="button" onClick={aoFechar} aria-label="Fechar" className="-mr-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-full active:bg-nude">
            <Icone nome="fechar" />
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
