"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { SeloStatus } from "@/components/cliente/partes";
import { PaginaStudio } from "@/components/studio/partes";
import { Icone } from "@/components/ui/icones";
import { Chip } from "@/components/ui/marca";
import { descreverServico } from "@/lib/data/mock/catalogo";
import { buscarLook } from "@/lib/data/mock/looks";
import { CarregandoLista } from "@/components/ui/estados";
import { usePedidos } from "@/lib/dados/use-pedidos";
import { formatarDataCurta, formatarHora, formatarMoeda, formatarMoedaCurta } from "@/lib/domain/formatar";
import type { StatusReserva } from "@/lib/domain/reserva";
import { resumoPedidos } from "@/lib/studio/painel";
import { STATUS_STUDIO } from "@/lib/studio/status";


const FILTROS: { id: string; texto: string; status: StatusReserva[] }[] = [
  { id: "acao", texto: "Pedem ação", status: ["solicitada", "orcamento", "aguardando_sinal"] },
  { id: "confirmadas", texto: "Confirmadas", status: ["confirmada"] },
  { id: "historico", texto: "Histórico", status: ["realizada", "expirada", "cancelada_cliente", "cancelada_profissional"] },
];

function ha(iso: string, agora: number) {
  const min = Math.round((agora - new Date(iso).getTime()) / 60_000);
  if (min < 60) return `há ${Math.max(1, min)} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `há ${h} h` : `há ${Math.round(h / 24)} dias`;
}

export default function Pedidos() {
  const [agora] = useState(() => new Date());
  const [filtro, setFiltro] = useState("acao");
  const { pedidos: RESERVAS, carregando, demo } = usePedidos();
  const s = resumoPedidos(RESERVAS, agora);
  const status = FILTROS.find((f) => f.id === filtro)!.status;
  const lista = RESERVAS.filter((r) => status.includes(r.status)).sort((a, b) =>
    filtro === "historico" ? new Date(b.inicio).getTime() - new Date(a.inicio).getTime() : new Date(a.inicio).getTime() - new Date(b.inicio).getTime(),
  );

  const numeros = [
    { rotulo: "Novos pedidos", valor: String(s.novos), destaque: s.novos > 0 },
    { rotulo: "Sinal para conferir", valor: String(s.aguardandoSinal), destaque: s.aguardandoSinal > 0 },
    { rotulo: "Makes nos próximos 7 dias", valor: String(s.proximos7dias) },
    { rotulo: "Previsto neste mês", valor: formatarMoedaCurta(s.previstoMes) },
  ];

  return (
    <PaginaStudio titulo={demo ? "Oi, Thalita (exemplo)" : "Oi, Thalita"} subtitulo={s.novos ? `Você tem ${s.novos === 1 ? "1 pedido novo" : `${s.novos} pedidos novos`} para responder.` : "Nenhum pedido esperando resposta."}>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {numeros.map((n) => (
          <div key={n.rotulo} className={`rounded-foto p-4 ${n.destaque ? "bg-cacau text-cacau-fg" : "bg-nude/60"}`}>
            <dt className={`text-sm ${n.destaque ? "text-cacau-fg/80" : "text-terra"}`}>{n.rotulo}</dt>
            <dd className="tabular mt-1 whitespace-nowrap font-display text-xl font-semibold sm:text-2xl">{n.valor}</dd>
          </div>
        ))}
      </dl>

      <div className="sem-barra -mx-5 mt-8 flex gap-2 overflow-x-auto px-5 md:mx-0 md:px-0" role="group" aria-label="Filtrar pedidos">
        {FILTROS.map((f) => {
          const n = RESERVAS.filter((r) => f.status.includes(r.status)).length;
          return <Chip key={f.id} ativo={filtro === f.id} onClick={() => setFiltro(f.id)}>{f.texto} ({n})</Chip>;
        })}
      </div>

      {carregando ? (
        <div className="mt-4"><CarregandoLista linhas={3} rotulo="Carregando pedidos" /></div>
      ) : lista.length === 0 ? (
        <div className="mt-4 rounded-foto bg-nude/60 p-8 text-center">
          <Icone nome="check" className="mx-auto size-8 text-sucesso" />
          <p className="mt-3 font-semibold">Tudo em dia por aqui</p>
          <p className="mt-1 text-sm text-terra">Quando chegar um pedido novo, ele aparece nesta lista e você recebe um aviso.</p>
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {lista.map((r) => {
            const look = buscarLook(r.lookId);
            const st = STATUS_STUDIO[r.status];
            return (
              <li key={r.id}>
                <Link href={`/studio/reservas/${r.id}`} className="flex h-full gap-4 rounded-foto border border-nude-2 bg-po p-3 [@media(hover:hover)]:hover:border-terra/40">
                  <span className="relative h-24 w-19 shrink-0 overflow-hidden rounded-2xl bg-nude-2">
                    {look && <Image src={look.imagem} alt="" fill sizes="76px" className="object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="truncate font-semibold">{r.cliente.nome}</span>
                      <span className="tabular shrink-0 text-sm font-semibold">{formatarMoeda(r.valores.total)}</span>
                    </span>
                    <span className="block truncate text-sm text-terra">
                      {descreverServico(r.ocasiao, r.papel)}
                      {r.pessoa.menor ? ", menor de idade" : ""}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-sm">
                      <Icone nome={r.modo === "domicilio" ? "casa" : "local"} className="size-4 text-terra" />
                      {formatarDataCurta(r.inicio)} às {formatarHora(r.inicio)}
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-2">
                      <SeloStatus tom={st.tom}>{st.texto}</SeloStatus>
                      {(r.status === "solicitada" || r.status === "aguardando_sinal") && <span className="text-xs text-terra">{ha(r.criadaEm, agora.getTime())}</span>}
                      {r.comprovante && <span className="text-xs text-terra">Comprovante enviado</span>}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </PaginaStudio>
  );
}
