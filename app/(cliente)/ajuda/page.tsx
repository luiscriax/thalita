import Link from "next/link";
import { PaginaCliente } from "@/components/cliente/partes";
import { Icone } from "@/components/ui/icones";
import { PROFISSIONAL } from "@/lib/data/mock/profissional";

export const metadata = { title: "Perguntas frequentes" };

const PERGUNTAS: { p: string; r: React.ReactNode }[] = [
  { p: "Como funciona o sinal?", r: "Depois que você envia o pedido, paga 30% da make no Pix. O horário só fica seu quando o sinal é confirmado. O restante você paga no dia, direto para a Thalita." },
  { p: "Posso cancelar ou remarcar?", r: "Com 7 dias ou mais de antecedência, o sinal volta para você ou vale para a nova data. Com menos de 7 dias, o sinal fica retido, porque o horário foi reservado só para você." },
  { p: "A Thalita faz penteado?", r: "Não. O serviço é só maquiagem. Na simulação, o seu cabelo continua como está." },
  { p: "A simulação é igual ao resultado final?", r: "É uma ilustração criada com inteligência artificial para você escolher o estilo. A make de verdade é feita na sua pele, com produtos profissionais, e pode ter diferenças de cor e textura." },
  { p: "O que acontece com a minha foto?", r: <>Ela serve só para criar a simulação e preparar a sua make. Sem reserva, é apagada em 7 dias. Veja <Link href="/sua-foto" className="underline underline-offset-4">como cuidamos da sua foto</Link>.</> },
  { p: "Quanto custa o deslocamento?", r: "Em Lins, R$ 30. Cidades vizinhas (até 25 km), R$ 60. Outras cidades, R$ 1,50 por km rodado, ida e volta (Marília fica em torno de R$ 250). Acima de 250 km, a Thalita manda um orçamento antes de qualquer pagamento. O app mostra o valor exato assim que você digita o CEP." },
  { p: "E se a make for para alguém menor de idade?", r: "A pessoa responsável faz o pedido e autoriza o atendimento e o uso da foto para a simulação." },
  { p: "Quanto tempo leva a make?", r: "Cerca de 2h30. Para eventos bem cedo, antes das 7h, há um adicional de R$ 60." },
];

export default function Ajuda() {
  return (
    <PaginaCliente titulo="Perguntas frequentes" voltarPara="/conta">
      <div className="divide-y divide-nude-2 overflow-hidden rounded-foto bg-nude/60">
        {PERGUNTAS.map(({ p, r }) => (
          <details key={p} className="group">
            <summary className="flex min-h-14 cursor-pointer list-none items-center gap-4 px-4 py-3 font-medium [&::-webkit-details-marker]:hidden">
              <span className="flex-1">{p}</span>
              <Icone nome="mais" className="size-5 shrink-0 text-terra transition-transform group-open:rotate-45" />
            </summary>
            <div className="px-4 pb-4 text-sm leading-relaxed text-terra">{r}</div>
          </details>
        ))}
      </div>

      <div className="mt-8 rounded-foto bg-nude p-5 text-center">
        <p className="font-semibold">Não achou o que procurava?</p>
        <p className="mt-1 text-sm text-terra">A Thalita responde pelo WhatsApp.</p>
        <a href={`https://wa.me/${PROFISSIONAL.whatsapp}`} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-full bg-cacau px-6 font-semibold text-cacau-fg">
          <Icone nome="whatsapp" />Falar com a Thalita
        </a>
      </div>
    </PaginaCliente>
  );
}
