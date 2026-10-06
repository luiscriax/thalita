"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PaginaCliente } from "@/components/cliente/partes";
import { Folha } from "@/components/ui/folha";
import { Icone } from "@/components/ui/icones";
import { Interruptor } from "@/components/ui/interruptor";
import { Aviso, Botao, Campo } from "@/components/ui/marca";
import { LOOKS_SALVOS } from "@/lib/data/mock/clientes";
import { useJornada } from "@/lib/jornada/jornada";

const PALAVRA = "apagar";

export default function Privacidade() {
  const router = useRouter();
  const { limpar } = useJornada();
  const [fotos, setFotos] = useState(LOOKS_SALVOS.length);
  const [verSimulacao, setVerSimulacao] = useState(true);
  const [folha, setFolha] = useState<"fotos" | "conta" | null>(null);
  const [digitado, setDigitado] = useState("");
  const [exportando, setExportando] = useState<"nao" | "pedido">("nao");

  return (
    <PaginaCliente titulo="Privacidade e dados" voltarPara="/conta">
      <section aria-labelledby="fotos">
        <h2 id="fotos" className="mb-2 px-1 text-sm font-medium text-terra">Fotos e simulações</h2>
        <div className="rounded-foto bg-nude/60 p-4">
          <p className="font-medium">{fotos === 0 ? "Nenhuma foto guardada" : `${fotos} simulações guardadas`}</p>
          <p className="mt-1 text-sm text-terra">Sem reserva, apagam sozinhas em 7 dias. Com reserva, até 30 dias depois da make.</p>
          {fotos > 0 && (
            <div className="mt-3 max-w-64">
              <Botao variante="secundario" onClick={() => setFolha("fotos")}><Icone nome="lixeira" className="size-4" />Apagar todas agora</Botao>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="autorizacoes" className="mt-6">
        <h2 id="autorizacoes" className="mb-2 px-1 text-sm font-medium text-terra">Autorizações</h2>
        <div className="divide-y divide-nude-2 overflow-hidden rounded-foto bg-nude/60">
          <Interruptor titulo="A Thalita pode ver minhas simulações" descricao="Só para preparar a sua make. Você pode tirar quando quiser." ligado={verSimulacao} aoMudar={setVerSimulacao} />
          <div className="flex min-h-14 items-center gap-4 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">Uso em divulgação</p>
              <p className="text-sm text-terra">Não autorizado. Fotos suas só vão para o Instagram com uma autorização separada, pedida pela Thalita.</p>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="seus-dados" className="mt-6">
        <h2 id="seus-dados" className="mb-2 px-1 text-sm font-medium text-terra">Seus dados</h2>
        <div className="space-y-3 rounded-foto bg-nude/60 p-4">
          {exportando === "pedido" ? (
            <Aviso tom="sucesso" titulo="Pedido recebido">Enviamos um arquivo com os seus dados para o seu e-mail em até 15 dias.</Aviso>
          ) : (
            <>
              <p className="text-sm text-terra">Receba uma cópia de tudo o que guardamos sobre você: cadastro, reservas e autorizações.</p>
              <div className="max-w-64"><Botao variante="secundario" onClick={() => setExportando("pedido")}><Icone nome="baixar" className="size-4" />Pedir meus dados</Botao></div>
            </>
          )}
        </div>
      </section>

      <section aria-labelledby="apagar" className="mt-6">
        <h2 id="apagar" className="mb-2 px-1 text-sm font-medium text-terra">Apagar conta</h2>
        <div className="rounded-foto border border-erro/30 p-4">
          <p className="text-sm text-terra">Apaga cadastro, fotos e simulações. Reservas já pagas ficam guardadas pelo tempo que a lei exige.</p>
          <div className="mt-3 max-w-64">
            <Botao variante="secundario" className="!border-erro/50 !text-erro" onClick={() => { setDigitado(""); setFolha("conta"); }}>Apagar minha conta</Botao>
          </div>
        </div>
      </section>

      <p className="mt-6 text-sm text-terra">
        Detalhes em <Link href="/privacidade" className="underline underline-offset-4">Política de privacidade</Link> e{" "}
        <Link href="/sua-foto" className="underline underline-offset-4">Como cuidamos da sua foto</Link>.
      </p>

      <Folha aberta={folha === "fotos"} aoFechar={() => setFolha(null)} titulo="Apagar todas as fotos?">
        <p className="text-sm text-terra">As {fotos} simulações e a foto original são apagadas de vez. Se tiver uma reserva, a Thalita recebe só o estilo escolhido.</p>
        <div className="mt-5 space-y-2">
          <Botao className="!bg-erro !text-[#f6ece6]" onClick={() => { setFotos(0); setFolha(null); }}>Apagar fotos</Botao>
          <Botao variante="texto" onClick={() => setFolha(null)}>Manter</Botao>
        </div>
      </Folha>

      <Folha aberta={folha === "conta"} aoFechar={() => setFolha(null)} titulo="Apagar sua conta?">
        <p className="text-sm text-terra">Isso não dá para desfazer. Reservas futuras são canceladas, seguindo a regra de devolução do sinal.</p>
        <div className="mt-4">
          <Campo id="confirmar-apagar" rotulo={`Para confirmar, digite ${PALAVRA}`} autoComplete="off" value={digitado} onChange={(e) => setDigitado(e.target.value)} />
        </div>
        <div className="mt-5 space-y-2">
          <Botao disabled={digitado.trim().toLowerCase() !== PALAVRA} className="!bg-erro !text-[#f6ece6]" onClick={() => { limpar(); router.push("/"); }}>Apagar conta</Botao>
          <Botao variante="texto" onClick={() => setFolha(null)}>Voltar</Botao>
        </div>
      </Folha>
    </PaginaCliente>
  );
}
