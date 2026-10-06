"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Icone, type NomeIcone } from "./icones";
import { Botao } from "./marca";

type Acao = { rotulo: string; href?: string; onClick?: () => void; secundaria?: boolean };

function BotaoAcao({ acao }: { acao: Acao }) {
  const classe = `inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 font-semibold active:scale-[0.98] ${
    acao.secundaria ? "border border-terra/50 text-cacau" : "bg-cacau text-cacau-fg shadow-flutuante"
  }`;
  if (acao.href) return <Link href={acao.href} className={classe}>{acao.rotulo}</Link>;
  return <Botao variante={acao.secundaria ? "secundario" : "principal"} onClick={acao.onClick}>{acao.rotulo}</Botao>;
}

const TONS = { neutro: "bg-nude text-terra", alerta: "bg-alerta/12 text-alerta", erro: "bg-erro/12 text-erro", sucesso: "bg-sucesso/12 text-sucesso" };

/**
 * Estado de tela: vazio, erro ou bloqueio. Diz o que houve e como seguir, sem pedir desculpas.
 * Erros usam role="alert"; os demais, role="status".
 */
export function Estado({ icone, tom = "neutro", titulo, texto, acoes = [], children }: { icone: NomeIcone; tom?: keyof typeof TONS; titulo: string; texto: ReactNode; acoes?: Acao[]; children?: ReactNode }) {
  return (
    <div role={tom === "erro" ? "alert" : "status"} className="flex flex-col items-center px-2 py-6 text-center">
      <span className={`grid size-14 place-items-center rounded-full ${TONS[tom]}`}><Icone nome={icone} className="size-7" /></span>
      <p className="mt-4 text-lg font-semibold">{titulo}</p>
      <p className="mt-1 max-w-sm text-sm text-terra">{texto}</p>
      {children}
      {acoes.length > 0 && (
        <div className="mt-5 w-full max-w-xs space-y-2">
          {acoes.map((a) => <BotaoAcao key={a.rotulo} acao={a} />)}
        </div>
      )}
    </div>
  );
}

/** Bloco de carregamento com brilho suave (respeita movimento reduzido via CSS). */
export function Esqueleto({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`esqueleto block rounded-campo bg-nude ${className}`} />;
}

/** Lista carregando: cartões com foto + duas linhas. */
export function CarregandoLista({ linhas = 3, rotulo = "Carregando" }: { linhas?: number; rotulo?: string }) {
  return (
    <div role="status" aria-label={rotulo} className="space-y-3">
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="flex gap-4 rounded-foto border border-nude-2 p-3">
          <Esqueleto className="h-24 w-19 shrink-0 !rounded-2xl" />
          <div className="flex-1 space-y-2 self-center">
            <Esqueleto className="h-4 w-2/3" />
            <Esqueleto className="h-3 w-1/2" />
            <Esqueleto className="h-6 w-28 !rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Faixa global de conexão: avisa quando cai e quando volta. */
export function AvisoConexao() {
  const [online, setOnline] = useState(true);
  const [voltou, setVoltou] = useState(false);
  useEffect(() => {
    const cair = () => { setOnline(false); setVoltou(false); };
    const voltar = () => { setOnline(true); setVoltou(true); setTimeout(() => setVoltou(false), 3000); };
    window.addEventListener("offline", cair);
    window.addEventListener("online", voltar);
    if (!navigator.onLine) cair();
    return () => { window.removeEventListener("offline", cair); window.removeEventListener("online", voltar); };
  }, []);
  if (online && !voltou) return null;
  return <FaixaConexao online={online} />;
}

export function FaixaConexao({ online, fixa = true }: { online: boolean; fixa?: boolean }) {
  return (
    <div
      role="status"
      className={`${fixa ? "fixed inset-x-0 top-0 z-50 pt-[env(safe-area-inset-top)]" : "rounded-campo"} flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium ${
        online ? "bg-sucesso text-[#f6ece6]" : "bg-cacau text-cacau-fg"
      }`}
    >
      <Icone nome={online ? "check" : "wifi"} className="size-4" />
      {online ? "Conexão de volta." : "Sem internet. O que você já escolheu fica guardado."}
    </div>
  );
}
