"use client";

import { useEffect, useState } from "react";
import { PaginaStudio } from "@/components/studio/partes";
import { Folha } from "@/components/ui/folha";
import { Icone } from "@/components/ui/icones";
import { Interruptor } from "@/components/ui/interruptor";
import { Botao, Campo } from "@/components/ui/marca";
import { OCASIOES, TESTE_NOIVA_CENTAVOS, type Papel } from "@/lib/data/mock/catalogo";
import { formatarMoeda, lerReais } from "@/lib/domain/formatar";

type Servico = Papel & { ativo: boolean };
type Edicao = { ocasiao: string; papel: Servico; reais: string; minutos: string };

const paraReais = (centavos: number) => (centavos / 100).toFixed(2).replace(".", ",");

export default function Servicos() {
  const [catalogo, setCatalogo] = useState(() => OCASIOES.map((o) => ({ ...o, papeis: o.papeis.map((p) => ({ ...p, ativo: true })) })));
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const [teste, setTeste] = useState(true);
  const [demo, setDemo] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Com a conta da profissional, os preços vêm do banco (os mesmos que o servidor cobra).
  useEffect(() => {
    let ativo = true;
    fetch("/api/studio/servicos")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { demo: boolean; servicos?: { ocasiao: string; papel: string; preco_centavos: number; duracao_min: number; ativo: boolean }[] } | null) => {
        if (!ativo || !d || d.demo || !d.servicos) return;
        setDemo(false);
        setCatalogo((c) => c.map((o) => ({ ...o, papeis: o.papeis.map((p) => {
          const db = d.servicos!.find((x) => x.ocasiao === o.id && x.papel === p.id);
          return db ? { ...p, servicoCentavos: db.preco_centavos, duracaoMin: db.duracao_min, ativo: db.ativo } : p;
        }) })));
      })
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);

  const valido = edicao && lerReais(edicao.reais) > 0 && Number(edicao.minutos) >= 30;

  async function salvar() {
    if (!edicao || !valido) return;
    setErro(null);
    if (!demo) {
      const r = await fetch("/api/studio/servicos", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ocasiao: edicao.ocasiao, papel: edicao.papel.id, preco_centavos: lerReais(edicao.reais), duracao_min: Number(edicao.minutos), ativo: edicao.papel.ativo }),
      });
      if (!r.ok) return setErro("Não deu para salvar agora. Tente de novo.");
    }
    setCatalogo((c) =>
      c.map((o) =>
        o.id !== edicao.ocasiao ? o : { ...o, papeis: o.papeis.map((p) => (p.id !== edicao.papel.id ? p : { ...p, servicoCentavos: lerReais(edicao.reais), duracaoMin: Number(edicao.minutos), ativo: edicao.papel.ativo })) },
      ),
    );
    setEdicao(null);
  }

  return (
    <PaginaStudio titulo="Serviços e preços" subtitulo="O que as clientes veem ao escolher o papel na ocasião. O sinal é sempre 30% da make.">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {catalogo.map((o) => (
          <section key={o.id} aria-labelledby={`oc-${o.id}`} className="overflow-hidden rounded-foto bg-nude/60">
            <h2 id={`oc-${o.id}`} className="px-4 pb-2 pt-4 font-semibold">{o.titulo}</h2>
            <ul className="divide-y divide-nude-2">
              {o.papeis.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => setEdicao({ ocasiao: o.id, papel: { ...p }, reais: paraReais(p.servicoCentavos), minutos: String(p.duracaoMin) })}
                    className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left [@media(hover:hover)]:hover:bg-nude"
                  >
                    <span className="min-w-0 flex-1">
                      <span className={`block font-medium ${p.ativo ? "" : "text-terra line-through"}`}>{p.titulo}</span>
                      <span className="block text-xs text-terra">{Math.floor(p.duracaoMin / 60)}h{p.duracaoMin % 60 ? p.duracaoMin % 60 : ""}{p.ativo ? "" : ", fora do app"}</span>
                    </span>
                    <span className="tabular font-semibold">{formatarMoeda(p.servicoCentavos)}</span>
                    <Icone nome="editar" className="size-4 shrink-0 text-terra" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <section className="overflow-hidden rounded-foto bg-nude/60">
          <Interruptor titulo="Teste de make para noivas" descricao={`Oferecido no resumo da noiva, por ${formatarMoeda(TESTE_NOIVA_CENTAVOS)}. Combinado pelo WhatsApp.`} ligado={teste} aoMudar={setTeste} />
        </section>
      </div>

      <Folha aberta={!!edicao} aoFechar={() => setEdicao(null)} titulo={edicao ? `${edicao.papel.titulo}, ${OCASIOES.find((o) => o.id === edicao.ocasiao)?.titulo.toLowerCase()}` : ""}>
        {edicao && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Campo id="s-preco" rotulo="Preço (R$)" inputMode="decimal" value={edicao.reais} onChange={(e) => setEdicao({ ...edicao, reais: e.target.value.replace(/[^\d,.]/g, "") })} />
              <Campo id="s-min" rotulo="Duração (min)" inputMode="numeric" value={edicao.minutos} onChange={(e) => setEdicao({ ...edicao, minutos: e.target.value.replace(/\D/g, "").slice(0, 3) })} />
            </div>
            {valido && <p className="mt-2 text-sm text-terra">Sinal de {formatarMoeda(Math.round(lerReais(edicao.reais) * 0.3))} no Pix para a cliente garantir.</p>}
            <div className="mt-4 overflow-hidden rounded-foto bg-nude/60">
              <Interruptor titulo="Aparece no app" descricao="Desligado, a cliente não vê essa opção." ligado={edicao.papel.ativo} aoMudar={(v) => setEdicao({ ...edicao, papel: { ...edicao.papel, ativo: v } })} />
            </div>
            <p className="mt-3 text-xs text-terra">Pedidos já feitos mantêm o preço da época.</p>
            {erro && <p role="alert" className="mt-3 text-sm text-erro">{erro}</p>}
            <div className="mt-5"><Botao disabled={!valido} onClick={() => void salvar()}>Salvar</Botao></div>
          </>
        )}
      </Folha>
    </PaginaStudio>
  );
}
