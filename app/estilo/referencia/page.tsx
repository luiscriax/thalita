"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState , useEffect} from "react";
import { TelaFluxo } from "@/components/layout/tela-fluxo";
import { CabecalhoFluxo } from "@/components/ui/cabecalho-fluxo";
import { Icone } from "@/components/ui/icones";
import { Aviso, Botao } from "@/components/ui/marca";
import { PedidoAjuste } from "@/components/ui/pedido-ajuste";
import { useJornada } from "@/lib/jornada/jornada";
import { preCarregarDetector } from "@/lib/rosto/detector";

const TIPOS = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const LIMITE_MB = 10;

/** "Minha referência": a cliente traz a foto de uma make que viu (Instagram, Pinterest) para a IA copiar no rosto dela. */
export default function Referencia() {
  // Começa a baixar o detector de rosto enquanto a cliente decide.
  useEffect(() => preCarregarDetector(), []);
  const router = useRouter();
  const { jornada, atualizar } = useJornada();
  const entrada = useRef<HTMLInputElement>(null);
  const [foto, setFoto] = useState<string | null>(jornada.referencia ?? null);
  const [erro, setErro] = useState<string | null>(null);
  const [pedido, setPedido] = useState(jornada.lookId === "referencia" ? (jornada.pedido ?? "") : "");

  function escolher(arquivo?: File) {
    setErro(null);
    if (!arquivo) return;
    if (!TIPOS.includes(arquivo.type)) return setErro("Esse arquivo não é uma imagem aceita. Use JPG, PNG, WebP ou HEIC.");
    if (arquivo.size > LIMITE_MB * 1024 * 1024) return setErro(`A imagem passa de ${LIMITE_MB} MB. Tire um print dela e envie o print.`);
    setFoto(URL.createObjectURL(arquivo));
  }

  function continuar() {
    if (!foto) return;
    atualizar({ lookId: "referencia", referencia: foto, pedido: pedido.trim() || undefined });
    router.push("/ver-em-mim");
  }

  return (
    <TelaFluxo
      cabecalho={<CabecalhoFluxo etapa={2} voltarPara="/estilo" />}
      rodape={
        foto ? (
          <div className="space-y-2">
            <Botao onClick={continuar}>Ver essa make em mim</Botao>
            <Botao variante="texto" onClick={() => entrada.current?.click()}>Trocar a referência</Botao>
          </div>
        ) : (
          <Botao onClick={() => entrada.current?.click()}>Escolher a foto</Botao>
        )
      }
    >
      <h1 className="mt-6 font-display text-2xl font-semibold tracking-tight lg:mt-10 lg:text-3xl">Mostre a make que você quer</h1>
      <p className="mt-2 text-sm text-terra">Um print do Instagram ou do Pinterest serve. A IA lê a maquiagem da foto e aplica no seu rosto, com o seu cabelo e o seu tom de pele.</p>

      <input ref={entrada} type="file" accept={TIPOS.join(",")} className="sr-only" aria-label="Escolher foto de referência" onChange={(e) => escolher(e.target.files?.[0])} />

      {foto ? (
        <div className="mt-5 flex gap-4">
          <span className="relative w-32 shrink-0 overflow-hidden rounded-foto bg-nude-2 sm:w-40">
            {/* eslint-disable-next-line @next/next/no-img-element -- prévia local (object URL) */}
            <img src={foto} alt="Sua foto de referência" className="aspect-[4/5] w-full object-cover" />
            <span className="absolute bottom-2 left-2 rounded-full bg-[#1a110e]/60 px-2 py-0.5 text-[0.6875rem] text-[#f6ece6]">Referência</span>
          </span>
          <div className="min-w-0 self-center text-sm">
            <p className="font-semibold">A IA vai copiar</p>
            <ul className="mt-1 space-y-1 text-terra">
              <li className="flex gap-2"><Icone nome="check" className="mt-0.5 size-4 shrink-0 text-sucesso" />Pele, olhos, boca e intensidade</li>
              <li className="flex gap-2"><Icone nome="check" className="mt-0.5 size-4 shrink-0 text-sucesso" />Cores adaptadas ao seu tom</li>
              <li className="flex gap-2"><Icone nome="check" className="mt-0.5 size-4 shrink-0 text-sucesso" />Seu rosto e seu cabelo continuam seus</li>
            </ul>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          className="mt-5 flex min-h-56 flex-col items-center justify-center gap-3 rounded-foto border-2 border-dashed border-terra/40 bg-nude/50 p-6 text-center"
        >
          <Icone nome="enviar" className="size-9 text-terra" />
          <span className="font-semibold">Toque para escolher a foto</span>
          <span className="text-sm text-terra">De preferência com o rosto de frente e a make bem visível</span>
        </button>
      )}
      {erro && <div className="mt-4"><Aviso tom="erro" titulo="Não deu para usar essa imagem">{erro}</Aviso></div>}

      {foto && (
        <div className="mt-6">
          <PedidoAjuste valor={pedido} aoMudar={setPedido} rotulo="O que você mais gostou nela? (opcional)" />
        </div>
      )}

      <p className="mt-6 text-xs text-terra">
        A referência serve só para ler a maquiagem: não é publicada e é apagada junto com as suas simulações.{" "}
        <Link href="/sua-foto" className="underline underline-offset-4">Como cuidamos das fotos</Link>
      </p>
    </TelaFluxo>
  );
}
