"use client";

import { useState } from "react";
import { Folha } from "./folha";
import { Icone } from "./icones";
import { Botao } from "./marca";

const PASSOS = {
  iphone: ["Abra este site no Safari.", "Toque em Compartilhar, o quadrado com a seta para cima.", "Escolha Adicionar à Tela de Início e confirme."],
  android: ["Abra este site no Chrome.", "Toque no menu de três pontos.", "Escolha Instalar app ou Adicionar à tela inicial."],
};

/** Convite para instalar o PWA, com instruções por sistema. */
export function ConviteInstalar() {
  const [aberta, setAberta] = useState(false);
  const [sistema, setSistema] = useState<keyof typeof PASSOS>("iphone");
  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        className="flex w-full items-center gap-4 rounded-foto border border-nude-2 p-4 text-left [@media(hover:hover)]:hover:bg-nude/60"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-cacau text-cacau-fg">
          <Icone nome="baixar" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Instale o app no celular</span>
          <span className="block text-sm text-terra">Receba o aviso quando a Thalita confirmar.</span>
        </span>
        <Icone nome="avancar" className="size-5 text-terra" />
      </button>
      <Folha aberta={aberta} aoFechar={() => setAberta(false)} titulo="Instalar o app da Thalita">
        <div role="tablist" aria-label="Sistema" className="grid grid-cols-2 gap-1 rounded-full bg-nude p-1">
          {(["iphone", "android"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={sistema === s}
              onClick={() => setSistema(s)}
              className={`min-h-10 rounded-full text-sm font-medium ${sistema === s ? "bg-po shadow-flutuante" : "text-terra"}`}
            >
              {s === "iphone" ? "iPhone" : "Android"}
            </button>
          ))}
        </div>
        <ol className="mt-5 space-y-3 text-sm" role="tabpanel">
          {PASSOS[sistema].map((t, i) => (
            <li key={t} className="flex gap-3">
              <span className="tabular grid size-7 shrink-0 place-items-center rounded-full bg-nude text-xs font-semibold">{i + 1}</span>
              <span className="pt-1">{t}</span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-terra">O app abre em tela cheia, sem barra do navegador, e não ocupa espaço como os apps da loja.</p>
        <div className="mt-5">
          <Botao onClick={() => setAberta(false)}>Entendi</Botao>
        </div>
      </Folha>
    </>
  );
}
