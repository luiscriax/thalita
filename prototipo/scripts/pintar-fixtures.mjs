// Pinta makes CONHECIDAS (com o nosso pintor, no Chromium) sobre as fotos de teste e salva os pixels
// em testes/fixtures/maquiadas/. Servem para conferir se "copiar make de uma foto" (referencia.js)
// recupera as cores certas: a resposta certa é o próprio estado usado para pintar.
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { servir } from "./servir.mjs";

export const MAKES_TESTE = {
  "boca-vermelha": { batom: { cor: "#B0182A", intensidade: 0.85, acabamento: "matte" } },
  "olho-esfumado": {
    sombra: { cor: "#8A5A3C", cores: ["#E6CBA6", "#8A5A3C", "#3E2418"], intensidade: 0.8, acabamento: "matte", estilo: "esfumado" },
    delineado: { cor: "#151213", intensidade: 0.9, estilo: "gatinho" },
    mascara: { cor: "#141012", intensidade: 0.8 },
    blush: { cor: "#D9837A", intensidade: 0.5 },
    batom: { cor: "#B87A6E", intensidade: 0.6, acabamento: "acetinado" },
  },
  glam: {
    sombra: { cor: "#6B3A7A", cores: ["#D8C3DE", "#6B3A7A", "#3A1C45"], intensidade: 0.75, acabamento: "matte", estilo: "esfumado" },
    blush: { cor: "#E07A86", intensidade: 0.55 },
    contorno: { cor: "#7A5040", intensidade: 0.6 },
    iluminador: { cor: "#F3E0C0", intensidade: 0.7, acabamento: "cintilante" },
    batom: { cor: "#8C2A3C", intensidade: 0.85, acabamento: "matte" },
  },
};
const FOTOS = ["rosto-frontal", "portrait", "rosto-luz-quente"];

const porta = 4198;
const servidor = await servir(porta);
const nav = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const pagina = await nav.newPage();
pagina.on("console", (m) => m.type() === "error" && !/XNNPACK/.test(m.text()) && console.error("[navegador]", m.text()));
await pagina.goto(`http://localhost:${porta}/testes/harness.html`);
await pagina.waitForFunction(() => window.pronto);
await mkdir("testes/fixtures/maquiadas", { recursive: true });
for (const foto of FOTOS) {
  const ext = foto === "portrait" ? "jpg" : "png";
  for (const [nome, estado] of Object.entries(MAKES_TESTE)) {
    const r = await pagina.evaluate(async ({ url, estado }) => {
      const { criarPintor } = await import("/js/pintura.js");
      const d = await window.detectarUrl(url);
      const img = new Image(); img.src = url; await img.decode();
      const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
      criarPintor(c).desenhar(img, d.pontos, estado);
      const px = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      const rgb = new Array((px.length / 4) * 3);
      for (let i = 0, j = 0; i < px.length; i += 4) { rgb[j++] = px[i]; rgb[j++] = px[i + 1]; rgb[j++] = px[i + 2]; }
      // os pontos são relidos na foto pintada (como aconteceria com uma referência de verdade)
      const c2 = document.createElement("canvas"); c2.width = c.width; c2.height = c.height; c2.getContext("2d").drawImage(c, 0, 0);
      const url2 = c2.toDataURL("image/png");
      const d2 = await window.detectarUrl(url2);
      return { rgb, largura: c.width, altura: c.height, deteccao: d2, png: url2 };
    }, { url: `/testes/fixtures/fotos/${foto}.${ext}`, estado });
    const base = `testes/fixtures/maquiadas/${foto}__${nome}`;
    await writeFile(`${base}.rgb`, Buffer.from(Uint8Array.from(r.rgb)));
    await writeFile(`${base}.png`, Buffer.from(r.png.split(",")[1], "base64"));
    await writeFile(`${base}.json`, JSON.stringify({ largura: r.largura, altura: r.altura, estado, deteccao: r.deteccao }));
    console.log(`${base}: ${r.largura}×${r.altura}, ${r.deteccao.pontos.length} pontos`);
  }
}
await nav.close();
servidor.close();
