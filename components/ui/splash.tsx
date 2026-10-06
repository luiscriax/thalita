"use client";

import { useEffect, useRef, useState } from "react";
import { Monograma } from "./monograma";

const CHAVE = "glam:splash";

/** Abertura da marca (só o monograma): aparece uma vez por sessão, ~1,4 s, e some revelando a capa. */
export function Splash() {
  const [fase, setFase] = useState<"visivel" | "saindo" | "fim">("visivel");
  // Lido uma única vez: o efeito pode rodar duas vezes (Strict Mode) sem pular a splash.
  const jaVista = useRef<boolean | null>(null);

  useEffect(() => {
    if (jaVista.current === null) {
      try {
        jaVista.current = sessionStorage.getItem(CHAVE) === "1";
        sessionStorage.setItem(CHAVE, "1");
      } catch {
        jaVista.current = false;
      }
    }
    const visto = jaVista.current;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tSaida = setTimeout(() => setFase("saindo"), visto ? 0 : reduzir ? 300 : 1400);
    const tFim = setTimeout(() => setFase("fim"), visto ? 10 : reduzir ? 450 : 1900);
    return () => {
      clearTimeout(tSaida);
      clearTimeout(tFim);
    };
  }, []);

  if (fase === "fim") return null;
  return (
    <div
      data-palco
      aria-hidden="true"
      className={`fixed inset-0 z-50 grid place-items-center bg-po text-cacau transition-opacity duration-500 ${fase === "saindo" ? "opacity-0" : "opacity-100"}`}
    >
      <Monograma className="splash-entrada h-24 text-champanhe sm:h-28" />
    </div>
  );
}
