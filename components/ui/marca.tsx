import type { ComponentProps, ReactNode } from "react";
import { Icone } from "./icones";
import { Monograma } from "./monograma";

export const SLOGAN = "Maquiagem com a sua cara.";

/** Logo dos cabeçalhos: monograma + "Thalita Mariano" numa linha. A splash usa só o `Monograma`. */
/** `className` define o tamanho (padrão `text-xl`); não somar outro `text-*` aqui, senão a ordem do CSS decide qual vale. */
export function Marca({ className = "text-xl" }: { className?: string }) {
  return (
    <span translate="no" className={`inline-flex items-center gap-[0.45em] font-marca leading-none ${className}`}>
      <Monograma className="h-[1.35em] shrink-0 text-champanhe" />
      <span className="whitespace-nowrap tracking-[0.01em]">Thalita Mariano</span>
    </span>
  );
}

type BotaoProps = ComponentProps<"button"> & {
  variante?: "principal" | "secundario" | "texto";
  carregando?: boolean;
};

const variantes = {
  principal: "bg-cacau text-cacau-fg shadow-flutuante",
  secundario: "border border-terra/50 text-cacau",
  texto: "text-terra underline-offset-4 [@media(hover:hover)]:hover:underline",
};

export function Botao({ variante = "principal", carregando, children, className = "", disabled, ...props }: BotaoProps) {
  return (
    <button
      {...props}
      disabled={disabled || carregando}
      aria-busy={carregando || undefined}
      className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-base font-semibold transition-transform duration-150 active:scale-[0.98] disabled:opacity-40 ${variantes[variante]} ${className}`}
    >
      {carregando ? <span className="size-5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : children}
    </button>
  );
}

export function BarraEtapa({ atual, total }: { atual: number; total: number }) {
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={atual}
      aria-label={`Etapa ${atual} de ${total}`}
      className="h-[3px] w-full overflow-hidden rounded-full bg-nude-2"
    >
      <div className="h-full rounded-full bg-champanhe transition-[width] duration-500" style={{ width: `${(atual / total) * 100}%` }} />
    </div>
  );
}

export function Chip({ ativo, children, ...props }: ComponentProps<"button"> & { ativo?: boolean }) {
  return (
    <button
      {...props}
      aria-pressed={ativo}
      className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors active:scale-[0.98] ${
        ativo ? "border-cacau bg-cacau text-cacau-fg" : "border-terra/30 bg-po text-cacau"
      }`}
    >
      {children}
    </button>
  );
}

export function Campo({ rotulo, ajuda, erro, id, className = "", ...props }: ComponentProps<"input"> & { rotulo: string; ajuda?: string; erro?: string }) {
  const idAjuda = `${id}-ajuda`;
  return (
    <label htmlFor={id} className="block min-w-0">
      <span className="mb-2 block text-sm font-medium text-terra">{rotulo}</span>
      <input
        id={id}
        {...props}
        aria-invalid={!!erro || undefined}
        aria-describedby={ajuda || erro ? idAjuda : undefined}
        className={`min-h-13 w-full min-w-0 rounded-campo border bg-nude px-4 text-cacau placeholder:text-terra/60 focus:outline-none focus-visible:outline-2 ${
          erro ? "border-erro" : "border-transparent"
        } ${className}`}
      />
      {(erro || ajuda) && (
        <span id={idAjuda} className={`mt-2 block text-sm ${erro ? "text-erro" : "text-terra"}`}>
          {erro ?? ajuda}
        </span>
      )}
    </label>
  );
}

const tonsAviso = {
  sucesso: "text-sucesso",
  alerta: "text-alerta",
  erro: "text-erro",
};

export function Aviso({ tom, titulo, children }: { tom: keyof typeof tonsAviso; titulo: string; children?: ReactNode }) {
  return (
    <div role={tom === "erro" ? "alert" : "status"} className="rounded-campo bg-nude p-4">
      <p className={`font-semibold ${tonsAviso[tom]}`}>{titulo}</p>
      {children && <p className="mt-1 text-sm text-terra">{children}</p>}
    </div>
  );
}

/**
 * Marcador de escolha única: círculo vazio quando dá para escolher, "certinho" dourado quando escolhido.
 * `sobreFoto` usa contorno claro, para aparecer em cima de imagens.
 */
export function SeloMarcado({ marcado, sobreFoto, className = "" }: { marcado?: boolean; sobreFoto?: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`grid size-7 shrink-0 place-items-center rounded-full transition-colors ${
        marcado ? "selo-marcado bg-champanhe text-[#2b1a15] shadow-flutuante" : sobreFoto ? "border-2 border-[#f6ece6]/85 bg-[#2b1a15]/20" : "border-2 border-terra/40"
      } ${className}`}
    >
      {marcado && <Icone nome="check" className="size-4 [stroke-width:2.6]" />}
    </span>
  );
}

/** Amostra de cor da paleta (Beauty Brief e ficha): bolinha com contorno leve, para cores claras aparecerem no fundo claro. */
export function BolinhaCor({ cor, className = "" }: { cor: string; className?: string }) {
  return <span aria-hidden="true" className={`inline-block shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)] ${className}`} style={{ backgroundColor: cor }} />;
}

/** Pincelada pequena: detalhe decorativo. */
export function Pincelada({ cor, className = "" }: { cor: string; className?: string }) {
  return (
    <svg viewBox="0 0 64 24" className={className} aria-hidden="true">
      <path
        d="M3 15c6-7 15-10 26-10 9 0 18 2 30 5 3 1 3 4 0 5-10 3-20 5-31 5C17 20 9 19 4 18c-2 0-2-2-1-3Z"
        fill={cor}
      />
    </svg>
  );
}

export function AmostraCor({ nome, hex, uso }: { nome: string; hex: string; uso: string }) {
  return (
    <div className="flex items-center gap-3">
      <BolinhaCor cor={hex} className="size-10" />
      <div className="min-w-0">
        <p className="text-sm font-medium">{nome}</p>
        <p className="tabular text-xs text-terra">
          {uso} <span className="uppercase">{hex}</span>
        </p>
      </div>
    </div>
  );
}
