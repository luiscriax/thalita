"use client";

import { useEffect, useState } from "react";
import { FotoEscaneando } from "@/components/ui/escaneamento";

const FOTOS = ["/demo/antes.jpg", "/demo/sim-glam-1-v1.jpg", "/acervo/looks/natural-2-v1.jpg"];

/** Vitrine da malha do rosto com detecção real no aparelho (mede o tempo de carregamento e leitura). */
export default function DesignRosto() {
  const [i, setI] = useState(0);
  const [blob, setBlob] = useState<string>();
  const [resultado, setResultado] = useState("Carregando o detector…");

  useEffect(() => {
    let url: string | undefined;
    fetch(FOTOS[i]).then((r) => r.blob()).then((b) => {
      url = URL.createObjectURL(b);
      setBlob(url);
    });
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [i]);

  return (
    <main data-palco className="mx-auto min-h-dvh max-w-md bg-po px-5 py-8 text-cacau">
      <h1 className="font-display text-2xl font-semibold">Malha do rosto</h1>
      <p className="mt-1 text-sm text-terra" aria-live="polite">{resultado}</p>
      <div className="mt-4 flex gap-2">
        {FOTOS.map((f, k) => (
          <button key={f} type="button" onClick={() => { setResultado("Lendo…"); setBlob(undefined); setI(k); }} className={`min-h-11 rounded-full border px-4 text-sm ${k === i ? "border-champanhe" : "border-nude-2"}`}>Foto {k + 1}</button>
        ))}
      </div>
      <div className="mt-4">
        {blob && <FotoEscaneando key={blob} foto={blob} aoDetectar={(r) => setResultado(r.erro ? `Erro: ${r.erro}` : `${r.rosto ? "Rosto encontrado" : "Nenhum rosto"} em ${r.ms} ms`)} />}
      </div>
    </main>
  );
}
