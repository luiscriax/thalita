// Estudo do rosto: confere se a selfie serve (checarQualidade) e mede cores e proporções (medir).
// Entra a Deteccao do MediaPipe (rosto.js) + os pixels da foto; sai Medidas (ver tipos.js).
// Funções puras, sem DOM: rodam no aparelho da cliente e nos testes (node --test).
//
// Convenções:
// - Pontos do MediaPipe são normalizados (0–1); aqui viram pixels da imagem do amostrador.
// - "direito/esquerdo" é o lado DA PESSOA (como em regioes.js).
// - O ganho do balanço de branco multiplica os valores sRGB 0–255 de cada canal
//   (corrigido = original × ganho), o jeito simples de aplicar também num canvas.
// - Limites numéricos calibrados com as fotos de teste (testes/fixtures); ver testes/unit/medidas.test.mjs.

import { rgbParaLab, labParaHex, deltaE2000, ita, faixaIta, tomMonk, profundidade, subtom, lch, medianaRgb } from "./cor.js";
import {
  OVAL, LABIOS_EXTERNO, LABIOS_INTERNO, OLHO_DIREITO, OLHO_ESQUERDO,
  SOBRANCELHA_DIREITA, SOBRANCELHA_ESQUERDA, PONTOS,
} from "./regioes.js";

/** @typedef {import("./tipos.js").Deteccao} Deteccao */
/** @typedef {import("./tipos.js").Medidas} Medidas */
/** @typedef {import("./tipos.js").Qualidade} Qualidade */
/** @typedef {import("./tipos.js").Checagem} Checagem */
/** @typedef {import("./tipos.js").CorMedida} CorMedida */
/** @typedef {{r:number,g:number,b:number}} RGB */
/** @typedef {{x:number,y:number,r:number,g:number,b:number}} Amostra   pixel com posição (x, y inteiros) */
/** @typedef {{x:number,y:number}} PontoPx   em pixels da imagem */
/** @typedef {{passo?:number, maximo?:number}} OpcoesAmostra  passo fixo ou teto de pixels (o passo cresce sozinho) */

/**
 * @typedef {Object} Amostrador
 * @property {number} largura
 * @property {number} altura
 * @property {(x:number,y:number)=>RGB|null} pixel            pixel inteiro (null fora da imagem)
 * @property {(x:number,y:number)=>number|null} luma          luma Rec.709 (0–255) do pixel
 * @property {(x:number,y:number)=>number|null} lumaSuave     luma interpolada (centro do pixel i fica em i + 0,5)
 * @property {(aneis:PontoPx[]|PontoPx[][], opcoes?:OpcoesAmostra)=>Amostra[]} poligono
 *           pixels com o centro dentro do polígono; vários anéis seguem a regra par-ímpar (ex.: lábios externo − interno)
 * @property {(centro:PontoPx, raio:number, opcoes?:OpcoesAmostra)=>Amostra[]} circulo
 * @property {(opcoes?:OpcoesAmostra)=>Amostra[]} imagem      amostra espaçada da imagem inteira
 */

// ───────────────────────── limites (calibrados com as fotos de teste) ─────────────────────────

export const LIMITES = congelar({
  /** graus: [atenção a partir de, erro a partir de] */
  frontal: { guinada: [15, 30], arfagem: [15, 30], rolagem: [10, 25] },
  /** largura do rosto (234–454): [atenção abaixo de, erro abaixo de], em px e relativa ao menor lado da foto */
  tamanho: { px: [200, 90], relativo: [0.3, 0.12] },
  /** nitidez (desvio do Laplaciano / luma, grade de 128 px): [atenção abaixo de, erro abaixo de].
   *  rosto-frontal ≈ 16, business-person ≈ 11, desfoque gaussiano σ≈1 px na grade ≈ 3–5, rosto-desfocado ≈ 1,9 */
  foco: [6, 3.5],
  luz: {
    escuraBrilho: 110, // luma das partes mais claras do rosto (branco do olho, reflexos) abaixo disso = escura
    poucaLuzBrilho: 150,
    LpeleEscura: 50, // …e a pele também escura (para não confundir pele escura com foto escura)
    LpelePoucaLuz: 55,
    LpeleMinima: 12,
    LpeleMaxima: 92,
    especular: 0.15, // fração da pele estourada (2+ canais no máximo)
    canalEstourado: 0.5, // fração da pele com algum canal no máximo
    razaoLados: 1.8, // luminância linear do lado mais claro / mais escuro
  },
  olhoFechado: 0.5,
  sorriso: 0.5,
  bocaAberta: 0.35,
});
function congelar(o) {
  for (const v of Object.values(o)) if (v && typeof v === "object") congelar(v);
  return Object.freeze(o);
}

/** Contornos logo abaixo dos olhos (anotações da malha do MediaPipe: eyeLower1 e eyeLower3). */
const SOB_OLHO = {
  direito: { perto: [130, 25, 110, 24, 23, 22, 26, 112, 243], longe: [143, 111, 117, 118, 119, 120, 121, 128, 245] },
  esquerdo: { perto: [359, 255, 339, 254, 253, 252, 256, 341, 463], longe: [372, 340, 346, 347, 348, 349, 350, 357, 465] },
};
/** Laterais do nariz (asas), onde a vermelhidão costuma aparecer. */
const ASA_NARIZ = { direita: 129, esquerda: 358 };
/** Largura do queixo (pontos do contorno ao lado do 152). */
const QUEIXO = { direita: 176, esquerda: 400 };
/** Bochechas de cada lado (maçã, meio e perto do nariz), para comparar a luz dos dois lados. */
const LADO = { direito: [50, 205, 101], esquerdo: [280, 425, 330] };

const PLACEHOLDER_LAB = Object.freeze({ L: 50, a: 0, b: 0 });
const grau = (rad) => (rad * 180) / Math.PI;
const limitar = (v, min, max) => (v < min ? min : v > max ? max : v);
const finito = (v, padrao = 0) => (Number.isFinite(v) ? v : padrao);
const arred = (v, casas = 3) => {
  const k = 10 ** casas;
  return Math.round(finito(v) * k) / k;
};
const luma709 = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const lumaP = (p) => luma709(p.r, p.g, p.b);
/** sRGB 0–255 → luminância linear 0–1. */
const linear = (v) => {
  const c = limitar(v, 0, 255) / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

// ───────────────────────────────────────── amostrador ─────────────────────────────────────────

/**
 * Leitor de pixels de uma imagem crua (ex.: ImageData.data, 4 canais; ou RGB puro, 3 canais).
 * Nunca lança exceção: coordenada fora da imagem ou dado faltando → null.
 * @param {{dados:Uint8Array|Uint8ClampedArray|number[], largura:number, altura:number, canais?:number}} img
 * @returns {Amostrador}
 */
export function criarAmostrador({ dados, largura, altura, canais } = /** @type {any} */ ({})) {
  const W = Math.max(0, Math.floor(finito(Number(largura))));
  const H = Math.max(0, Math.floor(finito(Number(altura))));
  const n = dados && typeof dados.length === "number" ? dados.length : 0;
  let C = canais === 3 || canais === 4 ? canais : 0;
  if (!C) C = n === W * H * 3 ? 3 : 4; // sem informação: deduz pelo tamanho
  const canal = (i) => {
    const v = dados[i];
    return v >= 0 ? (v > 255 ? 255 : v) : 0; // NaN/undefined/negativo → 0
  };
  const indice = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    if (!(xi >= 0 && yi >= 0 && xi < W && yi < H)) return -1;
    const i = (yi * W + xi) * C;
    return i + 2 < n ? i : -1;
  };
  const pixel = (x, y) => {
    const i = indice(x, y);
    return i < 0 ? null : { r: canal(i), g: canal(i + 1), b: canal(i + 2) };
  };
  const luma = (x, y) => {
    const i = indice(x, y);
    return i < 0 ? null : luma709(canal(i), canal(i + 1), canal(i + 2));
  };
  return completarAmostrador({ largura: W, altura: H, pixel, luma });
}

/** Acrescenta os ajudantes de amostragem a qualquer objeto {largura, altura, pixel}. */
function completarAmostrador(base) {
  const W = Math.max(0, Math.floor(finito(base.largura)));
  const H = Math.max(0, Math.floor(finito(base.altura)));
  const pixel = (x, y) => {
    try {
      const p = base.pixel(x, y);
      return p && Number.isFinite(p.r) && Number.isFinite(p.g) && Number.isFinite(p.b) ? p : null;
    } catch {
      return null;
    }
  };
  const luma =
    typeof base.luma === "function"
      ? base.luma
      : (x, y) => {
          const p = pixel(x, y);
          return p ? lumaP(p) : null;
        };

  const lumaSuave = (x, y) => {
    if (!(x >= 0 && y >= 0 && x <= W && y <= H) || W === 0 || H === 0) return null;
    const fx = limitar(x - 0.5, 0, W - 1), fy = limitar(y - 0.5, 0, H - 1);
    const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const x1 = Math.min(W - 1, x0 + 1), y1 = Math.min(H - 1, y0 + 1);
    const tx = fx - x0, ty = fy - y0;
    const a = luma(x0, y0), b = luma(x1, y0), c = luma(x0, y1), d = luma(x1, y1);
    if (a == null || b == null || c == null || d == null) return a ?? null;
    return (a * (1 - tx) + b * tx) * (1 - ty) + (c * (1 - tx) + d * tx) * ty;
  };

  /** Passo de amostragem para não passar de `maximo` pixels numa caixa. */
  const passoPara = (area, opcoes) => {
    const passo = Math.max(1, Math.floor(finito(opcoes?.passo, 1)));
    const maximo = finito(opcoes?.maximo, 0);
    return maximo > 0 && area > maximo ? Math.max(passo, Math.ceil(Math.sqrt(area / maximo))) : passo;
  };

  const poligono = (aneis, opcoes) => {
    const lista = normalizarAneis(aneis);
    if (!lista.length || !W || !H) return [];
    let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
    for (const anel of lista)
      for (const p of anel) {
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
      }
    const y0 = Math.max(0, Math.floor(minY)), y1 = Math.min(H - 1, Math.ceil(maxY));
    const x0 = Math.max(0, Math.floor(minX)), x1 = Math.min(W - 1, Math.ceil(maxX));
    if (y1 < y0 || x1 < x0) return [];
    const passo = passoPara((x1 - x0 + 1) * (y1 - y0 + 1), opcoes);
    const saida = [];
    const xs = [];
    for (let y = y0; y <= y1; y += passo) {
      const cy = y + 0.5;
      xs.length = 0;
      for (const anel of lista) {
        for (let k = 0, m = anel.length; k < m; k++) {
          const a = anel[k], b = anel[(k + 1) % m];
          if (a.y <= cy !== b.y <= cy) xs.push(a.x + ((cy - a.y) * (b.x - a.x)) / (b.y - a.y));
        }
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        // centro do pixel (x + 0,5) entre as duas travessias
        const xa = Math.max(x0, Math.ceil(xs[k] - 0.5));
        const xb = Math.min(x1, Math.ceil(xs[k + 1] - 0.5) - 1);
        for (let x = xa; x <= xb; x += passo) {
          const p = pixel(x, y);
          if (p) saida.push({ x, y, r: p.r, g: p.g, b: p.b });
        }
      }
    }
    return saida;
  };

  const circulo = (centro, raio, opcoes) => {
    if (!centro || !Number.isFinite(centro.x) || !Number.isFinite(centro.y) || !(raio > 0) || !Number.isFinite(raio) || !W || !H) return [];
    const x0 = Math.max(0, Math.floor(centro.x - raio)), x1 = Math.min(W - 1, Math.ceil(centro.x + raio));
    const y0 = Math.max(0, Math.floor(centro.y - raio)), y1 = Math.min(H - 1, Math.ceil(centro.y + raio));
    if (x1 < x0 || y1 < y0) return [];
    const passo = passoPara((x1 - x0 + 1) * (y1 - y0 + 1), opcoes);
    const r2 = raio * raio;
    const saida = [];
    for (let y = y0; y <= y1; y += passo) {
      const dy = y + 0.5 - centro.y;
      for (let x = x0; x <= x1; x += passo) {
        const dx = x + 0.5 - centro.x;
        if (dx * dx + dy * dy > r2) continue;
        const p = pixel(x, y);
        if (p) saida.push({ x, y, r: p.r, g: p.g, b: p.b });
      }
    }
    return saida;
  };

  const imagem = (opcoes) => {
    if (!W || !H) return [];
    const passo = passoPara(W * H, { passo: opcoes?.passo, maximo: finito(opcoes?.maximo, 40000) });
    const saida = [];
    for (let y = Math.floor(passo / 2); y < H; y += passo)
      for (let x = Math.floor(passo / 2); x < W; x += passo) {
        const p = pixel(x, y);
        if (p) saida.push({ x, y, r: p.r, g: p.g, b: p.b });
      }
    return saida;
  };

  return { largura: W, altura: H, pixel, luma, lumaSuave, poligono, circulo, imagem };
}

function normalizarAneis(aneis) {
  if (!Array.isArray(aneis) || !aneis.length) return [];
  const lista = Array.isArray(aneis[0]) ? aneis : [aneis];
  return lista
    .map((anel) => (Array.isArray(anel) ? anel.filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y)) : []))
    .filter((anel) => anel.length >= 3);
}

/** Ponto dentro de polígono (par-ímpar). */
function dentro(p, anel) {
  let c = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const a = anel[i], b = anel[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

// ───────────────────────────────────── contexto da foto ─────────────────────────────────────

/**
 * Prepara pontos em pixels, tamanho do rosto e pose. As amostras de pele, esclera e luz ficam
 * guardadas no contexto e são reaproveitadas pela checagem e pela medição.
 */
function preparar(deteccao, amostrador) {
  const d = deteccao && typeof deteccao === "object" ? deteccao : /** @type {any} */ ({});
  const a =
    amostrador && typeof amostrador.pixel === "function"
      ? typeof amostrador.poligono === "function" && typeof amostrador.lumaSuave === "function" && typeof amostrador.imagem === "function"
        ? amostrador
        : completarAmostrador(amostrador)
      : null;
  // dimensões da imagem dos pixels; sem pixels (ou imagem vazia), as da detecção (só geometria)
  const comPixels = !!a && a.largura > 0 && a.altura > 0;
  const W = comPixels ? a.largura : Math.max(0, finito(d.largura));
  const H = comPixels ? a.altura : Math.max(0, finito(d.altura));
  const brutos = Array.isArray(d.pontos) ? d.pontos : [];
  const pts = brutos.map((p) =>
    p && Number.isFinite(p.x) && Number.isFinite(p.y) ? { x: p.x * W, y: p.y * H, z: finito(p.z) * W } : null,
  );
  const temRosto = pts.length >= 468 && pts.filter(Boolean).length >= 400 && W > 0 && H > 0;
  const P = (i) => (temRosto ? pts[i] ?? null : null);
  const ctx = {
    d, a, W, H, P, temRosto,
    rostos: Math.max(temRosto ? 1 : 0, Math.floor(finito(d.rostos, 0))),
    expressoes: d.expressoes && typeof d.expressoes === "object" ? d.expressoes : {},
    temIris: temRosto && pts.length >= 478 && [468, 469, 470, 471, 472, 473, 474, 475, 476, 477].every((i) => pts[i]),
    cache: {},
  };
  if (!temRosto) return ctx;

  const oval = OVAL.map(P).filter(Boolean);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of oval) {
    x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
  }
  ctx.oval = oval;
  ctx.caixa = { x0, y0, x1, y1 };
  ctx.foraDaFoto = oval.filter((p) => p.x < 0 || p.y < 0 || p.x > W || p.y > H).length / Math.max(1, oval.length);
  const l = d2(P(PONTOS.rostoLarguraDireita), P(PONTOS.rostoLarguraEsquerda));
  ctx.larguraRosto = l > 0 ? l : Math.max(0, x1 - x0) * 0.9;

  // eixo dos olhos: u ao longo da linha dos olhos, v "para cima" do rosto (corrige a rolagem)
  const cDir = media([P(OLHO_DIREITO.cantoExterno), P(OLHO_DIREITO.cantoInterno)]);
  const cEsq = media([P(OLHO_ESQUERDO.cantoExterno), P(OLHO_ESQUERDO.cantoInterno)]);
  const n = d2(cDir, cEsq);
  if (n > 0) {
    const u = { x: (cEsq.x - cDir.x) / n, y: (cEsq.y - cDir.y) / n };
    ctx.eixo = { u, v: { x: u.y, y: -u.x } };
  } else {
    ctx.eixo = { u: { x: 1, y: 0 }, v: { x: 0, y: -1 } };
  }
  ctx.pose = calcularPose(ctx);
  return ctx;
}

const d2 = (a, b) => (a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0);
const d3 = (a, b) => (a && b ? Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0)) : 0);
function media(lista) {
  const v = lista.filter(Boolean);
  if (!v.length) return null;
  const s = v.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y, z: acc.z + (p.z ?? 0) }), { x: 0, y: 0, z: 0 });
  return { x: s.x / v.length, y: s.y / v.length, z: s.z / v.length };
}
/** Coordenadas no referencial do rosto: u ao longo da linha dos olhos, v para cima. */
const noRosto = (ctx, p) => ({ u: p.x * ctx.eixo.u.x + p.y * ctx.eixo.u.y, v: p.x * ctx.eixo.v.x + p.y * ctx.eixo.v.y });

/**
 * Pose da cabeça em graus. Guinada (virar para o lado) e arfagem (queixo para cima +, para baixo −)
 * vêm da matriz de transformação do MediaPipe (column-major: coluna 0 = eixo x do rosto, coluna 2 =
 * para onde o rosto aponta), já descontada a rolagem — assim uma foto deitada não vira "rosto virado".
 * Rolagem vem da linha dos olhos na imagem. Sem matriz, estimativa grosseira pelos pontos
 * (erro de ~±10°: serve para pegar os casos extremos).
 */
function calcularPose(ctx) {
  const { P } = ctx;
  const rolagem = grau(Math.atan2(ctx.eixo.u.y, ctx.eixo.u.x));
  const m = ctx.d.matriz;
  if (m && typeof m.length === "number" && m.length >= 16) {
    const x = normalizar3([m[0], m[1], m[2]]);
    const z = normalizar3([m[8], m[9], m[10]]);
    if (x && z) {
      const r = Math.atan2(x[1], x[0]); // rolagem na câmera (y para cima)
      const zx = z[0] * Math.cos(r) + z[1] * Math.sin(r);
      const zy = -z[0] * Math.sin(r) + z[1] * Math.cos(r);
      return {
        guinada: grau(Math.atan2(zx, z[2])),
        arfagem: grau(Math.atan2(zy, Math.hypot(zx, z[2]))),
        rolagem,
        fonte: "matriz",
      };
    }
  }
  // Guinada: diferença de profundidade (z) entre as laterais do rosto.
  // Arfagem: altura da ponta do nariz entre a linha dos olhos e a boca (≈ 0,61 de frente).
  const dir = P(PONTOS.rostoLarguraDireita), esq = P(PONTOS.rostoLarguraEsquerda);
  const nariz = P(PONTOS.pontaNariz);
  const olhos = media([P(OLHO_DIREITO.cantoExterno), P(OLHO_DIREITO.cantoInterno), P(OLHO_ESQUERDO.cantoExterno), P(OLHO_ESQUERDO.cantoInterno)]);
  const boca = media([P(PONTOS.labioSuperiorBase), P(PONTOS.labioInferiorTopo)]);
  let guinada = 0, arfagem = 0;
  if (dir && esq) {
    const a = noRosto(ctx, dir), b = noRosto(ctx, esq);
    guinada = grau(Math.atan2(esq.z - dir.z, b.u - a.u));
  }
  if (nariz && olhos && boca) {
    const vo = noRosto(ctx, olhos).v, vn = noRosto(ctx, nariz).v, vb = noRosto(ctx, boca).v;
    if (vo - vb > 0) arfagem = limitar((0.61 - (vo - vn) / (vo - vb)) / 0.006, -60, 60);
  }
  return { guinada: finito(guinada), arfagem: finito(arfagem), rolagem: finito(rolagem), fonte: "pontos" };
}
function normalizar3(v) {
  if (!v.every(Number.isFinite)) return null;
  const n = Math.hypot(v[0], v[1], v[2]);
  return n > 1e-9 ? v.map((c) => c / n) : null;
}

// ─────────────────────────────────────── amostras de cor ───────────────────────────────────────

/** Reflexo estourado: dois ou mais canais no máximo, ou quase branco. Não carrega cor. */
const especular = (p) => (p.r >= 250) + (p.g >= 250) + (p.b >= 250) >= 2 || lumaP(p) >= 245;
/** Algum canal no máximo (a mediana por canal aguenta isso enquanto for menos da metade). */
const canalNoMaximo = (p) => p.r >= 250 || p.g >= 250 || p.b >= 250;

/** Percentil (0–1) de uma lista de números. */
function percentil(valores, q) {
  if (!valores.length) return NaN;
  const s = Float64Array.from(valores).sort();
  const pos = limitar(q, 0, 1) * (s.length - 1);
  const i = Math.floor(pos), t = pos - i;
  return i + 1 < s.length ? s[i] * (1 - t) + s[i + 1] * t : s[i];
}

/** Aplica o ganho do balanço de branco a um pixel. */
const corrigir = (p, g) => ({ r: Math.min(255, p.r * g.r), g: Math.min(255, p.g * g.g), b: Math.min(255, p.b * g.b) });

/** Mantém só a faixa central de claridade (tira sombras/pelos e reflexos) pela posição relativa. */
function faixaDeClaridade(px, baixo, alto) {
  if (px.length < 4) return px.slice();
  const l = px.map(lumaP);
  const lo = percentil(l, baixo), hi = percentil(l, 1 - alto);
  return px.filter((_, i) => l[i] >= lo && l[i] <= hi);
}

/** @returns {CorMedida} */
function corMedida(rgb, confianca) {
  if (!rgb) return { hex: labParaHex(PLACEHOLDER_LAB), lab: { ...PLACEHOLDER_LAB }, confianca: 0 };
  const lab = rgbParaLab(rgb);
  const labR = { L: arred(lab.L, 2), a: arred(lab.a, 2), b: arred(lab.b, 2) };
  return { hex: labParaHex(labR), lab: labR, confianca: arred(limitar(finito(confianca), 0, 1), 2) };
}

/** Pele crua (sem correção): maçãs do rosto (50 e 280) e testa (151), raio de 6% da largura do rosto. */
function amostrasPele(ctx) {
  if (ctx.cache.pele) return ctx.cache.pele;
  const { a, P } = ctx;
  const r = Math.max(1, 0.06 * ctx.larguraRosto);
  const circ = (i) => (a && P(i) ? a.circulo(P(i), r, { maximo: 6000 }) : []);
  ctx.cache.pele = {
    bochechaDireita: circ(PONTOS.macaDireita),
    bochechaEsquerda: circ(PONTOS.macaEsquerda),
    testa: circ(PONTOS.testaCentro),
  };
  return ctx.cache.pele;
}

function raioIris(ctx, olho) {
  const c = ctx.P(olho.irisCentro);
  const ds = olho.iris.map((i) => d2(c, ctx.P(i))).filter((v) => v > 0);
  return ds.length ? ds.reduce((s, v) => s + v, 0) / ds.length : 0;
}

// ───────────────────────────────────── balanço de branco ─────────────────────────────────────

/**
 * Cor do branco do olho numa foto bem equilibrada, como proporção R:G:B. A esclera não é branca
 * pura; nas fotos de referência (fundo branco neutro) ela fica neutra a levemente quente.
 */
const ESCLERA_ALVO = Object.freeze({ r: 1.02, g: 1, b: 0.98 });

/**
 * Amostra o branco de um olho: pixels dentro do contorno, fora da íris, perto da altura do centro
 * da íris (longe das pálpebras e dos cantos), os 30% mais claros e, desses, os de cromaticidade
 * mais típica (distância em log(R/G), log(B/G), que não muda com a cor da luz).
 */
function amostrarEsclera(ctx, olho) {
  const { a, P } = ctx;
  if (!a || !ctx.temIris) return null;
  const contorno = olho.contorno.map(P);
  const c = P(olho.irisCentro), ci = P(olho.cantoInterno), ce = P(olho.cantoExterno);
  if (contorno.some((p) => !p) || !c || !ci || !ce) return null;
  const R = raioIris(ctx, olho);
  const w = d2(ci, ce);
  if (!(R > 0 && w > 0)) return null;
  const ux = (ce.x - ci.x) / w, uy = (ce.y - ci.y) / w;
  const candidatos = a.poligono(contorno, { maximo: 40000 }).filter((p) => {
    const dx = p.x + 0.5 - c.x, dy = p.y + 0.5 - c.y;
    const u = dx * ux + dy * uy, v = -dx * uy + dy * ux;
    const t = ((p.x + 0.5 - ci.x) * ux + (p.y + 0.5 - ci.y) * uy) / w; // 0 = canto interno, 1 = externo
    return Math.abs(v) <= 0.55 * R && Math.abs(u) >= 1.15 * R && t >= 0.12 && t <= 0.9 && !especular(p);
  });
  if (candidatos.length < 6) return { ref: null, n: 0, total: candidatos.length, L: NaN, luma: NaN };
  const l = candidatos.map(lumaP);
  const corte = percentil(l, 0.7);
  const claros = candidatos.filter((_, i) => l[i] >= corte);
  const logc = (p) => [Math.log((p.r + 1) / (p.g + 1)), Math.log((p.b + 1) / (p.g + 1))];
  const m = logc(medianaRgb(claros));
  const dist = claros.map((p) => {
    const q = logc(p);
    return Math.hypot(q[0] - m[0], q[1] - m[1]);
  });
  const corteD = percentil(dist, 0.7);
  const sel = claros.filter((_, i) => dist[i] <= corteD);
  const ref = medianaRgb(sel);
  return { ref, n: sel.length, total: candidatos.length, L: rgbParaLab(ref).L, luma: lumaP(ref) };
}

function escleras(ctx) {
  if (!ctx.cache.escleras) {
    const piscando = Math.max(finito(ctx.expressoes.eyeBlinkLeft), finito(ctx.expressoes.eyeBlinkRight)) > LIMITES.olhoFechado;
    ctx.cache.escleras =
      ctx.temRosto && !piscando
        ? [amostrarEsclera(ctx, OLHO_DIREITO), amostrarEsclera(ctx, OLHO_ESQUERDO)].filter((o) => o && o.ref && o.n >= 4)
        : [];
  }
  return ctx.cache.escleras;
}

/** Ganho por canal que leva `ref` ao `alvo`, preservando a luma, limitado a [0,7; 1,4]. */
function ganhoPara(ref, alvo = ESCLERA_ALVO) {
  if (!ref || !(ref.r > 0 && ref.g > 0 && ref.b > 0)) return null;
  let g = { r: alvo.r / ref.r, g: alvo.g / ref.g, b: alvo.b / ref.b };
  const s = lumaP(ref) / luma709(ref.r * g.r, ref.g * g.g, ref.b * g.b);
  g = { r: g.r * s, g: g.g * s, b: g.b * s };
  return { r: limitar(g.r, 0.7, 1.4), g: limitar(g.g, 0.7, 1.4), b: limitar(g.b, 0.7, 1.4) };
}
/** Aplica só a fração `w` do ganho (0 = nada, 1 = tudo). */
const parcial = (g, w) => ({ r: 1 + (g.r - 1) * w, g: 1 + (g.g - 1) * w, b: 1 + (g.b - 1) * w });
const arredGanho = (g) => ({ r: arred(g.r, 4), g: arred(g.g, 4), b: arred(g.b, 4) });

/**
 * Balanço de branco pelo branco do olho; sem ele, "mundo cinza" (média da foto fora do rosto),
 * aplicado só em parte e com confiança baixa.
 * @returns {Medidas["balancoDeBranco"]}
 */
function balancoDeBranco(ctx) {
  const neutro = { ganho: { r: 1, g: 1, b: 1 }, fonte: /** @type {const} */ ("nenhuma"), confianca: 0 };
  if (!ctx.a || !ctx.a.largura || !ctx.a.altura) return neutro;
  const olhos = escleras(ctx);
  if (olhos.length) {
    const n = olhos.reduce((s, o) => s + o.n, 0);
    const ref = {
      r: olhos.reduce((s, o) => s + o.ref.r * o.n, 0) / n,
      g: olhos.reduce((s, o) => s + o.ref.g * o.n, 0) / n,
      b: olhos.reduce((s, o) => s + o.ref.b * o.n, 0) / n,
    };
    const ganho = ganhoPara(ref);
    let consistencia = 0.6; // um olho só
    if (olhos.length === 2) {
      const g1 = ganhoPara(olhos[0].ref), g2 = ganhoPara(olhos[1].ref);
      const dif = g1 && g2 ? Math.max(Math.abs(g1.r - g2.r), Math.abs(g1.g - g2.g), Math.abs(g1.b - g2.b)) : 1;
      consistencia = limitar(1 - dif / 0.15, 0, 1);
    }
    // O branco do olho tem que estar pelo menos tão claro quanto a pele; mais escuro, está na
    // sombra ou misturado com pálpebra/cílios (e a esclera pode ser naturalmente amarelada).
    const Lpele = medidasDeLuz(ctx).Lpele;
    const Lesc = Math.max(...olhos.map((o) => o.L));
    const claridade = Number.isFinite(Lpele) && Lpele > 0 ? limitar((Lesc / Lpele - 0.8) / 0.15, 0, 1) : 0.5;
    const confianca = 0.9 * limitar(n / 40, 0, 1) * (0.3 + 0.7 * consistencia) * (0.2 + 0.8 * claridade);
    if (ganho && confianca >= 0.15) {
      // com confiança boa aplica tudo; com pouca, só uma parte
      const w = limitar(confianca / 0.6, 0, 1);
      return { ganho: arredGanho(parcial(ganho, w)), fonte: "branco-do-olho", confianca: arred(confianca, 2) };
    }
  }
  // Plano B: mundo cinza, fora da caixa do rosto (a pele puxaria tudo para o azul).
  const caixa = ctx.caixa;
  const amostra = ctx.a
    .imagem({ maximo: 40000 })
    .filter((p) => !especular(p) && lumaP(p) > 15 && !(caixa && p.x >= caixa.x0 && p.x <= caixa.x1 && p.y >= caixa.y0 && p.y <= caixa.y1));
  if (amostra.length < 50) return neutro;
  const m = {
    r: amostra.reduce((s, p) => s + p.r, 0) / amostra.length,
    g: amostra.reduce((s, p) => s + p.g, 0) / amostra.length,
    b: amostra.reduce((s, p) => s + p.b, 0) / amostra.length,
  };
  const g = ganhoPara(m, { r: 1, g: 1, b: 1 });
  if (!g) return neutro;
  // pista fraca (fundo colorido engana): aplica 30% e no máximo ±7% por canal
  const fraco = parcial(g, 0.3);
  const teto = { r: limitar(fraco.r, 0.93, 1.07), g: limitar(fraco.g, 0.93, 1.07), b: limitar(fraco.b, 0.93, 1.07) };
  return { ganho: arredGanho(teto), fonte: "mundo-cinza", confianca: 0.15 };
}

// ───────────────────────────────────────── qualidade ─────────────────────────────────────────

/** @returns {Checagem} */
const checagem = (id, estado, titulo, dica, valor) => ({ id, estado, titulo, dica, valor: arred(valor, 3) });

/**
 * Confere se a selfie serve para o estudo do rosto. Checagens (nesta ordem): "um-rosto",
 * "frontal", "tamanho", "luz", "foco", "olhos", "expressao". Sem rosto, só "um-rosto" (erro).
 * Sem amostrador (ex.: prévia da câmera), "luz" e "foco" ficam de fora.
 * @param {Deteccao} deteccao
 * @param {Amostrador} [amostrador]
 * @returns {Qualidade}  aprovada = nenhuma checagem em "erro"
 */
export function checarQualidade(deteccao, amostrador) {
  return qualidadeDe(preparar(deteccao, amostrador));
}

function qualidadeDe(ctx) {
  /** @type {Checagem[]} */
  const checagens = [];
  if (!ctx.temRosto || ctx.rostos === 0) {
    checagens.push(checagem("um-rosto", "erro", "Não encontramos um rosto", "Tire a foto de frente, com o rosto inteiro aparecendo e boa luz.", 0));
    return { aprovada: false, checagens };
  }
  checagens.push(
    ctx.rostos > 1
      ? checagem("um-rosto", "atencao", "Tem mais de um rosto na foto", "Tire a foto sozinha, só com o seu rosto aparecendo.", ctx.rostos)
      : checagem("um-rosto", "ok", "Um rosto na foto", "Só o seu rosto na foto.", 1),
  );
  checagens.push(checarFrontal(ctx), checarTamanho(ctx));
  if (ctx.a) checagens.push(checarLuz(ctx), checarFoco(ctx));
  checagens.push(checarOlhos(ctx), checarExpressao(ctx));
  return { aprovada: checagens.every((c) => c.estado !== "erro"), checagens };
}

function checarFrontal(ctx) {
  const { guinada, arfagem, rolagem } = ctx.pose;
  const L = LIMITES.frontal;
  const nivel = (v, [at, er]) => (Math.abs(v) >= er ? 2 : Math.abs(v) >= at ? 1 : 0);
  const pior = Math.max(nivel(guinada, L.guinada), nivel(arfagem, L.arfagem), nivel(rolagem, L.rolagem));
  // o mais grave em relação ao próprio limite de atenção (1 = no limite)
  const rel = [
    [Math.abs(rolagem) / L.rolagem[0], "rolagem"],
    [Math.abs(guinada) / L.guinada[0], "guinada"],
    [Math.abs(arfagem) / L.arfagem[0], "arfagem"],
  ].sort((x, y) => y[0] - x[0])[0];
  const valor = rel[0];
  if (pior === 0) return checagem("frontal", "ok", "Rosto de frente", "Celular na altura dos olhos, olhando para a câmera.", valor);
  const estado = pior === 2 ? "erro" : "atencao";
  if (rel[1] === "rolagem") {
    if (Math.abs(rolagem) > 135)
      return checagem("frontal", estado, "A foto está de cabeça para baixo", "Gire a foto ou segure o celular em pé, com o rosto reto.", valor);
    if (Math.abs(rolagem) > 60)
      return checagem("frontal", estado, "A foto está deitada", "Gire a foto ou segure o celular em pé, com o rosto reto.", valor);
    return checagem("frontal", estado, "Cabeça inclinada para o lado", "Deixe a cabeça reta, com os olhos na mesma altura.", valor);
  }
  if (rel[1] === "guinada")
    return checagem("frontal", estado, "Rosto virado para o lado", "Olhe direto para a câmera, com o nariz apontando para ela.", valor);
  return arfagem < 0
    ? checagem("frontal", estado, "Rosto inclinado para baixo", "Levante um pouco o queixo e segure o celular na altura dos olhos.", valor)
    : checagem("frontal", estado, "Rosto inclinado para cima", "Abaixe um pouco o queixo e segure o celular na altura dos olhos.", valor);
}

function checarTamanho(ctx) {
  const px = ctx.larguraRosto;
  const relativo = px / Math.max(1, Math.min(ctx.W, ctx.H));
  const T = LIMITES.tamanho;
  if (px < T.px[1] || relativo < T.relativo[1])
    return checagem("tamanho", "erro", "Rosto muito pequeno na foto", "Chegue mais perto: o rosto deve ocupar boa parte da tela.", relativo);
  if (ctx.foraDaFoto > 0.05)
    return checagem("tamanho", "atencao", "Parte do rosto ficou fora da foto", "Afaste um pouco o celular para o rosto caber inteiro.", relativo);
  if (px < T.px[0] || relativo < T.relativo[0])
    return checagem("tamanho", "atencao", "Rosto pequeno na foto", "Chegue um pouco mais perto da câmera.", relativo);
  return checagem("tamanho", "ok", "Rosto em bom tamanho", "O rosto ocupa boa parte da foto.", relativo);
}

/** Números de luz da foto crua (antes da correção de cor). */
function medidasDeLuz(ctx) {
  if (ctx.cache.luz) return ctx.cache.luz;
  const vazio = { n: 0, Lpele: NaN, razaoLados: 1, especular: 0, canalNoMaximo: 0, brilho: NaN };
  if (!ctx.a || !ctx.temRosto) return (ctx.cache.luz = vazio);
  const pele = amostrasPele(ctx);
  const todas = [...pele.bochechaDireita, ...pele.bochechaEsquerda, ...pele.testa];
  const semReflexo = todas.filter((p) => !especular(p));
  const mediana = medianaRgb(faixaDeClaridade(semReflexo.length ? semReflexo : todas, 0.2, 0.1));
  // luz dos dois lados: 75º percentil da luma (ignora sombras pequenas), comparado em luminância linear
  const r = Math.max(1, 0.06 * ctx.larguraRosto);
  const lado = (ids) => ids.flatMap((i) => (ctx.P(i) ? ctx.a.circulo(ctx.P(i), r, { maximo: 4000 }) : []));
  const p75 = (px) => (px.length >= 10 ? linear(percentil(px.map(lumaP), 0.75)) : NaN);
  const yDir = p75(lado(LADO.direito)), yEsq = p75(lado(LADO.esquerdo));
  const razaoLados = Number.isFinite(yDir) && Number.isFinite(yEsq) ? Math.max(yDir, yEsq) / Math.max(1e-4, Math.min(yDir, yEsq)) : 1;
  // partes mais claras do rosto (branco do olho, reflexos, dentes): separam foto escura de pele escura
  const rosto = ctx.a.poligono(ctx.oval, { maximo: 30000 });
  const p97 = rosto.length ? percentil(rosto.map(lumaP), 0.97) : NaN;
  const esc = escleras(ctx).map((o) => o.luma);
  const brilho = Math.max(finito(p97, -Infinity), ...esc.map((v) => finito(v, -Infinity)));
  ctx.cache.luz = {
    n: todas.length,
    Lpele: mediana ? rgbParaLab(mediana).L : NaN,
    razaoLados,
    especular: todas.length ? todas.filter(especular).length / todas.length : 0,
    canalNoMaximo: todas.length ? todas.filter(canalNoMaximo).length / todas.length : 0,
    brilho: Number.isFinite(brilho) ? brilho : NaN,
  };
  return ctx.cache.luz;
}

function checarLuz(ctx) {
  const m = medidasDeLuz(ctx);
  const L = LIMITES.luz;
  // sem pixels de pele não há o que medir (imagem vazia ou que não bate com a detecção)
  if (m.n < 20 || !Number.isFinite(m.Lpele))
    return checagem("luz", "erro", "Não deu para medir a luz", "Tente tirar a foto de novo, com o rosto bem iluminado e inteiro na tela.", 0);
  const brilho = finito(m.brilho, 0);
  if (m.Lpele < L.LpeleMinima || (brilho < L.escuraBrilho && m.Lpele < L.LpeleEscura))
    return checagem("luz", "erro", "Foto escura demais", "Procure uma janela ou uma luz de frente para o rosto.", m.Lpele);
  if (brilho < L.poucaLuzBrilho && m.Lpele < L.LpelePoucaLuz)
    return checagem("luz", "atencao", "Pouca luz no rosto", "Chegue mais perto de uma janela ou acenda uma luz de frente.", m.Lpele);
  if (m.especular > L.especular || m.canalNoMaximo > L.canalEstourado || m.Lpele > L.LpeleMaxima)
    return checagem("luz", "atencao", "Luz forte demais no rosto", "Saia da luz direta do sol ou desligue o flash.", m.Lpele);
  if (m.razaoLados > L.razaoLados)
    return checagem("luz", "atencao", "Luz só de um lado", "Fique de frente para a luz, para iluminar os dois lados do rosto.", m.razaoLados);
  return checagem("luz", "ok", "Luz boa", "Luz de frente e sem sombras fortes.", m.Lpele);
}

const GRADE_FOCO = 128;
/**
 * Nitidez: desvio do Laplaciano dentro do rosto, numa grade de largura fixa (o tamanho do rosto
 * não muda a nota) e dividido pela luma média (a exposição também não).
 */
function medirNitidez(ctx) {
  if (ctx.cache.nitidez !== undefined) return ctx.cache.nitidez;
  ctx.cache.nitidez = NaN;
  if (!ctx.a || !ctx.temRosto) return NaN;
  const { a } = ctx;
  const x0 = Math.max(0, ctx.caixa.x0), y0 = Math.max(0, ctx.caixa.y0);
  const x1 = Math.min(ctx.W, ctx.caixa.x1), y1 = Math.min(ctx.H, ctx.caixa.y1);
  const bw = x1 - x0, bh = y1 - y0;
  if (!(bw >= 8 && bh >= 8)) return NaN;
  // rosto maior que a grade: média de k×k amostras por célula; menor: fica na resolução dele
  const nx = Math.max(8, Math.min(GRADE_FOCO, Math.round(bw)));
  const escala = bw / nx;
  const ny = Math.max(8, Math.min(4 * GRADE_FOCO, Math.round(bh / escala)));
  const k = Math.max(1, Math.min(6, Math.ceil(escala)));
  const grade = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      let s = 0, c = 0;
      for (let sy = 0; sy < k; sy++)
        for (let sx = 0; sx < k; sx++) {
          const v = a.lumaSuave(x0 + (i + (sx + 0.5) / k) * escala, y0 + (j + (sy + 0.5) / k) * escala);
          if (v != null) {
            s += v;
            c++;
          }
        }
      grade[j * nx + i] = c ? s / c : NaN;
    }
  // máscara: oval encolhido 8% (sem o fundo)
  const centro = media(ctx.oval);
  const ovalGrade = ctx.oval.map((p) => ({
    x: (centro.x + (p.x - centro.x) * 0.92 - x0) / escala,
    y: (centro.y + (p.y - centro.y) * 0.92 - y0) / escala,
  }));
  let n = 0, somaL = 0, soma = 0, soma2 = 0;
  for (let j = 1; j < ny - 1; j++)
    for (let i = 1; i < nx - 1; i++) {
      if (!dentro({ x: i + 0.5, y: j + 0.5 }, ovalGrade)) continue;
      const c = grade[j * nx + i];
      const v = grade[j * nx + i - 1] + grade[j * nx + i + 1] + grade[(j - 1) * nx + i] + grade[(j + 1) * nx + i] - 4 * c;
      if (!Number.isFinite(v)) continue;
      n++;
      somaL += c;
      soma += v;
      soma2 += v * v;
    }
  if (n < 30) return NaN;
  const mediaLuma = somaL / n;
  const dp = Math.sqrt(Math.max(0, soma2 / n - (soma / n) ** 2));
  ctx.cache.nitidez = mediaLuma > 1 ? (100 * dp) / mediaLuma : 0;
  return ctx.cache.nitidez;
}

function checarFoco(ctx) {
  const v = medirNitidez(ctx);
  if (!Number.isFinite(v)) return checagem("foco", "atencao", "Não deu para medir o foco", "Tire a foto com o rosto inteiro na tela.", 0);
  const [atencao, erro] = LIMITES.foco;
  if (v < erro) return checagem("foco", "erro", "Foto desfocada", "Limpe a lente, segure o celular firme e toque no rosto para focar.", v);
  if (v < atencao) return checagem("foco", "atencao", "Foto um pouco desfocada", "Segure o celular firme e toque no rosto para focar.", v);
  return checagem("foco", "ok", "Foto nítida", "Celular firme e lente limpa.", v);
}

function checarOlhos(ctx) {
  const e = ctx.expressoes;
  let valor;
  if (Number.isFinite(e.eyeBlinkLeft) || Number.isFinite(e.eyeBlinkRight)) {
    valor = Math.max(finito(e.eyeBlinkLeft), finito(e.eyeBlinkRight));
  } else {
    // sem blendshapes: abertura do olho (altura/largura); aberto ≈ 0,3, fechado < 0,1
    const abertura = (o) => {
      const w = d2(ctx.P(o.cantoExterno), ctx.P(o.cantoInterno));
      return w > 0 ? d2(ctx.P(o.topo), ctx.P(o.base)) / w : 0.3;
    };
    valor = limitar((0.25 - Math.min(abertura(OLHO_DIREITO), abertura(OLHO_ESQUERDO))) / 0.2, 0, 1);
  }
  if (valor > LIMITES.olhoFechado)
    return checagem("olhos", "atencao", "Olhos fechados", "Abra bem os olhos e olhe para a câmera na hora da foto.", valor);
  return checagem("olhos", "ok", "Olhos abertos", "Olhos abertos, olhando para a câmera.", valor);
}

function checarExpressao(ctx) {
  const e = ctx.expressoes;
  let sorriso = 0, boca;
  if (Number.isFinite(e.mouthSmileLeft) || Number.isFinite(e.mouthSmileRight) || Number.isFinite(e.jawOpen)) {
    sorriso = (finito(e.mouthSmileLeft) + finito(e.mouthSmileRight)) / 2;
    boca = finito(e.jawOpen);
  } else {
    const w = d2(ctx.P(PONTOS.bocaCantoDireito), ctx.P(PONTOS.bocaCantoEsquerdo));
    boca = w > 0 ? limitar(d2(ctx.P(PONTOS.labioSuperiorBase), ctx.P(PONTOS.labioInferiorTopo)) / w / 0.4, 0, 1) : 0;
  }
  const valor = Math.max(sorriso, boca);
  if (sorriso > LIMITES.sorriso || boca > LIMITES.bocaAberta)
    return checagem("expressao", "atencao", "Rosto neutro mede melhor a boca", "Se puder, tire a foto com a boca relaxada, sem sorrir.", valor);
  return checagem("expressao", "ok", "Expressão neutra", "Boca relaxada e rosto tranquilo.", valor);
}

// ─────────────────────────────────────────── medição ───────────────────────────────────────────

/**
 * Estudo completo do rosto. Sempre devolve Medidas completas e com números finitos: o que não deu
 * para medir vem com confiança 0 (e a qualidade explica o porquê).
 * @param {Deteccao} deteccao
 * @param {Amostrador} [amostrador]
 * @param {{balancoDeBranco?:boolean}} [opcoes]  balancoDeBranco:false mede sem corrigir a cor (diagnóstico)
 * @returns {Medidas}
 */
export function medir(deteccao, amostrador, opcoes = {}) {
  const ctx = preparar(deteccao, amostrador);
  const qualidade = qualidadeDe(ctx);
  const bb =
    opcoes?.balancoDeBranco === false
      ? { ganho: { r: 1, g: 1, b: 1 }, fonte: /** @type {const} */ ("nenhuma"), confianca: 0 }
      : balancoDeBranco(ctx);
  const g = bb.ganho;
  const fatorBB = bb.fonte === "branco-do-olho" ? 0.55 + 0.45 * bb.confianca : bb.fonte === "mundo-cinza" ? 0.5 : 0.4;
  const fator = (ctx.temRosto ? fatorDeQualidade(qualidade) : 0) * fatorBB;

  const pele = medirPele(ctx, g, fator);
  const olhos = medirIris(ctx, g, fator);
  const labios = medirLabios(ctx, g, pele, fator);
  const sobrancelhas = medirSobrancelhas(ctx, g, pele, fator);
  return {
    qualidade,
    balancoDeBranco: bb,
    pele,
    olhos,
    labios,
    sobrancelhas,
    olheira: medirOlheira(ctx, g, pele),
    vermelhidao: medirVermelhidao(ctx, g),
    rosto: medirFormatoRosto(ctx),
    formatoOlhos: medirFormatoOlhos(ctx),
    formatoBoca: medirFormatoBoca(ctx),
    contrastePessoal: medirContraste(pele, sobrancelhas, olhos),
  };
}

/** Quanto a qualidade da foto pesa na confiança das cores (1 = tudo ok). */
function fatorDeQualidade(q) {
  const pesos = { luz: [0.7, 0.35], foco: [0.85, 0.5], frontal: [0.85, 0.5], tamanho: [0.8, 0.4], "um-rosto": [0.95, 0.5] };
  let f = 1;
  for (const c of q.checagens) {
    const peso = pesos[c.id];
    if (peso && c.estado === "atencao") f *= peso[0];
    if (peso && c.estado === "erro") f *= peso[1];
  }
  return f;
}

function medirPele(ctx, g, fator) {
  const completar = (cor) => {
    const graus = ita(cor.lab);
    const m = tomMonk(cor.lab);
    const s = subtom(cor.lab);
    return {
      ...cor,
      ita: arred(graus, 2),
      faixaIta: faixaIta(graus),
      monk: { n: m.n, hex: m.hex, distancia: arred(m.distancia, 2) },
      profundidade: profundidade(cor.lab.L),
      subtom: { subtom: s.subtom, h: arred(s.h, 1), explicacao: s.explicacao },
    };
  };
  if (!ctx.temRosto || !ctx.a) return completar(corMedida(null, 0));
  const limpas = {};
  for (const [nome, px] of Object.entries(amostrasPele(ctx))) {
    // sem reflexos; tira os 25% mais escuros (sombra, pelos, fios de cabelo) e os 10% mais claros (brilho)
    limpas[nome] = faixaDeClaridade(px.filter((p) => !especular(p)).map((p) => corrigir(p, g)), 0.25, 0.1);
  }
  const medianas = {};
  for (const [k, v] of Object.entries(limpas)) medianas[k] = v.length >= 10 ? rgbParaLab(medianaRgb(v)) : null;
  // descarta região muito mais escura que as outras (franja na testa, sombra de cabelo)
  const validas = Object.keys(medianas).filter((k) => medianas[k]);
  if (!validas.length) return completar(corMedida(null, 0));
  const Lmax = Math.max(...validas.map((k) => medianas[k].L));
  const usadas = validas.filter((k) => medianas[k].L >= Lmax - 15);
  const pixels = usadas.flatMap((k) => limpas[k]);
  const rgb = medianaRgb(pixels);
  const lab = rgbParaLab(rgb);
  // regiões que discordam muito (ex.: blush forte, luz de um lado) baixam a confiança
  const dif = usadas.reduce((s, k) => s + deltaE2000(lab, medianas[k]), 0) / usadas.length;
  const conf = fator * limitar(pixels.length / 300, 0, 1) * (usadas.length >= 2 ? limitar(1.15 - dif / 12, 0.3, 1) : 0.6);
  return completar(corMedida(rgb, conf));
}

/** Família da íris pela claridade, croma e matiz (Lab corrigido, anel médio da íris). */
export function familiaDaIris(lab) {
  const { L, C, h } = lch(lab);
  if (C < 5) return L < 25 ? "preto" : "cinza";
  if (h >= 180 && h < 300) return C < 8 ? "cinza" : "azul";
  if (h >= 78 && h < 180) return C < 7 ? "cinza" : "verde";
  // matizes quentes (marrons) e avermelhados
  if (L < 18) return "preto";
  if (L < 30) return "castanho escuro";
  if (h >= 60 && h < 78 && C >= 15 && L >= 38) return "mel";
  return "castanho";
}

/** Anel médio da íris (0,5–0,8 do raio): sem pupila, sem o anel escuro da borda; só o que aparece entre as pálpebras. */
function amostrarIris(ctx, olho) {
  const { a, P } = ctx;
  const c = P(olho.irisCentro);
  const R = raioIris(ctx, olho);
  const contorno = olho.contorno.map(P);
  if (!c || !(R > 0) || contorno.some((p) => !p)) return { px: [], R: 0 };
  const px = a.circulo(c, 0.8 * R).filter((p) => {
    const dx = p.x + 0.5 - c.x, dy = p.y + 0.5 - c.y;
    return dx * dx + dy * dy >= (0.5 * R) ** 2 && dentro({ x: p.x + 0.5, y: p.y + 0.5 }, contorno) && !especular(p);
  });
  return { px, R };
}

function medirIris(ctx, g, fator) {
  const vazio = { ...corMedida(null, 0), familia: /** @type {const} */ ("castanho") };
  if (!ctx.temRosto || !ctx.a || !ctx.temIris) return vazio;
  const lados = [amostrarIris(ctx, OLHO_DIREITO), amostrarIris(ctx, OLHO_ESQUERDO)]
    // tira reflexos (15% mais claros) e sombra de cílios (15% mais escuros)
    .map(({ px, R }) => ({ px: faixaDeClaridade(px.map((p) => corrigir(p, g)), 0.15, 0.15), R }))
    .filter((l) => l.px.length >= 6);
  if (!lados.length) return vazio;
  const pixels = lados.flatMap((l) => l.px);
  const rgb = medianaRgb(pixels);
  let consistencia = 0.6;
  if (lados.length === 2) {
    const dE = deltaE2000(rgbParaLab(medianaRgb(lados[0].px)), rgbParaLab(medianaRgb(lados[1].px)));
    consistencia = limitar(1.2 - dE / 15, 0.2, 1);
  }
  const R = lados.reduce((s, l) => s + l.R, 0) / lados.length;
  const resolucao = limitar((R - 3) / 7, 0, 1); // raio < 3 px não diz nada; 10 px já é bom
  const cor = corMedida(rgb, fator * consistencia * resolucao * limitar(pixels.length / 60, 0, 1));
  return { ...cor, familia: familiaDaIris(cor.lab) };
}

function medirLabios(ctx, g, pele, fator) {
  const vazio = { ...corMedida(null, 0), pigmentacao: /** @type {const} */ ("media") };
  if (!ctx.temRosto || !ctx.a) return vazio;
  const externo = LABIOS_EXTERNO.map(ctx.P), interno = LABIOS_INTERNO.map(ctx.P);
  if (externo.some((p) => !p)) return vazio;
  const px = ctx.a
    .poligono(interno.every(Boolean) ? [externo, interno] : [externo], { maximo: 20000 })
    .filter((p) => !especular(p))
    .map((p) => corrigir(p, g))
    .filter((p) => {
      const lab = rgbParaLab(p);
      return !(lab.L > 65 && Math.hypot(lab.a, lab.b) < 14); // dentes: claros e quase sem cor
    });
  const limpas = faixaDeClaridade(px, 0.15, 0.1); // sombra da boca e brilho
  if (limpas.length < 10) return vazio;
  const cor = corMedida(medianaRgb(limpas), fator * limitar(limpas.length / 150, 0, 1));
  let pigmentacao = /** @type {"clara"|"media"|"marcada"} */ ("media");
  if (pele.confianca > 0) {
    const dE = deltaE2000(cor.lab, pele.lab);
    const dL = cor.lab.L - pele.lab.L;
    pigmentacao = dE < LIMITES_LABIOS.clara && dL > -10 ? "clara" : dE > LIMITES_LABIOS.marcada || dL < -22 ? "marcada" : "media";
  }
  return { ...cor, pigmentacao };
}
const LIMITES_LABIOS = { clara: 12, marcada: 24 };

function medirSobrancelhas(ctx, g, pele, fator) {
  if (!ctx.temRosto || !ctx.a) return corMedida(null, 0);
  const pixels = [SOBRANCELHA_DIREITA, SOBRANCELHA_ESQUERDA].flatMap((s) => {
    const anel = [...s.superior, ...[...s.inferior].reverse()].map(ctx.P);
    if (anel.some((p) => !p)) return [];
    const px = ctx.a.poligono(anel, { maximo: 12000 }).map((p) => corrigir(p, g));
    if (px.length < 4) return px;
    // pelos: os 25% mais escuros (o polígono também pega pele entre os fios)
    const l = px.map(lumaP);
    const corte = percentil(l, 0.25);
    return px.filter((_, i) => l[i] <= corte);
  });
  if (pixels.length < 8) return corMedida(null, 0);
  const rgb = medianaRgb(pixels);
  const lab = rgbParaLab(rgb);
  // pouco contraste com a pele = sobrancelha clara ou rala → medição menos segura
  const contraste = pele.confianca > 0 ? limitar((pele.lab.L - lab.L) / 20, 0.3, 1) : 0.5;
  return corMedida(rgb, fator * contraste * limitar(pixels.length / 40, 0, 1));
}

/** Rosto grande o bastante para ler detalhes finos (olheira, vermelhidão). */
const rostoLegivel = (ctx) => ctx.temRosto && !!ctx.a && ctx.larguraRosto >= LIMITES.tamanho.px[1];

function medirOlheira(ctx, g, pele) {
  const nada = { presente: false, tipo: /** @type {const} */ ("nenhuma"), intensidade: 0 };
  if (!rostoLegivel(ctx) || !(pele.confianca > 0)) return nada;
  const px = Object.values(SOB_OLHO).flatMap(({ perto, longe }) => {
    const anel = [...perto, ...[...longe].reverse()].map(ctx.P);
    return anel.some((p) => !p) ? [] : ctx.a.poligono(anel, { maximo: 12000 }).filter((p) => !especular(p)).map((p) => corrigir(p, g));
  });
  const limpas = faixaDeClaridade(px, 0.1, 0.1); // cílios e brilho
  if (limpas.length < 20) return nada;
  const lab = rgbParaLab(medianaRgb(limpas));
  const dL = lab.L - pele.lab.L, da = lab.a - pele.lab.a, db = lab.b - pele.lab.b;
  // a região sob os olhos é naturalmente um pouco mais escura (sombra do relevo)
  const intensidade = arred(limitar((-dL - 5) / 15, 0, 1), 2);
  if (intensidade < 0.2) return { ...nada, intensidade };
  const tipo = db < -2 ? (da > -1 ? "arroxeada" : "azulada") : "marrom";
  return { presente: true, tipo, intensidade };
}

function medirVermelhidao(ctx, g) {
  const nada = { presente: false, intensidade: 0 };
  if (!rostoLegivel(ctx)) return nada;
  const r = Math.max(1, 0.06 * ctx.larguraRosto);
  const aDe = (px) => {
    const v = faixaDeClaridade(px.filter((p) => !especular(p)).map((p) => corrigir(p, g)), 0.2, 0.1);
    return v.length >= 10 ? rgbParaLab(medianaRgb(v)).a : NaN;
  };
  const pele = amostrasPele(ctx);
  const testa = aDe(pele.testa);
  const bochechas = aDe([...pele.bochechaDireita, ...pele.bochechaEsquerda]);
  const nariz = aDe([...ctx.a.circulo(ctx.P(ASA_NARIZ.direita), r * 0.5), ...ctx.a.circulo(ctx.P(ASA_NARIZ.esquerda), r * 0.5)]);
  const zonas = [bochechas, nariz].filter(Number.isFinite);
  if (!Number.isFinite(testa) || !zonas.length) return nada;
  // a* (vermelho) das bochechas/asas do nariz acima do da testa
  const intensidade = arred(limitar((Math.max(...zonas) - testa - 3) / 12, 0, 1), 2);
  return { presente: intensidade > 0.2, intensidade };
}

/**
 * Proporções típicas (com os pontos do MediaPipe) de cada formato: comprimento 10–152 / largura
 * 234–454 (r), mandíbula (j), testa (t) e queixo (q) / largura. O ponto 10 fica abaixo da linha
 * do cabelo, então r é menor que a proporção "de livro".
 */
const PROTOTIPOS_ROSTO = {
  oval: { r: 1.24, j: 0.78, t: 0.87, q: 0.31 },
  redondo: { r: 1.08, j: 0.82, t: 0.88, q: 0.34 },
  quadrado: { r: 1.1, j: 0.88, t: 0.89, q: 0.37 },
  alongado: { r: 1.4, j: 0.79, t: 0.86, q: 0.32 },
  coracao: { r: 1.22, j: 0.72, t: 0.9, q: 0.27 },
  diamante: { r: 1.25, j: 0.73, t: 0.79, q: 0.29 },
};
const ESCALA_ROSTO = { r: 0.06, j: 0.03, t: 0.03, q: 0.03 };

/** Formato do rosto por proporções 3D (com o z do MediaPipe). Confiança no máximo moderada (0,6). */
function medirFormatoRosto(ctx) {
  const vazio = { formato: /** @type {const} */ ("oval"), proporcoes: {}, confianca: 0 };
  if (!ctx.temRosto) return vazio;
  const { P } = ctx;
  const largura = d3(P(PONTOS.rostoLarguraDireita), P(PONTOS.rostoLarguraEsquerda));
  if (!(largura > 0)) return vazio;
  const f = {
    r: d3(P(PONTOS.testaTopo), P(PONTOS.queixo)) / largura,
    j: d3(P(PONTOS.mandibulaDireita), P(PONTOS.mandibulaEsquerda)) / largura,
    t: d3(P(PONTOS.testaLarguraDireita), P(PONTOS.testaLarguraEsquerda)) / largura,
    q: d3(P(QUEIXO.direita), P(QUEIXO.esquerda)) / largura,
  };
  const proporcoes = {
    comprimentoLargura: arred(f.r),
    mandibulaLargura: arred(f.j),
    testaLargura: arred(f.t),
    queixoLargura: arred(f.q),
  };
  // protótipo mais próximo (distância normalizada) → probabilidade relativa
  const pesos = Object.entries(PROTOTIPOS_ROSTO).map(([nome, p]) => {
    const d = Object.keys(ESCALA_ROSTO).reduce((s, k) => s + ((f[k] - p[k]) / ESCALA_ROSTO[k]) ** 2, 0);
    return [nome, Math.exp(-d / 2)];
  });
  const total = pesos.reduce((s, [, w]) => s + w, 0);
  pesos.sort((x, y) => y[1] - x[1]);
  const prob = total > 0 ? pesos[0][1] / total : 0;
  const poseOk = Math.abs(ctx.pose.guinada) < 15 && Math.abs(ctx.pose.arfagem) < 15 ? 1 : 0.6;
  return {
    formato: /** @type {any} */ (total > 0 ? pesos[0][0] : "oval"),
    proporcoes,
    confianca: arred(limitar(0.6 * prob * poseOk, 0, 0.6), 2),
  };
}

function medirFormatoOlhos(ctx) {
  const vazio = { inclinacao: /** @type {const} */ ("reta"), distancia: /** @type {const} */ ("equilibrados"), possivelEncapuzado: false, proporcoes: {} };
  if (!ctx.temRosto) return vazio;
  const { P } = ctx;
  // inclinação canto interno → externo, no referencial do rosto (sem a rolagem da cabeça)
  const ang = (interno, externo, sinal) => {
    const a = P(interno), b = P(externo);
    if (!a || !b) return NaN;
    const pa = noRosto(ctx, a), pb = noRosto(ctx, b);
    return grau(Math.atan2(pb.v - pa.v, sinal * (pb.u - pa.u)));
  };
  // olho direito da pessoa: o canto externo fica do lado de u menor
  const inc = [ang(OLHO_DIREITO.cantoInterno, OLHO_DIREITO.cantoExterno, -1), ang(OLHO_ESQUERDO.cantoInterno, OLHO_ESQUERDO.cantoExterno, 1)].filter(Number.isFinite);
  const inclinacaoGraus = inc.length ? inc.reduce((s, v) => s + v, 0) / inc.length : 0;
  const larg = (d3(P(OLHO_DIREITO.cantoExterno), P(OLHO_DIREITO.cantoInterno)) + d3(P(OLHO_ESQUERDO.cantoExterno), P(OLHO_ESQUERDO.cantoInterno))) / 2;
  if (!(larg > 0)) return vazio;
  const entre = d3(P(OLHO_DIREITO.cantoInterno), P(OLHO_ESQUERDO.cantoInterno));
  const altura = (d3(P(OLHO_DIREITO.topo), P(OLHO_DIREITO.base)) + d3(P(OLHO_ESQUERDO.topo), P(OLHO_ESQUERDO.base))) / 2;
  // espaço entre a pálpebra (topo do olho) e a borda de baixo da sobrancelha logo acima
  const espaco = (topo, s) => d3(P(topo), media([P(s.inferior[2]), P(s.inferior[3])]));
  const palpebra = (espaco(OLHO_DIREITO.topo, SOBRANCELHA_DIREITA) + espaco(OLHO_ESQUERDO.topo, SOBRANCELHA_ESQUERDA)) / 2;
  const proporcoes = {
    inclinacaoGraus: arred(inclinacaoGraus, 2),
    distanciaEntreOlhos: arred(entre / larg), // distância entre os cantos internos / largura do olho
    alturaLargura: arred(altura / larg),
    palpebraSobrancelha: arred(palpebra / larg),
    confiancaEncapuzado: 0.3, // os pontos não mostram o vinco da pálpebra: é só um indício
  };
  return {
    inclinacao: inclinacaoGraus >= 8 ? "para cima" : inclinacaoGraus <= 0 ? "para baixo" : "reta",
    // nas fotos de teste, olhos comuns ficam entre ~1,1 e ~1,35 (os pontos variam ±0,06 na mesma pessoa)
    distancia: proporcoes.distanciaEntreOlhos < 1.02 ? "juntos" : proporcoes.distanciaEntreOlhos > 1.36 ? "separados" : "equilibrados",
    possivelEncapuzado: palpebra > 0 && proporcoes.palpebraSobrancelha < 0.38,
    proporcoes,
  };
}

function medirFormatoBoca(ctx) {
  const vazio = { volume: /** @type {const} */ ("media"), equilibrio: /** @type {const} */ ("equilibrada"), proporcoes: {} };
  if (!ctx.temRosto) return vazio;
  const { P } = ctx;
  const largura = d3(P(PONTOS.bocaCantoDireito), P(PONTOS.bocaCantoEsquerdo));
  const larguraRosto = d3(P(PONTOS.rostoLarguraDireita), P(PONTOS.rostoLarguraEsquerda));
  if (!(largura > 0 && larguraRosto > 0)) return vazio;
  const sup = d3(P(PONTOS.labioSuperiorTopo), P(PONTOS.labioSuperiorBase));
  const inf = d3(P(PONTOS.labioInferiorTopo), P(PONTOS.labioInferiorBase));
  const proporcoes = {
    alturaLargura: arred((sup + inf) / largura),
    // altura dos lábios / largura do rosto: o sorriso estica a boca, mas muda pouco esta medida
    alturaRosto: arred((sup + inf) / larguraRosto),
    superiorInferior: arred(inf > 0 ? sup / inf : 1),
    larguraBocaRosto: arred(largura / larguraRosto),
  };
  return {
    volume: proporcoes.alturaRosto < 0.1 ? "fina" : proporcoes.alturaRosto > 0.16 ? "carnuda" : "media",
    equilibrio: proporcoes.superiorInferior < 0.6 ? "superior menor" : proporcoes.superiorInferior > 1.0 ? "superior maior" : "equilibrada",
    proporcoes,
  };
}

/** Contraste pessoal: diferença de claridade (L*) da pele para sobrancelhas (peso 0,6) e íris (0,4). */
function medirContraste(pele, sobrancelhas, olhos) {
  if (!(pele.confianca > 0)) return { contraste: /** @type {const} */ ("medio"), valor: 0 };
  const partes = [];
  if (sobrancelhas.confianca > 0) partes.push([Math.abs(pele.lab.L - sobrancelhas.lab.L), 0.6]);
  if (olhos.confianca > 0) partes.push([Math.abs(pele.lab.L - olhos.lab.L), 0.4]);
  if (!partes.length) return { contraste: "medio", valor: 0 };
  const valor = partes.reduce((s, [v, p]) => s + v * p, 0) / partes.reduce((s, [, p]) => s + p, 0);
  return { contraste: valor < 25 ? "baixo" : valor >= 40 ? "alto" : "medio", valor: arred(valor, 1) };
}

/** Diagnóstico (bastidores e calibração): números intermediários. Não faz parte do contrato. */
export function _diagnostico(deteccao, amostrador) {
  const ctx = preparar(deteccao, amostrador);
  if (!ctx.temRosto) return { temRosto: false };
  return {
    temRosto: true,
    pose: ctx.pose,
    larguraRosto: ctx.larguraRosto,
    luz: ctx.a ? medidasDeLuz(ctx) : null,
    nitidez: ctx.a ? medirNitidez(ctx) : NaN,
    escleras: ctx.a ? escleras(ctx).map((o) => ({ ref: o.ref, n: o.n, L: o.L })) : [],
  };
}
