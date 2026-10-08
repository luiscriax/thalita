// Ida e volta do "copiar make de uma foto": para cada foto de referência pintada (fixtures/maquiadas),
// lê a make (referencia.js), pinta o que foi lido na MESMA foto limpa e compara a cor de cada região
// (boca, pálpebra, maçã, topo da maçã) com a referência. É o que a cliente vê: "ficou igual à foto?".
// Uso: node scripts/ida-e-volta.mjs  (precisa de `npm run fixtures`). Imprime JSON com os ΔE.
import { chromium } from "@playwright/test";
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { servir } from "./servir.mjs";

const porta = 4197;
const servidor = await servir(porta);
const nav = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const pagina = await nav.newPage();
await pagina.goto(`http://localhost:${porta}/testes/harness.html`);
await pagina.waitForFunction(() => window.pronto);
const saida = [];
for (const f of (await readdir("testes/fixtures/maquiadas")).filter((f) => f.endsWith(".json")).sort()) {
  const [foto] = f.replace(".json", "").split("__");
  const ext = foto === "portrait" ? "jpg" : "png";
  const r = await pagina.evaluate(async ({ arq, url }) => {
    const { lerMakeDaFoto, diferencaCor } = await import("/js/referencia.js");
    const { criarAmostrador } = await import("/js/medidas.js");
    const { criarPintor } = await import("/js/pintura.js");
    const j = await (await fetch(`/testes/fixtures/maquiadas/${arq}.json`)).json();
    const rgb = new Uint8Array(await (await fetch(`/testes/fixtures/maquiadas/${arq}.rgb`)).arrayBuffer());
    const ref = {}; const lido = lerMakeDaFoto(j.deteccao, criarAmostrador({ dados: rgb, largura: j.largura, altura: j.altura, canais: 3 }), { diagnostico: ref });
    // pinta o que foi lido na foto limpa
    const d = await window.detectarUrl(url);
    const img = new Image(); img.src = url; await img.decode();
    const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
    criarPintor(c).desenhar(img, d.pontos, lido.estado);
    const px = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
    const volta = {}; lerMakeDaFoto(d, criarAmostrador({ dados: px, largura: c.width, altura: c.height, canais: 4 }), { diagnostico: volta });
    const dE = {};
    for (const k of Object.keys(j.estado)) if (ref.regioes?.[k] && volta.regioes?.[k]) dE[k] = Math.round(diferencaCor(ref.regioes[k], volta.regioes[k]) * 10) / 10;
    return { lidos: Object.keys(lido.estado), dE, ref: ref.regioes, volta: volta.regioes };
  }, { arq: f.replace(".json", ""), url: `/testes/fixtures/fotos/${foto}.${ext}` });
  saida.push({ arquivo: f.replace(".json", ""), ...r });
  console.log(f.replace(".json", "").padEnd(36), JSON.stringify(r.dE));
}
await mkdir("testes/resultados", { recursive: true });
await writeFile("testes/resultados/ida-e-volta.json", JSON.stringify(saida, null, 1));
await nav.close();
servidor.close();
