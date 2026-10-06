"use client";

import { useState, type ReactNode } from "react";
import { Cartao, PaginaStudio } from "@/components/studio/partes";
import { Icone } from "@/components/ui/icones";
import { Interruptor } from "@/components/ui/interruptor";
import { Aviso, Botao, Campo, Chip } from "@/components/ui/marca";
import { PROFISSIONAL } from "@/lib/data/mock/profissional";
import { CONTROLADOR } from "@/lib/legal/controlador";
import { REGRA_PADRAO } from "@/lib/domain/deslocamento";
import { ADICIONAL_MADRUGADA } from "@/lib/domain/precos";
import { formatarMoeda, lerReais } from "@/lib/domain/formatar";

function Secao({ id, titulo, descricao, children }: { id: string; titulo: string; descricao?: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-t`} className="scroll-mt-6">
      <h2 id={`${id}-t`} className="text-lg font-semibold">{titulo}</h2>
      {descricao && <p className="mt-1 text-sm text-terra">{descricao}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function Ajustes() {
  const [google, setGoogle] = useState(true);
  const [sync, setSync] = useState({ criar: true, bloquear: true });
  const [sinal, setSinal] = useState(PROFISSIONAL.percentualSinal);
  const [pix, setPix] = useState({ chave: PROFISSIONAL.pix.chave, nome: PROFISSIONAL.pix.nomeRecebedor });
  const [faixas, setFaixas] = useState(REGRA_PADRAO.faixas.map((f) => ({ ateKm: String(f.ateKm), reais: (f.centavos / 100).toFixed(0) })));
  const [porKm, setPorKm] = useState((REGRA_PADRAO.porKmCentavos / 100).toFixed(2).replace(".", ","));
  const [kmMaximo, setKmMaximo] = useState(String(REGRA_PADRAO.kmMaximo));
  const [madrugada, setMadrugada] = useState((ADICIONAL_MADRUGADA / 100).toFixed(0));
  const [avisos, setAvisos] = useState({ pedido: true, email: true });
  const [salvo, setSalvo] = useState(false);
  const toque = () => setSalvo(false);

  return (
    <PaginaStudio titulo="Ajustes" subtitulo="Regras do seu atendimento. Valem para os próximos pedidos.">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-x-10">
        <Secao id="google-agenda" titulo="Google Agenda" descricao="Reservas confirmadas entram na sua agenda do Google, e compromissos de lá bloqueiam horários aqui.">
          {google ? (
            <Cartao className="!p-0 overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-po"><Icone nome="calendario" /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Conectado</p>
                  <p className="truncate text-sm text-terra">agenda da thalita (exemplo), sincronizado há 2 min</p>
                </div>
                <span className="size-2.5 rounded-full bg-sucesso" aria-hidden="true" />
              </div>
              <div className="divide-y divide-nude-2 border-t border-nude-2">
                <Interruptor titulo="Criar evento ao confirmar" descricao="Com local, cliente e link para o pedido." ligado={sync.criar} aoMudar={(v) => { setSync({ ...sync, criar: v }); toque(); }} />
                <Interruptor titulo="Bloquear quando estou ocupada" descricao="Só o horário é lido, nunca o nome do compromisso." ligado={sync.bloquear} aoMudar={(v) => { setSync({ ...sync, bloquear: v }); toque(); }} />
              </div>
              <div className="border-t border-nude-2 p-3">
                <Botao variante="texto" className="!min-h-11" onClick={() => setGoogle(false)}>Desconectar</Botao>
              </div>
            </Cartao>
          ) : (
            <Cartao>
              <p className="text-sm">Sem a conexão, a agenda do app funciona sozinha e você bloqueia horários à mão.</p>
              <div className="mt-3"><Botao variante="secundario" onClick={() => setGoogle(true)}>Conectar Google Agenda</Botao></div>
            </Cartao>
          )}
        </Secao>

        <Secao id="sinal" titulo="Sinal e Pix" descricao="O sinal é cobrado só sobre a make, nunca sobre o deslocamento.">
          <Cartao className="space-y-4">
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-terra">Valor do sinal</legend>
              <div className="flex flex-wrap gap-2">
                {[20, 30, 40, 50].map((p) => <Chip key={p} ativo={sinal === p} onClick={() => { setSinal(p); toque(); }}>{p}%</Chip>)}
              </div>
              <p className="mt-2 text-xs text-terra">Numa make de R$ 220, a cliente paga {formatarMoeda(Math.round(22000 * sinal / 100))} agora.</p>
            </fieldset>
            <Campo id="pix-chave" rotulo="Chave Pix" value={pix.chave} onChange={(e) => { setPix({ ...pix, chave: e.target.value.trim() }); toque(); }} ajuda="E-mail, celular, CPF/CNPJ ou chave aleatória." />
            <Campo id="pix-nome" rotulo="Nome que aparece no Pix" value={pix.nome} onChange={(e) => { setPix({ ...pix, nome: e.target.value }); toque(); }} ajuda="Precisa ser igual ao do banco, para a cliente confiar." />
          </Cartao>
        </Secao>

        <Secao id="deslocamento" titulo="Deslocamento" descricao="Distância de carro estimada a partir do seu espaço: taxa fixa perto de casa e, para outra cidade, valor por km rodado (ida e volta).">
          <Cartao>
            <ul className="space-y-3">
              {faixas.map((f, i) => (
                <li key={i} className="grid grid-cols-2 items-end gap-3">
                  <Campo id={`f-km-${i}`} rotulo="Até (km)" inputMode="numeric" value={f.ateKm} onChange={(e) => { const n = [...faixas]; n[i] = { ...f, ateKm: e.target.value.replace(/\D/g, "").slice(0, 3) }; setFaixas(n); toque(); }} />
                  <Campo id={`f-rs-${i}`} rotulo="Taxa (R$)" inputMode="decimal" value={f.reais} onChange={(e) => { const n = [...faixas]; n[i] = { ...f, reais: e.target.value.replace(/[^\d,]/g, "") }; setFaixas(n); toque(); }}
                    erro={lerReais(f.reais) === 0 ? "Informe um valor" : undefined} />
                </li>
              ))}
            </ul>
            <div className="mt-4 grid grid-cols-2 items-end gap-3 border-t border-nude-2 pt-4">
              <Campo id="por-km" rotulo="Outra cidade (R$/km)" inputMode="decimal" value={porKm} ajuda="Ida e volta" onChange={(e) => { setPorKm(e.target.value.replace(/[^\d,]/g, "")); toque(); }} />
              <Campo id="km-maximo" rotulo="Atende até (km)" inputMode="numeric" value={kmMaximo} onChange={(e) => { setKmMaximo(e.target.value.replace(/\D/g, "").slice(0, 4)); toque(); }} />
            </div>
            <p className="mt-3 text-sm text-terra">Acima de {faixas[faixas.length - 1]?.ateKm} km: R$ {porKm} por km, ida e volta, arredondado de R$ 5 em R$ 5. Acima de {kmMaximo} km: orçamento antes de qualquer pagamento.</p>
          </Cartao>
        </Secao>

        <Secao id="atendimento" titulo="Atendimento">
          <Cartao className="space-y-4">
            <Campo id="espaco" rotulo="Endereço do seu espaço" defaultValue={PROFISSIONAL.espaco.endereco} ajuda="A cliente só vê o endereço completo depois da confirmação." onChange={toque} />
            <div className="grid grid-cols-2 gap-3">
              <Campo id="madrugada" rotulo="Adicional antes das 7h (R$)" inputMode="decimal" value={madrugada} onChange={(e) => { setMadrugada(e.target.value.replace(/[^\d,]/g, "")); toque(); }} />
              <Campo id="antecedencia" rotulo="Antecedência mínima" defaultValue="24 horas" disabled ajuda="Fixa no MVP." />
            </div>
          </Cartao>
        </Secao>

        <Secao id="avisos" titulo="Seus avisos">
          <div className="divide-y divide-nude-2 overflow-hidden rounded-foto bg-nude/60">
            <Interruptor titulo="Novo pedido no celular" descricao="Na hora em que a cliente pede." ligado={avisos.pedido} aoMudar={(v) => { setAvisos({ ...avisos, pedido: v }); toque(); }} />
            <Interruptor titulo="Resumo por e-mail" descricao="Pedidos do dia, toda manhã." ligado={avisos.email} aoMudar={(v) => { setAvisos({ ...avisos, email: v }); toque(); }} />
          </div>
        </Secao>

        <Secao id="negocio" titulo="Dados do negócio" descricao="Aparecem nos termos, na política de privacidade e nos recibos.">
          <Cartao className="space-y-4">
            {CONTROLADOR.provisorio && (
              <Aviso tom="alerta" titulo="CNPJ provisório">Troque pelo CNPJ do seu MEI antes de publicar o app. Ele aparece nos documentos legais.</Aviso>
            )}
            <Campo id="neg-nome" rotulo="Nome da marca" defaultValue="Thalita Mariano" onChange={toque} />
            <Campo id="neg-cnpj" rotulo="CNPJ" defaultValue={CONTROLADOR.cnpj} onChange={toque} />
            <Campo id="neg-insta" rotulo="Instagram" defaultValue={PROFISSIONAL.instagram} onChange={toque} />
          </Cartao>
        </Secao>
      </div>

      <div className="sticky bottom-20 mt-10 flex items-center justify-end gap-3 md:bottom-6">
        <p className="text-sm text-terra" aria-live="polite">{salvo ? "Alterações salvas." : ""}</p>
        <Botao className="!w-auto" onClick={() => setSalvo(true)}>Salvar alterações</Botao>
      </div>
    </PaginaStudio>
  );
}
