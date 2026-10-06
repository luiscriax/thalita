"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GrupoMenu, LinhaMenu, PaginaCliente } from "@/components/cliente/partes";
import { Folha } from "@/components/ui/folha";
import { Icone } from "@/components/ui/icones";
import { Botao, Campo } from "@/components/ui/marca";
import { CLIENTE_DEMO, PESSOAS } from "@/lib/data/mock/clientes";
import { mascaraTelefone, telefoneValido } from "@/lib/domain/mascaras";
import { useJornada } from "@/lib/jornada/jornada";

export default function Conta() {
  const router = useRouter();
  const { limpar } = useJornada();
  const [dados, setDados] = useState({ nome: CLIENTE_DEMO.nomeCompleto, whatsapp: CLIENTE_DEMO.whatsapp, email: CLIENTE_DEMO.email });
  const [rascunho, setRascunho] = useState(dados);
  const [editar, setEditar] = useState(false);
  const [sair, setSair] = useState(false);
  const [salvo, setSalvo] = useState(false);

  return (
    <PaginaCliente titulo="Conta">
      <section className="flex items-center gap-4 rounded-foto bg-nude p-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-cacau font-display text-xl font-semibold text-cacau-fg">{dados.nome[0]}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold">{dados.nome}</p>
          <p className="truncate text-sm text-terra">{dados.email}</p>
          <p className="tabular text-sm text-terra">{dados.whatsapp}</p>
        </div>
        <button type="button" onClick={() => { setRascunho(dados); setEditar(true); }} aria-label="Editar seus dados" className="grid size-11 shrink-0 place-items-center rounded-full [@media(hover:hover)]:hover:bg-nude-2">
          <Icone nome="editar" />
        </button>
      </section>
      <p className="sr-only" aria-live="polite">{salvo ? "Dados salvos" : ""}</p>

      <div className="mt-6">
        <GrupoMenu titulo="Suas coisas">
          <LinhaMenu href="/conta/pessoas" icone="usuario" titulo="Pessoas atendidas" detalhe={`${PESSOAS.length} pessoas`} />
          <LinhaMenu href="/conta/notificacoes" icone="sino" titulo="Notificações" detalhe="Confirmações e lembretes" />
          <LinhaMenu href="/conta/privacidade" icone="escudo" titulo="Privacidade e dados" detalhe="Fotos, autorizações, apagar conta" />
        </GrupoMenu>
        <GrupoMenu titulo="Ajuda">
          <LinhaMenu href="/ajuda" icone="ajuda" titulo="Perguntas frequentes" />
          <LinhaMenu href="/sua-foto" icone="camera" titulo="Como cuidamos da sua foto" />
        </GrupoMenu>
        <GrupoMenu titulo="Documentos">
          <LinhaMenu href="/termos" icone="info" titulo="Termos de uso" />
          <LinhaMenu href="/privacidade" icone="info" titulo="Política de privacidade" />
          <LinhaMenu href="/cookies" icone="info" titulo="Cookies" />
        </GrupoMenu>
      </div>

      <div className="mt-6">
        <Botao variante="secundario" onClick={() => setSair(true)}><Icone nome="sair" />Sair</Botao>
      </div>
      <p className="mt-6 text-center text-xs text-terra">Thalita Mariano, versão 0.1 (demonstração)</p>

      <Folha aberta={editar} aoFechar={() => setEditar(false)} titulo="Seus dados">
        <div className="space-y-3">
          <Campo id="c-nome" rotulo="Nome" autoComplete="name" value={rascunho.nome} onChange={(e) => setRascunho({ ...rascunho, nome: e.target.value.slice(0, 60) })} />
          <Campo id="c-whatsapp" rotulo="WhatsApp" type="tel" inputMode="tel" value={rascunho.whatsapp} onChange={(e) => setRascunho({ ...rascunho, whatsapp: mascaraTelefone(e.target.value) })}
            erro={rascunho.whatsapp && !telefoneValido(rascunho.whatsapp) ? "Celular com DDD, 11 números." : undefined} />
          <Campo id="c-email" rotulo="E-mail" type="email" value={rascunho.email} disabled ajuda="Para trocar o e-mail, fale com a Thalita." />
        </div>
        <div className="mt-5">
          <Botao disabled={rascunho.nome.trim().length < 2 || !telefoneValido(rascunho.whatsapp)} onClick={() => { setDados({ ...rascunho, nome: rascunho.nome.trim() }); setEditar(false); setSalvo(true); }}>Salvar</Botao>
        </div>
      </Folha>

      <Folha aberta={sair} aoFechar={() => setSair(false)} titulo="Sair da conta?">
        <p className="text-sm text-terra">Suas reservas continuam guardadas. Para entrar de novo, é só pedir um link no seu e-mail.</p>
        <div className="mt-5 space-y-2">
          <Botao onClick={() => { limpar(); router.push("/"); }}>Sair</Botao>
          <Botao variante="texto" onClick={() => setSair(false)}>Continuar aqui</Botao>
        </div>
      </Folha>
    </PaginaCliente>
  );
}
