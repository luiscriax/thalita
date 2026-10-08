// "Treino" dos limites do copiar-make: coleta as medidas de cada região (referencia.js, modo diagnóstico)
// em rostos COM make de gabarito conhecido (épocas pintadas em 10 rostos, força cheia e 60%) e em rostos
// SEM make, e procura, por categoria, a regra (uma medida, ou duas juntas) que mais acerta sem inventar
// produto (falso positivo ≤ 10%). Saída: testes/resultados/calibracao.json e a tabela no terminal.
// Uso: node scripts/calibrar.mjs
import { chromium } from "@playwright/test";
import { readFile, writeFile, readdir } from "node:fs/promises";
import { servir } from "./servir.mjs";

const G = JSON.parse(await readFile("testes/diversidade-gabarito.json", "utf8"));
const semMake = (await readdir("testes/fixtures/bancada/sem-make")).filter((f) => !/xfsy_0503|00434x/.test(f)).sort();
const porta = 4194;
const servidor = await servir(porta);
const nav = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const pagina = await nav.newPage();
await pagina.goto(`http://localhost:${porta}/testes/harness.html`);
await pagina.waitForFunction(() => window.pronto);

const amostras = await pagina.evaluate(async ({ G, semMake }) => {
  const { carregarDetector, detectarFoto } = await import("/js/rosto.js");
  const { lerMakeDaFoto } = await import("/js/referencia.js");
  const { criarAmostrador } = await import("/js/medidas.js");
  const { criarPintor } = await import("/js/pintura.js");
  const { MAKES_EPOCAS } = await import("/js/epocas.js");
  await carregarDetector();
  const carregar = async (url) => { const i = new Image(); i.src = url; await i.decode(); return i; };
  const amostra = (f, w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d", { willReadFrequently: true }); x.drawImage(f, 0, 0, w, h); return criarAmostrador({ dados: x.getImageData(0, 0, w, h).data, largura: w, altura: h, canais: 4 }); };
  const diagDe = (d, a) => { const g = {}; lerMakeDaFoto(d, a, { diagnostico: g }); return g; };
  const saida = [];
  const escala = (estado, k) => Object.fromEntries(Object.entries(estado).map(([c, v]) => [c, v && { ...v, intensidade: v.intensidade * k }]));
  // limpas
  const limpas = [...G.rostosParaMake.map((r) => r.arquivo), ...semMake.map((f) => `sem-make/${f}`)];
  for (const arq of [...new Set(limpas)]) {
    const img = await carregar(`/testes/fixtures/bancada/${arq}`);
    const d = await detectarFoto(img);
    if (!d.pontos.length) continue;
    saida.push({ origem: arq, tem: {}, diag: diagDe(d, amostra(img, d.largura, d.altura)) });
  }
  // com make (épocas, 100% e 60%)
  for (const r of G.rostosParaMake) {
    const img = await carregar(`/testes/fixtures/bancada/${r.arquivo}`);
    const d = await detectarFoto(img);
    if (!d.pontos.length) continue;
    for (const ep of MAKES_EPOCAS) for (const k of [1, 0.6]) {
      const est = escala(ep.estado, k);
      const c = document.createElement("canvas"); c.width = d.largura; c.height = d.altura;
      criarPintor(c).desenhar(img, d.pontos, est);
      const d2 = await detectarFoto(c);
      if (!d2.pontos.length) continue;
      const tem = Object.fromEntries(["sombra", "blush", "iluminador", "delineado"].map((cat) => [cat, !!est[cat] && (cat !== "delineado" || est[cat].estilo === "gatinho")]));
      saida.push({ origem: `${r.id}/${ep.id}/${k}`, tom: r.tom, tem, diag: diagDe(d2, amostra(c, c.width, c.height)) });
    }
  }
  return saida;
}, { G, semMake });
await nav.close();
servidor.close();

// ── procura das regras ──
const FEATS = {
  sombra: ["dC", "dCor", "dL", "Crel", "dh", "dLvinco", "dE"],
  blush: ["dE", "da", "dL", "db", "dC"],
  iluminador: ["dL", "dLbochecha", "contraste", "brilho"],
  delineado: ["alem"],
};
const valor = (a, cat, f) => a.diag?.[cat]?.[f];
const resultados = {};
for (const [cat, feats] of Object.entries(FEATS)) {
  const pos = amostras.filter((a) => a.tem[cat] === true), neg = amostras.filter((a) => !a.tem[cat]);
  const regras = [];
  const limiares = (f) => { const v = amostras.map((a) => valor(a, cat, f)).filter((x) => x != null).sort((x, y) => x - y); return [...new Set(v.filter((_, i) => i % 3 === 0))]; };
  const testa = (cond) => {
    const vp = pos.filter(cond).length, fp = neg.filter(cond).length;
    return { tpr: vp / (pos.length || 1), fpr: fp / (neg.length || 1) };
  };
  for (const f of feats) for (const t of limiares(f)) for (const dir of [">=", "<="]) {
    const c = (a) => { const v = valor(a, cat, f); return v != null && (dir === ">=" ? v >= t : v <= t); };
    regras.push({ regra: `${f} ${dir} ${t}`, ...testa(c), c });
  }
  // pares (E): só com as melhores regras simples de cada medida
  const melhores = feats.flatMap((f) => regras.filter((r) => r.regra.startsWith(f + " ")).sort((a, b) => b.tpr - b.fpr - (a.tpr - a.fpr)).slice(0, 6));
  for (let i = 0; i < melhores.length; i++) for (let j = i + 1; j < melhores.length; j++) {
    const a = melhores[i], b = melhores[j];
    if (a.regra.split(" ")[0] === b.regra.split(" ")[0]) continue;
    const c = (x) => a.c(x) && b.c(x);
    regras.push({ regra: `${a.regra} E ${b.regra}`, ...testa(c), c });
    const o = (x) => a.c(x) || b.c(x);
    regras.push({ regra: `${a.regra} OU ${b.regra}`, ...testa(o), c: o });
  }
  const validas = regras.filter((r) => r.fpr <= 0.1).sort((a, b) => b.tpr - a.tpr || a.fpr - b.fpr);
  resultados[cat] = { positivos: pos.length, negativos: neg.length, top: validas.slice(0, 5).map(({ regra, tpr, fpr }) => ({ regra, achou: Math.round(tpr * 100) + "%", inventou: Math.round(fpr * 100) + "%" })) };
}
await writeFile("testes/resultados/calibracao.json", JSON.stringify({ resultados, amostras }, null, 1));
console.log(JSON.stringify(resultados, null, 1));
