"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CarregandoLista, Esqueleto, Estado, FaixaConexao } from "@/components/ui/estados";
import { Icone } from "@/components/ui/icones";

/** Vitrine de todos os estados do app (vazio, carregando, erros e bloqueios), para revisão de design. */
function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="text-lg font-semibold">{titulo}</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

function Tela({ nome, children }: { nome: string; children: ReactNode }) {
  return (
    <figure className="rounded-foto border border-nude-2 bg-po p-4">
      <figcaption className="mb-1 text-xs text-terra">{nome}</figcaption>
      {children}
    </figure>
  );
}

export default function Estados() {
  return (
    <main className="mx-auto max-w-6xl px-5 pb-16 pt-8 md:px-8">
      <Link href="/design" className="-ml-2 inline-flex min-h-11 items-center gap-1 pr-3 text-sm text-terra"><Icone nome="voltar" className="size-5" />Design system</Link>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Estados</h1>
      <p className="mt-1 text-sm text-terra">Cada mensagem diz o que houve e qual é o próximo passo. Nenhuma pede desculpas nem culpa a cliente.</p>

      <Grupo titulo="Base">
        <Tela nome="Carregando lista"><CarregandoLista linhas={2} /></Tela>
        <Tela nome="Carregando foto">
          <div role="status" aria-label="Carregando foto" className="space-y-3">
            <Esqueleto className="aspect-[4/5] w-full !rounded-foto" />
            <Esqueleto className="h-4 w-1/2" />
          </div>
        </Tela>
        <Tela nome="Vazio">
          <Estado icone="looks" titulo="Nenhuma make guardada" texto="Teste um estilo em você. Ele fica aqui por 7 dias." acoes={[{ rotulo: "Testar uma make", href: "/momento" }]} />
        </Tela>
        <Tela nome="Sem internet e conexão de volta">
          <div className="space-y-2 py-4">
            <FaixaConexao online={false} fixa={false} />
            <FaixaConexao online fixa={false} />
          </div>
        </Tela>
      </Grupo>

      <Grupo titulo="Foto da cliente">
        <Tela nome="Sem rosto"><Estado icone="rosto" tom="alerta" titulo="Não encontramos um rosto na foto" texto="Tente de frente, com o rosto todo aparecendo e sem óculos escuros. Essa tentativa não conta no seu limite." acoes={[{ rotulo: "Tirar outra foto" }, { rotulo: "Escolher da galeria", secundaria: true }]} /></Tela>
        <Tela nome="Vários rostos"><Estado icone="usuario" tom="alerta" titulo="Tem mais de uma pessoa na foto" texto="Envie uma foto só sua, ou recorte antes de enviar. Essa tentativa não conta no seu limite." acoes={[{ rotulo: "Escolher outra foto" }]} /></Tela>
        <Tela nome="Pouca luz"><Estado icone="sol" tom="alerta" titulo="A foto ficou escura" texto="Fique de frente para uma janela ou acenda a luz. Com luz no rosto, a simulação fica bem mais fiel." acoes={[{ rotulo: "Tirar outra foto" }, { rotulo: "Usar essa mesmo", secundaria: true }]} /></Tela>
        <Tela nome="Formato não aceito"><Estado icone="info" tom="erro" titulo="Esse arquivo não é uma foto aceita" texto="Use JPG, PNG, WebP ou HEIC. Vídeos e PDFs não funcionam aqui." acoes={[{ rotulo: "Escolher outra" }]} /></Tela>
        <Tela nome="Arquivo grande"><Estado icone="info" tom="erro" titulo="A foto passa de 10 MB" texto="Escolha outra ou tire um print dela e envie o print." acoes={[{ rotulo: "Escolher outra" }]} /></Tela>
      </Grupo>

      <Grupo titulo="Simulação com IA">
        <Tela nome="Demorando (mais de 20 s)"><Estado icone="relogio" titulo="Está levando mais que o normal" texto="A simulação ainda está sendo criada. Você pode esperar aqui ou sair: avisamos quando ficar pronta." acoes={[{ rotulo: "Continuar esperando" }, { rotulo: "Me avise quando ficar pronta", secundaria: true }]} /></Tela>
        <Tela nome="Erro ao gerar"><Estado icone="info" tom="erro" titulo="A simulação não saiu" texto="Foi uma falha do nosso lado, não da sua foto. Sua escolha está guardada e essa tentativa não conta." acoes={[{ rotulo: "Tentar de novo" }]} /></Tela>
        <Tela nome="Fim do teste grátis (sem conta)"><Estado icone="estrela" tom="sucesso" titulo="Gostou? Continue testando" texto="O teste grátis é uma simulação. Entrando com o seu e-mail, você testa até 5 por dia e guarda as suas makes." acoes={[{ rotulo: "Entrar e continuar" }, { rotulo: "Agendar com essa make", secundaria: true }]} /></Tela>
        <Tela nome="Limite do dia (com conta)"><Estado icone="calendario" titulo="Você já fez as 5 simulações de hoje" texto="Amanhã libera mais. Enquanto isso, dá para agendar com as makes que você já testou." acoes={[{ rotulo: "Ver minhas makes", href: "/makes" }]} /></Tela>
        <Tela nome="Teto do mês atingido"><Estado icone="pausa" titulo="As simulações estão pausadas" texto="Você ainda pode escolher pela foto de inspiração e agendar normalmente. A Thalita prepara a make com você no dia." acoes={[{ rotulo: "Escolher sem simular" }]} /></Tela>
        <Tela nome="Pedido fora da maquiagem"><Estado icone="pincel" tom="alerta" titulo="Esse ajuste não é de maquiagem" texto="A simulação muda só a make: rosto, corpo, idade e cabelo continuam os seus. Tente algo como “olho mais leve” ou “boca mais escura”." acoes={[{ rotulo: "Escrever outro pedido" }]} /></Tela>
      </Grupo>

      <Grupo titulo="Agenda, sinal e acesso">
        <Tela nome="Horário acabou de ser ocupado"><Estado icone="calendario" tom="alerta" titulo="Esse horário acabou de ser reservado" texto="Outra cliente confirmou antes. Os horários livres mais próximos nesse dia são 15h e 16h30." acoes={[{ rotulo: "Ver horários livres" }]} /></Tela>
        <Tela nome="Sinal expirado"><Estado icone="relogio" tom="erro" titulo="O prazo do sinal acabou" texto="O horário foi liberado na agenda. Se ainda estiver livre, você pode pedir de novo em um toque." acoes={[{ rotulo: "Pedir de novo" }]} /></Tela>
        <Tela nome="Link de acesso vencido"><Estado icone="escudo" tom="alerta" titulo="Esse link de acesso venceu" texto="Por segurança, cada link vale 15 minutos e só pode ser usado uma vez. Enviamos um novo para o seu e-mail." acoes={[{ rotulo: "Enviar novo link" }]} /></Tela>
        <Tela nome="CEP fora da área"><Estado icone="local" tom="alerta" titulo="Esse endereço fica fora da área padrão" texto="Seu pedido vira um orçamento: a Thalita responde com o valor do deslocamento antes de qualquer pagamento." acoes={[{ rotulo: "Pedir orçamento" }, { rotulo: "Fazer no espaço da Thalita", secundaria: true }]} /></Tela>
      </Grupo>
    </main>
  );
}
