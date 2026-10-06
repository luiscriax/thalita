"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Componente-assinatura: a maquiagem chega com uma pincelada que varre a selfie (uma vez),
 * depois a divisória vira arrastável para comparar antes e depois.
 */
export function AntesDepois({ antes, depois, alt }: { antes: string; depois: string; alt: string }) {
  const [fase, setFase] = useState<"carregando" | "revelando" | "comparando">("carregando");
  const [posicao, setPosicao] = useState(50);
  const caixa = useRef<HTMLDivElement>(null);
  const arrastando = useRef(false);
  const carregadas = useRef(new Set<string>());

  // A pincelada só começa com as duas fotos prontas, para não acontecer "no escuro" em conexão lenta.
  // Idempotente: conta pelo onLoad ou pela imagem já completa (cache), o que vier primeiro.
  const marcar = (qual: "antes" | "depois") => {
    if (carregadas.current.has(qual)) return;
    carregadas.current.add(qual);
    if (carregadas.current.size === 2) setFase("revelando");
  };
  // Fotos vindas do cache podem terminar antes de o React ligar o onLoad: confere logo após montar.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      caixa.current?.querySelectorAll<HTMLImageElement>("img[data-qual]").forEach((img) => {
        if (img.complete && img.naturalWidth > 0) marcar(img.dataset.qual as "antes" | "depois");
      });
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (fase !== "revelando") return;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t = setTimeout(() => setFase("comparando"), reduzir ? 150 : 1300);
    return () => clearTimeout(t);
  }, [fase]);

  const mover = useCallback((clientX: number) => {
    const r = caixa.current?.getBoundingClientRect();
    if (!r) return;
    setPosicao(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  }, []);

  return (
    <div
      ref={caixa}
      className="relative aspect-[4/5] w-full touch-pan-y select-none overflow-hidden rounded-foto bg-nude"
      onPointerDown={(e) => {
        if (fase !== "comparando") return;
        arrastando.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        mover(e.clientX);
      }}
      onPointerMove={(e) => arrastando.current && mover(e.clientX)}
      onPointerUp={() => (arrastando.current = false)}
      onPointerCancel={() => (arrastando.current = false)}
    >
      <Image src={antes} alt={`${alt}, antes`} fill sizes="(max-width: 480px) 100vw, 420px" className="object-cover" priority data-qual="antes" onLoad={() => marcar("antes")} />
      <div
        className={`absolute inset-0 ${fase === "revelando" ? "pincelada-revelar" : ""} ${fase === "carregando" ? "opacity-0" : ""}`}
        style={fase === "comparando" ? { clipPath: `inset(0 0 0 ${posicao}%)` } : undefined}
      >
        <Image src={depois} alt={`${alt}, com a maquiagem`} fill sizes="(max-width: 480px) 100vw, 420px" className="object-cover" priority data-qual="depois" onLoad={() => marcar("depois")} />
      </div>
      {fase === "revelando" && <span className="pincelada-brilho pointer-events-none absolute inset-y-0 w-1/3" aria-hidden="true" />}

      {fase === "comparando" && (
        <>
          <span className="pointer-events-none absolute inset-y-0 w-[2px] -translate-x-1/2 bg-[#f6ece6]/90" style={{ left: `${posicao}%` }} />
          <span
            role="slider"
            tabIndex={0}
            aria-label="Comparar antes e depois"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(posicao)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") setPosicao((p) => Math.max(0, p - 5));
              if (e.key === "ArrowRight") setPosicao((p) => Math.min(100, p + 5));
            }}
            className="absolute top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#f6ece6] text-[#2b1a15] shadow-flutuante"
            style={{ left: `${posicao}%` }}
          >
            <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
              <path d="M9 6 3 12l6 6M15 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-[#2b1a15]/55 px-3 py-1 text-xs text-[#f6ece6] backdrop-blur">Antes</span>
          <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-[#2b1a15]/55 px-3 py-1 text-xs text-[#f6ece6] backdrop-blur">Depois</span>
        </>
      )}
    </div>
  );
}
