// Servidor estático mínimo para rodar o protótipo e os testes localmente (módulos e wasm exigem http).
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";

const RAIZ = resolve(new URL("..", import.meta.url).pathname);
const TIPOS = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".wasm": "application/wasm",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".svg": "image/svg+xml", ".task": "application/octet-stream", ".y4m": "video/x-yuv4mpeg",
};

export function servir(porta = Number(process.env.PORTA) || 4173) {
  const s = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://x");
      let caminho = normalize(join(RAIZ, decodeURIComponent(url.pathname)));
      if (!caminho.startsWith(RAIZ)) throw new Error("fora da raiz");
      if ((await stat(caminho)).isDirectory()) caminho = join(caminho, "index.html");
      const corpo = await readFile(caminho);
      res.writeHead(200, { "content-type": TIPOS[extname(caminho)] ?? "application/octet-stream", "cache-control": "no-store" });
      res.end(corpo);
    } catch {
      res.writeHead(404).end("não encontrado");
    }
  });
  return new Promise((ok) => s.listen(porta, () => ok(s)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const porta = Number(process.env.PORTA) || 4173;
  await servir(porta);
  console.log(`Protótipo em http://localhost:${porta}/`);
}
