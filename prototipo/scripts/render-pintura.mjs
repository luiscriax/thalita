// Teste visual do motor de pintura: renderiza fotos de teste com vários estados de make no
// Chromium (sem GPU) e salva PNGs (inteiros + recortes ampliados de boca e olho) em
// testes/resultados/pintura/. Também mede o tempo por quadro a 720p.
//   node scripts/render-pintura.mjs            (tudo)
//   node scripts/render-pintura.mjs --so-tempo (só a medição de tempo)
import { chromium } from "@playwright/test";
import { readFile, writeFile, mkdir, access } from "node:fs/promises";
import { servir } from "./servir.mjs";
import { ESTADOS } from "../testes/pintura-estados.mjs";
import { LABIOS_EXTERNO, OLHO_DIREITO, SOBRANCELHA_DIREITA, OLHO_ESQUERDO, SOBRANCELHA_ESQUERDA } from "../js/regioes.js";

const PORTA = 4303;
const SAIDA = "testes/resultados/pintura";
const FOTOS = [
  ["rosto-frontal", "png"],
  ["portrait", "jpg"],
  ["business-person", "png"],
];

function caixa(pontos, indices, margemX, margemY) {
  const ps = indices.map((i) => pontos[i]);
  const x0 = Math.min(...ps.map((p) => p.x)), x1 = Math.max(...ps.map((p) => p.x));
  const y0 = Math.min(...ps.map((p) => p.y)), y1 = Math.max(...ps.map((p) => p.y));
  const w = x1 - x0, h = y1 - y0;
  const x = Math.max(0, x0 - w * margemX), y = Math.max(0, y0 - h * margemY);
  return { x, y, w: Math.min(1 - x, w * (1 + 2 * margemX)), h: Math.min(1 - y, h * (1 + 2 * margemY)) };
}

const salvar = (arq, dataUrl) => writeFile(arq, Buffer.from(dataUrl.split(",")[1], "base64"));

const soTempo = process.argv.includes("--so-tempo");
const mapa = process.argv.includes("--mapa");
try { await access("testes/fixtures/pontos"); } catch { console.error("Sem fixtures: rode npm run fixtures"); process.exit(1); }
await mkdir(SAIDA, { recursive: true });
const servidor = await servir(PORTA);
const nav = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const pagina = await nav.newPage({ viewport: { width: 1400, height: 1000 } });
pagina.on("console", (m) => ["error", "warning"].includes(m.type()) && console.error("[navegador]", m.text()));
pagina.on("pageerror", (e) => console.error("[erro na página]", e.message));
await pagina.goto(`http://localhost:${PORTA}/testes/pintura.html`);
await pagina.waitForFunction(() => window.pronto);

try {
  if (mapa) {
    const d = JSON.parse(await readFile("testes/fixtures/pontos/rosto-frontal.json", "utf8"));
    const todos = Array.from({ length: 468 }, (_, i) => i);
    for (const [nome, r] of Object.entries({
      bochecha: { x: 0.18, y: 0.38, w: 0.34, h: 0.4 },
      olho: { x: 0.25, y: 0.36, w: 0.2, h: 0.14 },
      boca: { x: 0.34, y: 0.66, w: 0.32, h: 0.15 },
    })) {
      const sel = todos.filter((i) => { const p = d.pontos[i]; return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; });
      await salvar(`${SAIDA}/mapa-${nome}.png`, await pagina.evaluate(([u, p, s, rr]) => window.mapa(u, p, s, rr), [`/testes/fixtures/fotos/rosto-frontal.png`, d.pontos, sel, r]));
    }
  }
  if (!soTempo && !mapa) {
    for (const [foto, ext] of FOTOS) {
      const d = JSON.parse(await readFile(`testes/fixtures/pontos/${foto}.json`, "utf8"));
      if (!d.pontos.length) { console.log(`${foto}: sem rosto, pulando`); continue; }
      const recortes = {
        boca: caixa(d.pontos, LABIOS_EXTERNO, 0.35, 0.7),
        olho: caixa(d.pontos, [...OLHO_DIREITO.contorno, ...SOBRANCELHA_DIREITA.superior], 0.35, 0.3),
        olhos: caixa(d.pontos, [...OLHO_DIREITO.contorno, ...SOBRANCELHA_DIREITA.superior, ...OLHO_ESQUERDO.contorno, ...SOBRANCELHA_ESQUERDA.superior], 0.12, 0.35),
      };
      for (const [nome, estado] of Object.entries(ESTADOS)) {
        const t0 = Date.now();
        const r = await pagina.evaluate(([u, p, e, rc]) => window.renderizar(u, p, e, {}, rc), [`/testes/fixtures/fotos/${foto}.${ext}`, d.pontos, estado, recortes]);
        await salvar(`${SAIDA}/${foto}--${nome}.png`, r.png);
        for (const [rn, png] of Object.entries(r.recortes)) await salvar(`${SAIDA}/${foto}--${nome}--${rn}.png`, png);
        console.log(`${foto} / ${nome}: ${r.largura}x${r.altura} (${Date.now() - t0} ms com PNG)`);
      }
      const z = await pagina.evaluate(([u, p, e]) => window.diferencaDaFoto(u, p, e), [`/testes/fixtures/fotos/${foto}.${ext}`, d.pontos, ESTADOS["intensidade-zero"]]);
      console.log(`${foto} / intensidade 0: diferença máx ${z.max}, média ${z.media.toFixed(4)}`);
      // espelhado (selfie): pontos e imagem juntos
      const esp = await pagina.evaluate(([u, p, e]) => window.renderizar(u, p, e, { espelhar: true }), [`/testes/fixtures/fotos/${foto}.${ext}`, d.pontos, ESTADOS["soft-glam"]]);
      await salvar(`${SAIDA}/${foto}--soft-glam-espelhado.png`, esp.png);
      const pts = await pagina.evaluate(([u, p]) => window.renderizar(u, p, {}, { mostrarPontos: true }), [`/testes/fixtures/fotos/${foto}.${ext}`, d.pontos]);
      await salvar(`${SAIDA}/${foto}--pontos.png`, pts.png);
    }
  }
  if (!mapa) {
    const d = JSON.parse(await readFile("testes/fixtures/pontos/rosto-frontal.json", "utf8"));
    for (const nome of ["batom-vermelho-matte", "soft-glam", "glam-noite-glitter"]) {
      const t = await pagina.evaluate(([u, p, e]) => window.medirTempo(u, p, e, 60, true), ["/testes/fixtures/fotos/rosto-frontal.png", d.pontos, ESTADOS[nome]]);
      console.log(`tempo 720p (${t.largura}x${t.altura}) ${nome}: média ${t.media.toFixed(1)} ms, mediana ${t.mediana.toFixed(1)} ms, p90 ${t.p90.toFixed(1)} ms`);
    }
    const t0 = await pagina.evaluate(([u, p]) => window.medirTempo(u, p, {}, 60, true), ["/testes/fixtures/fotos/rosto-frontal.png", d.pontos]);
    console.log(`tempo 720p só a foto: média ${t0.media.toFixed(1)} ms`);
  }
} finally {
  await nav.close();
  servidor.close();
}
