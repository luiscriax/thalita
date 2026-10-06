"use client";

import { useState } from "react";
import { PaginaCliente } from "@/components/cliente/partes";
import { Folha } from "@/components/ui/folha";
import { Icone } from "@/components/ui/icones";
import { Botao, Campo } from "@/components/ui/marca";
import { PESSOAS, type Pessoa } from "@/lib/data/mock/clientes";
import { ehMenorNaData } from "@/lib/domain/idade";

const hoje = () => new Date().toISOString().slice(0, 10);
const RELACOES = ["Filha", "Mãe", "Irmã", "Amiga", "Outra"];

export default function Pessoas() {
  const [lista, setLista] = useState(PESSOAS);
  const [nova, setNova] = useState(false);
  const [remover, setRemover] = useState<Pessoa | null>(null);
  const [form, setForm] = useState({ nome: "", nascimento: "", relacao: "Filha" });
  const valido = form.nome.trim().length >= 2 && /^\d{4}-\d{2}-\d{2}$/.test(form.nascimento) && form.nascimento < hoje();

  return (
    <PaginaCliente titulo="Pessoas atendidas" subtitulo="Para agendar para alguém sem digitar tudo de novo." voltarPara="/conta">
      <ul className="divide-y divide-nude-2 overflow-hidden rounded-foto bg-nude/60">
        {lista.map((p) => {
          const menor = ehMenorNaData(p.nascimento, hoje());
          return (
            <li key={p.id} className="flex min-h-16 items-center gap-4 px-4 py-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-nude-2 font-semibold">{p.nome[0]}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{p.nome}</span>
                <span className="flex flex-wrap items-center gap-2 text-sm text-terra">
                  {p.relacao}
                  {menor && <span className="rounded-full bg-alerta/12 px-2 py-0.5 text-xs font-semibold text-alerta">Menor de idade</span>}
                </span>
              </span>
              {!p.propria && (
                <button type="button" onClick={() => setRemover(p)} aria-label={`Remover ${p.nome}`} className="grid size-11 shrink-0 place-items-center rounded-full text-terra [@media(hover:hover)]:hover:bg-nude-2">
                  <Icone nome="lixeira" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-sm text-terra">Para menores de idade, a autorização da pessoa responsável é pedida em cada agendamento.</p>
      <div className="mt-6">
        <Botao variante="secundario" onClick={() => { setForm({ nome: "", nascimento: "", relacao: "Filha" }); setNova(true); }}><Icone nome="mais" />Adicionar pessoa</Botao>
      </div>

      <Folha aberta={nova} aoFechar={() => setNova(false)} titulo="Adicionar pessoa">
        <div className="space-y-4">
          <Campo id="p-nome" rotulo="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value.slice(0, 60) })} placeholder="Nome e sobrenome" />
          <Campo id="p-nasc" rotulo="Data de nascimento" type="date" max={hoje()} value={form.nascimento} onChange={(e) => setForm({ ...form, nascimento: e.target.value })} />
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-terra">Quem ela é para você</legend>
            <div className="flex flex-wrap gap-2">
              {RELACOES.map((r) => (
                <button key={r} type="button" aria-pressed={form.relacao === r} onClick={() => setForm({ ...form, relacao: r })}
                  className={`min-h-11 rounded-full border px-4 text-sm font-medium ${form.relacao === r ? "border-cacau bg-cacau text-cacau-fg" : "border-terra/30"}`}>{r}</button>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="mt-5">
          <Botao disabled={!valido} onClick={() => { setLista((l) => [...l, { id: `p${Date.now()}`, nome: form.nome.trim(), nascimento: form.nascimento, relacao: form.relacao }]); setNova(false); }}>Adicionar</Botao>
        </div>
      </Folha>

      <Folha aberta={!!remover} aoFechar={() => setRemover(null)} titulo={`Remover ${remover?.nome.split(" ")[0] ?? ""}?`}>
        <p className="text-sm text-terra">As reservas já feitas para essa pessoa continuam valendo.</p>
        <div className="mt-5 space-y-2">
          <Botao className="!bg-erro !text-[#f6ece6]" onClick={() => { setLista((l) => l.filter((x) => x.id !== remover?.id)); setRemover(null); }}>Remover</Botao>
          <Botao variante="texto" onClick={() => setRemover(null)}>Manter</Botao>
        </div>
      </Folha>
    </PaginaCliente>
  );
}
