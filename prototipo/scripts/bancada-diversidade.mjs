// Bancada de diversidade: pontos do rosto em fotos variadas + makes de época em vários tons de pele.
// A) Para cada foto de testes/fixtures/bancada/diversos: acha o rosto? quantos? quanto tempo? Desenha os
//    contornos (olhos, sobrancelhas, boca, rosto) numa folha para conferir no olho se os pontos caem no lugar.
// B) Para cada rosto adulto escolhido × cada make de época (js/epocas.js): pinta a make (gabarito conhecido),
//    lê de volta com referencia.js e compara: o que foi achado e se a reprodução fica da mesma cor (ida e volta).
// Saída: testes/resultados/diversidade/relatorio-<rotulo>.json e folhas .jpg. Uso: node scripts/bancada-diversidade.mjs [rotulo]
import { chromium } from "@playwright/test";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { servir } from "./servir.mjs";

const rotulo = process.argv[2] ?? "rodada";
const G = JSON.parse(await readFile("testes/diversidade-gabarito.json", "utf8"));
const fotos = (await readdir("testes/fixtures/bancada/diversos")).filter((f) => /\.(jpe?g|png)$/i.test(f)).sort();
const porta = 4195;
const servidor = await servir(porta);
const nav = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const pagina = await nav.newPage();
await pagina.goto(`http://localhost:${porta}/testes/harness.html`);
await pagina.waitForFunction(() => window.pronto);
await mkdir("testes/resultados/diversidade", { recursive: true });

const r = await pagina.evaluate(async ({ fotos, G }) => {
  const { carregarDetector, detectarFoto } = await import("/js/rosto.js");
  const { lerMakeDaFoto, diferencaCor } = await import("/js/referencia.js");
  const { criarAmostrador, medir } = await import("/js/medidas.js");
  const { criarPintor } = await import("/js/pintura.js");
  const { MAKES_EPOCAS } = await import("/js/epocas.js");
  const { OVAL, LABIOS_EXTERNO, OLHO_DIREITO, OLHO_ESQUERDO, SOBRANCELHA_DIREITA, SOBRANCELHA_ESQUERDA } = await import("/js/regioes.js");
  await carregarDetector();
  const carregar = async (url) => { const i = new Image(); i.src = url; await i.decode(); return i; };
  const amostra = (fonte, w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(fonte, 0, 0, w, h); return criarAmostrador({ dados: x.getImageData(0, 0, w, h).data, largura: w, altura: h, canais: 4 }); };

  // ── A: pontos do rosto ──
  const A = [];
  const T = 160, cols = 10;
  const folha = document.createElement("canvas"); folha.width = cols * T; folha.height = Math.ceil(fotos.length / cols) * (T + 14);
  const fx = folha.getContext("2d"); fx.fillStyle = "#fff"; fx.fillRect(0, 0, folha.width, folha.height); fx.font = "11px sans-serif";
  for (const [i, f] of fotos.entries()) {
    const img = await carregar(`/testes/fixtures/bancada/diversos/${f}`);
    const t0 = performance.now();
    const d = await detectarFoto(img);
    const ms = performance.now() - t0;
    let monk = null, qualidade = null;
    if (d.pontos.length) { try { const m = medir(d, amostra(img, d.largura, d.altura)); monk = m.pele.monk.n; qualidade = m.qualidade.aprovada; } catch { /* nada */ } }
    A.push({ i, arquivo: f, rostos: d.rostos, achou: d.pontos.length > 0, ms: Math.round(ms), monk, qualidade });
    // miniatura com os contornos
    const k = Math.min(T / img.naturalWidth, T / img.naturalHeight), w = img.naturalWidth * k, h = img.naturalHeight * k;
    const x0 = (i % cols) * T, y0 = Math.floor(i / cols) * (T + 14);
    fx.drawImage(img, x0, y0, w, h);
    if (d.pontos.length) {
      const P = (j) => [x0 + d.pontos[j].x * w, y0 + d.pontos[j].y * h];
      const linha = (ids, cor, fechar = true) => { fx.strokeStyle = cor; fx.lineWidth = 1; fx.beginPath(); ids.forEach((j, n) => (n ? fx.lineTo(...P(j)) : fx.moveTo(...P(j)))); if (fechar) fx.closePath(); fx.stroke(); };
      linha(OVAL, "#D6B588"); linha(LABIOS_EXTERNO, "#ff3b6b"); linha(OLHO_DIREITO.contorno, "#3bd1ff"); linha(OLHO_ESQUERDO.contorno, "#3bd1ff");
      linha(SOBRANCELHA_DIREITA.superior, "#7cff6b", false); linha(SOBRANCELHA_ESQUERDA.superior, "#7cff6b", false);
    }
    fx.fillStyle = d.pontos.length ? "#000" : "#c00"; fx.fillText(`${String(i).padStart(3, "0")} ${d.pontos.length ? `${d.rostos}r ${Math.round(ms)}ms` : "SEM ROSTO"}`, x0 + 2, y0 + T + 11);
  }
  const folhaA = folha.toDataURL("image/jpeg", 0.8);

  // ── B: épocas × rostos ──
  const B = [];
  const quadros = [];
  for (const rosto of G.rostosParaMake) {
    const img = await carregar(`/testes/fixtures/bancada/${rosto.arquivo}`);
    const d = await detectarFoto(img);
    if (!d.pontos.length) { B.push({ rosto: rosto.id, erro: "sem rosto" }); continue; }
    const linhaQuadro = [];
    for (const ep of MAKES_EPOCAS) {
      const c = document.createElement("canvas"); c.width = d.largura; c.height = d.altura;
      const t0 = performance.now();
      criarPintor(c).desenhar(img, d.pontos, ep.estado);
      const msPintar = performance.now() - t0;
      const d2 = await detectarFoto(c); // a foto pintada vira a referência
      const diag = {}; const t1 = performance.now();
      const lido = lerMakeDaFoto(d2, amostra(c, c.width, c.height), { diagnostico: diag });
      const msLer = performance.now() - t1;
      // ida e volta: pinta o que foi lido no rosto limpo e compara as regiões com a referência
      const c2 = document.createElement("canvas"); c2.width = d.largura; c2.height = d.altura;
      criarPintor(c2).desenhar(img, d.pontos, lido.estado);
      const diag2 = {}; lerMakeDaFoto(d, amostra(c2, c2.width, c2.height), { diagnostico: diag2 });
      const regs = {};
      for (const k of ["batom", "sombra", "blush", "iluminador"]) if (diag.regioes?.[k] && diag2.regioes?.[k]) regs[k] = Math.round(diferencaCor(diag.regioes[k], diag2.regioes[k]) * 10) / 10;
      const presenca = {};
      for (const k of ["sombra", "blush", "iluminador", "delineado", "batom"]) presenca[k] = { tem: !!ep.estado[k], achou: !!lido.estado[k] };
      if (ep.estado.delineado) presenca.delineado.gatinho = ep.estado.delineado.estilo === "gatinho";
      B.push({ rosto: rosto.id, tom: rosto.tom, epoca: ep.id, presenca, idaEVolta: regs, ms: { pintar: Math.round(msPintar), ler: Math.round(msLer) } });
      linhaQuadro.push(c, c2);
    }
    // quadro do rosto: limpo | (época: referência pintada, reprodução lida) × 7
    const H = 150, w = Math.round(d.largura * H / d.altura);
    const q = document.createElement("canvas"); q.width = w * (1 + linhaQuadro.length) + 4 * linhaQuadro.length; q.height = H;
    const qx = q.getContext("2d"); qx.fillStyle = "#1b1311"; qx.fillRect(0, 0, q.width, H);
    qx.drawImage(img, 0, 0, w, H);
    linhaQuadro.forEach((cv, n) => qx.drawImage(cv, (n + 1) * (w + 4), 0, w, H));
    quadros.push({ rosto: rosto.id, url: q.toDataURL("image/jpeg", 0.8) });
  }
  return { A, B, folhaA, quadros };
}, { fotos, G });

// resumo
const med = (v) => { const s = v.filter((x) => x != null).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
const rotulos = G.categorias ?? {};
const porCategoria = Object.fromEntries(Object.entries(rotulos).map(([cat, ids]) => {
  const itens = r.A.filter((a) => ids.includes(String(a.i).padStart(3, "0")));
  return [cat, { achou: `${itens.filter((a) => a.achou).length}/${itens.length}` }];
}));
const presenca = {};
for (const k of ["sombra", "blush", "iluminador", "delineado", "batom"]) {
  const tem = r.B.filter((b) => b.presenca?.[k]?.tem && (k !== "delineado" || b.presenca[k].gatinho));
  const nao = r.B.filter((b) => b.presenca && !b.presenca[k].tem);
  presenca[k] = { achou: `${tem.filter((b) => b.presenca[k].achou).length}/${tem.length}`, inventou: `${nao.filter((b) => b.presenca[k].achou).length}/${nao.length}` };
}
const porTom = {};
for (const b of r.B.filter((x) => x.idaEVolta)) { (porTom[b.tom] ??= []).push(...Object.values(b.idaEVolta)); }
const porEpoca = {};
for (const b of r.B.filter((x) => x.idaEVolta)) { (porEpoca[b.epoca] ??= []).push(...Object.values(b.idaEVolta)); }
const resumo = {
  rotulo, data: new Date().toISOString(),
  pontos: { fotos: r.A.length, comRosto: r.A.filter((a) => a.achou).length, msMediana: med(r.A.map((a) => a.ms)), porCategoria },
  epocas: {
    presenca,
    idaEVoltaMediana: Object.fromEntries(Object.entries(porTom).map(([t, v]) => [t, med(v)])),
    idaEVoltaPorEpoca: Object.fromEntries(Object.entries(porEpoca).map(([t, v]) => [t, med(v)])),
    msLerMediana: med(r.B.map((b) => b.ms?.ler)), msPintarMediana: med(r.B.map((b) => b.ms?.pintar)),
  },
};
await writeFile(`testes/resultados/diversidade/pontos-${rotulo}.jpg`, Buffer.from(r.folhaA.split(",")[1], "base64"));
for (const q of r.quadros) await writeFile(`testes/resultados/diversidade/epocas-${rotulo}-${q.rosto}.jpg`, Buffer.from(q.url.split(",")[1], "base64"));
await writeFile(`testes/resultados/diversidade/relatorio-${rotulo}.json`, JSON.stringify({ resumo, A: r.A, B: r.B }, null, 1));
console.log(JSON.stringify(resumo, null, 1));
await nav.close();
servidor.close();
