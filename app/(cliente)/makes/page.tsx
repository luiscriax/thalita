"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PaginaCliente } from "@/components/cliente/partes";
import { Folha } from "@/components/ui/folha";
import { Icone } from "@/components/ui/icones";
import { Botao } from "@/components/ui/marca";
import { diasParaApagar } from "@/lib/cliente/retencao";
import { LOOKS_SALVOS, type LookSalvo } from "@/lib/data/mock/clientes";
import { buscarLook } from "@/lib/data/mock/looks";
import { useJornada } from "@/lib/jornada/jornada";

function prazo(s: LookSalvo, agora: number) {
  if (s.reservaId) return "Guardado com a sua reserva";
  const d = diasParaApagar(s.criadoEm, agora);
  return d <= 1 ? "Apaga amanhã" : `Apaga em ${d} dias`;
}

export default function MeusLooks() {
  const router = useRouter();
  const { atualizar } = useJornada();
  const [agora] = useState(() => Date.now());
  const [lista, setLista] = useState(LOOKS_SALVOS);
  const [aberto, setAberto] = useState<LookSalvo | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const look = aberto && buscarLook(aberto.lookId);

  function apagar() {
    if (!aberto) return;
    setLista((l) => l.filter((x) => x.id !== aberto.id));
    setConfirmar(false);
    setAberto(null);
  }

  return (
    <PaginaCliente titulo="Minhas makes" subtitulo="Simulações criadas com IA a partir da sua foto." largura="larga">
      {lista.length === 0 ? (
        <div className="rounded-foto bg-nude/60 p-8 text-center">
          <Icone nome="looks" className="mx-auto size-8 text-terra" />
          <p className="mt-3 font-semibold">Nenhuma make guardada</p>
          <p className="mt-1 text-sm text-terra">Teste um estilo em você. Ele fica aqui por 7 dias.</p>
          <Link href="/momento" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-cacau px-5 text-sm font-semibold text-cacau-fg">Testar uma make</Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
          {lista.map((s, i) => {
            const l = buscarLook(s.lookId);
            return (
              <li key={s.id}>
                <button type="button" onClick={() => setAberto(s)} className="group block w-full text-left">
                  <span className="relative block aspect-[4/5] overflow-hidden rounded-foto bg-nude-2">
                    <Image src={s.imagem} alt={l?.titulo ?? "Simulação"} fill priority={i < 4} sizes="(min-width: 1024px) 240px, (min-width: 768px) 30vw, 50vw" className="object-cover transition-transform duration-500 [@media(hover:hover)]:group-hover:scale-[1.03]" />
                    {s.reservaId && <span className="absolute left-2 top-2 grid size-8 place-items-center rounded-full bg-po/90 text-cacau"><Icone nome="calendario" className="size-4" /></span>}
                  </span>
                  <span className="mt-2 block truncate font-medium">{l?.titulo}</span>
                  <span className="block text-xs text-terra">{prazo(s, agora)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-8 text-xs text-terra">
        Simulações sem reserva são apagadas sozinhas em 7 dias. <Link href="/sua-foto" className="underline underline-offset-4">Como cuidamos da sua foto</Link>
      </p>

      <Folha aberta={!!aberto && !confirmar} aoFechar={() => setAberto(null)} titulo={look?.titulo ?? "Simulação"}>
        {aberto && (
          <>
            <div className="relative mx-auto aspect-[4/5] w-full max-w-xs overflow-hidden rounded-foto bg-nude-2">
              <Image src={aberto.imagem} alt={look?.titulo ?? "Simulação"} fill sizes="320px" className="object-cover" />
              <span className="absolute bottom-2 left-2 rounded-full bg-[#1a110e]/60 px-2.5 py-1 text-xs text-[#f6ece6]">Simulação com IA</span>
            </div>
            {look && <p className="mt-3 text-sm text-terra">{look.descricao} {aberto.variacao && `Variação: ${aberto.variacao.toLowerCase()}.`}</p>}
            <div className="mt-5 space-y-2">
              {!aberto.reservaId && (
                <Botao onClick={() => { atualizar({ lookId: aberto.lookId }); router.push("/momento"); }}>Agendar esta make</Botao>
              )}
              <Botao variante="texto" className="!text-erro" onClick={() => setConfirmar(true)}>
                <Icone nome="lixeira" className="size-4" />Apagar simulação
              </Botao>
            </div>
          </>
        )}
      </Folha>

      <Folha aberta={confirmar} aoFechar={() => setConfirmar(false)} titulo="Apagar esta simulação?">
        <p className="text-sm text-terra">A imagem é apagada de vez e não dá para recuperar.{aberto?.reservaId ? " A Thalita deixa de ver essa simulação na sua reserva." : ""}</p>
        <div className="mt-5 space-y-2">
          <Botao className="!bg-erro !text-[#f6ece6]" onClick={apagar}>Apagar</Botao>
          <Botao variante="texto" onClick={() => setConfirmar(false)}>Manter</Botao>
        </div>
      </Folha>
    </PaginaCliente>
  );
}
