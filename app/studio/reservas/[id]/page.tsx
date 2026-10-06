"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { LinhaValor } from "@/components/agendar/partes";
import { SeloStatus } from "@/components/cliente/partes";
import { BeautyBriefEditavel } from "@/components/studio/beauty-brief";
import { PaginaStudio } from "@/components/studio/partes";
import { Folha } from "@/components/ui/folha";
import { Icone } from "@/components/ui/icones";
import { Aviso, Botao, Campo, Chip } from "@/components/ui/marca";
import type { BeautyBrief } from "@/lib/data/mock/brief";
import { Estado } from "@/components/ui/estados";
import { descreverServico } from "@/lib/data/mock/catalogo";
import { buscarLook } from "@/lib/data/mock/looks";
import { CarregandoLista } from "@/components/ui/estados";
import { useBriefDoPedido } from "@/lib/dados/use-brief-pedido";
import { usePedidos } from "@/lib/dados/use-pedidos";
import { formatarDataCurta, formatarHora, formatarMoeda } from "@/lib/domain/formatar";
import { podeTransicionar, type StatusReserva } from "@/lib/domain/reserva";
import { STATUS_STUDIO } from "@/lib/studio/status";

const MOTIVOS = ["Agenda cheia nesse horário", "Fora da minha área", "Não faço esse tipo de make", "Outro motivo"];

export default function DetalhePedido() {
  const { id } = useParams<{ id: string }>();
  const { pedidos, carregando, demo } = usePedidos();
  const reserva = pedidos.find((r) => r.id === id);
  // Mudanças feitas nesta tela por cima do que veio do banco.
  const [statusLocal, setStatusLocal] = useState<StatusReserva>();
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const status = statusLocal ?? reserva?.status;
  const [folha, setFolha] = useState<"recusar" | null>(null);
  const [salvando, setSalvando] = useState(false);
  // Orçamento: a Thalita informa o deslocamento (em reais) antes de aceitar.
  const [deslocamentoReais, setDeslocamentoReais] = useState("");
  const [deslocamentoLocal, setDeslocamentoLocal] = useState<number>();
  const [motivo, setMotivo] = useState<string>();
  const [notasSalvas, setNotasSalvas] = useState(false);
  const [aba, setAba] = useState<"pedido" | "brief">("pedido");
  const [agora] = useState(() => Date.now());
  // Brief, notas e fotos (reais com a conta da Thalita; exemplos na demonstração).
  const dados = useBriefDoPedido(id, { demo, carregando, notasExemplo: reserva?.notas });
  // Foto aberta em tamanho grande (original ou simulação).
  const [ampliada, setAmpliada] = useState<"original" | "simulacao" | null>(null);
  const [notasLocal, setNotas] = useState<string>();
  const notas = notasLocal ?? dados.notas;
  const salvarBrief = (mudancas: { editado?: BeautyBrief; notas?: string }) =>
    !demo && fetch(`/api/studio/reservas/${id}/brief`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(mudancas) });

  const voltar = (
    <Link href="/studio" className="-ml-2 mb-2 inline-flex min-h-11 items-center gap-1 pr-3 text-sm text-terra">
      <Icone nome="voltar" className="size-5" />Pedidos
    </Link>
  );

  if (carregando) {
    return (
      <PaginaStudio titulo="Pedido" voltar={voltar}>
        <CarregandoLista linhas={2} rotulo="Carregando pedido" />
      </PaginaStudio>
    );
  }

  if (!reserva || !status) {
    return (
      <PaginaStudio titulo="Pedido não encontrado" voltar={voltar}>
        <p className="text-terra">Ele pode ter sido apagado. Volte para a lista de pedidos.</p>
      </PaginaStudio>
    );
  }

  const look = buscarLook(reserva.lookId);
  const { simulacao, fotos, brief } = dados;
  const st = STATUS_STUDIO[status];
  const quando = `${formatarDataCurta(reserva.inicio)} às ${formatarHora(reserva.inicio)}`;
  const primeiroNome = reserva.cliente.nome.split(" ")[0];
  const zapCliente = `55${reserva.cliente.whatsapp.replace(/\D/g, "")}`;
  const deslocamento = deslocamentoLocal ?? reserva.valores.deslocamento;
  const total = reserva.valores.total - reserva.valores.deslocamento + deslocamento;
  const linkPedido = `${window.location.origin}/reservas/${reserva.id}`;
  const mensagem =
    status === "aguardando_sinal"
      ? `Oi, ${primeiroNome}! Aqui é a Thalita. Aceitei o seu pedido de ${quando}! Para garantir o horário, é só pagar o sinal de ${formatarMoeda(reserva.valores.sinal)} pelo app: ${linkPedido}`
      : status === "solicitada" || status === "orcamento"
        ? `Oi, ${primeiroNome}! Aqui é a Thalita. Recebi o seu pedido de ${quando} e já vou te responder.`
        : `Oi, ${primeiroNome}! Aqui é a Thalita, sobre a sua make de ${quando}.`;
  const centavosInformados = Math.round(Number(deslocamentoReais.replace(/\./g, "").replace(",", ".")) * 100);

  /** Muda o status: na demonstração só na tela; com a conta da Thalita, grava no banco. */
  async function transicionar(para: StatusReserva, deslocamentoCentavos?: number) {
    if (!status || !podeTransicionar(status, para)) return;
    setErroAcao(null);
    setSalvando(true);
    if (!demo) {
      const r = await fetch(`/api/studio/reservas/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: para, deslocamentoCentavos }),
      });
      if (!r.ok) {
        setSalvando(false);
        return setErroAcao(((await r.json().catch(() => ({}))) as { erro?: string }).erro ?? "Não deu para salvar.");
      }
    }
    setSalvando(false);
    if (deslocamentoCentavos) setDeslocamentoLocal(deslocamentoCentavos);
    setStatusLocal(para);
  }
  const zap = (
    <a
      href={`https://wa.me/${zapCliente}?text=${encodeURIComponent(mensagem)}`}
      target="_blank"
      rel="noreferrer"
      className={
        status === "aguardando_sinal"
          ? "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-cacau px-6 font-semibold text-cacau-fg shadow-flutuante active:scale-[0.98]"
          : "mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-medium underline-offset-4 [@media(hover:hover)]:hover:underline"
      }
    >
      <Icone nome="whatsapp" className="size-5" />
      {status === "aguardando_sinal" ? `Avisar ${primeiroNome} no WhatsApp` : `Mandar mensagem para ${primeiroNome}`}
    </a>
  );

  const pedido = (
    <div className="space-y-5">
      <div className="flex gap-4">
        {fotos.length ? (
          <div className="flex shrink-0 gap-2">
            {fotos.map((f) => (
              <button key={f.tipo} type="button" onClick={() => setAmpliada(f.tipo)} aria-label={`Ampliar foto: ${f.rotulo.toLowerCase()}`} className="group relative h-32 w-24 overflow-hidden rounded-2xl bg-nude-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- link assinado temporário do storage privado */}
                <img src={f.src} alt="" className="absolute inset-0 size-full object-cover" />
                <span className="absolute inset-x-1.5 bottom-1.5 rounded-full bg-[#2b1a15]/60 py-0.5 text-center text-[0.6875rem] text-[#f6ece6] backdrop-blur">{f.rotulo}</span>
              </button>
            ))}
          </div>
        ) : (
          <span className="relative h-32 w-24 shrink-0 overflow-hidden rounded-2xl bg-nude-2">
            {look && <Image src={look.imagem} alt={look.titulo} fill sizes="96px" className="object-cover" />}
          </span>
        )}
        <div className="min-w-0 self-center text-sm">
          <p className="text-xs text-terra">{simulacao ? "Aprovada pela cliente" : "Estilo escolhido (sem foto da cliente)"}</p>
          <p className="mt-0.5 text-base font-semibold">{look?.titulo}</p>
          {!fotos.length && <p className="text-terra">{look && `Pele ${look.detalhes.pele.toLowerCase()}, olhos ${look.detalhes.olhos.toLowerCase()}, boca ${look.detalhes.boca.toLowerCase()}.`}</p>}
        </div>
      </div>

      <dl className="space-y-3 rounded-foto bg-nude/60 p-4 text-sm">
        <div className="flex gap-3"><Icone nome="calendario" className="size-5 shrink-0 text-terra" /><div><dt className="text-xs text-terra">Quando</dt><dd className="font-medium">{quando}, 2h30</dd></div></div>
        <div className="flex gap-3">
          <Icone nome={reserva.modo === "domicilio" ? "casa" : "local"} className="size-5 shrink-0 text-terra" />
          <div className="min-w-0">
            <dt className="text-xs text-terra">Onde</dt>
            <dd className="font-medium">{reserva.modo === "domicilio" ? reserva.endereco : "No seu espaço"}</dd>
            {reserva.modo === "domicilio" && (
              <dd className="text-terra">
                {(reserva.distanciaKm ?? 0) < 1 ? "Na sua cidade" : `${reserva.distanciaKm?.toFixed(0)} km`}, com 30 min de folga antes e depois.{" "}
                <a className="underline underline-offset-4" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(reserva.endereco ?? "")}`}>Abrir no mapa</a>
              </dd>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <Icone nome="usuario" className="size-5 shrink-0 text-terra" />
          <div>
            <dt className="text-xs text-terra">Cliente</dt>
            <dd className="font-medium">{reserva.cliente.nome}</dd>
            <dd className="tabular text-terra">{reserva.cliente.whatsapp}, {reserva.cliente.email}</dd>
            {reserva.pessoa.nome !== reserva.cliente.nome && (
              <dd className="mt-1">
                Make para <span className="font-medium">{reserva.pessoa.nome}</span>
                {reserva.pessoa.menor && <span className="ml-2 rounded-full bg-alerta/12 px-2 py-0.5 text-xs font-semibold text-alerta">Menor, autorização do responsável registrada</span>}
              </dd>
            )}
          </div>
        </div>
      </dl>

      <section aria-labelledby="valores-pedido">
        <h2 id="valores-pedido" className="font-semibold">Valores</h2>
        <dl className="mt-1">
          <LinhaValor rotulo="Make" valor={formatarMoeda(reserva.valores.servico)} />
          {(deslocamento > 0 || status === "orcamento") && <LinhaValor rotulo="Deslocamento" valor={deslocamento > 0 ? formatarMoeda(deslocamento) : "a definir"} />}
          {reserva.valores.adicional > 0 && <LinhaValor rotulo="Adicional antes das 7h" valor={formatarMoeda(reserva.valores.adicional)} />}
          <div className="my-1 border-t border-nude-2" />
          <LinhaValor forte rotulo="Total" valor={formatarMoeda(total)} />
          <LinhaValor rotulo={status === "confirmada" || status === "realizada" ? "Sinal recebido" : "Sinal (30% da make)"} valor={formatarMoeda(reserva.valores.sinal)} />
          <LinhaValor rotulo="Recebe no dia" valor={formatarMoeda(total - reserva.valores.sinal)} />
        </dl>
      </section>

      <section aria-labelledby="notas">
        <h2 id="notas" className="font-semibold">Suas notas</h2>
        <textarea
          aria-labelledby="notas"
          rows={3}
          value={notas}
          onChange={(e) => { setNotas(e.target.value.slice(0, 500)); setNotasSalvas(false); }}
          onBlur={() => {
            void salvarBrief({ notas });
            setNotasSalvas(true);
          }}
          placeholder="Ex.: pele sensível, levar cílios extras, prédio sem elevador."
          className="mt-2 w-full resize-y rounded-campo bg-nude px-4 py-3 text-sm placeholder:text-terra/60 focus-visible:outline-2"
        />
        <p className="mt-1 text-xs text-terra" aria-live="polite">{notasSalvas ? "Notas salvas. Só você vê." : "Só você vê."}</p>
      </section>
    </div>
  );

  return (
    <PaginaStudio
      voltar={voltar}
      titulo={reserva.cliente.nome}
      subtitulo={<span className="flex flex-wrap items-center gap-2">{descreverServico(reserva.ocasiao, reserva.papel)} <SeloStatus tom={st.tom}>{st.texto}</SeloStatus></span>}
    >
      {/* Ações do status atual, sempre no topo. */}
      <div className="mb-6 rounded-foto border border-nude-2 p-4">
        {status === "solicitada" && (
          <>
            <p className="text-sm">
              Ao aceitar, {primeiroNome} paga o sinal de <span className="tabular whitespace-nowrap font-semibold">{formatarMoeda(reserva.valores.sinal)}</span> pelo app em até{" "}
              {new Date(reserva.inicio).getTime() - agora < 72 * 3_600_000 ? "2 horas" : "24 horas"}. Nada foi pago ainda.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Botao carregando={salvando} onClick={() => void transicionar("aguardando_sinal")}>Aceitar</Botao>
              <Botao variante="secundario" onClick={() => setFolha("recusar")}>Recusar</Botao>
            </div>
          </>
        )}
        {status === "orcamento" && (
          <>
            <p className="text-sm">
              Fora da sua área de atendimento{reserva.distanciaKm ? ` (${reserva.distanciaKm.toFixed(0)} km)` : ""}. Informe o deslocamento e aceite: {primeiroNome} vê o total e paga o sinal pelo app.
            </p>
            <div className="mt-3 max-w-60">
              <Campo id="deslocamento-orcamento" name="deslocamento" rotulo="Deslocamento (R$)" inputMode="decimal" autoComplete="off" placeholder="Ex.: 250" value={deslocamentoReais} onChange={(e) => setDeslocamentoReais(e.target.value.replace(/[^\d,]/g, "").slice(0, 7))} />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Botao disabled={!(centavosInformados > 0)} carregando={salvando} onClick={() => void transicionar("aguardando_sinal", centavosInformados)}>Aceitar com esse valor</Botao>
              <Botao variante="secundario" onClick={() => setFolha("recusar")}>Recusar</Botao>
            </div>
          </>
        )}
        {status === "aguardando_sinal" && (
          <>
            <p className="text-sm">Pedido aceito. Avise {primeiroNome}: ela paga o sinal de <span className="tabular whitespace-nowrap font-semibold">{formatarMoeda(reserva.valores.sinal)}</span> pelo app e a confirmação chega sozinha.</p>
            <div className="mt-3 space-y-2">
              {zap}
              <Botao variante="texto" className="!min-h-11" onClick={() => void transicionar("confirmada")}>Recebi o sinal por fora, confirmar</Botao>
            </div>
          </>
        )}
        {status === "confirmada" && <Aviso tom="sucesso" titulo="Confirmada">A cliente já recebeu a confirmação e o endereço. Ela recebe um lembrete na véspera.</Aviso>}
        {status === "realizada" && <Aviso tom="sucesso" titulo="Make realizada">As fotos da cliente são apagadas 30 dias depois do atendimento.</Aviso>}
        {status === "cancelada_profissional" && <Aviso tom="alerta" titulo="Pedido recusado">{motivo ? `Motivo enviado: ${motivo.toLowerCase()}.` : "A cliente foi avisada."} O horário voltou para a agenda.</Aviso>}
        {erroAcao && <p role="alert" className="mt-3 text-sm text-erro">{erroAcao}</p>}
        {status !== "aguardando_sinal" && zap}
      </div>

      {/* Celular: abas. Computador: pedido e brief lado a lado. */}
      <div role="tablist" aria-label="Detalhes" className="mb-5 grid grid-cols-2 gap-1 rounded-full bg-nude p-1 lg:hidden">
        {(["pedido", "brief"] as const).map((a) => (
          <button key={a} type="button" role="tab" aria-selected={aba === a} onClick={() => setAba(a)} className={`min-h-10 rounded-full text-sm font-medium ${aba === a ? "bg-po shadow-flutuante" : "text-terra"}`}>
            {a === "pedido" ? "Pedido" : "Beauty Brief"}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className={`lg:sticky lg:top-8 lg:self-start ${aba === "pedido" ? "" : "hidden lg:block"}`}>{pedido}</div>
        <div className={aba === "brief" ? "" : "hidden lg:block"}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="hidden text-lg font-semibold lg:block">Beauty Brief</h2>
            {brief && (
              <Link href={`/studio/reservas/${reserva.id}/ficha`} className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-terra/40 px-4 text-sm font-medium [@media(hover:hover)]:hover:bg-nude/60">
                <Icone nome="enviar" className="size-4" />
                Ficha em PDF
              </Link>
            )}
          </div>
          {brief ? (
            <BeautyBriefEditavel key={JSON.stringify(brief).length} inicial={brief} imagem={simulacao} aoSalvar={(b) => void salvarBrief({ editado: b })} />
          ) : (
            <Estado icone="pincel" titulo="Sem Beauty Brief para este pedido" texto="O brief é gerado quando a cliente autoriza você a ver a simulação. Use o estilo escolhido e combine os detalhes pelo WhatsApp." />
          )}
        </div>
      </div>

      <Folha aberta={!!ampliada} aoFechar={() => setAmpliada(null)} titulo={ampliada === "original" ? "Foto original" : "Simulação"}>
        {fotos.length > 1 && (
          <div role="tablist" aria-label="Foto" className="mb-3 grid grid-cols-2 gap-1 rounded-full bg-nude p-1">
            {fotos.map((f) => (
              <button key={f.tipo} type="button" role="tab" aria-selected={ampliada === f.tipo} onClick={() => setAmpliada(f.tipo)} className={`min-h-10 rounded-full text-sm font-medium ${ampliada === f.tipo ? "bg-po shadow-flutuante" : "text-terra"}`}>
                {f.rotulo}
              </button>
            ))}
          </div>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element -- link assinado temporário do storage privado */}
        <img src={fotos.find((f) => f.tipo === ampliada)?.src} alt={ampliada === "original" ? "Foto original da cliente" : "Simulação aprovada pela cliente"} className="max-h-[65dvh] w-full rounded-foto object-contain" />
        <p className="mt-3 text-xs text-terra">Uso só para preparar o atendimento. Não salve nem compartilhe sem autorização da cliente.</p>
      </Folha>

      <Folha aberta={folha === "recusar"} aoFechar={() => setFolha(null)} titulo={`Recusar o pedido de ${primeiroNome}?`}>
        <p className="text-sm text-terra">A cliente recebe o aviso com o motivo, e nada foi pago ainda.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {MOTIVOS.map((m) => <Chip key={m} ativo={motivo === m} onClick={() => setMotivo(m)}>{m}</Chip>)}
        </div>
        <div className="mt-5 space-y-2">
          <Botao disabled={!motivo} className="!bg-erro !text-[#f6ece6]" onClick={() => { void transicionar("cancelada_profissional"); setFolha(null); }}>Recusar pedido</Botao>
          <Botao variante="texto" onClick={() => setFolha(null)}>Voltar</Botao>
        </div>
      </Folha>
    </PaginaStudio>
  );
}
