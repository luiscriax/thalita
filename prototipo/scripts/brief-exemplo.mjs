// Abre o face chart de exemplo (gerado por `node --test testes/unit/brief.test.mjs`) num navegador de
// verdade, confere se o SVG é válido para o parser do navegador e salva um PNG para olhar.
//   node scripts/brief-exemplo.mjs   → testes/resultados/brief-exemplo.png
import { chromium } from "@playwright/test";
import { existsSync } from "node:fs";
import { servir } from "./servir.mjs";

const PORTA = 4304;
const RAIZ = new URL("..", import.meta.url).pathname;
if (!existsSync(`${RAIZ}testes/resultados/brief-exemplo.svg`)) {
  console.error("Falta testes/resultados/brief-exemplo.svg: rode antes `node --test testes/unit/brief.test.mjs`.");
  process.exit(1);
}
const servidor = await servir(PORTA);
const nav = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
  const pagina = await nav.newPage({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
  await pagina.goto(`http://localhost:${PORTA}/testes/resultados/brief-exemplo.svg`);
  const info = await pagina.evaluate(async () => {
    const texto = await (await fetch(location.href)).text();
    const doc = new DOMParser().parseFromString(texto, "image/svg+xml");
    const svg = document.querySelector("svg");
    const caixa = svg.getBBox();
    return {
      erro: doc.querySelector("parsererror")?.textContent ?? null,
      titulo: doc.querySelector("title")?.textContent,
      elementos: doc.querySelectorAll("*").length,
      caixa: { w: Math.round(caixa.width), h: Math.round(caixa.height) },
      viewBox: svg.getAttribute("viewBox"),
    };
  });
  if (info.erro) throw new Error(`SVG inválido: ${info.erro}`);
  await pagina.locator("svg").screenshot({ path: `${RAIZ}testes/resultados/brief-exemplo.png` });
  console.log(`ok: ${info.titulo} · ${info.elementos} elementos · viewBox ${info.viewBox} · desenho ${info.caixa.w}×${info.caixa.h}`);
  console.log("PNG em testes/resultados/brief-exemplo.png");
} finally {
  await nav.close();
  servidor.close();
}
