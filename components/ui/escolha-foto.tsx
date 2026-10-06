import Image from "next/image";
import type { ComponentProps } from "react";
import { SeloMarcado } from "./marca";

type Props = ComponentProps<"button"> & {
  titulo: string;
  imagem: string;
  selecionada?: boolean;
  inspiracaoIa?: boolean;
  formato?: "retrato" | "paisagem";
  /** Enquadramento da foto (object-position), ex.: "50% 20%". */
  foco?: string;
  /** Fotos visíveis sem rolar (primeira dobra) carregam sem espera. */
  prioridade?: boolean;
};

/** Escolha com foto: ocasião, papel, estilo. A seleção é marcada pelo "certinho" no canto. */
export function EscolhaFoto({ titulo, imagem, selecionada, inspiracaoIa, formato = "retrato", foco = "50% 30%", prioridade, className = "", ...props }: Props) {
  return (
    <button
      {...props}
      aria-pressed={selecionada}
      className={`group relative w-full overflow-hidden rounded-foto bg-nude-2 text-left transition-transform duration-150 active:scale-[0.98] ${
        formato === "retrato" ? "aspect-[4/5]" : "aspect-[16/10]"
      } ${selecionada ? "ring-2 ring-champanhe ring-offset-2 ring-offset-po" : ""} ${className}`}
    >
      <Image src={imagem} alt="" fill priority={prioridade} sizes="(max-width: 480px) 50vw, 240px" className="object-cover" style={{ objectPosition: foco }} />
      <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[#2b1a15]/80 to-transparent" />
      {inspiracaoIa && (
        <span className="absolute left-3 top-3 rounded-full bg-[#2b1a15]/55 px-2.5 py-1 text-[0.6875rem] text-[#f6ece6] backdrop-blur">
          Inspiração com IA
        </span>
      )}
      <SeloMarcado marcado={selecionada} sobreFoto className="absolute right-3 top-3" />
      <span className="absolute bottom-3 left-4 right-4 font-display text-lg font-semibold leading-tight tracking-tight text-[#f6ece6]">{titulo}</span>
    </button>
  );
}
