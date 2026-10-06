"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { SeloStatus } from "@/components/cliente/partes";
import { Icone } from "@/components/ui/icones";
import { rotuloStatus, separarReservas } from "@/lib/cliente/reservas";
import { descreverServico } from "@/lib/data/mock/catalogo";
import { useReservasCliente } from "@/lib/dados/use-reservas-cliente";
import { LOOKS_SALVOS } from "@/lib/data/mock/clientes";
import { buscarLook } from "@/lib/data/mock/looks";
import { PROFISSIONAL } from "@/lib/data/mock/profissional";
import { FUSO, formatarDataCurta, formatarHora } from "@/lib/domain/formatar";

function saudacao(agora: Date) {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "2-digit", hourCycle: "h23" }).format(agora));
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

function faltam(inicio: string, agora: Date) {
  const dias = Math.ceil((new Date(inicio).getTime() - agora.getTime()) / 86_400_000);
  return dias <= 0 ? "É hoje" : dias === 1 ? "É amanhã" : `Faltam ${dias} dias`;
}

export default function Inicio() {
  const [agora] = useState(() => new Date());
  const { reservas, nome, demo } = useReservasCliente();
  // Makes salvas de exemplo só na demonstração (a cliente logada vê as dela quando houver).
  const salvas = demo ? LOOKS_SALVOS : [];
  const { proximas } = separarReservas(reservas, agora);
  const proxima = proximas[0];
  const look = proxima && buscarLook(proxima.lookId);
  const status = proxima && rotuloStatus(proxima.status);

  return (
    <main className="mx-auto w-full max-w-5xl px-5 pb-10 pt-[max(env(safe-area-inset-top),1rem)] lg:px-8 lg:pt-10">
      <div className="flex items-center justify-between gap-4 pt-2">
        <div>
          <p className="text-sm text-terra">{saudacao(agora)},</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight lg:text-3xl">{nome || "Que bom te ver"}</h1>
        </div>
        <Link href="/conta" aria-label="Sua conta" className="grid size-11 place-items-center rounded-full bg-nude font-semibold lg:hidden">
          {(nome || "?")[0]}
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr] lg:gap-6">
        {proxima && look ? (
          <Link
            href={`/reservas/${proxima.id}`}
            data-palco
            className="group relative flex min-h-[23rem] flex-col justify-end overflow-hidden rounded-foto bg-po p-5 text-cacau lg:min-h-[28rem] lg:p-7"
          >
            <Image src={look.imagem} alt="" fill priority sizes="(min-width: 1024px) 560px, 100vw" className="object-cover transition-transform duration-700 [@media(hover:hover)]:group-hover:scale-[1.02]" />
            <span className="absolute inset-0 bg-gradient-to-t from-[#1a110e] via-[#1a110e]/55 to-transparent" />
            <span className="relative">
              <span className="text-sm text-terra">Sua próxima make</span>
              <span className="mt-1 block font-display text-2xl font-semibold tracking-tight">
                {formatarDataCurta(proxima.inicio)} às {formatarHora(proxima.inicio)}
              </span>
              <span className="mt-1 block text-sm text-cacau/85">
                {descreverServico(proxima.ocasiao, proxima.papel)}, {proxima.modo === "domicilio" ? "no seu endereço" : "no espaço da Thalita"}
              </span>
              <span className="mt-4 flex flex-wrap items-center gap-2">
                {status && <SeloStatus tom={status.tom}>{status.texto}</SeloStatus>}
                <span className="rounded-full bg-cacau/10 px-2.5 py-1 text-xs font-semibold">{faltam(proxima.inicio, agora)}</span>
              </span>
            </span>
          </Link>
        ) : (
          <div className="flex min-h-[18rem] flex-col justify-end rounded-foto bg-nude p-6">
            <p className="font-display text-xl font-semibold">Nenhuma make marcada.</p>
            <p className="mt-1 text-sm text-terra">Teste uma make em você e escolha o dia.</p>
          </div>
        )}

        <div className="flex min-w-0 flex-col gap-4">
          <Link href="/momento" className="group relative flex min-h-40 items-end overflow-hidden rounded-foto p-5 text-[#f6ece6]">
            <Image src="/acervo/marca/abertura-v2.jpg" alt="" fill sizes="(min-width: 1024px) 440px, 100vw" className="object-cover object-[50%_30%]" />
            <span className="absolute inset-0 bg-gradient-to-r from-[#1a110e]/80 to-[#1a110e]/10" />
            <span className="relative flex w-full items-end justify-between gap-4">
              <span>
                <span className="block text-lg font-semibold">Testar outra make</span>
                <span className="block text-sm text-[#f6ece6]/80">Veja em você antes de decidir.</span>
              </span>
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#f6ece6] text-[#2b1a15]">
                <Icone nome="rosto" />
              </span>
            </span>
          </Link>

          {salvas.length > 0 && (
          <section aria-labelledby="suas-makes" className="rounded-foto bg-nude/60 p-4">
            <div className="flex items-center justify-between">
              <h2 id="suas-makes" className="font-semibold">Suas makes</h2>
              <Link href="/makes" className="grid min-h-11 place-items-center px-1 text-sm text-terra underline underline-offset-4">Ver todos</Link>
            </div>
            <div className="sem-barra -mx-4 mt-1 flex gap-3 overflow-x-auto px-4">
              {salvas.map((s) => (
                <Link key={s.id} href="/makes" className="relative h-28 w-22 shrink-0 overflow-hidden rounded-2xl bg-nude-2">
                  <Image src={s.imagem} alt={buscarLook(s.lookId)?.titulo ?? "Simulação"} fill sizes="88px" className="object-cover" />
                </Link>
              ))}
            </div>
          </section>
          )}

          <a
            href={`https://wa.me/${PROFISSIONAL.whatsapp}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-4 rounded-foto border border-nude-2 p-4 [@media(hover:hover)]:hover:bg-nude/60"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-nude"><Icone nome="whatsapp" /></span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Falar com a Thalita</span>
              <span className="block text-sm text-terra">Dúvidas, remarcação ou um pedido especial.</span>
            </span>
            <Icone nome="avancar" className="size-5 text-terra" />
          </a>
        </div>
      </div>
    </main>
  );
}
