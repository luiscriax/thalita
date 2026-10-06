"use client";

import { useRouter } from "next/navigation";
import { TelaFluxo } from "@/components/layout/tela-fluxo";
import { Icone } from "@/components/ui/icones";
import { ConviteInstalar } from "@/components/ui/instalar-app";
import { Botao } from "@/components/ui/marca";
import { totalDaJornada } from "@/lib/agendar/calculo";
import { descreverServico } from "@/lib/data/mock/catalogo";
import { buscarLook, tituloDaMake } from "@/lib/data/mock/looks";
import { PROFISSIONAL } from "@/lib/data/mock/profissional";
import { formatarDataCurta, formatarHora, formatarMoeda } from "@/lib/domain/formatar";
import { useJornada } from "@/lib/jornada/jornada";

export default function Enviado() {
  const router = useRouter();
  const { jornada } = useJornada();
  const look = buscarLook(jornada.lookId);
  const total = totalDaJornada(jornada);
  const orcamento = jornada.modo === "domicilio" && jornada.deslocamento?.tipo === "orcamento";
  const quando = jornada.inicio ? `${formatarDataCurta(jornada.inicio)} às ${formatarHora(jornada.inicio)}` : "";
  const primeiroNome = jornada.contato?.nome.split(" ")[0];

  const passos = orcamento
    ? [
        { titulo: "Pedido de orçamento enviado", feito: true },
        { titulo: "A Thalita responde com o valor do deslocamento", atual: true },
        { titulo: "Você paga o sinal e o horário fica seu" },
      ]
    : jornada.sinalPago
      ? [
          { titulo: "Pedido enviado", feito: true },
          { titulo: "Sinal pago no Pix", feito: true },
          { titulo: "Horário confirmado", feito: true },
          { titulo: "Dia da make", detalhe: quando, atual: true },
        ]
      : [
          { titulo: "Pedido enviado", feito: true },
          { titulo: "A Thalita confere e aceita", atual: true },
          { titulo: "Você paga o sinal pelo app", detalhe: total ? `${formatarMoeda(total.sinal)} no Pix` : undefined },
          { titulo: "Dia da make", detalhe: quando },
        ];

  const mensagem = [
    `Oi, Thalita! Sou ${jornada.contato?.nome ?? "cliente"} e acabei de fazer um pedido pelo app.`,
    jornada.pessoa && !jornada.pessoa.propria && jornada.pessoa.nome ? `A make é para ${jornada.pessoa.nome}.` : "",
    `${tituloDaMake(jornada.lookId)}, ${descreverServico(jornada.ocasiao, jornada.papel).toLowerCase()}, ${quando}.`,
    orcamento ? "Fica fora da área padrão, aguardo o orçamento do deslocamento." : "Fico no aguardo da sua confirmação para pagar o sinal.",
  ].filter(Boolean).join(" ");
  const whatsapp = `https://wa.me/${PROFISSIONAL.whatsapp}?text=${encodeURIComponent(mensagem)}`;

  return (
    <TelaFluxo
      painel={look && { imagem: look.imagem, legenda: "Agora é com a Thalita." }}
      rodape={
        <div className="space-y-2">
          <Botao onClick={() => router.push(jornada.reservaId ? `/reservas/${jornada.reservaId}` : "/inicio")}>
            {jornada.reservaId ? "Acompanhar meu pedido" : "Ir para o início"}
          </Botao>
          <a href={whatsapp} target="_blank" rel="noreferrer" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-terra/50 px-6 text-base font-semibold text-cacau active:scale-[0.98]">
            <Icone nome="whatsapp" />
            Falar com a Thalita
          </a>
        </div>
      }
    >
      <div className="mt-10 text-center lg:mt-16">
        <span className="enviado-selo mx-auto grid size-20 place-items-center rounded-full bg-champanhe text-[#2b1a15]">
          <Icone nome="check" className="size-10" />
        </span>
        <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight lg:text-3xl">
          {orcamento ? "Pedido de orçamento enviado" : jornada.sinalPago ? (primeiroNome ? `Tudo certo, ${primeiroNome}!` : "Tudo certo!") : primeiroNome ? `Pedido enviado, ${primeiroNome}!` : "Pedido enviado!"}
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-terra">
          {orcamento
            ? "A Thalita vai calcular o deslocamento e responder por aqui e no WhatsApp."
            : jornada.sinalPago ? "O Pix caiu e o seu horário está garantido. Você recebe um lembrete na véspera." : "Você não pagou nada ainda. A Thalita confere o pedido e, quando aceitar, o Pix do sinal aparece no seu pedido aqui no app."}
        </p>
      </div>

      <ol className="mt-8 rounded-foto bg-nude p-5" aria-label="Andamento do pedido">
        {passos.map((p, i) => (
          <li key={p.titulo} className="relative flex gap-4 pb-5 last:pb-0">
            {i < passos.length - 1 && <span aria-hidden="true" className={`absolute left-[13px] top-7 h-[calc(100%-1.5rem)] w-0.5 ${p.feito ? "bg-cacau" : "bg-nude-2"}`} />}
            <span
              className={`relative grid size-7 shrink-0 place-items-center rounded-full ${
                p.feito ? "bg-cacau text-cacau-fg" : "atual" in p && p.atual ? "border-2 border-champanhe bg-po" : "border-2 border-nude-2 bg-po"
              }`}
            >
              {p.feito && <Icone nome="check" className="size-4" />}
              {"atual" in p && p.atual && <span className="size-2.5 animate-pulse rounded-full bg-champanhe" />}
            </span>
            <span className="pt-0.5">
              <span className={`block text-sm ${p.feito || ("atual" in p && p.atual) ? "font-semibold" : "text-terra"}`}>
                {p.titulo}
                {"atual" in p && p.atual && <span className="sr-only"> (etapa atual)</span>}
              </span>
              {"detalhe" in p && p.detalhe && <span className="block text-xs text-terra">{p.detalhe}</span>}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-4">
        <ConviteInstalar />
      </div>
    </TelaFluxo>
  );
}
