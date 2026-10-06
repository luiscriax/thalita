"use client";

import { useState } from "react";
import { Icone } from "@/components/ui/icones";
import { BolinhaCor, Botao } from "@/components/ui/marca";
import { ROTULOS_BRIEF, ROTULOS_LEITURA, comAcento, type BeautyBrief } from "@/lib/data/mock/brief";

type Secao = "pele" | "olhos" | "boca";
const TITULOS: Record<Secao, string> = { pele: "Pele", olhos: "Olhos", boca: "Boca" };
/** O que a Thalita precisa ver de relance em cada parte; o resto abre em "Ver detalhes". */
const PRINCIPAL: Record<Secao, string> = { pele: "base", olhos: "palpebra", boca: "batom" };

/**
 * Beauty Brief: ficha técnica gerada pela IA, editável pela Thalita.
 * Ordem pensada para bater o olho: simulação + resumo, paleta, leitura do rosto, uma linha por parte (detalhes sob demanda),
 * ordem de execução, o que foi adaptado, o que conferir. Campos novos (etapa 2) só aparecem quando o brief os tem.
 */
export function BeautyBriefEditavel({ inicial, aoSalvar, imagem }: { inicial: BeautyBrief; aoSalvar?: (b: BeautyBrief) => void; imagem?: string }) {
  const [brief, setBrief] = useState(inicial);
  const [abertas, setAbertas] = useState<Secao[]>([]);
  const [editando, setEditando] = useState<Secao | "obs" | null>(null);
  const [rascunho, setRascunho] = useState<Record<string, string>>({});
  const [conferidos, setConferidos] = useState<number[]>([]);
  const [salvo, setSalvo] = useState<string | null>(null);

  const alternar = (secao: Secao) => setAbertas((a) => (a.includes(secao) ? a.filter((x) => x !== secao) : [...a, secao]));

  function editar(secao: Secao | "obs") {
    if (secao !== "obs" && !abertas.includes(secao)) setAbertas((a) => [...a, secao]);
    setRascunho(secao === "obs" ? { obs: brief.observacoes_para_a_profissional } : { ...(brief[secao] as Record<string, string>) });
    setEditando(secao);
  }
  function salvar() {
    const novo: BeautyBrief =
      editando === "obs" ? { ...brief, observacoes_para_a_profissional: rascunho.obs } : editando ? { ...brief, [editando]: { ...brief[editando], ...rascunho } } : brief;
    setBrief(novo);
    aoSalvar?.(novo);
    setSalvo(editando === "obs" ? "Observações" : TITULOS[editando as Secao]);
    setEditando(null);
    setTimeout(() => setSalvo(null), 2500);
  }

  const campo = "w-full resize-y rounded-campo border border-transparent bg-po px-3 py-2 text-sm focus-visible:outline-2";

  return (
    <div>
      <div className="flex gap-4 rounded-foto bg-cacau p-4 text-cacau-fg">
        {imagem && (
          <span className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-2xl bg-cacau-fg/10 sm:w-28">
            {/* eslint-disable-next-line @next/next/no-img-element -- link assinado temporário do storage privado ou foto do acervo */}
            <img src={imagem} alt="Simulação aprovada pela cliente" className="absolute inset-0 size-full object-cover" />
          </span>
        )}
        <div className="min-w-0 self-center">
          <p className="text-xs text-cacau-fg/70">Resumo da make · intensidade {comAcento(brief.intensidade)}</p>
          <p className="mt-1 font-display text-lg font-semibold leading-snug text-pretty">{brief.resumo_do_look}</p>
          {brief.contexto && <p className="mt-2 text-sm leading-snug text-cacau-fg/85">{brief.contexto}</p>}
        </div>
      </div>
      <p className="mt-2 text-xs text-terra">Gerado com IA a partir da simulação. Use como direção e confira pessoalmente.</p>
      <p className="sr-only" aria-live="polite">{salvo ? `${salvo} salvo` : ""}</p>

      <section className="mt-5" aria-labelledby="brief-paleta">
        <h3 id="brief-paleta" className="font-semibold">Paleta</h3>
        <ul className="mt-3 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:grid-cols-3">
          {brief.paleta.map((c) => (
            <li key={c.hex + c.uso} className="flex min-w-0 items-center gap-3">
              <BolinhaCor cor={c.hex} className="size-11" />
              <div className="min-w-0">
                <p className="text-sm font-medium leading-tight">{c.nome_da_cor}</p>
                <p className="text-xs leading-tight text-terra">{c.uso}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-terra">Cores aproximadas pela tela, não a cor exata do produto.</p>
      </section>

      {brief.leitura && (
        <section className="mt-4 rounded-foto bg-nude/60 p-4" aria-labelledby="brief-leitura">
          <h3 id="brief-leitura" className="font-semibold">Leitura do rosto</h3>
          <dl className="mt-3 space-y-3">
            {(Object.entries(ROTULOS_LEITURA) as [keyof typeof ROTULOS_LEITURA, string][]).map(([chave, rotulo]) =>
              brief.leitura?.[chave] ? (
                <div key={chave} className="grid grid-cols-1 gap-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3">
                  <dt className="text-xs font-medium text-terra sm:pt-0.5">{rotulo}</dt>
                  <dd className="text-sm leading-relaxed">{brief.leitura[chave]}</dd>
                </div>
              ) : null,
            )}
          </dl>
          <p className="mt-3 text-xs text-terra">Leitura pela foto, com confiança {comAcento(brief.leitura.confianca)}: confira pessoalmente.</p>
        </section>
      )}

      {(Object.keys(TITULOS) as Secao[]).map((secao) => {
        const rotulos = ROTULOS_BRIEF[secao] as Record<string, string>;
        const valores = brief[secao] as Record<string, string>;
        const aberto = editando === secao;
        const expandida = abertas.includes(secao) || aberto;
        const principal = PRINCIPAL[secao];
        // Briefs antigos não têm os campos novos (corretor de cor, bronzer): mostra só o que existe.
        const resto = Object.entries(rotulos).filter(([chave]) => chave !== principal && valores[chave]);
        return (
          <section key={secao} className="mt-4 rounded-foto bg-nude/60 p-4" aria-labelledby={`brief-${secao}`}>
            <div className="flex items-center justify-between gap-3">
              <h3 id={`brief-${secao}`} className="font-semibold">{TITULOS[secao]}</h3>
              {expandida && !aberto && (
                <button type="button" onClick={() => editar(secao)} className="flex min-h-11 items-center gap-1.5 px-1 text-sm text-terra" aria-label={`Editar ${TITULOS[secao].toLowerCase()}`}>
                  <Icone nome="editar" className="size-4" />
                  {salvo === TITULOS[secao] ? "Salvo" : "Editar"}
                </button>
              )}
            </div>
            {!aberto && <p className="mt-1 text-sm leading-relaxed">{valores[principal]}</p>}
            {expandida && secao === "pele" && !aberto && (
              <p className="mt-2 text-xs text-terra">
                {brief.pele.confianca_tom ? `Profundidade com confiança ${comAcento(brief.pele.confianca_tom)}; subtom com confiança ${comAcento(brief.pele.confianca)}` : `Leitura do tom com confiança ${comAcento(brief.pele.confianca)}`}: confirme na luz do local.
              </p>
            )}
            {expandida && <dl className="mt-3 space-y-3 border-t border-nude-2 pt-3">
              {(aberto ? Object.entries(rotulos) : resto).map(([chave, rotulo]) => (
                <div key={chave} className="grid grid-cols-1 gap-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3">
                  <dt className="text-xs font-medium text-terra sm:pt-0.5">{rotulo}</dt>
                  <dd className="text-sm leading-relaxed">
                    {aberto ? (
                      <textarea
                        aria-label={rotulo}
                        rows={2}
                        className={campo}
                        value={rascunho[chave] ?? ""}
                        onChange={(e) => setRascunho({ ...rascunho, [chave]: e.target.value.slice(0, 300) })}
                      />
                    ) : (
                      valores[chave]
                    )}
                  </dd>
                </div>
              ))}
            </dl>}
            {expandida && secao === "olhos" && !aberto && (
              <div className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3">
                <p className="text-xs font-medium text-terra">Sobrancelhas</p>
                <p className="text-sm leading-relaxed">{brief.sobrancelhas}</p>
              </div>
            )}
            {aberto ? (
              <div className="mt-4 flex gap-2">
                <Botao className="!min-h-11 !w-auto" onClick={salvar}>Salvar</Botao>
                <Botao variante="texto" className="!min-h-11 !w-auto" onClick={() => setEditando(null)}>Cancelar</Botao>
              </div>
            ) : (
              <button type="button" onClick={() => alternar(secao)} aria-expanded={expandida} className="mt-2 flex min-h-11 items-center gap-1 text-sm font-medium text-cacau underline-offset-4 [@media(hover:hover)]:hover:underline">
                {expandida ? "Ver menos" : `Ver detalhes (${resto.length + (secao === "olhos" ? 1 : 0)})`}
                <Icone nome="avancar" className={`size-4 transition-transform ${expandida ? "-rotate-90" : "rotate-90"}`} />
              </button>
            )}
          </section>
        );
      })}

      {!!brief.ordem_de_execucao?.length && (
        <section className="mt-4 rounded-foto bg-nude/60 p-4" aria-labelledby="brief-ordem">
          <h3 id="brief-ordem" className="font-semibold">Ordem de execução</h3>
          <ol className="mt-3 space-y-2">
            {brief.ordem_de_execucao.map((passo, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-full bg-cacau text-xs font-semibold text-cacau-fg">{i + 1}</span>
                <span className="min-w-0">{passo}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {!!brief.adaptacao?.length && (
        <section className="mt-4 rounded-foto bg-nude/60 p-4" aria-labelledby="brief-adaptacao">
          <h3 id="brief-adaptacao" className="font-semibold">O que foi adaptado</h3>
          <ul className="mt-3 space-y-3">
            {brief.adaptacao.map((a, i) => (
              <li key={i} className="grid grid-cols-1 gap-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-3">
                <p className="text-xs font-medium text-terra sm:pt-0.5">{a.parte}</p>
                <p className="text-sm leading-relaxed">{a.o_que_mudou} <span className="text-terra">Por quê: {a.por_que}</span></p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-4 rounded-foto bg-nude/60 p-4" aria-labelledby="brief-confirmar">
        <h3 id="brief-confirmar" className="font-semibold">Confirmar pessoalmente</h3>
        <ul className="mt-2 space-y-1">
          {brief.confirmar_pessoalmente.map((item, i) => {
            const feito = conferidos.includes(i);
            return (
              <li key={item}>
                <label className="flex min-h-11 cursor-pointer items-start gap-3 py-1 text-sm">
                  <input type="checkbox" className="peer sr-only" checked={feito} onChange={() => setConferidos(feito ? conferidos.filter((x) => x !== i) : [...conferidos, i])} />
                  <span aria-hidden="true" className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg border-2 peer-focus-visible:outline-2 ${feito ? "border-cacau bg-cacau text-cacau-fg" : "border-terra/50"}`}>
                    {feito && <Icone nome="check" className="size-4" />}
                  </span>
                  <span className={feito ? "text-terra line-through" : ""}>{item}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-4 rounded-foto bg-nude/60 p-4" aria-labelledby="brief-fixacao">
        <h3 id="brief-fixacao" className="font-semibold">Duração e fixação</h3>
        <p className="mt-2 text-sm leading-relaxed">{brief.duracao_e_fixacao}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <h3 className="font-semibold">Observações</h3>
          {editando !== "obs" && (
            <button type="button" onClick={() => editar("obs")} className="flex min-h-11 items-center gap-1.5 px-1 text-sm text-terra" aria-label="Editar observações">
              <Icone nome="editar" className="size-4" />{salvo === "Observações" ? "Salvo" : "Editar"}
            </button>
          )}
        </div>
        {editando === "obs" ? (
          <>
            <textarea aria-label="Observações" rows={3} className={`${campo} mt-2`} value={rascunho.obs} onChange={(e) => setRascunho({ obs: e.target.value.slice(0, 500) })} />
            <div className="mt-3 flex gap-2">
              <Botao className="!min-h-11 !w-auto" onClick={salvar}>Salvar</Botao>
              <Botao variante="texto" className="!min-h-11 !w-auto" onClick={() => setEditando(null)}>Cancelar</Botao>
            </div>
          </>
        ) : (
          <p className="mt-1 text-sm leading-relaxed">{brief.observacoes_para_a_profissional}</p>
        )}
      </section>
    </div>
  );
}
