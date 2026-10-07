// Motor de pintura da make: desenha cada camada (base → batom) sobre a foto ou o vídeo da câmera,
// a partir dos 478 pontos do MediaPipe. Usado no Modo Ao Vivo (30 qps) e na prévia sobre a foto.
//
// Técnica: para cada camada, uma MÁSCARA suave (polígonos dos pontos, desfocada na proporção do
// rosto) é desenhada num canvas fora da tela, colorida e composta na imagem com modos de mistura.
// A cor é aplicada como "ganho" por canal (alvo ÷ cor medida da região): multiply onde a cor
// escurece e soma (lighter) onde clareia. Assim a textura da pele e dos lábios continua lá —
// parece produto na pele, não adesivo. Todos os canvases são reaproveitados entre quadros.
//
// A parte geométrica (polígonos, brilhos estáveis, ganho de cor) é pura e exportada para os testes.

import {
  OVAL, LABIOS_EXTERNO, LABIOS_INTERNO, OLHO_DIREITO, OLHO_ESQUERDO,
  SOBRANCELHA_DIREITA, SOBRANCELHA_ESQUERDA, PONTOS, dist, interp, meio,
} from "./regioes.js";
import { hexParaRgb, medianaRgb, misturar } from "./cor.js";

/** @typedef {import("./tipos.js").EstadoMake} EstadoMake */
/** @typedef {import("./tipos.js").Camada} Camada */
/** @typedef {import("./tipos.js").Categoria} Categoria */
/** @typedef {{x:number,y:number}} XY */
/** @typedef {{r:number,g:number,b:number}} RGB */
/** @typedef {{x:number,y:number,w:number,h:number}} Retangulo */

export const ESTILOS_SOMBRA = ["palpebra", "esfumado", "asa"];
export const ESTILOS_DELINEADO = ["fino", "gatinho", "marcado"];
/** Ordem em que as camadas são pintadas (de baixo para cima). */
export const ORDEM_CAMADAS = /** @type {Categoria[]} */ (["base", "corretivo", "contorno", "blush", "iluminador", "sombra", "delineado", "mascara", "sobrancelha", "batom"]);

/** Maior lado interno do canvas (desempenho no celular). */
export const LIMITE_LADO = 1280;

// ───────────────────────── utilidades puras ─────────────────────────

const fin = (v) => typeof v === "number" && Number.isFinite(v);
const lim = (v, a, b) => (v < a ? a : v > b ? b : v);
const suave01 = (a, b, t) => {
  const x = lim((t - a) / (b - a || 1e-9), 0, 1);
  return x * x * (3 - 2 * x);
};
const somar = (a, b, k = 1) => ({ x: a.x + b.x * k, y: a.y + b.y * k });
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
const escalar = (a, k) => ({ x: a.x * k, y: a.y * k });
const norm = (v) => {
  const l = Math.hypot(v.x, v.y);
  return l > 1e-9 ? { x: v.x / l, y: v.y / l } : { x: 0, y: -1 };
};
const pontoMedio = (pts) => {
  let x = 0, y = 0;
  for (const p of pts) { x += p.x; y += p.y; }
  return { x: x / (pts.length || 1), y: y / (pts.length || 1) };
};
const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Valida e normaliza uma camada do estado. Devolve null se estiver desligada. */
export function camadaValida(c) {
  if (!c || typeof c !== "object" || typeof c.cor !== "string" || !HEX.test(c.cor.trim())) return null;
  const intensidade = lim(fin(c.intensidade) ? c.intensidade : 0.6, 0, 1);
  if (intensidade < 0.004) return null;
  const cor = c.cor.trim().startsWith("#") ? c.cor.trim() : "#" + c.cor.trim();
  const cores = Array.isArray(c.cores) ? c.cores.filter((h) => typeof h === "string" && HEX.test(h.trim())).map((h) => (h.trim().startsWith("#") ? h.trim() : "#" + h.trim())) : [];
  return { cor, intensidade, acabamento: c.acabamento ?? "matte", estilo: typeof c.estilo === "string" ? c.estilo : undefined, cores };
}

/**
 * Converte os pontos normalizados em pixels do canvas (espelhando se preciso).
 * Devolve null se os pontos não servem (menos de 468, valores não finitos ou rosto minúsculo).
 * @param {{x:number,y:number}[]} pontos @param {number} largura @param {number} altura @param {boolean} [espelhar]
 * @returns {(XY|null)[]|null}
 */
export function paraPixels(pontos, largura, altura, espelhar = false) {
  if (!Array.isArray(pontos) || pontos.length < 468 || !(largura > 0) || !(altura > 0)) return null;
  const out = new Array(pontos.length);
  for (let i = 0; i < pontos.length; i++) {
    const p = pontos[i];
    if (!p || !fin(p.x) || !fin(p.y) || Math.abs(p.x) > 10 || Math.abs(p.y) > 10) {
      if (i < 468) return null;
      out[i] = null;
      continue;
    }
    out[i] = { x: (espelhar ? 1 - p.x : p.x) * largura, y: p.y * altura };
  }
  const u = dist(out[PONTOS.rostoLarguraDireita], out[PONTOS.rostoLarguraEsquerda]);
  if (!(u >= 8)) return null;
  return out;
}

/** Retângulo inteiro que envolve os pontos com margem, recortado à imagem (null se vazio). */
export function retangulo(pts, margem, largura, altura) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) {
    if (!p || !fin(p.x) || !fin(p.y)) continue;
    if (p.x < x0) x0 = p.x; if (p.y < y0) y0 = p.y;
    if (p.x > x1) x1 = p.x; if (p.y > y1) y1 = p.y;
  }
  if (!fin(x0) || !fin(x1)) return null;
  const m = fin(margem) ? Math.max(0, margem) : 0;
  const x = Math.max(0, Math.floor(x0 - m)), y = Math.max(0, Math.floor(y0 - m));
  const xf = Math.min(largura, Math.ceil(x1 + m)), yf = Math.min(altura, Math.ceil(y1 + m));
  if (!(xf - x >= 1 && yf - y >= 1)) return null;
  return { x, y, w: xf - x, h: yf - y };
}

/** Reamostra uma polilinha aberta em n pontos igualmente espaçados pelo comprimento. */
export function reamostrar(pts, n) {
  if (pts.length < 2 || n < 2) return pts.map((p) => ({ x: p.x, y: p.y }));
  const acum = [0];
  for (let i = 1; i < pts.length; i++) acum.push(acum[i - 1] + dist(pts[i - 1], pts[i]));
  const total = acum[acum.length - 1];
  if (!(total > 1e-9)) return Array.from({ length: n }, () => ({ x: pts[0].x, y: pts[0].y }));
  const out = [];
  let j = 1;
  for (let k = 0; k < n; k++) {
    const alvo = (total * k) / (n - 1);
    while (j < pts.length - 1 && acum[j] < alvo) j++;
    const seg = acum[j] - acum[j - 1] || 1e-9;
    out.push(interp(pts[j - 1], pts[j], lim((alvo - acum[j - 1]) / seg, 0, 1)));
  }
  return out;
}

/** Normais unitárias de uma polilinha, orientadas para o lado de `lado` (vetor de referência). */
export function normais(pts, lado) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let n = norm({ x: -(b.y - a.y), y: b.x - a.x });
    if (n.x * lado.x + n.y * lado.y < 0) n = { x: -n.x, y: -n.y };
    return n;
  });
}

/** Ponto dentro do polígono (regra par-ímpar). */
export function pontoNoPoligono(p, poli) {
  let dentro = false;
  for (let i = 0, j = poli.length - 1; i < poli.length; j = i++) {
    const a = poli[i], b = poli[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y || 1e-12) + a.x) dentro = !dentro;
  }
  return dentro;
}

/**
 * Ganho de cor por canal para levar a cor média `medio` até o `alvo`, preservando a textura:
 * pixel × mult (onde escurece) + soma (onde clareia). Valores 0–255.
 * @param {RGB} alvo @param {RGB} medio @param {{soEscurecer?:boolean}} [op]
 * @returns {{mult:RGB, soma:RGB, temSoma:boolean}}
 */
export function ganhoDeCor(alvo, medio, op = {}) {
  const mult = { r: 255, g: 255, b: 255 }, soma = { r: 0, g: 0, b: 0 };
  let temSoma = false;
  for (const k of ["r", "g", "b"]) {
    const t = lim(fin(alvo?.[k]) ? alvo[k] : 0, 0, 255);
    const m = lim(fin(medio?.[k]) ? medio[k] : 128, 8, 255);
    if (t <= m) mult[k] = Math.round((255 * t) / m);
    else if (!op.soEscurecer) {
      soma[k] = Math.round(t - m);
      if (soma[k] > 0) temSoma = true;
    }
  }
  return { mult, soma, temSoma };
}

/**
 * Mediana das cores (RGBA cru) dentro de regiões: polígono (menos `fora`) ou disco.
 * @param {Uint8ClampedArray|number[]} dados @param {number} largura @param {number} altura
 * @param {{poli?:XY[], fora?:XY[], disco?:{c:XY, r:number}}[]} testes
 * @returns {RGB|null}
 */
export function coletarCores(dados, largura, altura, testes) {
  const lista = [];
  const add = (x, y) => { const o = (y * largura + x) * 4; lista.push({ r: dados[o], g: dados[o + 1], b: dados[o + 2] }); };
  for (const t of testes) {
    if (t.disco) {
      const { c, r } = t.disco;
      if (!fin(c?.x) || !fin(c?.y) || !(r > 0)) continue;
      for (let y = Math.max(0, Math.floor(c.y - r)); y < Math.min(altura, Math.ceil(c.y + r)); y++)
        for (let x = Math.max(0, Math.floor(c.x - r)); x < Math.min(largura, Math.ceil(c.x + r)); x++)
          if ((x + 0.5 - c.x) ** 2 + (y + 0.5 - c.y) ** 2 <= r * r) add(x, y);
      continue;
    }
    if (!t.poli || t.poli.length < 3) continue;
    const bb = retangulo(t.poli, 0, largura, altura);
    if (!bb) continue;
    for (let y = bb.y; y < bb.y + bb.h; y++)
      for (let x = bb.x; x < bb.x + bb.w; x++) {
        const q = { x: x + 0.5, y: y + 0.5 };
        if (pontoNoPoligono(q, t.poli) && !(t.fora && pontoNoPoligono(q, t.fora))) add(x, y);
      }
  }
  return lista.length >= 3 ? medianaRgb(lista) : null;
}

const css = (c) => `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`;

/** Gerador pseudoaleatório determinístico (mulberry32). */
export function aleatorio(semente) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Brilhos (glitter/cintilante) em posições ESTÁVEIS: cada um é guardado como (faixa, u, v)
 * relativo a duas linhas de pontos do rosto, então acompanha o rosto sem piscar entre quadros.
 * @param {number} semente @param {number} n @param {number} faixas  número de quadriláteros
 * @param {{vMin?:number, vMax?:number, pesoV?:number}} [op]
 * @returns {{q:number,u:number,v:number,tam:number,forca:number}[]}
 */
export function brilhosEstaveis(semente, n, faixas, op = {}) {
  const r = aleatorio(semente);
  const vMin = op.vMin ?? 0.12, vMax = op.vMax ?? 0.88, peso = op.pesoV ?? 1;
  const out = [];
  for (let i = 0; i < n && faixas > 0; i++) {
    out.push({
      q: Math.floor(r() * faixas) % faixas,
      u: r(),
      v: vMin + (vMax - vMin) * Math.pow(r(), peso),
      tam: 0.35 + 0.65 * Math.pow(r(), 2.2),
      forca: 0.35 + 0.65 * r(),
    });
  }
  return out;
}

/** Posição de um brilho entre duas linhas A (borda) e B (outra borda); fechadas = anel. */
export function posicaoBrilho(b, A, B, fechadas = false) {
  const n = Math.min(A.length, B.length);
  if (n < 2) return null;
  const faixas = fechadas ? n : n - 1;
  const q = lim(b.q, 0, faixas - 1), q2 = (q + 1) % n;
  const a = interp(A[q], A[q2], b.u), c = interp(B[q], B[q2], b.u);
  return interp(a, c, b.v);
}

// ───────────────────────── geometria do rosto ─────────────────────────

/** Medidas básicas do rosto em pixels. */
export function medirRosto(P) {
  const u = Math.max(dist(P[PONTOS.rostoLarguraDireita], P[PONTOS.rostoLarguraEsquerda]), 1);
  const caixa = retangulo(OVAL.map((i) => P[i]), 0, Infinity, Infinity);
  const angulo = Math.atan2(P[263].y - P[33].y, P[263].x - P[33].x);
  return { u, caixa, angulo };
}

// Anéis acima da pálpebra (MediaPipe, de fora para dentro): anel1 ≈ vinco, anel2 ≈ osso abaixo da
// sobrancelha. "abaixoSobr" é a linha logo abaixo da fileira inferior da sobrancelha.
const LADOS = {
  direito: { olho: OLHO_DIREITO, sobr: SOBRANCELHA_DIREITA, anel1: [247, 30, 29, 27, 28, 56, 190], anel2: [113, 225, 224, 223, 222, 221, 189], abaixoSobr: [46, 224, 223, 222, 55] },
  esquerdo: { olho: OLHO_ESQUERDO, sobr: SOBRANCELHA_ESQUERDA, anel1: [467, 260, 259, 257, 258, 286, 414], anel2: [342, 445, 444, 443, 442, 441, 413], abaixoSobr: [276, 444, 443, 442, 285] },
};

/**
 * Geometria de um olho: linha dos cílios (de fora para dentro), eixo (para fora), "cima" (para a
 * sobrancelha), largura, contorno e a sobrancelha projetada sobre cada ponto dos cílios.
 * @param {XY[]} P @param {"direito"|"esquerdo"} lado
 */
export function geometriaOlho(P, lado) {
  const { olho: O, sobr: S, anel1, anel2 } = LADOS[lado];
  const ext = P[O.cantoExterno], int = P[O.cantoInterno];
  const larg = Math.max(dist(ext, int), 1e-3);
  const eixo = norm(sub(ext, int));
  const centro = meio(ext, int);
  const sobInf = S.inferior.map((i) => P[i]);
  let cima = { x: eixo.y, y: -eixo.x };
  const ms = pontoMedio(sobInf);
  if ((ms.x - centro.x) * cima.x + (ms.y - centro.y) * cima.y < 0) cima = { x: -cima.x, y: -cima.y };
  const cilios = reamostrar(O.palpebraSuperior.map((i) => P[i]), 15); // fora → dentro
  const inferior = O.palpebraInferior.map((i) => P[i]);
  const contorno = O.contorno.map((i) => P[i]);
  // posição de cada ponto da sobrancelha no eixo do olho (0 = canto interno, 1 = externo)
  const proj = (p) => ((p.x - int.x) * eixo.x + (p.y - int.y) * eixo.y) / larg;
  // ponto de uma linha "acima" de cada ponto dos cílios (mesma posição no eixo do olho)
  const projetar = (linha) => {
    const sp = linha.map((p) => ({ p, s: proj(p) })).sort((a, b) => a.s - b.s);
    return cilios.map((c) => {
      const t = proj(c);
      if (t <= sp[0].s) return somar(sp[0].p, eixo, (t - sp[0].s) * larg);
      for (let k = 1; k < sp.length; k++) {
        if (t <= sp[k].s) return interp(sp[k - 1].p, sp[k].p, (t - sp[k - 1].s) / (sp[k].s - sp[k - 1].s || 1e-9));
      }
      const u = sp[sp.length - 1];
      return somar(u.p, eixo, (t - u.s) * larg);
    });
  };
  const sobreCilio = projetar(sobInf);
  const vinco1 = projetar(anel1.map((i) => P[i]));
  const vinco2 = projetar(anel2.map((i) => P[i]));
  const tCilio = cilios.map((c) => lim(proj(c), 0, 1));
  return { ext, int, larg, eixo, cima, centro, cilios, inferior, contorno, sobreCilio, vinco1, vinco2, tCilio, sobrancelha: S };
}

/**
 * Curva acima dos cílios na altura h(t): 0 = cílios, 1 = vinco (anel1), 2 = osso abaixo da
 * sobrancelha (anel2). t = 0 no canto interno, 1 no externo. Nunca passa do anel2.
 */
function vinco(g, h) {
  return g.cilios.map((c, i) => {
    const a = lim(h(g.tCilio[i]), 0, 1.9);
    return a <= 1 ? interp(c, g.vinco1[i], a) : interp(g.vinco1[i], g.vinco2[i], a - 1);
  });
}

const ALTURA_SOMBRA = {
  palpebra: (t) => 0.95 + 0.2 * t,
  esfumado: (t) => 1.15 + 0.35 * t,
  asa: (t) => 1.0 + 0.3 * t,
};

/**
 * Polígonos da sombra em camadas (mais intensa perto dos cílios) e a ponta da asa.
 * @returns {{camadas:{poli:XY[], alfa:number}[], vinco:XY[], ponta:XY|null, g:ReturnType<typeof geometriaOlho>}}
 */
export function geometriaSombra(P, lado, estilo = "palpebra") {
  const g = geometriaOlho(P, lado);
  const est = ESTILOS_SOMBRA.includes(estilo) ? estilo : "palpebra";
  const h = ALTURA_SOMBRA[est];
  let ponta = null;
  if (est === "asa") ponta = somar(somar(g.ext, g.eixo, 0.34 * g.larg), g.cima, 0.24 * g.larg);
  else ponta = somar(somar(g.ext, g.eixo, 0.09 * g.larg), g.cima, 0.06 * g.larg);
  const niveis = est === "esfumado"
    ? [[0.45, 0.6], [0.8, 0.45], [1.12, 0.35]]
    : est === "asa" ? [[0.45, 0.6], [0.8, 0.45], [1.05, 0.3]] : [[0.5, 0.6], [0.85, 0.45], [1.05, 0.25]];
  const camadas = niveis.map(([k, alfa]) => {
    const v = vinco(g, (t) => h(t) * k);
    const p = est === "asa" ? interp(g.ext, ponta, Math.min(1, k)) : ponta;
    // cílios de fora para dentro, vinco de dentro para fora, ponta externa
    return { poli: [...g.cilios, ...v.slice().reverse(), p], alfa };
  });
  // côncavo: faixa em volta do vinco, da metade do olho para fora (cor escura dá profundidade)
  const baixo = vinco(g, (t) => h(t) * 0.6), alto = vinco(g, (t) => h(t) * (est === "palpebra" ? 1.0 : 1.08));
  const idx = g.tCilio.map((t, i) => [t, i]).filter(([t]) => t >= 0.42).map(([, i]) => i); // de fora para dentro
  const concavo = idx.length >= 2
    ? [...idx.map((i) => alto[i]), ...idx.slice().reverse().map((i) => baixo[i]), est === "asa" ? ponta : somar(g.ext, g.eixo, 0.05 * g.larg)]
    : [];
  return { camadas, concavo, vinco: vinco(g, h), ponta, g };
}

/** Polígono do delineado (afina no canto interno; gatinho = extensão para cima/fora). */
export function geometriaDelineado(P, lado, estilo = "fino") {
  const g = geometriaOlho(P, lado);
  const est = ESTILOS_DELINEADO.includes(estilo) ? estilo : "fino";
  const L = reamostrar(g.cilios.slice().reverse(), 18); // dentro → fora
  const N = normais(L, g.cima);
  const max = { fino: 0.05, gatinho: 0.065, marcado: 0.09 }[est] * g.larg;
  const inicio = est === "marcado" ? 0.3 : 0.12;
  const sup = [], inf = [];
  L.forEach((p, i) => {
    const t = i / (L.length - 1);
    const e = max * (inicio + (1 - inicio) * suave01(0, est === "marcado" ? 0.55 : 0.75, t));
    sup.push(somar(p, N[i], e));
    inf.push(somar(p, N[i], -e * 0.12));
  });
  // direção da ponta: segue o eixo do olho levantada ~20° (um pouco do ângulo da pálpebra inferior)
  const inf2 = g.inferior[2] ?? g.int;
  const dirInf = norm(sub(g.ext, inf2));
  const ang = { fino: 0.2, gatinho: 0.36, marcado: 0.3 }[est];
  const dirEixo = norm(somar(escalar(g.eixo, Math.cos(ang)), g.cima, Math.sin(ang)));
  const dir = norm(somar(escalar(dirEixo, 0.75), dirInf, 0.25));
  const comp = { fino: 0.07, gatinho: 0.3, marcado: 0.16 }[est] * g.larg;
  const ponta = somar(g.ext, dir, comp);
  // a borda de baixo prolonga a linha dos cílios até a ponta; a de cima volta da ponta até ~70%
  // da pálpebra, formando o triângulo do gatinho
  const corte = est === "fino" ? 1 : est === "marcado" ? 0.85 : 0.72;
  const supUsado = sup.filter((_, i) => i / (sup.length - 1) <= corte);
  const poli = [...inf, ponta, ...supUsado.slice().reverse()];
  return { poli, ponta, g, espessura: max };
}

/**
 * Cílios: fios curvos e afinando, com variação estável (mesma semente → mesmos fios em todo
 * quadro), mais longos e abertos para fora no canto externo; os de baixo, curtos e leves.
 */
export function geometriaMascara(P, lado) {
  const g = geometriaOlho(P, lado);
  const L = reamostrar(g.cilios.slice().reverse(), 30); // dentro → fora
  const N = normais(L, g.cima);
  const rnd = aleatorio(lado === "direito" ? 11 : 12);
  const fios = [];
  const n = 38;
  for (let i = 0; i < n; i++) {
    const t = lim((i + 0.5 + (rnd() - 0.5) * 0.8) / n, 0.04, 1);
    const pos = t * (L.length - 1), j = Math.floor(pos), f = pos - j;
    const base0 = interp(L[j], L[Math.min(L.length - 1, j + 1)], f);
    const nn = norm(interp(N[j], N[Math.min(N.length - 1, j + 1)], f));
    const sino = Math.sin(Math.PI * Math.min(1, 0.15 + t * 0.85));
    const comp = g.larg * (0.07 + 0.08 * sino + 0.04 * t) * (0.8 + 0.4 * rnd());
    let dir = norm(somar(nn, g.eixo, 0.1 + 0.9 * t * t));
    const giro = (rnd() - 0.5) * 0.25;
    dir = { x: dir.x * Math.cos(giro) - dir.y * Math.sin(giro), y: dir.x * Math.sin(giro) + dir.y * Math.cos(giro) };
    const base = somar(base0, nn, 0.008 * g.larg);
    // curvatura para cima (cílio curvado)
    const curva = somar(somar(base, dir, comp * 0.55), nn, comp * 0.12);
    fios.push({ base, ponta: somar(somar(base, dir, comp), nn, comp * 0.15), curva, larg: g.larg * (0.012 + 0.006 * rnd()), t });
  }
  const inf = reamostrar(g.inferior.slice().reverse(), 16); // dentro → fora
  const baixo = { x: -g.cima.x, y: -g.cima.y };
  const NI = normais(inf, baixo);
  const fiosInf = [];
  for (let i = 6; i < inf.length - 1; i++) {
    const t = i / (inf.length - 1);
    const dir = norm(somar(NI[i], g.eixo, 0.5 * t));
    fiosInf.push({ base: inf[i], ponta: somar(inf[i], dir, g.larg * (0.035 + 0.04 * t) * (0.8 + 0.4 * rnd())), larg: g.larg * 0.008, t });
  }
  return { linha: L, normais: N, fios, fiosInf, g };
}

/** Polígono da sobrancelha (de fora para dentro em cima, de dentro para fora embaixo). */
export function geometriaSobrancelha(P, lado) {
  const { sobr: S, abaixoSobr } = LADOS[lado];
  const sup = S.superior.map((i) => P[i]);
  // a fileira "inferior" do MediaPipe passa pelo MEIO dos fios: descemos em direção ao osso
  const desce = [0, 0.35, 0.6, 0.6, 0];
  const inf = S.inferior.map((i, k) => interp(P[i], P[abaixoSobr[k]], desce[k]));
  return { poli: [...sup, ...inf.slice().reverse()], externo: meio(sup[0], inf[0]), interno: meio(sup[sup.length - 1], inf[inf.length - 1]) };
}

/** Blush: elipse nas maçãs, inclinada para a têmpora. */
export function geometriaBlush(P, lado) {
  const d = lado === "direito";
  const maca = interp(P[d ? 50 : 280], P[d ? 101 : 330], 0.45);
  const tempora = P[d ? 127 : 356];
  const eixo = norm(sub(tempora, maca));
  const L = dist(maca, tempora);
  const centro = somar(maca, eixo, L * 0.08);
  return { centro, angulo: Math.atan2(eixo.y, eixo.x), rx: L * 0.5, ry: L * 0.3 };
}

/** Contorno: faixa abaixo do osso da bochecha (da orelha para o canto da boca, até ~2/3), têmpora e mandíbula. */
export function geometriaContorno(P, lado) {
  const d = lado === "direito";
  const orelha = interp(P[d ? 93 : 323], P[d ? 132 : 361], 0.35);
  const boca = P[d ? 61 : 291];
  const fim = interp(orelha, boca, 0.66);
  const faixa = [orelha, interp(orelha, boca, 0.33), fim];
  const tempora = interp(P[d ? 54 : 284], P[d ? 127 : 356], 0.55);
  const mandibula = (d ? [132, 58, 172, 136, 150, 149, 176] : [361, 288, 397, 365, 379, 378, 400]).map((i) => P[i]);
  return { faixa, tempora, mandibula };
}

/** Iluminador: topo das maçãs (traço curto), dorso do nariz e arco do cupido. */
export function geometriaIluminador(P) {
  const lado = (d) => {
    const a = interp(P[d ? 118 : 347], P[d ? 101 : 330], 0.3);
    const b0 = interp(P[d ? 116 : 345], P[d ? 123 : 352], 0.3);
    const b = interp(b0, a, 0.15);
    return [a, interp(a, b, 0.5), b];
  };
  const cupido = P[PONTOS.arcoDoCupido];
  const acima = somar(cupido, sub(cupido, P[PONTOS.labioSuperiorBase]), 0.28);
  return { macaDireita: lado(true), macaEsquerda: lado(false), nariz: [P[168], P[6], P[197], P[195]], cupido: acima };
}

/** Corretivo: triângulo suave sob o olho. */
export function geometriaCorretivo(P, lado) {
  const g = geometriaOlho(P, lado);
  const baixo = { x: -g.cima.x, y: -g.cima.y };
  const inf = g.inferior.map((p) => somar(p, baixo, 0.05 * g.larg)); // fora → dentro
  const ponta = somar(somar(g.centro, baixo, 0.95 * g.larg), g.eixo, -0.05 * g.larg);
  return { poli: [...inf, somar(g.int, baixo, 0.25 * g.larg), ponta, somar(g.ext, baixo, 0.3 * g.larg)], g };
}

/** Pontos dos lábios (externo e interno têm 20 pontos em correspondência). */
export function geometriaLabios(P) {
  const ext = LABIOS_EXTERNO.map((i) => P[i]), int = LABIOS_INTERNO.map((i) => P[i]);
  const larg = Math.max(dist(P[61], P[291]), 1e-3);
  const eixo = norm(sub(P[291], P[61]));
  const espInf = dist(P[14], P[17]), espSup = dist(P[0], P[13]);
  const abertura = dist(P[13], P[14]) / larg;
  return { ext, int, larg, eixo, espInf, espSup, abertura };
}

// ───────────────────────── desenho de caminhos ─────────────────────────

/** Caminho por Catmull-Rom (passa por todos os pontos), fechado ou aberto. */
function tracar(ctx, pts, fechado = true, suave = true) {
  const n = pts.length;
  if (n < 2) return;
  ctx.moveTo(pts[0].x, pts[0].y);
  if (!suave || n < 3) {
    for (let i = 1; i < n; i++) ctx.lineTo(pts[i].x, pts[i].y);
    if (fechado) ctx.closePath();
    return;
  }
  const m = fechado ? n : n - 1;
  const at = (i) => (fechado ? pts[(i + n) % n] : pts[lim(i, 0, n - 1)]);
  for (let i = 0; i < m; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    ctx.bezierCurveTo(p1.x + (p2.x - p0.x) / 6, p1.y + (p2.y - p0.y) / 6, p2.x - (p3.x - p1.x) / 6, p2.y - (p3.y - p1.y) / 6, p2.x, p2.y);
  }
  if (fechado) ctx.closePath();
}

function elipse(ctx, c, rx, ry, ang) {
  ctx.moveTo(c.x + Math.cos(ang) * rx, c.y + Math.sin(ang) * rx);
  ctx.ellipse(c.x, c.y, Math.max(0.01, rx), Math.max(0.01, ry), ang, 0, Math.PI * 2);
}

// ───────────────────────── o pintor ─────────────────────────

/**
 * Cria o pintor ligado a um canvas.
 * @param {HTMLCanvasElement|OffscreenCanvas} canvas
 */
export function criarPintor(canvas) {
  const ctx = canvas.getContext("2d");
  const doc = canvas?.ownerDocument ?? (typeof document !== "undefined" ? document : null);
  const novoCanvas = (w = 1, h = 1) => {
    if (doc?.createElement) { const c = doc.createElement("canvas"); c.width = w; c.height = h; return c; }
    if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
    return null;
  };

  /** Canvases de trabalho (crescem, nunca encolhem; só são recriados no liberar). */
  const telas = {};
  const tela = (nome, w, h, ler = false) => {
    let t = telas[nome];
    if (!t) {
      const c = novoCanvas(Math.max(1, w), Math.max(1, h));
      if (!c) return null;
      const x = c.getContext("2d", ler ? { willReadFrequently: true } : undefined);
      if (!x) return null;
      t = telas[nome] = { c, x };
    }
    if (t.c.width < w || t.c.height < h) {
      t.c.width = Math.max(t.c.width, Math.ceil(w / 64) * 64);
      t.c.height = Math.max(t.c.height, Math.ceil(h / 64) * 64);
    }
    return t;
  };

  // ctx.filter = "blur()" existe? (Safari antigo não tem: usamos reduzir e ampliar)
  let temFiltro = false;
  try {
    const t = novoCanvas(2, 2)?.getContext("2d");
    if (t && "filter" in t) { t.filter = "blur(1px)"; temFiltro = t.filter === "blur(1px)"; }
  } catch { temFiltro = false; }

  const zerar = (x) => {
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = "source-over";
    x.globalAlpha = 1;
    if (temFiltro) x.filter = "none";
  };

  /** Desfoca, no lugar, a área (0,0,sw,sh) de uma tela. raio em pixels dessa tela. */
  function desfocar(t, sw, sh, raio) {
    if (!(raio >= 0.35)) return;
    const tmp = tela("desfoque", sw, sh);
    if (!tmp) return;
    t.x.save();
    zerar(tmp.x); tmp.x.clearRect(0, 0, sw, sh);
    zerar(t.x);
    if (temFiltro) {
      tmp.x.filter = `blur(${raio.toFixed(2)}px)`;
      tmp.x.drawImage(t.c, 0, 0, sw, sh, 0, 0, sw, sh);
      tmp.x.filter = "none";
      t.x.clearRect(0, 0, sw, sh);
      t.x.drawImage(tmp.c, 0, 0, sw, sh, 0, 0, sw, sh);
    } else {
      // reduzir e ampliar duas vezes (aproxima um desfoque gaussiano)
      const k = Math.max(1, raio / 1.1);
      const tw = Math.max(1, Math.round(sw / k)), th = Math.max(1, Math.round(sh / k));
      for (let r = 0; r < 2; r++) {
        tmp.x.clearRect(0, 0, sw, sh);
        tmp.x.imageSmoothingEnabled = true;
        tmp.x.drawImage(t.c, 0, 0, sw, sh, 0, 0, tw, th);
        t.x.clearRect(0, 0, sw, sh);
        t.x.imageSmoothingEnabled = true;
        t.x.drawImage(tmp.c, 0, 0, tw, th, 0, 0, sw, sh);
      }
    }
    t.x.restore();
  }

  /**
   * Aplica uma camada: `mascara(m, s, aux)` desenha o alfa (em coordenadas da imagem) na tela de
   * máscara; cada passo colore a máscara e compõe na imagem com o modo e o alfa dados.
   * @param {Retangulo} r @param {number} s escala da tela de trabalho (1 = resolução cheia)
   */
  function aplicar(r, s, mascara, passos) {
    if (!r) return;
    const sw = Math.max(1, Math.ceil(r.w * s)), sh = Math.max(1, Math.ceil(r.h * s));
    const M = tela("mascara", sw, sh), C = tela("cor", sw, sh);
    if (!M || !C) return;
    zerar(M.x); M.x.clearRect(0, 0, sw, sh);
    M.x.setTransform(s, 0, 0, s, -r.x * s, -r.y * s);
    M.x.fillStyle = "#fff"; M.x.strokeStyle = "#fff";
    const aux = {
      sw, sh,
      transformar: (x) => x.setTransform(s, 0, 0, s, -r.x * s, -r.y * s),
      desfocar: (raioImagem) => desfocar(M, sw, sh, raioImagem * s),
      apagar: (desenho) => { M.x.save(); M.x.globalCompositeOperation = "destination-out"; M.x.globalAlpha = 1; M.x.filter = "none"; M.x.beginPath(); desenho(M.x); M.x.fill(); M.x.restore(); },
      aux: (nome) => { const t = tela(nome, sw, sh); if (!t) return null; zerar(t.x); t.x.clearRect(0, 0, sw, sh); t.x.setTransform(s, 0, 0, s, -r.x * s, -r.y * s); return t; },
      recortarCom: (t) => { M.x.save(); zerar(M.x); M.x.globalCompositeOperation = "destination-in"; M.x.drawImage(t.c, 0, 0, sw, sh, 0, 0, sw, sh); M.x.restore(); },
    };
    mascara(M.x, s, aux);
    zerar(M.x);
    for (const p of passos) {
      if (!p || !(p.alfa > 0.003)) continue;
      zerar(C.x); C.x.clearRect(0, 0, sw, sh);
      C.x.setTransform(s, 0, 0, s, -r.x * s, -r.y * s);
      if (typeof p.desenhar === "function") p.desenhar(C.x);
      else {
        C.x.fillStyle = typeof p.tinta === "function" ? p.tinta(C.x) : p.tinta;
        C.x.fillRect(r.x, r.y, sw / s, sh / s);
      }
      zerar(C.x);
      C.x.globalCompositeOperation = "destination-in";
      C.x.drawImage(M.c, 0, 0, sw, sh, 0, 0, sw, sh);
      C.x.globalCompositeOperation = "source-over";
      ctx.globalCompositeOperation = p.modo ?? "source-over";
      ctx.globalAlpha = lim(p.alfa, 0, 1);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(C.c, 0, 0, sw, sh, r.x, r.y, sw / s, sh / s);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }
  }

  /** Passos de "ganho" (multiply + lighter) para levar a cor medida até a cor alvo. */
  function passosGanho(alvoHex, medio, alfa, op) {
    const g = ganhoDeCor(hexParaRgb(alvoHex), medio, op);
    const passos = [{ modo: "multiply", alfa, tinta: css(g.mult) }];
    if (g.temSoma) passos.push({ modo: "lighter", alfa, tinta: css(g.soma) });
    return passos;
  }

  // ───── medição das cores da própria foto (antes da make) ─────
  const PADRAO = { pele: { r: 200, g: 160, b: 135 }, labios: { r: 185, g: 110, b: 105 }, palpebra: { r: 190, g: 150, b: 130 }, olheira: { r: 180, g: 140, b: 120 }, sobrancelha: { r: 110, g: 85, b: 70 } };
  let medida = null, ultimaFonte = null;

  let tAmostra = -1e9, chaveAmostra = "";
  const agora = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

  /**
   * Mede as cores da região (pele, lábios, pálpebra, olheira, sobrancelha) direto da FONTE, numa
   * tela pequena só de leitura (não lê o canvas principal, que pode estar na GPU). No vídeo,
   * mede no máximo 4 vezes por segundo e suaviza no tempo.
   */
  function amostrar(Q, fonte, espelhar) {
    const r = Q.caixa;
    const chave = `${Q.W}x${Q.H}:${Math.round(r.x / 8)},${Math.round(r.y / 8)},${Math.round(r.w / 8)}`;
    const t = agora();
    const mesma = fonte === ultimaFonte;
    if (mesma && medida && t - tAmostra < 250 && (chave === chaveAmostra || t - tAmostra < 120)) return;
    const k = Math.min(1, 120 / Math.max(r.w, r.h));
    const aw = Math.max(1, Math.round(r.w * k)), ah = Math.max(1, Math.round(r.h * k));
    const A = tela("amostra", aw, ah, true);
    let dados = null;
    if (A) {
      try {
        zerar(A.x); A.x.clearRect(0, 0, A.c.width, A.c.height);
        A.x.setTransform(k, 0, 0, k, -r.x * k, -r.y * k);
        if (espelhar) A.x.transform(-1, 0, 0, 1, Q.W, 0);
        A.x.imageSmoothingEnabled = true;
        A.x.drawImage(fonte, 0, 0, Q.W, Q.H);
        zerar(A.x);
        dados = A.x.getImageData(0, 0, aw, ah).data;
      } catch { dados = null; }
    }
    const P = Q.P;
    const paraA = (p) => ({ x: (p.x - r.x) * k, y: (p.y - r.y) * k });
    const coletar = (testes) => (dados ? coletarCores(dados, aw, ah, testes.map((x) => ({
      poli: x.poli?.map(paraA), fora: x.fora?.map(paraA), disco: x.disco ? { c: paraA(x.disco.c), r: x.disco.r * k } : undefined,
    }))) : null);
    const lab = geometriaLabios(P);
    // anel do meio dos lábios (longe da pele e dos dentes)
    const anelExt = lab.ext.map((p, i) => interp(p, lab.int[i], 0.2)), anelInt = lab.ext.map((p, i) => interp(p, lab.int[i], 0.8));
    const olhos = ["direito", "esquerdo"].map((l) => geometriaSombra(P, l, "palpebra"));
    const nova = {
      pele: coletar([
        { disco: { c: geometriaBlush(P, "direito").centro, r: Q.u * 0.06 } },
        { disco: { c: geometriaBlush(P, "esquerdo").centro, r: Q.u * 0.06 } },
        { disco: { c: P[PONTOS.testaCentro], r: Q.u * 0.05 } },
      ]),
      labios: coletar([{ poli: anelExt, fora: anelInt }]),
      palpebra: coletar(olhos.map((o) => ({ poli: o.camadas[1].poli, fora: o.g.contorno }))),
      olheira: coletar(["direito", "esquerdo"].map((l) => ({ poli: geometriaCorretivo(P, l).poli, fora: geometriaOlho(P, l).contorno }))),
      sobrancelha: coletar(["direito", "esquerdo"].map((l) => ({ poli: geometriaSobrancelha(P, l).poli }))),
    };
    // suavização no tempo só para a mesma fonte (vídeo); foto nova mede do zero
    const ant = mesma && medida && t - tAmostra < 1000 ? medida : null;
    const res = {};
    for (const k2 of Object.keys(PADRAO)) {
      const n = nova[k2] ?? ant?.[k2] ?? PADRAO[k2];
      res[k2] = ant ? { r: ant[k2].r + (n.r - ant[k2].r) * 0.5, g: ant[k2].g + (n.g - ant[k2].g) * 0.5, b: ant[k2].b + (n.b - ant[k2].b) * 0.5 } : n;
    }
    medida = res;
    ultimaFonte = fonte;
    tAmostra = t;
    chaveAmostra = chave;
  }

  // ───── brilhos ─────
  const sprites = new Map();
  function sprite(hex) {
    if (sprites.has(hex)) return sprites.get(hex);
    const c = novoCanvas(48, 48);
    const x = c?.getContext("2d");
    if (!x) return null;
    const cor = hexParaRgb(hex);
    const g = x.createRadialGradient(24, 24, 0, 24, 24, 24);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.2, `rgba(${cor.r},${cor.g},${cor.b},0.85)`);
    g.addColorStop(0.5, `rgba(${cor.r},${cor.g},${cor.b},0.18)`);
    g.addColorStop(1, `rgba(${cor.r},${cor.g},${cor.b},0)`);
    x.fillStyle = g;
    x.fillRect(0, 0, 48, 48);
    if (sprites.size > 12) sprites.clear();
    sprites.set(hex, c);
    return c;
  }
  const brilhosCache = new Map();
  const brilhos = (chave, semente, n, faixas, op) => {
    const k = `${chave}:${n}:${faixas}`;
    if (!brilhosCache.has(k)) brilhosCache.set(k, brilhosEstaveis(semente, n, faixas, op));
    return brilhosCache.get(k);
  };
  function desenharBrilhos(lista, A, B, fechadas, tamanho, cor, alfa, pequenoMin = 0.6) {
    const sp = sprite(cor);
    if (!sp || !(alfa > 0.003)) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const b of lista) {
      const p = posicaoBrilho(b, A, B, fechadas);
      if (!p) continue;
      const t = Math.max(pequenoMin, tamanho * b.tam * 2.4);
      ctx.globalAlpha = lim(alfa * b.forca, 0, 1);
      ctx.drawImage(sp, p.x - t / 2, p.y - t / 2, t, t);
    }
    ctx.restore();
  }

  // ───── camadas ─────
  const soft = (Q) => lim(150 / Q.u, 0.12, 1); // escala das camadas suaves

  const PINTORES = {
    base(Q, c) {
      const { P, u } = Q;
      const s = lim(100 / u, 0.1, 1);
      const r = retangulo(OVAL.map((i) => P[i]), u * 0.02, Q.W, Q.H);
      if (!r) return;
      // versão desfocada da pele (rosto reduzido a ~45 px de largura)
      const k = lim(45 / u, 0.02, 1);
      const bw = Math.max(1, Math.ceil(r.w * k)), bh = Math.max(1, Math.ceil(r.h * k));
      const B = tela("pele", bw, bh);
      if (B) {
        zerar(B.x); B.x.clearRect(0, 0, bw, bh);
        if (temFiltro) B.x.filter = "blur(0.8px)";
        B.x.drawImage(canvas, r.x, r.y, r.w, r.h, 0, 0, bw, bh);
        B.x.filter = "none";
      }
      const gs = ["direito", "esquerdo"].map((l) => geometriaOlho(P, l));
      const mascara = (m, _s, a) => {
        m.beginPath(); tracar(m, OVAL.map((i) => P[i]), true); m.fill();
        a.apagar((x) => {
          for (const g of gs) { tracar(x, g.contorno, true); }
          tracar(x, LABIOS_EXTERNO.map((i) => P[i]), true);
          for (const l of ["direito", "esquerdo"]) tracar(x, geometriaSobrancelha(P, l).poli, true);
        });
        m.save(); m.globalCompositeOperation = "destination-out";
        m.lineJoin = "round";
        for (const g of gs) { m.lineWidth = g.larg * 0.35; m.beginPath(); tracar(m, g.contorno, true); m.stroke(); }
        m.lineWidth = u * 0.035; m.beginPath(); tracar(m, LABIOS_EXTERNO.map((i) => P[i]), true); m.stroke();
        m.lineWidth = u * 0.06; for (const l of ["direito", "esquerdo"]) { m.beginPath(); tracar(m, geometriaSobrancelha(P, l).poli, true); m.stroke(); }
        m.lineWidth = u * 0.07; m.beginPath(); tracar(m, OVAL.map((i) => P[i]), true); m.stroke();
        // narinas
        m.beginPath(); for (const i of [64, 294]) { elipse(m, P[i], u * 0.035, u * 0.022, 0); } m.fill();
        m.restore();
        a.desfocar(u * 0.035);
      };
      const passos = [];
      if (B) passos.push({ modo: "source-over", alfa: 0.4 * c.intensidade, desenhar: (x) => x.drawImage(B.c, 0, 0, bw, bh, r.x, r.y, bw / k, bh / k) });
      passos.push(...passosGanho(c.cor, medida.pele, 0.42 * c.intensidade));
      aplicar(r, s, mascara, passos);
    },

    corretivo(Q, c) {
      const { P } = Q;
      const geos = ["direito", "esquerdo"].map((l) => geometriaCorretivo(P, l));
      const larg = Math.max(geos[0].g.larg, geos[1].g.larg);
      const r = retangulo(geos.flatMap((g) => g.poli), larg * 0.5, Q.W, Q.H);
      aplicar(r, soft(Q), (m, _s, a) => {
        m.beginPath(); for (const g of geos) tracar(m, g.poli, true); m.fill();
        a.desfocar(larg * 0.2);
        a.apagar((x) => { for (const g of geos) tracar(x, g.g.contorno, true); });
      }, passosGanho(c.cor, medida.olheira, 0.55 * c.intensidade));
    },

    contorno(Q, c) {
      const { P, u } = Q;
      const geos = ["direito", "esquerdo"].map((l) => geometriaContorno(P, l));
      const r = retangulo(OVAL.map((i) => P[i]), u * 0.02, Q.W, Q.H);
      aplicar(r, soft(Q), (m, _s, a) => {
        m.lineCap = "round"; m.lineJoin = "round";
        for (const g of geos) {
          // faixa afinando em direção à boca
          const [a0, a1, a2] = g.faixa;
          const n = norm({ x: -(a2.y - a0.y), y: a2.x - a0.x });
          const e0 = u * 0.045, e2 = u * 0.018;
          m.beginPath();
          tracar(m, [somar(a0, n, e0), somar(a1, n, (e0 + e2) / 2), somar(a2, n, e2), somar(a2, n, -e2 * 0.6), somar(a1, n, -(e0 + e2) / 2 * 0.7), somar(a0, n, -e0 * 0.8)], true);
          m.fill();
          m.globalAlpha = 0.55;
          m.beginPath(); elipse(m, g.tempora, u * 0.07, u * 0.11, Q.angulo + 0.3); m.fill();
          m.globalAlpha = 0.5;
          m.lineWidth = u * 0.06; m.beginPath(); tracar(m, g.mandibula, false); m.stroke();
          m.globalAlpha = 1;
        }
        a.desfocar(u * 0.045);
        // nada fora do rosto
        const t = a.aux("aux1");
        if (t) {
          t.x.fillStyle = "#fff"; t.x.beginPath(); tracar(t.x, OVAL.map((i) => P[i]), true); t.x.fill();
          a.recortarCom(t);
        }
      }, passosGanho(c.cor, medida.pele, 0.6 * c.intensidade, { soEscurecer: true }));
    },

    blush(Q, c) {
      const { P, u } = Q;
      const geos = ["direito", "esquerdo"].map((l) => geometriaBlush(P, l));
      const r = retangulo(geos.flatMap((g) => [somar(g.centro, { x: g.rx * 1.3, y: g.rx * 1.3 }), somar(g.centro, { x: -g.rx * 1.3, y: -g.rx * 1.3 })]), 2, Q.W, Q.H);
      aplicar(r, soft(Q), (m) => {
        for (const g of geos) {
          m.save();
          m.translate(g.centro.x, g.centro.y); m.rotate(g.angulo); m.scale(g.rx, g.ry);
          const gr = m.createRadialGradient(0, 0, 0, 0, 0, 1);
          gr.addColorStop(0, "rgba(255,255,255,1)");
          gr.addColorStop(0.35, "rgba(255,255,255,0.75)");
          gr.addColorStop(0.7, "rgba(255,255,255,0.28)");
          gr.addColorStop(1, "rgba(255,255,255,0)");
          m.fillStyle = gr; m.fillRect(-1, -1, 2, 2);
          m.restore();
        }
      }, passosGanho(c.cor, medida.pele, 0.5 * c.intensidade));
    },

    iluminador(Q, c) {
      const { P, u } = Q;
      const g = geometriaIluminador(P);
      const r = retangulo([...g.macaDireita, ...g.macaEsquerda, ...g.nariz, g.cupido], u * 0.08, Q.W, Q.H);
      const mascara = (m, _s, a) => {
        m.lineCap = "round"; m.lineJoin = "round";
        m.lineWidth = u * 0.05;
        for (const l of [g.macaDireita, g.macaEsquerda]) { m.beginPath(); tracar(m, l, false); m.stroke(); }
        m.lineWidth = u * 0.022; m.globalAlpha = 0.8;
        m.beginPath(); tracar(m, g.nariz, false); m.stroke();
        m.globalAlpha = 0.7;
        m.beginPath(); elipse(m, g.cupido, u * 0.03, u * 0.012, Q.angulo); m.fill();
        m.globalAlpha = 1;
        a.desfocar(u * 0.022);
      };
      aplicar(r, soft(Q), mascara, [
        { modo: "screen", alfa: 0.5 * c.intensidade, tinta: c.cor },
        { modo: "soft-light", alfa: 0.5 * c.intensidade, tinta: "#ffffff" },
      ]);
    },

    sombra(Q, c) {
      const { P } = Q;
      const estilo = ESTILOS_SOMBRA.includes(c.estilo) ? c.estilo : "palpebra";
      const geos = ["direito", "esquerdo"].map((l) => geometriaSombra(P, l, estilo));
      const larg = Math.max(geos[0].g.larg, geos[1].g.larg);
      const raio = { palpebra: 0.1, esfumado: 0.17, asa: 0.09 }[estilo] * larg;
      const r = retangulo(geos.flatMap((g) => g.camadas.flatMap((k) => k.poli)), raio * 3, Q.W, Q.H);
      const s = lim(60 / larg, 0.25, 1);
      // cores: clara (canto interno) → média → escura (canto externo)
      const lum = (h) => { const x = hexParaRgb(h); return 0.3 * x.r + 0.59 * x.g + 0.11 * x.b; };
      let cores = c.cores.length ? c.cores.slice(0, 3) : [c.cor];
      cores.sort((a, b) => lum(b) - lum(a));
      if (cores.length === 1) cores = [cores[0], cores[0], cores[0]];
      else if (cores.length === 2) cores = [cores[0], cores[0], cores[1]];
      const ganhos = cores.map((h) => ganhoDeCor(hexParaRgb(h), medida.palpebra));
      const pintarGrad = (x, qual) => {
        for (const g of geos) {
          const a = somar(g.g.int, g.g.eixo, 0.05 * g.g.larg), b = somar(g.g.ext, g.g.eixo, 0.25 * g.g.larg);
          const gr = x.createLinearGradient(a.x, a.y, b.x, b.y);
          const cs = ganhos.map((k) => css(k[qual]));
          gr.addColorStop(0, cs[0]); gr.addColorStop(0.15, cs[0]); gr.addColorStop(0.45, cs[1]); gr.addColorStop(0.8, cs[2]); gr.addColorStop(1, cs[2]);
          x.fillStyle = gr;
          // metade da tela de cada olho: corta pelo meio do rosto
          const meioRosto = meio(P[133], P[362]);
          x.save();
          x.beginPath();
          const lado = (g.g.centro.x < meioRosto.x) ? -1 : 1;
          x.rect(lado < 0 ? r.x - 10 : meioRosto.x, r.y - 10, lado < 0 ? meioRosto.x - r.x + 10 : r.x + r.w - meioRosto.x + 10, r.h + 20);
          x.clip();
          x.fillRect(r.x - 10, r.y - 10, r.w + 20, r.h + 20);
          x.restore();
        }
      };
      const alfa = 0.95 * c.intensidade;
      const passos = [{ modo: "multiply", alfa, desenhar: (x) => pintarGrad(x, "mult") }];
      if (ganhos.some((k) => k.temSoma)) passos.push({ modo: "lighter", alfa, desenhar: (x) => pintarGrad(x, "soma") });
      aplicar(r, s, (m, _s, a) => {
        for (const g of geos) for (const k of g.camadas) {
          m.globalAlpha = k.alfa; m.beginPath(); tracar(m, k.poli, true); m.fill();
        }
        m.globalAlpha = 1;
        a.desfocar(raio);
        a.apagar((x) => { for (const g of geos) tracar(x, g.g.contorno, true); });
      }, passos);
      // profundidade no côncavo com a cor mais escura
      const fConcavo = { palpebra: 0.3, esfumado: 0.55, asa: 0.6 }[estilo];
      if (geos.every((g) => g.concavo.length >= 3)) {
        aplicar(r, s, (m, _s, a) => {
          m.beginPath(); for (const g of geos) tracar(m, g.concavo, true); m.fill();
          a.desfocar(raio * 1.1);
          a.apagar((x) => { for (const g of geos) tracar(x, g.g.contorno, true); });
        }, passosGanho(cores[2], medida.palpebra, fConcavo * c.intensidade));
      }
      // cintilante / glitter: brilhos presos à pálpebra
      if (c.acabamento === "cintilante" || c.acabamento === "glitter") {
        const glitter = c.acabamento === "glitter";
        for (const [i, g] of geos.entries()) {
          const A = g.g.cilios, B = vinco(g.g, (t) => ALTURA_SOMBRA[estilo](t) * 0.7);
          const lista = brilhos(`sombra${i}${glitter}`, 1000 + i, glitter ? 34 : 50, A.length - 1, { vMin: 0.08, vMax: 0.95, pesoV: 1.4 });
          desenharBrilhos(lista, A, B, false, g.g.larg * (glitter ? 0.05 : 0.026), cores[1], (glitter ? 0.9 : 0.55) * c.intensidade);
        }
      }
    },

    delineado(Q, c) {
      const { P } = Q;
      const estilo = ESTILOS_DELINEADO.includes(c.estilo) ? c.estilo : "fino";
      const geos = ["direito", "esquerdo"].map((l) => geometriaDelineado(P, l, estilo));
      const larg = Math.max(geos[0].g.larg, geos[1].g.larg);
      const r = retangulo(geos.flatMap((g) => g.poli), larg * 0.15, Q.W, Q.H);
      aplicar(r, 1, (m, _s, a) => {
        m.beginPath(); for (const g of geos) tracar(m, g.poli, true, false); m.fill();
        a.desfocar(Math.max(0.4, larg * 0.012));
      }, [
        { modo: "multiply", alfa: 0.6 * c.intensidade, tinta: c.cor },
        { modo: "source-over", alfa: 0.82 * c.intensidade, tinta: c.cor },
      ]);
    },

    mascara(Q, c) {
      const { P } = Q;
      const geos = ["direito", "esquerdo"].map((l) => geometriaMascara(P, l));
      const larg = Math.max(geos[0].g.larg, geos[1].g.larg);
      const r = retangulo(geos.flatMap((g) => [...g.fios.map((f) => f.ponta), ...g.linha, ...g.fiosInf.map((f) => f.ponta)]), larg * 0.1, Q.W, Q.H);
      aplicar(r, 1, (m, _s, a) => {
        m.lineCap = "round"; m.lineJoin = "round";
        for (const g of geos) {
          // linha dos cílios mais densa
          m.lineWidth = g.g.larg * 0.035;
          m.beginPath(); tracar(m, g.linha.map((p, i) => somar(p, g.normais[i], g.g.larg * 0.012)), false); m.stroke();
          m.globalAlpha = 0.8;
          m.beginPath();
          for (const f of g.fios) {
            const n = norm({ x: -(f.ponta.y - f.base.y), y: f.ponta.x - f.base.x });
            const w = f.larg / 2;
            m.moveTo(f.base.x + n.x * w, f.base.y + n.y * w);
            m.quadraticCurveTo(f.curva.x, f.curva.y, f.ponta.x, f.ponta.y);
            m.quadraticCurveTo(f.curva.x, f.curva.y, f.base.x - n.x * w, f.base.y - n.y * w);
            m.closePath();
          }
          m.fill();
          m.globalAlpha = 0.4;
          m.lineWidth = g.g.larg * 0.008;
          m.beginPath();
          for (const f of g.fiosInf) { m.moveTo(f.base.x, f.base.y); m.lineTo(f.ponta.x, f.ponta.y); }
          m.stroke();
          m.globalAlpha = 1;
        }
        a.desfocar(Math.max(0.35, larg * 0.006));
      }, [{ modo: "source-over", alfa: 0.88 * c.intensidade, tinta: c.cor }]);
    },

    sobrancelha(Q, c) {
      const { P } = Q;
      const geos = ["direito", "esquerdo"].map((l) => geometriaSobrancelha(P, l));
      const larg = Math.max(dist(geos[0].externo, geos[0].interno), dist(geos[1].externo, geos[1].interno));
      const r = retangulo(geos.flatMap((g) => g.poli), larg * 0.2, Q.W, Q.H);
      aplicar(r, 1, (m, _s, a) => {
        for (const g of geos) {
          const gr = m.createLinearGradient(g.interno.x, g.interno.y, g.externo.x, g.externo.y);
          gr.addColorStop(0, "rgba(255,255,255,0.35)");
          gr.addColorStop(0.3, "rgba(255,255,255,0.9)");
          gr.addColorStop(1, "rgba(255,255,255,1)");
          m.fillStyle = gr;
          m.beginPath(); tracar(m, g.poli, true); m.fill();
        }
        a.desfocar(larg * 0.03);
      }, passosGanho(c.cor, medida.sobrancelha, 0.7 * c.intensidade, { soEscurecer: true }));
    },

    batom(Q, c) {
      const { P, u } = Q;
      const L = geometriaLabios(P);
      const r = retangulo(L.ext, L.larg * 0.12, Q.W, Q.H);
      if (!r) return;
      const mascaraLabios = (m, _s, a) => {
        m.beginPath(); tracar(m, L.ext, true); tracar(m, L.int, true); m.fill("evenodd");
        a.desfocar(Math.max(0.4, L.larg * 0.012));
        a.apagar((x) => tracar(x, L.int, true)); // dentes e boca aberta nunca
      };
      const i = c.intensidade;
      const passos = passosGanho(c.cor, medida.labios, 0.9 * i);
      if (c.acabamento === "matte") passos.push({ modo: "source-over", alfa: 0.14 * i, tinta: c.cor });
      // gloss/acetinado: a própria boca em "overlay" sobre si mesma realça volume e brilhos reais
      const volume = { gloss: 0.5, acetinado: 0.22, cintilante: 0.2 }[c.acabamento] ?? 0;
      if (volume > 0) passos.push({ modo: "overlay", alfa: volume * i, desenhar: (x) => x.drawImage(canvas, r.x, r.y, r.w, r.h, r.x, r.y, r.w, r.h) });
      aplicar(r, 1, mascaraLabios, passos);
      // realces: gloss (forte), acetinado/cintilante (suave)
      const forca = { gloss: 0.8, acetinado: 0.28, cintilante: 0.4, glitter: 0.3 }[c.acabamento] ?? 0;
      if (forca > 0) {
        const ang = Math.atan2(L.eixo.y, L.eixo.x);
        const centroInf = interp(P[14], P[17], 0.45);
        const cs = [
          { c: centroInf, rx: L.larg * 0.14, ry: Math.max(1, L.espInf * 0.2), f: 1 },
          { c: somar(centroInf, L.eixo, -L.larg * 0.13), rx: L.larg * 0.05, ry: Math.max(1, L.espInf * 0.12), f: 0.6 },
          { c: interp(interp(P[37], P[82], 0.55), P[0], 0.1), rx: L.larg * 0.06, ry: Math.max(1, L.espSup * 0.16), f: 0.75 },
          { c: interp(interp(P[267], P[312], 0.55), P[0], 0.1), rx: L.larg * 0.06, ry: Math.max(1, L.espSup * 0.16), f: 0.75 },
        ];
        aplicar(r, 1, (m, s, a) => {
          mascaraLabios(m, s, a);
          const t = a.aux("aux1");
          if (!t) return;
          for (const e of cs) {
            t.x.save();
            t.x.translate(e.c.x, e.c.y); t.x.rotate(ang); t.x.scale(e.rx, e.ry);
            const gr = t.x.createRadialGradient(0, 0, 0, 0, 0, 1);
            gr.addColorStop(0, `rgba(255,255,255,${e.f})`);
            gr.addColorStop(0.3, `rgba(255,255,255,${e.f * 0.75})`);
            gr.addColorStop(0.65, `rgba(255,255,255,${e.f * 0.2})`);
            gr.addColorStop(1, "rgba(255,255,255,0)");
            t.x.fillStyle = gr; t.x.fillRect(-1, -1, 2, 2);
            t.x.restore();
          }
          a.recortarCom(t);
        }, [
          { modo: "screen", alfa: forca * i, tinta: "#ffffff" },
        ]);
      }
      if (c.acabamento === "cintilante" || c.acabamento === "glitter") {
        const glitter = c.acabamento === "glitter";
        const lista = brilhos(`labios${glitter}`, glitter ? 77 : 78, glitter ? 150 : 200, L.ext.length, { vMin: 0.15, vMax: 0.8 });
        const corBrilho = glitter ? misturar(c.cor, "#FFFFFF", 0.45) : "#FFF4E8";
        desenharBrilhos(lista, L.ext, L.int, true, u * (glitter ? 0.006 : 0.0035), corBrilho, (glitter ? 0.8 : 0.45) * i);
      }
    },
  };

  function desenhar(fonte, pontos, estado, opcoes = {}) {
    if (!ctx) return;
    const fw = fonte?.videoWidth || fonte?.naturalWidth || fonte?.displayWidth || fonte?.width || 0;
    const fh = fonte?.videoHeight || fonte?.naturalHeight || fonte?.displayHeight || fonte?.height || 0;
    if (!(fw > 0 && fh > 0)) return;
    const k = Math.min(1, LIMITE_LADO / Math.max(fw, fh));
    const W = Math.max(1, Math.round(fw * k)), H = Math.max(1, Math.round(fh * k));
    if (canvas.width !== W) canvas.width = W;
    if (canvas.height !== H) canvas.height = H;
    const espelhar = !!opcoes?.espelhar;
    zerar(ctx);
    ctx.imageSmoothingEnabled = true;
    ctx.clearRect(0, 0, W, H);
    try {
      if (espelhar) ctx.setTransform(-1, 0, 0, 1, W, 0);
      ctx.drawImage(fonte, 0, 0, W, H);
    } catch { /* vídeo ainda sem quadro */ }
    zerar(ctx);

    const P = paraPixels(pontos, W, H, espelhar);
    if (!P) return;
    const { u, caixa, angulo } = medirRosto(P);
    const r = retangulo(OVAL.map((i) => P[i]), u * 0.05, W, H);
    const camadas = ORDEM_CAMADAS.map((cat) => [cat, camadaValida(estado?.[cat])]).filter(([, c]) => c);
    if (r && camadas.length) {
      const Q = { P, W, H, u, caixa: r, caixaRosto: caixa, angulo };
      amostrar(Q, fonte, espelhar);
      for (const [cat, c] of camadas) {
        try { PINTORES[cat](Q, c); } catch (e) { zerar(ctx); if (typeof console !== "undefined") console.warn(`pintura: camada ${cat}`, e); }
      }
      zerar(ctx);
    }
    if (opcoes?.mostrarPontos) {
      ctx.fillStyle = "rgba(214,181,136,0.85)";
      const rp = Math.max(0.8, u / 300);
      ctx.beginPath();
      for (const p of P) if (p) { ctx.moveTo(p.x + rp, p.y); ctx.arc(p.x, p.y, rp, 0, Math.PI * 2); }
      ctx.fill();
    }
  }

  function liberar() {
    for (const k of Object.keys(telas)) { telas[k].c.width = 0; telas[k].c.height = 0; delete telas[k]; }
    sprites.clear(); brilhosCache.clear();
    medida = null; ultimaFonte = null; tAmostra = -1e9; chaveAmostra = "";
  }

  return { desenhar, liberar };
}
