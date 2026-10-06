"use client";

import { useState } from "react";
import { PaginaCliente } from "@/components/cliente/partes";
import { Icone } from "@/components/ui/icones";
import { Interruptor } from "@/components/ui/interruptor";
import { Botao } from "@/components/ui/marca";

export default function Notificacoes() {
  // Etapa A: o pedido de permissão do aparelho é simulado (não abre o aviso do navegador).
  const [aparelho, setAparelho] = useState(false);
  const [pref, setPref] = useState({ confirmacao: true, lembrete: true, email: true, novidades: false });
  const muda = (k: keyof typeof pref) => (v: boolean) => setPref({ ...pref, [k]: v });

  return (
    <PaginaCliente titulo="Notificações" voltarPara="/conta">
      {!aparelho && (
        <div className="mb-6 flex items-start gap-4 rounded-foto bg-nude p-4">
          <Icone nome="sino" className="mt-0.5 size-6 shrink-0 text-terra" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Avisos no celular estão desligados</p>
            <p className="mt-1 text-sm text-terra">Ligue para saber na hora quando a Thalita confirmar. No iPhone, instale o app antes.</p>
            <div className="mt-3 max-w-56">
              <Botao onClick={() => setAparelho(true)}>Ligar avisos</Botao>
            </div>
          </div>
        </div>
      )}

      <section aria-labelledby="no-celular">
        <h2 id="no-celular" className="mb-2 px-1 text-sm font-medium text-terra">No celular</h2>
        <div className="divide-y divide-nude-2 overflow-hidden rounded-foto bg-nude/60">
          <Interruptor titulo="Confirmação e mudanças" descricao="Quando a Thalita confirmar, remarcar ou responder." ligado={pref.confirmacao} aoMudar={muda("confirmacao")} disabled={!aparelho} />
          <Interruptor titulo="Lembrete na véspera" descricao="Um dia antes, com horário e local." ligado={pref.lembrete} aoMudar={muda("lembrete")} disabled={!aparelho} />
        </div>
      </section>
      <section aria-labelledby="por-email" className="mt-6">
        <h2 id="por-email" className="mb-2 px-1 text-sm font-medium text-terra">Por e-mail</h2>
        <div className="divide-y divide-nude-2 overflow-hidden rounded-foto bg-nude/60">
          <Interruptor titulo="Resumo das reservas" descricao="Pedido, confirmação e comprovante." ligado={pref.email} aoMudar={muda("email")} />
          <Interruptor titulo="Novidades da Thalita" descricao="Agenda aberta e makes novas. No máximo um por mês." ligado={pref.novidades} aoMudar={muda("novidades")} />
        </div>
      </section>
    </PaginaCliente>
  );
}
