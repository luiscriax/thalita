// Roda o MediaPipe de verdade (Chromium sem tela) em cada foto de teste e salva os 478 pontos
// em testes/fixtures/pontos/<foto>.json — os testes de unidade usam esses pontos reais.
import { chromium } from "@playwright/test";
import { readdir, mkdir, writeFile } from "node:fs/promises";
import { servir } from "./servir.mjs";

const porta = 4199;
const servidor = await servir(porta);
const nav = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const pagina = await nav.newPage();
pagina.on("console", (m) => m.type() === "error" && console.error("[navegador]", m.text()));
await pagina.goto(`http://localhost:${porta}/testes/harness.html`);
await pagina.waitForFunction(() => window.pronto);
await mkdir("testes/fixtures/pontos", { recursive: true });
for (const nome of (await readdir("testes/fixtures/fotos")).sort()) {
  const d = await pagina.evaluate((u) => window.detectarUrl(u), `/testes/fixtures/fotos/${nome}`);
  await writeFile(`testes/fixtures/pontos/${nome.replace(/\.\w+$/, "")}.json`, JSON.stringify(d));
  console.log(`${nome}: ${d.rostos} rosto(s), ${d.pontos.length} pontos, delegate ${d.delegate}`);
}
await nav.close();
servidor.close();
