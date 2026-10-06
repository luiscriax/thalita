"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Abas, PaginaCliente, SeloStatus } from "@/components/cliente/partes";
import { Icone } from "@/components/ui/icones";
import { rotuloStatus, separarReservas } from "@/lib/cliente/reservas";
import { descreverServico } from "@/lib/data/mock/catalogo";
import { CarregandoLista } from "@/components/ui/estados";
import { useReservasCliente } from "@/lib/dados/use-reservas-cliente";
import { buscarLook } from "@/lib/data/mock/looks";
import { formatarDataCurta, formatarHora } from "@/lib/domain/formatar";

export default function Reservas() {
  const [agora] = useState(() => new Date());
  const [aba, setAba] = useState<"proximas" | "anteriores">("proximas");
  const { reservas, carregando } = useReservasCliente();
  const grupos = separarReservas(reservas, agora);
  const lista = grupos[aba];

  return (
    <PaginaCliente titulo="Reservas">
      <Abas
        rotulo="Reservas"
        valor={aba}
        aoMudar={setAba}
        opcoes={[
          { id: "proximas", texto: `Próximas (${grupos.proximas.length})` },
          { id: "anteriores", texto: "Anteriores" },
        ]}
      />
      <div role="tabpanel" className="mt-5">
        {carregando ? (
          <CarregandoLista linhas={2} rotulo="Carregando reservas" />
        ) : lista.length === 0 ? (
          <div className="rounded-foto bg-nude/60 p-6 text-center">
            <Icone nome="calendario" className="mx-auto size-8 text-terra" />
            <p className="mt-3 font-semibold">{aba === "proximas" ? "Nenhuma make marcada" : "Nada por aqui ainda"}</p>
            <p className="mt-1 text-sm text-terra">{aba === "proximas" ? "Teste uma make e escolha o dia." : "As makes que você fizer aparecem aqui."}</p>
            {aba === "proximas" && (
              <Link href="/momento" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-cacau px-5 text-sm font-semibold text-cacau-fg">Testar uma make</Link>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {lista.map((r) => {
              const look = buscarLook(r.lookId);
              const st = rotuloStatus(r.status);
              return (
                <li key={r.id}>
                  <Link href={`/reservas/${r.id}`} className="flex gap-4 rounded-foto border border-nude-2 p-3 [@media(hover:hover)]:hover:bg-nude/60">
                    <span className="relative h-24 w-19 shrink-0 overflow-hidden rounded-2xl bg-nude-2">
                      {look && <Image src={look.imagem} alt="" fill sizes="76px" className={`object-cover ${aba === "anteriores" ? "grayscale-[35%]" : ""}`} />}
                    </span>
                    <span className="min-w-0 flex-1 self-center">
                      <span className="block font-semibold">{formatarDataCurta(r.inicio)} às {formatarHora(r.inicio)}</span>
                      <span className="block truncate text-sm text-terra">
                        {descreverServico(r.ocasiao, r.papel)}
                        {r.pessoa.nome !== r.cliente.nome ? `, para ${r.pessoa.nome.split(" ")[0]}` : ""}
                      </span>
                      <span className="mt-2 block"><SeloStatus tom={st.tom}>{st.texto}</SeloStatus></span>
                    </span>
                    <Icone nome="avancar" className="size-5 shrink-0 self-center text-terra/70" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </PaginaCliente>
  );
}
