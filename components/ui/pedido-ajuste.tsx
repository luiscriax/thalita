"use client";

import { useEffect, useRef, useState } from "react";
import { Icone } from "./icones";

type Reconhecimento = {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null; start(): void; stop(): void;
};
type ConstrutorReconhecimento = new () => Reconhecimento;

const LIMITE_CARACTERES = 300;
const LIMITE_SEGUNDOS = 30;

/** "Quer mudar algo?": texto livre ou ditado (reconhecimento de voz do próprio navegador, quando houver). */
export function PedidoAjuste({ valor, aoMudar, rotulo = "Quer mudar algo? (opcional)" }: { valor: string; aoMudar: (v: string) => void; rotulo?: string }) {
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [suporte, setSuporte] = useState<ConstrutorReconhecimento | null>(null);
  const rec = useRef<Reconhecimento | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: ConstrutorReconhecimento; webkitSpeechRecognition?: ConstrutorReconhecimento };
    const C = w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
    const t = setTimeout(() => setSuporte(() => C), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!gravando) return;
    const id = setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [gravando]);

  useEffect(() => {
    if (gravando && segundos >= LIMITE_SEGUNDOS) rec.current?.stop();
  }, [gravando, segundos]);

  function alternar() {
    if (gravando) return rec.current?.stop();
    if (!suporte) return;
    const r = new suporte();
    r.lang = "pt-BR";
    r.interimResults = true;
    r.continuous = true;
    const base = valor ? `${valor} ` : "";
    r.onresult = (e) => {
      const texto = Array.from(e.results).map((x) => x[0].transcript).join(" ");
      aoMudar((base + texto).slice(0, LIMITE_CARACTERES));
    };
    r.onend = () => setGravando(false);
    r.onerror = () => setGravando(false);
    rec.current = r;
    setSegundos(0);
    setGravando(true);
    r.start();
  }

  return (
    <div>
      <label htmlFor="pedido" className="mb-2 block text-sm font-medium text-terra">
        {rotulo}
      </label>
      <div className="flex items-end gap-2 rounded-campo bg-nude p-2 pl-4 focus-within:outline-2 focus-within:outline-terra">
        <textarea
          id="pedido"
          rows={2}
          maxLength={LIMITE_CARACTERES}
          value={valor}
          onChange={(e) => aoMudar(e.target.value)}
          placeholder="Ex.: olho mais leve, boca mais rosada"
          className="min-h-12 flex-1 resize-none bg-transparent py-2 text-base text-cacau placeholder:text-terra/60 focus:outline-none"
        />
        {suporte && (
          <button
            type="button"
            onClick={alternar}
            aria-pressed={gravando}
            aria-label={gravando ? "Parar o ditado" : "Ditar o pedido"}
            className={`grid size-12 shrink-0 place-items-center rounded-full transition-colors ${gravando ? "bg-erro text-[#f6ece6]" : "bg-cacau text-cacau-fg"}`}
          >
            <Icone nome="microfone" />
          </button>
        )}
      </div>
      <p className="mt-1.5 text-xs text-terra" aria-live="polite">
        {gravando ? `Ouvindo… ${LIMITE_SEGUNDOS - segundos} s` : `Só ajustes de maquiagem. ${valor.length}/${LIMITE_CARACTERES}`}
      </p>
    </div>
  );
}
