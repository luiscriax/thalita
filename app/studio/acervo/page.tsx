"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { CaixaAceite } from "@/components/agendar/partes";
import { PaginaStudio } from "@/components/studio/partes";
import { Folha } from "@/components/ui/folha";
import { Icone } from "@/components/ui/icones";
import { Botao, Campo, Chip } from "@/components/ui/marca";
import { OCASIOES } from "@/lib/data/mock/catalogo";
import { ESTILOS, LOOKS, type Estilo } from "@/lib/data/mock/looks";

type Trabalho = { id: string; titulo: string; imagem: string; ocasiao: string; estilo: Estilo };

export default function Acervo() {
  const [ativos, setAtivos] = useState<Record<string, boolean>>(() => Object.fromEntries(LOOKS.map((l) => [l.id, true])));
  const [trabalhos, setTrabalhos] = useState<Trabalho[]>([]);
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState<{ foto?: string; titulo: string; ocasiao: string; estilo: Estilo; autorizado: boolean }>({ titulo: "", ocasiao: "casamento", estilo: "soft-glam", autorizado: false });
  const entrada = useRef<HTMLInputElement>(null);
  const ligados = Object.values(ativos).filter(Boolean).length;
  const pronto = !!form.foto && form.titulo.trim().length >= 2 && form.autorizado;

  function adicionar() {
    if (!pronto || !form.foto) return;
    setTrabalhos((t) => [{ id: `t${Date.now()}`, titulo: form.titulo.trim(), imagem: form.foto!, ocasiao: form.ocasiao, estilo: form.estilo }, ...t]);
    setNovo(false);
  }

  return (
    <PaginaStudio
      titulo="Acervo"
      subtitulo={`${ligados} de ${LOOKS.length} inspirações aparecem para as clientes.`}
      acao={<Botao className="!min-h-11 !w-auto" onClick={() => { setForm({ titulo: "", ocasiao: "casamento", estilo: "soft-glam", autorizado: false }); setNovo(true); }}><Icone nome="mais" />Adicionar trabalho</Botao>}
    >
      <section aria-labelledby="trabalhos">
        <h2 id="trabalhos" className="text-lg font-semibold">Seus trabalhos</h2>
        {trabalhos.length === 0 ? (
          <div className="mt-3 flex flex-col items-start gap-3 rounded-foto border border-dashed border-terra/40 p-5 sm:flex-row sm:items-center">
            <Icone nome="camera" className="size-8 shrink-0 text-terra" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">Mostre makes que você fez</p>
              <p className="text-sm text-terra">Fotos reais passam mais confiança que inspirações de IA e aparecem primeiro para as clientes.</p>
            </div>
            <Botao variante="secundario" className="!w-auto" onClick={() => setNovo(true)}>Adicionar</Botao>
          </div>
        ) : (
          <ul className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {trabalhos.map((t) => (
              <li key={t.id}>
                <span className="relative block aspect-[4/5] overflow-hidden rounded-foto bg-nude-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- prévia local (object URL) */}
                  <img src={t.imagem} alt={t.titulo} className="absolute inset-0 size-full object-cover" />
                  <span className="absolute left-2 top-2 rounded-full bg-sucesso px-2 py-0.5 text-[0.6875rem] font-semibold text-[#f6ece6]">Trabalho real</span>
                </span>
                <p className="mt-2 truncate text-sm font-medium">{t.titulo}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="inspiracoes" className="mt-10">
        <h2 id="inspiracoes" className="text-lg font-semibold">Inspirações criadas com IA</h2>
        <p className="mt-1 text-sm text-terra">Aparecem sempre com o selo &ldquo;Inspiração com IA&rdquo;. Desligue as que não combinam com o seu trabalho.</p>
        <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {LOOKS.map((l) => {
            const ativo = ativos[l.id];
            return (
              <li key={l.id}>
                <span className={`relative block aspect-[4/5] overflow-hidden rounded-foto bg-nude-2 transition-opacity ${ativo ? "" : "opacity-40"}`}>
                  <Image src={l.imagem} alt={l.titulo} fill sizes="(min-width: 1024px) 200px, 45vw" className="object-cover" />
                </span>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{l.titulo}</p>
                    <p className="truncate text-xs text-terra">{ESTILOS.find((e) => e.id === l.estilo)?.titulo}</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={ativo}
                    aria-label={`${l.titulo} aparece para as clientes`}
                    onClick={() => setAtivos({ ...ativos, [l.id]: !ativo })}
                    className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${ativo ? "bg-cacau" : "bg-nude-2"}`}
                  >
                    <span className={`absolute left-0 top-1 size-5 rounded-full bg-po shadow transition-transform ${ativo ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <Folha aberta={novo} aoFechar={() => setNovo(false)} titulo="Adicionar trabalho">
        <input ref={entrada} type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="sr-only" aria-label="Escolher foto do trabalho"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) setForm({ ...form, foto: URL.createObjectURL(f) }); }} />
        <button type="button" onClick={() => entrada.current?.click()} className="flex w-full items-center gap-4 rounded-campo border border-dashed border-terra/50 p-3 text-left">
          <span className="relative grid h-20 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-nude">
            {form.foto ? (
              // eslint-disable-next-line @next/next/no-img-element -- prévia local (object URL)
              <img src={form.foto} alt="" className="absolute inset-0 size-full object-cover" />
            ) : (
              <Icone nome="camera" className="size-6 text-terra" />
            )}
          </span>
          <span className="min-w-0">
            <span className="block font-medium">{form.foto ? "Trocar foto" : "Escolher foto"}</span>
            <span className="block text-xs text-terra">Rosto bem iluminado, sem filtro forte</span>
          </span>
        </button>
        <div className="mt-4 space-y-4">
          <Campo id="t-titulo" rotulo="Nome da make" placeholder="Ex.: Noiva iluminada" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value.slice(0, 40) })} />
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-terra">Ocasião</legend>
            <div className="flex flex-wrap gap-2">{OCASIOES.map((o) => <Chip key={o.id} ativo={form.ocasiao === o.id} onClick={() => setForm({ ...form, ocasiao: o.id })}>{o.titulo}</Chip>)}</div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-terra">Estilo</legend>
            <div className="flex flex-wrap gap-2">{ESTILOS.map((e) => <Chip key={e.id} ativo={form.estilo === e.id} onClick={() => setForm({ ...form, estilo: e.id })}>{e.titulo}</Chip>)}</div>
          </fieldset>
          <CaixaAceite id="t-autoriza" marcada={form.autorizado} aoMudar={(v) => setForm({ ...form, autorizado: v })}>
            A pessoa da foto autorizou, por escrito, o uso da imagem no app e nas redes. Se for menor de idade, a autorização é da pessoa responsável.
          </CaixaAceite>
        </div>
        <div className="mt-5"><Botao disabled={!pronto} onClick={adicionar}>Adicionar ao acervo</Botao></div>
      </Folha>
    </PaginaStudio>
  );
}
