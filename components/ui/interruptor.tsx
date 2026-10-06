"use client";

import { useId } from "react";

/** Interruptor liga/desliga (role="switch"), com rótulo e descrição clicáveis. */
export function Interruptor({ ligado, aoMudar, titulo, descricao, disabled }: { ligado: boolean; aoMudar: (v: boolean) => void; titulo: string; descricao?: string; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="flex min-h-14 items-center gap-4 px-4 py-3">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="block font-medium">{titulo}</label>
        {descricao && <p id={`${id}-d`} className="text-sm text-terra">{descricao}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={ligado}
        aria-describedby={descricao ? `${id}-d` : undefined}
        disabled={disabled}
        onClick={() => aoMudar(!ligado)}
        className={`relative h-8 w-13 shrink-0 rounded-full transition-colors disabled:opacity-40 ${ligado ? "bg-cacau" : "bg-nude-2"}`}
      >
        <span className={`absolute left-0 top-1 size-6 rounded-full bg-po shadow transition-transform duration-200 ${ligado ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}
