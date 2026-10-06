"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { LinhaValor } from "@/components/agendar/partes";
import { PaginaCliente, SeloStatus } from "@/components/cliente/partes";
import { Folha } from "@/components/ui/folha";
import { Icone } from "@/components/ui/icones";
import { Aviso, Botao } from "@/components/ui/marca";
import { rotuloStatus } from "@/lib/cliente/reservas";
import { descreverServico } from "@/lib/data/mock/catalogo";
import { CarregandoLista } from "@/components/ui/estados";
import { useReservasCliente } from "@/lib/dados/use-reservas-cliente";
import { LOOKS_SALVOS } from "@/lib/data/mock/clientes";
import { buscarLook } from "@/lib/data/mock/looks";
import { PROFISSIONAL } from "@/lib/data/mock/profissional";
import { formatarDataCurta, formatarHora, formatarMoeda } from "@/lib/domain/formatar";
import { reembolsoAoCancelar, type StatusReserva } from "@/lib/domain/reserva";

const EXPLICACAO: Partial<Record<StatusReserva, string>> = {
  solicitada: "A Thalita recebeu o seu pedido e está conferindo. Você ainda não pagou nada: quando ela aceitar, o Pix do sinal aparece aqui.",
  aguardando_sinal: "A Thalita aceitou o seu pedido! Pague o sinal no Pix para o horário ficar seu.",
  confirmada: "Está tudo certo. A Thalita te espera no dia e horário marcados.",
  orcamento: "A Thalita está calculando o deslocamento. O valor chega por aqui e no WhatsApp.",
};

export default function DetalheReserva() {
  const { id } = useParams<{ id: string }>();
  const { reservas, carregando, demo } = useReservasCliente();
  const reserva = reservas.find((r) => r.id === id);
  const [agora] = useState(() => new Date());
  const [folha, setFolha] = useState<"cancelar" | "remarcar" | null>(null);
  const [cancelada, setCancelada] = useState(false);
  const [devolvido, setDevolvido] = useState(false);
  const [erroCancelar, setErroCancelar] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState(false);

  /** Cancela: na demonstração só na tela; com conta, no servidor (devolve o sinal com 7+ dias). */
  async function cancelar() {
    setErroCancelar(null);
    if (!demo) {
      setCancelando(true);
      const r = await fetch(`/api/conta/reservas/${id}/cancelar`, { method: "POST" });
      const corpo = (await r.json().catch(() => ({}))) as { erro?: string; devolvido?: boolean };
      setCancelando(false);
      if (!r.ok) return setErroCancelar(corpo.erro ?? "Não deu para cancelar agora. Fale com a Thalita.");
      setDevolvido(!!corpo.devolvido);
    }
    setCancelada(true);
    setFolha(null);
  }

  if (carregando) {
    return (
      <PaginaCliente titulo="Reserva" voltarPara="/reservas">
        <CarregandoLista linhas={1} rotulo="Carregando reserva" />
      </PaginaCliente>
    );
  }

  if (!reserva) {
    return (
      <PaginaCliente titulo="Reserva não encontrada" voltarPara="/reservas">
        <p className="text-terra">Ela pode ter sido apagada ou o link está incompleto.</p>
        <Link href="/reservas" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-cacau px-5 text-sm font-semibold text-cacau-fg">Ver minhas reservas</Link>
      </PaginaCliente>
    );
  }

  const look = buscarLook(reserva.lookId);
  const simulacao = demo ? LOOKS_SALVOS.find((x) => x.reservaId === reserva.id) : undefined;
  const status: StatusReserva = cancelada ? "cancelada_cliente" : reserva.status;
  const st = rotuloStatus(status);
  const ativa = ["solicitada", "aguardando_sinal", "confirmada", "orcamento"].includes(status) && new Date(reserva.inicio) > agora;
  const reembolso = reembolsoAoCancelar(new Date(reserva.inicio), agora);
  const sinalPago = ["confirmada", "realizada"].includes(reserva.status);
  const quando = `${formatarDataCurta(reserva.inicio)} às ${formatarHora(reserva.inicio)}`;
  const zap = (texto: string) => `https://wa.me/${PROFISSIONAL.whatsapp}?text=${encodeURIComponent(texto)}`;

  return (
    <PaginaCliente titulo={quando} subtitulo={descreverServico(reserva.ocasiao, reserva.papel)} voltarPara="/reservas">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        <div className="relative aspect-[5/4] overflow-hidden rounded-foto bg-nude-2 md:aspect-[4/5] md:self-start">
          {look && <Image src={simulacao?.imagem ?? look.imagem} alt={simulacao ? `Sua simulação: ${look.titulo}` : look.titulo} fill priority sizes="(min-width: 768px) 240px, 100vw" className="object-cover object-[50%_30%]" />}
          <span className="absolute left-3 top-3 rounded-full bg-po"><SeloStatus tom={st.tom}>{st.texto}</SeloStatus></span>
          <span className="absolute bottom-3 left-3 rounded-full bg-[#1a110e]/60 px-2.5 py-1 text-xs text-[#f6ece6]">{simulacao ? "Sua simulação com IA" : "Inspiração criada com IA"}</span>
        </div>

        <div className="space-y-6">
          {cancelada ? (
            <Aviso tom="sucesso" titulo="Reserva cancelada">
              {devolvido || (demo && reembolso === "devolve_sinal" && sinalPago) ? `O sinal de ${formatarMoeda(reserva.valores.sinal)} volta para você em até 5 dias úteis.` : "O horário foi liberado na agenda."}
            </Aviso>
          ) : (
            EXPLICACAO[status] && (
              <div className="rounded-foto bg-nude p-4 text-sm">
                <p>{EXPLICACAO[status]}</p>
                {/* Depois do aceite, pagar é a ação principal: fica aqui no topo, sem precisar rolar. */}
                {status === "aguardando_sinal" && ativa && !cancelada && (
                  <Link href={`/agendar/sinal?reserva=${reserva.id}`} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-cacau px-6 text-base font-semibold text-cacau-fg shadow-flutuante active:scale-[0.98]">
                    Pagar sinal de {formatarMoeda(reserva.valores.sinal)}
                  </Link>
                )}
              </div>
            )
          )}

          <dl className="space-y-3 text-sm">
            <div className="flex gap-3"><Icone nome="local" className="size-5 shrink-0 text-terra" /><div><dt className="text-xs text-terra">Onde</dt><dd className="font-medium">{reserva.modo === "domicilio" ? reserva.endereco : status === "confirmada" ? PROFISSIONAL.espaco.endereco : "Espaço da Thalita (endereço completo após a confirmação)"}</dd></div></div>
            <div className="flex gap-3"><Icone nome="usuario" className="size-5 shrink-0 text-terra" /><div><dt className="text-xs text-terra">Para quem</dt><dd className="font-medium">{reserva.pessoa.nome}{reserva.pessoa.menor && <span className="ml-2 rounded-full bg-nude px-2 py-0.5 text-xs">Menor de idade</span>}</dd></div></div>
            <div className="flex gap-3"><Icone nome="looks" className="size-5 shrink-0 text-terra" /><div><dt className="text-xs text-terra">Make</dt><dd className="font-medium">{look?.titulo}</dd>{look && <dd className="text-terra">Pele {look.detalhes.pele.toLowerCase()}, olhos {look.detalhes.olhos.toLowerCase()}, boca {look.detalhes.boca.toLowerCase()}.</dd>}</div></div>
          </dl>

          <section aria-labelledby="valores">
            <h2 id="valores" className="font-semibold">Valores</h2>
            <dl className="mt-1">
              <LinhaValor rotulo="Make" valor={formatarMoeda(reserva.valores.servico)} />
              {reserva.valores.deslocamento > 0 && <LinhaValor rotulo="Deslocamento" valor={formatarMoeda(reserva.valores.deslocamento)} />}
              {reserva.valores.adicional > 0 && <LinhaValor rotulo="Adicional antes das 7h" valor={formatarMoeda(reserva.valores.adicional)} />}
              <LinhaValor rotulo={sinalPago ? "Sinal pago" : "Sinal"} valor={formatarMoeda(reserva.valores.sinal)} />
              <div className="my-1 border-t border-nude-2" />
              <LinhaValor forte rotulo={status === "realizada" ? "Total pago" : "A pagar no dia"} valor={formatarMoeda(status === "realizada" ? reserva.valores.total : reserva.valores.restante)} />
            </dl>
          </section>

          {ativa && !cancelada && (
            <div className="space-y-2">
              <a
                href={zap(`Oi, Thalita! Sobre a minha reserva de ${quando}.`)}
                target="_blank"
                rel="noreferrer"
                className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-6 font-semibold ${status === "aguardando_sinal" ? "border border-terra/50 text-cacau" : "bg-cacau text-cacau-fg shadow-flutuante"}`}
              >
                <Icone nome="whatsapp" />Falar com a Thalita
              </a>
              <div className="grid grid-cols-2 gap-2">
                <Botao variante="secundario" onClick={() => setFolha("remarcar")}>Remarcar</Botao>
                <Botao variante="secundario" className="!text-erro" onClick={() => setFolha("cancelar")}>Cancelar</Botao>
              </div>
            </div>
          )}
          {status === "realizada" && (
            <Link href="/momento" className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-cacau px-6 font-semibold text-cacau-fg">Marcar de novo</Link>
          )}
        </div>
      </div>

      <Folha aberta={folha === "remarcar"} aoFechar={() => setFolha(null)} titulo="Remarcar a make">
        <p className="text-sm text-terra">A remarcação é combinada com a Thalita, conforme a agenda dela. Com 7 dias ou mais de antecedência, o sinal vale para a nova data.</p>
        <div className="mt-5">
          <a href={zap(`Oi, Thalita! Preciso remarcar a make de ${quando}. Quais datas você tem?`)} target="_blank" rel="noreferrer" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-cacau px-6 font-semibold text-cacau-fg">
            <Icone nome="whatsapp" />Pedir nova data no WhatsApp
          </a>
        </div>
      </Folha>

      <Folha aberta={folha === "cancelar"} aoFechar={() => setFolha(null)} titulo="Cancelar esta reserva?">
        {!sinalPago ? (
          <p className="text-sm text-terra">Você ainda não pagou o sinal, então não há valor a devolver. O horário volta para a agenda da Thalita.</p>
        ) : reembolso === "devolve_sinal" ? (
          <Aviso tom="sucesso" titulo={`O sinal de ${formatarMoeda(reserva.valores.sinal)} volta para você`}>Faltam 7 dias ou mais, então a devolução é integral, em até 5 dias úteis.</Aviso>
        ) : (
          <Aviso tom="alerta" titulo={`O sinal de ${formatarMoeda(reserva.valores.sinal)} não é devolvido`}>Faltam menos de 7 dias. O sinal cobre o horário que ficou reservado para você. Se for remarcar, fale com a Thalita antes.</Aviso>
        )}
        <div className="mt-5 space-y-2">
          <Botao className="!bg-erro !text-[#f6ece6]" carregando={cancelando} onClick={() => void cancelar()}>Cancelar reserva</Botao>
          {erroCancelar && <p role="alert" className="text-sm text-erro">{erroCancelar}</p>}
          <Botao variante="texto" onClick={() => setFolha(null)}>Manter reserva</Botao>
        </div>
      </Folha>
    </PaginaCliente>
  );
}
