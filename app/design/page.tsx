"use client";

import Link from "next/link";
import { useState } from "react";
import { AntesDepois } from "@/components/ui/antes-depois";
import { AmostraCor, Aviso, BarraEtapa, Botao, Campo, Chip, Marca } from "@/components/ui/marca";

// Vitrine interna do design system (fase 6). Não faz parte do fluxo da cliente.

const cores = [
  ["Pó", "--po", "fundo"],
  ["Nude", "--nude", "superfícies"],
  ["Nude 2", "--nude-2", "pressionado"],
  ["Cacau", "--cacau", "texto e ação"],
  ["Terra", "--terra", "texto de apoio"],
  ["Champanhe", "--champanhe", "brilho"],
];

const paleta = [
  { nome: "Bege médio dourado", hex: "#C99E75", uso: "Base" },
  { nome: "Champanhe acetinado", hex: "#D8C3A5", uso: "Pálpebra" },
  { nome: "Marrom médio quente", hex: "#8A644D", uso: "Côncavo" },
  { nome: "Pêssego rosado", hex: "#CB8470", uso: "Blush" },
  { nome: "Nude rosado queimado", hex: "#A76966", uso: "Lábios" },
];

const dias = [
  ["sex", "14"],
  ["sáb", "15"],
  ["dom", "16"],
  ["ter", "18"],
  ["qua", "19"],
  ["sex", "21"],
];
const horarios = ["8h", "10h30", "14h", "16h30"];

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-nude-2 py-8">
      <h2 className="mb-5 font-display text-xl font-semibold tracking-tight">{titulo}</h2>
      {children}
    </section>
  );
}

export default function Vitrine() {
  const [variacao, setVariacao] = useState("Como está");
  const [dia, setDia] = useState(1);
  const [hora, setHora] = useState("14h");

  return (
    <main className="mx-auto max-w-md px-5 pb-24 pt-[max(env(safe-area-inset-top),1.5rem)]">
      <Marca className="text-xl" />
      <p className="mt-2 text-sm text-terra">Design system</p>
      <Link href="/design/estados" className="mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium underline underline-offset-4">Ver todos os estados (vazio, carregando, erros)</Link>

      <Secao titulo="Cores">
        <div className="grid grid-cols-3 gap-3">
          {cores.map(([nome, v, uso]) => (
            <div key={v}>
              <div className="h-16 rounded-campo border border-nude-2" style={{ background: `var(${v})` }} />
              <p className="mt-2 text-sm font-medium">{nome}</p>
              <p className="text-xs text-terra">{uso}</p>
            </div>
          ))}
        </div>
      </Secao>

      <Secao titulo="Tipografia">
        <p className="font-display text-3xl font-semibold tracking-tight">Soft Glam</p>
        <p className="mt-3 font-display text-2xl font-semibold tracking-tight">Para qual momento é a sua make?</p>
        <p className="mt-3 text-base">
          Escolha um estilo, veja como fica em você e agende com a Thalita. Texto de interface em Hanken Grotesk, 17 px.
        </p>
        <p className="mt-2 text-sm text-terra">Texto de apoio, 15 px, em Terra.</p>
        <p className="tabular mt-4 font-display text-xl font-semibold tracking-tight">R$ 220</p>
      </Secao>

      <Secao titulo="Botões">
        <div className="space-y-3">
          <Botao>Ver em mim</Botao>
          <Botao variante="secundario">Testar outro estilo</Botao>
          <Botao carregando>Pedir horário</Botao>
          <Botao variante="texto">Agora não</Botao>
        </div>
      </Secao>

      <Secao titulo="Progresso e variações">
        <BarraEtapa atual={3} total={4} />
        <div className="-mx-5 mt-5 sem-barra flex gap-2 overflow-x-auto px-5 pb-1">
          {["Como está", "Mais suave", "Mais intenso", "Outra boca", "Outro olho"].map((v) => (
            <Chip key={v} ativo={variacao === v} onClick={() => setVariacao(v)}>
              {v}
            </Chip>
          ))}
        </div>
      </Secao>

      <Secao titulo="O momento da revelação">
        <div data-palco className="-mx-5 bg-po px-5 py-6 text-cacau">
          <AntesDepois antes="/demo/antes.jpg" depois="/demo/depois.jpg" alt="Simulação de maquiagem Soft Glam" />
          <p className="mt-5 font-display text-2xl font-semibold tracking-tight">Ficou a sua cara.</p>
          <p className="mt-1 text-sm text-terra">Arraste para comparar. Rosto fictício, só para demonstração.</p>
          <div className="mt-5">
            <Botao>Quero essa</Botao>
          </div>
        </div>
      </Secao>

      <Secao titulo="Data e horário">
        <div className="-mx-5 sem-barra flex gap-2 overflow-x-auto px-5 pb-1">
          {dias.map(([sem, num], i) => (
            <button
              key={num}
              aria-pressed={dia === i}
              onClick={() => setDia(i)}
              className={`flex h-20 w-16 shrink-0 flex-col items-center justify-center rounded-full transition-colors active:scale-[0.98] ${
                dia === i ? "bg-cacau text-cacau-fg" : "bg-nude"
              }`}
            >
              <span className="text-xs">{sem}</span>
              <span className="tabular font-display text-xl font-semibold tracking-tight">{num}</span>
            </button>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {horarios.map((h) => (
            <Chip key={h} ativo={hora === h} onClick={() => setHora(h)}>
              <span className="tabular">{h}</span>
            </Chip>
          ))}
        </div>
        <p className="mt-3 text-sm text-terra">Restam 2 horários neste sábado.</p>
      </Secao>

      <Secao titulo="Campos">
        <div className="space-y-4">
          <Campo id="nome" rotulo="Seu nome" placeholder="Como a Thalita vai te chamar" autoComplete="given-name" />
          <Campo id="cep" rotulo="CEP do local" inputMode="numeric" defaultValue="0000" erro="Esse CEP tem 8 números. Confira e tente de novo." />
        </div>
      </Secao>

      <Secao titulo="Paleta do Beauty Brief">
        <div className="space-y-4">
          {paleta.map((c) => (
            <AmostraCor key={c.hex} {...c} />
          ))}
        </div>
      </Secao>

      <Secao titulo="Avisos">
        <div className="space-y-3">
          <Aviso tom="sucesso" titulo="Horário confirmado">Sábado, 15 de novembro, às 14h.</Aviso>
          <Aviso tom="alerta" titulo="Aguardando o sinal">Pague o Pix até amanhã às 14h para garantir o horário.</Aviso>
          <Aviso tom="erro" titulo="Não encontramos um rosto na foto">Tente de frente, com luz no rosto.</Aviso>
        </div>
      </Secao>

      <Secao titulo="Folha inferior">
        <div className="relative h-72 overflow-hidden rounded-foto bg-nude-2">
          <div className="absolute inset-x-0 bottom-0 rounded-t-folha bg-po p-5 shadow-flutuante">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-nude-2" />
            <p className="font-display text-xl font-semibold tracking-tight">Entre para pedir o horário</p>
            <p className="mt-1 text-sm text-terra">Sua make fica salva na sua conta.</p>
            <div className="mt-5 space-y-3">
              <Botao>Continuar com Google</Botao>
              <Botao variante="secundario">Receber link no e-mail</Botao>
            </div>
          </div>
        </div>
      </Secao>
    </main>
  );
}
