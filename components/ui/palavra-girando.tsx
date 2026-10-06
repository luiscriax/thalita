"use client";

import { useEffect, useState } from "react";

/**
 * Troca o final de uma frase em ciclo (inspirado no onboarding do Wedy).
 * Leitores de tela recebem só a frase fixa; quem prefere menos movimento vê a primeira opção parada.
 */
export function PalavraGirando({ opcoes, intervaloMs = 2600 }: { opcoes: string[]; intervaloMs?: number }) {
  const [i, setI] = useState(0);
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let t: ReturnType<typeof setTimeout>;
    const id = setInterval(() => {
      setSaindo(true);
      t = setTimeout(() => {
        setI((x) => (x + 1) % opcoes.length);
        setSaindo(false);
      }, 280);
    }, intervaloMs);
    return () => {
      clearInterval(id);
      clearTimeout(t);
    };
  }, [opcoes.length, intervaloMs]);

  return (
    <span aria-hidden="true" className={`inline-block transition-[opacity,transform,filter] duration-300 ease-out ${saindo ? "translate-y-2 opacity-0 blur-[2px]" : "translate-y-0 opacity-100 blur-0"}`}>
      {opcoes[i]}
    </span>
  );
}
