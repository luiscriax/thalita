// Bancada de referências: o teste de "copiar make de uma foto" com fotos REAIS de make.
// Para cada referência (testes/bancada-gabarito.json) e cada rosto sem make ("cliente"):
//   1) lê a make da referência (referencia.js)   2) pinta no rosto da cliente (pintura.js)
//   3) compara: a boca ficou da mesma cor? a pálpebra e a maçã ganharam o mesmo efeito sobre a pele?
// Também confere a detecção contra o gabarito anotado à mão (tem sombra? tem blush?).
// Saída: testes/resultados/bancada/relatorio.json e imagens lado a lado (referência | antes | depois).
// Uso: node scripts/bancada.mjs [rotulo]   (precisa das fotos em testes/fixtures/bancada; ver docs)
import { chromium } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { servir } from "./servir.mjs";

const rotulo = process.argv[2] ?? "rodada";
const nClientes = Number(process.argv[3]) || 99; // rodada rápida: menos clientes
const G = JSON.parse(await readFile("testes/bancada-gabarito.json", "utf8"));
const porta = 4196;
const servidor = await servir(porta);
const nav = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const pagina = await nav.newPage();
pagina.on("console", (m) => m.type() === "error" && !/XNNPACK/.test(m.text()) && console.error("[navegador]", m.text()));
await pagina.goto(`http://localhost:${porta}/testes/harness.html`);
await pagina.waitForFunction(() => window.pronto);
await mkdir("testes/resultados/bancada/comparacoes", { recursive: true });

const resultado = await pagina.evaluate(async ({ G, nC }) => {
  const { lerMakeDaFoto } = await import("/js/referencia.js");
  const { criarAmostrador } = await import("/js/medidas.js");
  const { criarPintor } = await import("/js/pintura.js");
  const { hexParaLab, deltaE2000 } = await import("/js/cor.js");
  const carregar = async (url) => { const i = new Image(); i.src = url; await i.decode(); return i; };
  const pixels = (fonte, w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(fonte, 0, 0, w, h); return { c, a: criarAmostrador({ dados: x.getImageData(0, 0, w, h).data, largura: w, altura: h, canais: 4 }) }; };
  const ler = (det, a) => { const diag = {}; const r = lerMakeDaFoto(det, a, { diagnostico: diag }); return { r, diag }; };
  const lab = (h) => (h ? hexParaLab(h) : null);
  const efeito = (reg, pele, comL = false) => { const A = lab(reg), P = lab(pele); return A && P ? { L: comL ? A.L - P.L : 0, a: A.a - P.a, b: A.b - P.b } : null; };
  const dist = (u, v) => (u && v ? Math.hypot(u.L - v.L, u.a - v.a, u.b - v.b) : null);

  // clientes (sem make): detecta uma vez
  const clientes = [];
  for (const c of G.clientes.slice(0, nC)) {
    const img = await carregar(`/testes/fixtures/bancada/sem-make/${c.arquivo}`);
    const det = await window.detectarUrl(img.src);
    const { a } = pixels(img, det.largura, det.altura);
    clientes.push({ ...c, img, det, limpa: ler(det, a) });
  }
  const saida = [];
  for (const ref of G.referencias) {
    const img = await carregar(`/testes/fixtures/bancada/com-make/${ref.arquivo}`);
    const det = await window.detectarUrl(img.src);
    if (!det.pontos.length) { saida.push({ ...ref, semRosto: true }); continue; }
    const { a } = pixels(img, det.largura, det.altura);
    const R = ler(det, a);
    if (!R.r.ok) { saida.push({ ...ref, semRosto: true, aviso: R.r.avisos[0] }); continue; }
    const pares = [];
    let quadro = null;
    for (const [ci, cl] of clientes.entries()) {
      const tela = document.createElement("canvas"); tela.width = cl.det.largura; tela.height = cl.det.altura;
      criarPintor(tela).desenhar(cl.img, cl.det.pontos, R.r.estado);
      const depois = ler(cl.det, pixels(tela, tela.width, tela.height).a);
      const rg = R.diag.regioes ?? {}, dg = depois.diag.regioes ?? {};
      pares.push({
        cliente: cl.id,
        batom: rg.batom && dg.batom ? Math.round(deltaE2000(lab(rg.batom), lab(dg.batom)) * 10) / 10 : null,
        blush: rg.blush && dg.blush ? Math.round(dist(efeito(rg.blush, R.diag.pele, true), efeito(dg.blush, depois.diag.pele, true)) * 10) / 10 : null,
        sombra: rg.sombra && dg.sombra ? Math.round(dist(efeito(rg.sombra, R.diag.pele), efeito(dg.sombra, depois.diag.pele)) * 10) / 10 : null,
        // força do efeito (quanto a região se afastou da pele): referência × cliente pintada × cliente limpa
        forca: Object.fromEntries(["blush", "sombra"].map((k) => {
          const f = (reg, pele) => { const e = efeito(reg, pele, k === "blush"); return e ? Math.round(Math.hypot(e.L, e.a, e.b) * 10) / 10 : null; };
          const v = (reg, pele) => efeito(reg, pele, true);
          return [k, { ref: f(rg[k], R.diag.pele), depois: f(dg[k], depois.diag.pele), antes: f(cl.limpa.diag.regioes?.[k], cl.limpa.diag.pele),
            vRef: v(rg[k], R.diag.pele), vDepois: v(dg[k], depois.diag.pele), vAntes: v(cl.limpa.diag.regioes?.[k], cl.limpa.diag.pele) }];
        })),
      });
      if (ci === 0) {
        // quadro: referência | cliente antes | cliente depois (altura 320)
        const H = 320, w1 = Math.round(img.naturalWidth * H / img.naturalHeight), w2 = Math.round(tela.width * H / tela.height);
        const q = document.createElement("canvas"); q.width = w1 + 2 * w2 + 16; q.height = H; const x = q.getContext("2d");
        x.fillStyle = "#1b1311"; x.fillRect(0, 0, q.width, H);
        x.drawImage(img, 0, 0, w1, H); x.drawImage(cl.img, w1 + 8, 0, w2, H); x.drawImage(tela, w1 + w2 + 16, 0, w2, H);
        quadro = q.toDataURL("image/jpeg", 0.85);
      }
    }
    saida.push({ ...ref, lidos: Object.keys(R.r.estado), estado: R.r.estado, leituras: R.r.leituras.map((l) => ({ c: l.categoria, p: l.presente, cor: l.cor, conf: l.confianca })), diag: R.diag, pares, quadro });
  }
  return saida;
}, { G, nC: nClientes });

// "o que a make acrescentou": na cliente = depois − antes; na referência = referência − região natural média
// (a média das regiões das clientes SEM make, em relação à pele de cada uma). Assim a sarda, o sorriso
// ou a pálpebra funda de cada cliente não contam como erro do motor.
for (const k of ["blush", "sombra"]) {
  const nat = resultado.find((r) => r.pares)?.pares.map((p) => p.forca[k].vAntes).filter(Boolean) ?? [];
  const media = nat.length ? { L: nat.reduce((s, v) => s + v.L, 0) / nat.length, a: nat.reduce((s, v) => s + v.a, 0) / nat.length, b: nat.reduce((s, v) => s + v.b, 0) / nat.length } : { L: 0, a: 0, b: 0 };
  for (const r of resultado) for (const p of r.pares ?? []) {
    const f = p.forca[k];
    if (!f.vRef || !f.vDepois || !f.vAntes) { p[k + "Acrescentado"] = null; continue; }
    const ref = { L: f.vRef.L - media.L, a: f.vRef.a - media.a, b: f.vRef.b - media.b };
    const cli = { L: f.vDepois.L - f.vAntes.L, a: f.vDepois.a - f.vAntes.a, b: f.vDepois.b - f.vAntes.b };
    p[k + "Acrescentado"] = Math.round(Math.hypot(ref.L - cli.L, ref.a - cli.a, ref.b - cli.b) * 10) / 10;
  }
}

// métricas
const med = (v) => { const s = v.filter((x) => x != null).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
const p75 = (v) => { const s = v.filter((x) => x != null).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length * 0.75)] : null; };
const sociais = resultado.filter((r) => r.tipo === "social" && !r.semRosto);
const det = (cat) => {
  let vp = 0, fp = 0, fn = 0, vn = 0;
  // gabarito em 3 níveis: "marcada" tem de ser achada; "nenhuma" não pode ser inventada; "leve" vale as duas
  for (const r of sociais) {
    const lido = r.lidos.includes(cat);
    if (r[cat] === "marcada") lido ? vp++ : fn++;
    else if (r[cat] === "nenhuma") lido ? fp++ : vn++;
  }
  return { achouMarcadas: `${vp}/${vp + fn}`, inventouOndeNaoTem: `${fp}/${fp + vn}` };
};
const todos = (k) => sociais.flatMap((r) => r.pares.map((p) => p[k]));
const resumo = {
  rotulo, data: new Date().toISOString(),
  referencias: resultado.length, semRosto: resultado.filter((r) => r.semRosto).map((r) => r.id),
  deteccao: { sombra: det("sombra"), blush: det("blush") },
  boca: { medianaDeltaE: med(todos("batom")), p75: p75(todos("batom")), ate10: `${todos("batom").filter((x) => x != null && x <= 10).length}/${todos("batom").filter((x) => x != null).length}` },
  blush: { medianaDiferencaEfeito: med(todos("blush")), p75: p75(todos("blush")), medianaAcrescentado: med(todos("blushAcrescentado")), p75Acrescentado: p75(todos("blushAcrescentado")) },
  sombra: { medianaDiferencaEfeito: med(todos("sombra")), p75: p75(todos("sombra")), medianaAcrescentado: med(todos("sombraAcrescentado")), p75Acrescentado: p75(todos("sombraAcrescentado")) },
  // razão da força do efeito (cliente pintada ÷ referência), só onde o produto foi lido: 1 = mesma força
  forca: Object.fromEntries(["blush", "sombra"].map((k) => [k, med(sociais.filter((r) => r.lidos.includes(k)).flatMap((r) => r.pares.map((p) => (p.forca[k].ref ? p.forca[k].depois / p.forca[k].ref : null))))])),
};
for (const r of resultado) if (r.quadro) { await writeFile(`testes/resultados/bancada/comparacoes/${r.id}-${r.tipo}.jpg`, Buffer.from(r.quadro.split(",")[1], "base64")); delete r.quadro; }
await writeFile(`testes/resultados/bancada/relatorio-${rotulo}.json`, JSON.stringify({ resumo, resultado }, null, 1));
console.log(JSON.stringify(resumo, null, 1));
await nav.close();
servidor.close();
