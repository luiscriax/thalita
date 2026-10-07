// Gera dist/artefato/index.html: a mesma página, sem o "esqueleto" (doctype/html/head/body),
// no formato que o visualizador de Artifacts do Claude espera. Os outros arquivos (js, vendor,
// modelos) são publicados ao lado, com os mesmos caminhos relativos.
import { readFile, writeFile, mkdir } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const cabeca = html.match(/<head>([\s\S]*?)<\/head>/)[1];
const corpo = html.match(/<body>([\s\S]*?)<\/body>/)[1];
const manter = (re) => (cabeca.match(re) ?? []).join("\n");
const saida = [
  manter(/<title>[\s\S]*?<\/title>/g),
  manter(/<link rel="(?:preconnect|stylesheet)"[^>]*>/g),
  manter(/<style>[\s\S]*?<\/style>/g),
  corpo.trim(),
].join("\n");
await mkdir(new URL("../dist/artefato/", import.meta.url), { recursive: true });
await writeFile(new URL("../dist/artefato/index.html", import.meta.url), saida);
console.log(`dist/artefato/index.html (${(saida.length / 1024).toFixed(1)} KB)`);
