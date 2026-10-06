"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { formatarHora } from "@/lib/domain/formatar";

const ALTURA = 52;
const VISIVEIS = 5;
const SOBRA = ((VISIVEIS - 1) / 2) * ALTURA;

function suave(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

/**
 * Roda de horários (como o despertador do celular): a cliente rola e o horário do meio é o escolhido.
 * Toque num horário leva-o ao meio; no teclado, setas, Home e End.
 */
export function RodaHorarios({ horarios, valor, aoMudar, rotulo = "Horário" }: {
  horarios: string[];
  valor?: string;
  aoMudar: (horario: string) => void;
  rotulo?: string;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const id = useId();
  const indiceValor = Math.max(0, horarios.indexOf(valor ?? ""));
  const [ativo, setAtivo] = useState(indiceValor);
  // Valores atuais para o ouvinte de rolagem, que é criado uma vez só: recriá-lo a cada render
  // cancelava a gravação pendente do horário.
  const atual = useRef({ valor, horarios, aoMudar });
  useEffect(() => {
    atual.current = { valor, horarios, aoMudar };
  });

  // Posiciona no horário escolhido antes de pintar (ao abrir e quando a lista muda).
  useLayoutEffect(() => {
    caixa.current?.scrollTo({ top: indiceValor * ALTURA });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reposiciona quando a lista muda, não a cada rolagem
  }, [horarios]);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    let espera: ReturnType<typeof setTimeout>;
    const indiceAtual = () => Math.min(atual.current.horarios.length - 1, Math.max(0, Math.round(el.scrollTop / ALTURA)));
    const rolar = () => {
      setAtivo(indiceAtual());
      clearTimeout(espera);
      espera = setTimeout(() => {
        const { valor: v, horarios: lista, aoMudar: mudar } = atual.current;
        const h = lista[indiceAtual()];
        if (h && h !== v) mudar(h);
      }, 120);
    };
    el.addEventListener("scroll", rolar, { passive: true });
    return () => {
      el.removeEventListener("scroll", rolar);
      clearTimeout(espera);
    };
  }, []);

  function irPara(i: number) {
    const alvo = Math.min(horarios.length - 1, Math.max(0, i));
    caixa.current?.scrollTo({ top: alvo * ALTURA, behavior: suave() });
  }

  function tecla(e: KeyboardEvent) {
    const mapa: Record<string, number> = { ArrowDown: ativo + 1, ArrowUp: ativo - 1, Home: 0, End: horarios.length - 1 };
    if (!(e.key in mapa)) return;
    e.preventDefault();
    irPara(mapa[e.key]);
  }

  return (
    <div className="relative mx-auto w-full max-w-60" style={{ height: VISIVEIS * ALTURA }}>
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 rounded-full bg-nude" style={{ top: SOBRA, height: ALTURA }} />
      <div
        ref={caixa}
        role="listbox"
        aria-label={rotulo}
        aria-activedescendant={`${id}-${ativo}`}
        tabIndex={0}
        onKeyDown={tecla}
        className="sem-barra relative h-full snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-full [mask-image:linear-gradient(to_bottom,transparent,black_30%,black_70%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-4"
        style={{ paddingBlock: SOBRA }}
      >
        {horarios.map((h, i) => {
          const sim = i === ativo;
          return (
            <div
              key={h}
              id={`${id}-${i}`}
              role="option"
              aria-selected={sim}
              onClick={() => irPara(i)}
              className={`tabular flex snap-center items-center justify-center text-center transition-[color,font-size] duration-150 ${
                sim ? "text-2xl font-semibold text-cacau" : "text-lg text-terra/70"
              }`}
              style={{ height: ALTURA }}
            >
              {formatarHora(h)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
