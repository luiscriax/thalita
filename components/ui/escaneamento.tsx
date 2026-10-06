"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type RefObject } from "react";
import { brilhoMedio, detectorDeRosto } from "@/lib/rosto/detector";
import { avaliarEnquadramento, avaliarLuz, LINHAS_MALHA, pontosDaMalha, type Enquadramento, type Luz, type NomePonto } from "@/lib/rosto/malha";

type Pontos = Record<NomePonto, [number, number]>;

/** Pontos da foto de demonstração (896×1152), usados quando não há foto da cliente. */
const PONTOS_DEMO: Pontos = {
  testa: [455, 330], temporaE: [330, 420], temporaD: [585, 420],
  sobrE: [370, 495], sobrD: [545, 495],
  olhoEf: [335, 545], olhoEi: [415, 548], olhoDi: [500, 548], olhoDf: [580, 545],
  ponte: [457, 545], nariz: [457, 640], narizE: [420, 660], narizD: [495, 660],
  macaE: [335, 640], macaD: [585, 640],
  bocaE: [405, 715], bocaC: [457, 700], bocaD: [510, 715], bocaB: [457, 740],
  mandE: [320, 700], mandD: [600, 700], queixoE: [395, 800], queixo: [457, 825], queixoD: [520, 800],
};

/**
 * Malha dos traços do rosto: as linhas se desenham uma a uma e os pontos acendem.
 * `largura`/`altura` são as do quadro de origem; o SVG recorta como `object-cover`.
 */
export function MalhaRosto({ ativa, pontos = PONTOS_DEMO, largura = 896, altura = 1152, espelhar }: { ativa: boolean; pontos?: Pontos; largura?: number; altura?: number; espelhar?: boolean }) {
  const r = (largura / 896) * 5;
  return (
    <svg viewBox={`0 0 ${largura} ${altura}`} preserveAspectRatio="xMidYMid slice" className={`pointer-events-none absolute inset-0 size-full ${espelhar ? "-scale-x-100" : ""}`} aria-hidden="true">
      <g className={ativa ? "malha-ativa" : "opacity-0"}>
        {LINHAS_MALHA.map(([a, b], i) => {
          const [x1, y1] = pontos[a];
          const [x2, y2] = pontos[b];
          return <line key={`${a}-${b}`} x1={x1} y1={y1} x2={x2} y2={y2} pathLength={1} vectorEffect="non-scaling-stroke" className="malha-linha" style={{ animationDelay: `${400 + i * 45}ms` }} />;
        })}
        {(Object.entries(pontos) as [NomePonto, [number, number]][]).map(([id, [x, y]], i) => (
          <circle key={id} cx={x} cy={y} r={r} vectorEffect="non-scaling-stroke" className="malha-ponto" style={{ animationDelay: `${200 + i * 60}ms` }} />
        ))}
      </g>
    </svg>
  );
}

/** Cantoneiras de enquadramento; ficam douradas quando o rosto está bem posicionado. */
export function GuiaRosto({ pronto }: { pronto?: boolean }) {
  const canto = `absolute size-10 transition-colors duration-300 ${pronto ? "border-champanhe" : "border-[#f6ece6]/90"}`;
  return (
    <div className="pointer-events-none absolute inset-[9%_11%_14%]" aria-hidden="true">
      <span className={`${canto} left-0 top-0 rounded-tl-2xl border-l-2 border-t-2`} />
      <span className={`${canto} right-0 top-0 rounded-tr-2xl border-r-2 border-t-2`} />
      <span className={`${canto} bottom-0 left-0 rounded-bl-2xl border-b-2 border-l-2`} />
      <span className={`${canto} bottom-0 right-0 rounded-br-2xl border-b-2 border-r-2`} />
    </div>
  );
}

export type LeituraRosto = { estado: "carregando" | "indisponivel" | "lendo"; enquadramento?: Enquadramento; luz?: Luz };

/**
 * Malha ao vivo sobre o vídeo da câmera (espelhado como o vídeo).
 * Detecta ~15 vezes por segundo no aparelho e avisa enquadramento e luz.
 */
export function MalhaAoVivo({ video, aoLer }: { video: RefObject<HTMLVideoElement | null>; aoLer: (l: LeituraRosto) => void }) {
  const [quadro, setQuadro] = useState<{ pontos: Pontos; w: number; h: number } | null>(null);
  const [geracao, setGeracao] = useState(0); // muda quando o rosto reaparece, para redesenhar a malha
  const aoLerRef = useRef(aoLer);
  useEffect(() => {
    aoLerRef.current = aoLer;
  }, [aoLer]);

  useEffect(() => {
    let parar = false;
    let quadroAnim = 0;
    let ultimo = 0;
    let ultimaLuz = 0;
    let luz: Luz = "ok";
    let tinhaRosto = false;
    const tela = document.createElement("canvas");
    aoLerRef.current({ estado: "carregando" });

    detectorDeRosto("VIDEO")
      .then((detector) => {
        const passo = (t: number) => {
          if (parar) return;
          quadroAnim = requestAnimationFrame(passo);
          const v = video.current;
          if (!v || v.readyState < 2 || t - ultimo < 66) return;
          ultimo = t;
          const res = detector.detectForVideo(v, t);
          if (t - ultimaLuz > 600) {
            luz = avaliarLuz(brilhoMedio(v, tela));
            ultimaLuz = t;
          }
          const enquadramento = avaliarEnquadramento(res.faceLandmarks);
          aoLerRef.current({ estado: "lendo", enquadramento, luz });
          const temRosto = res.faceLandmarks.length === 1;
          if (temRosto) {
            if (!tinhaRosto) setGeracao((g) => g + 1);
            setQuadro({ pontos: pontosDaMalha(res.faceLandmarks[0], v.videoWidth, v.videoHeight), w: v.videoWidth, h: v.videoHeight });
          } else if (tinhaRosto) {
            setQuadro(null);
          }
          tinhaRosto = temRosto;
        };
        quadroAnim = requestAnimationFrame(passo);
      })
      .catch(() => aoLerRef.current({ estado: "indisponivel" }));

    return () => {
      parar = true;
      cancelAnimationFrame(quadroAnim);
    };
  }, [video]);

  if (!quadro) return null;
  return <MalhaRosto key={geracao} ativa pontos={quadro.pontos} largura={quadro.w} altura={quadro.h} espelhar />;
}

export function AnelProgresso({ valor, children }: { valor: number; children?: React.ReactNode }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid size-28 place-items-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--nude-2)" strokeWidth="5" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke="var(--champanhe)" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - valor / 100)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      {children}
    </div>
  );
}

/**
 * Foto sendo analisada. Com a foto de demonstração, usa os pontos conhecidos;
 * com a foto da cliente, detecta os traços no aparelho e desenha a malha neles.
 */
export function FotoEscaneando({ foto, aoDetectar }: { foto: string; aoDetectar?: (r: { rosto: boolean; ms: number; erro?: string }) => void }) {
  const local = foto.startsWith("blob:");
  const img = useRef<HTMLImageElement>(null);
  const [detectada, setDetectada] = useState<{ pontos: Pontos; w: number; h: number } | null>(null);
  const aoDetectarRef = useRef(aoDetectar);
  useEffect(() => {
    aoDetectarRef.current = aoDetectar;
  }, [aoDetectar]);

  useEffect(() => {
    if (!local) return;
    let cancelado = false;
    const el = img.current;
    const inicio = performance.now();
    const ler = () =>
      detectorDeRosto("IMAGE")
        .then((d) => {
          if (cancelado || !el) return;
          const res = d.detect(el);
          const rosto = res.faceLandmarks.length >= 1;
          if (rosto) setDetectada({ pontos: pontosDaMalha(res.faceLandmarks[0], el.naturalWidth, el.naturalHeight), w: el.naturalWidth, h: el.naturalHeight });
          aoDetectarRef.current?.({ rosto, ms: Math.round(performance.now() - inicio) });
        })
        .catch((e: unknown) => aoDetectarRef.current?.({ rosto: false, ms: Math.round(performance.now() - inicio), erro: String(e) }));
    if (el?.complete) void ler();
    else el?.addEventListener("load", ler, { once: true });
    return () => {
      cancelado = true;
    };
  }, [local, foto]);

  return (
    <div className="relative aspect-[896/1152] w-full overflow-hidden rounded-foto bg-nude">
      {local ? (
        // eslint-disable-next-line @next/next/no-img-element -- foto local da cliente (object URL)
        <img ref={img} src={foto} alt="Sua foto sendo analisada" className="absolute inset-0 size-full object-cover" />
      ) : (
        <Image src={foto} alt="Sua foto sendo analisada" fill priority sizes="(max-width: 480px) 100vw, 420px" className="object-cover" />
      )}
      <span className="absolute inset-0 bg-[#1a110e]/15" />
      {local ? (
        detectada && <MalhaRosto ativa pontos={detectada.pontos} largura={detectada.w} altura={detectada.h} />
      ) : (
        <MalhaRosto ativa />
      )}
      <GuiaRosto />
      <span className="linha-escaneio pointer-events-none absolute inset-x-[6%] h-24" aria-hidden="true" />
    </div>
  );
}
