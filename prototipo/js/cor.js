// Ciência da cor do motor: conversões sRGB ↔ CIELAB (D65), ΔE2000, ITA, escala Monk e
// leitura de subtom. Funções puras, sem DOM: rodam no navegador e nos testes (node --test).

/** @typedef {{r:number,g:number,b:number}} RGB  0–255 */
/** @typedef {{L:number,a:number,b:number}} Lab */

const D65 = { x: 0.95047, y: 1.0, z: 1.08883 };

const lin = (c) => {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const gam = (c) => {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(v * 255)));
};

/** @param {RGB} c @returns {Lab} */
export function rgbParaLab({ r, g, b }) {
  const R = lin(r), G = lin(g), B = lin(b);
  const x = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / D65.x;
  const y = (R * 0.2126729 + G * 0.7151522 + B * 0.072175) / D65.y;
  const z = (R * 0.0193339 + G * 0.119192 + B * 0.9503041) / D65.z;
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f(x), fy = f(y), fz = f(z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

/** @param {Lab} c @returns {RGB} */
export function labParaRgb({ L, a, b }) {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const inv = (t) => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27));
  const x = inv(fx) * D65.x, y = inv(fy) * D65.y, z = inv(fz) * D65.z;
  return {
    r: gam(x * 3.2404542 + y * -1.5371385 + z * -0.4985314),
    g: gam(x * -0.969266 + y * 1.8760108 + z * 0.041556),
    b: gam(x * 0.0556434 + y * -0.2040259 + z * 1.0572252),
  };
}

/** @param {string} hex "#RRGGBB" @returns {RGB} */
export function hexParaRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** @param {RGB} c @returns {string} */
export function rgbParaHex({ r, g, b }) {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
}

export const hexParaLab = (hex) => rgbParaLab(hexParaRgb(hex));
export const labParaHex = (lab) => rgbParaHex(labParaRgb(lab));

/** Croma e ângulo de matiz (graus, 0–360) no plano a*b*. */
export function lch({ L, a, b }) {
  const h = (Math.atan2(b, a) * 180) / Math.PI;
  return { L, C: Math.hypot(a, b), h: h < 0 ? h + 360 : h };
}

/** CIEDE2000 (Sharma et al., 2005). < 1 imperceptível; 2–3 perceptível de perto; > 5 cor diferente. */
export function deltaE2000(l1, l2) {
  const rad = Math.PI / 180;
  const C1 = Math.hypot(l1.a, l1.b), C2 = Math.hypot(l2.a, l2.b);
  const Cm = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
  const a1 = (1 + G) * l1.a, a2 = (1 + G) * l2.a;
  const c1 = Math.hypot(a1, l1.b), c2 = Math.hypot(a2, l2.b);
  const hf = (b, a) => {
    if (a === 0 && b === 0) return 0;
    const h = Math.atan2(b, a) / rad;
    return h < 0 ? h + 360 : h;
  };
  const h1 = hf(l1.b, a1), h2 = hf(l2.b, a2);
  const dL = l2.L - l1.L, dC = c2 - c1;
  let dh = 0;
  if (c1 * c2 !== 0) {
    dh = h2 - h1;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(c1 * c2) * Math.sin((dh / 2) * rad);
  const Lm = (l1.L + l2.L) / 2, cm = (c1 + c2) / 2;
  let hm = h1 + h2;
  if (c1 * c2 !== 0) {
    if (Math.abs(h1 - h2) > 180) hm += h1 + h2 < 360 ? 360 : -360;
    hm /= 2;
  }
  const T = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad) + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.2 * Math.cos((4 * hm - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hm - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(cm ** 7 / (cm ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lm - 50) ** 2) / Math.sqrt(20 + (Lm - 50) ** 2);
  const Sc = 1 + 0.045 * cm, Sh = 1 + 0.015 * cm * T;
  const Rt = -Math.sin(2 * dTheta * rad) * Rc;
  return Math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh));
}

/** Individual Typology Angle (graus). Quanto maior, mais clara a pele. */
export function ita({ L, b }) {
  return (Math.atan2(L - 50, b) * 180) / Math.PI;
}

/** Faixas clássicas do ITA (Chardon et al., 1991), com nomes usados na ficha. */
export function faixaIta(graus) {
  if (graus > 55) return "muito clara";
  if (graus > 41) return "clara";
  if (graus > 28) return "média clara";
  if (graus > 10) return "média";
  if (graus > -30) return "média escura";
  return "escura";
}

/** Escala Monk (MST), 10 tons, licença CC BY 4.0 — skintone.google. */
export const MONK = [
  { n: 1, hex: "#F6EDE4" },
  { n: 2, hex: "#F3E7DB" },
  { n: 3, hex: "#F7EAD0" },
  { n: 4, hex: "#EADABA" },
  { n: 5, hex: "#D7BD96" },
  { n: 6, hex: "#A07E56" },
  { n: 7, hex: "#825C43" },
  { n: 8, hex: "#604134" },
  { n: 9, hex: "#3A312A" },
  { n: 10, hex: "#292420" },
];

/** Tom Monk mais próximo por ΔE2000, com a distância (quanto menor, mais confiável). */
export function tomMonk(lab) {
  let melhor = null;
  for (const t of MONK) {
    const d = deltaE2000(lab, hexParaLab(t.hex));
    if (!melhor || d < melhor.distancia) melhor = { n: t.n, hex: t.hex, distancia: d };
  }
  return melhor;
}

/** Profundidade em palavras, pela claridade L* da pele corrigida. */
export function profundidade(L) {
  if (L >= 75) return "clara";
  if (L >= 65) return "média clara";
  if (L >= 52) return "média";
  if (L >= 40) return "média escura";
  if (L >= 30) return "escura";
  return "retinta";
}

/**
 * Subtom pela matiz da pele em a*b* (estimativa a partir de foto).
 * Pele humana fica entre ~30° (mais rosada/vermelha) e ~75° (mais amarelada/dourada).
 * Oliva: amarelado com pouco vermelho (a* baixo) e croma moderado.
 * @returns {{subtom:"frio"|"neutro"|"quente"|"oliva", h:number, explicacao:string}}
 */
export function subtom(lab) {
  const { C, h } = lch(lab);
  if (lab.a < 9 && lab.b > 12 && h > 58) return { subtom: "oliva", h, explicacao: "amarelado com pouco vermelho" };
  if (h < 48) return { subtom: "frio", h, explicacao: "puxa para o rosado" };
  if (h > 60) return { subtom: "quente", h, explicacao: "puxa para o dourado" };
  return { subtom: "neutro", h, explicacao: C < 14 ? "pouca cor dominante" : "equilíbrio entre rosado e dourado" };
}

/** Mistura duas cores em Lab (t = 0 → a, 1 → b). */
export function misturar(hexA, hexB, t) {
  const a = hexParaLab(hexA), b = hexParaLab(hexB);
  return labParaHex({ L: a.L + (b.L - a.L) * t, a: a.a + (b.a - a.a) * t, b: a.b + (b.b - a.b) * t });
}

/** Ajusta claridade (dL) e croma (fator) de uma cor, mantendo a matiz. */
export function ajustar(hex, { dL = 0, croma = 1 } = {}) {
  const c = hexParaLab(hex);
  return labParaHex({ L: Math.max(0, Math.min(100, c.L + dL)), a: c.a * croma, b: c.b * croma });
}

/** Família de cor com temperatura, para a ficha (ex.: "marrom quente", "rosa frio"). */
export function familia(hex) {
  const lab = hexParaLab(hex);
  const { C, h } = lch(lab);
  const L = lab.L;
  if (C < 8) return L > 80 ? "branco" : L < 25 ? "preto" : L > 55 ? "cinza claro" : "cinza escuro";
  const temp = h >= 40 && h <= 100 ? "quente" : h < 20 || h > 300 ? "frio" : "neutro";
  let nome;
  if (h < 20 || h >= 330) nome = L < 35 ? "vinho" : L > 70 ? "rosa" : C > 45 ? "vermelho" : "rosa";
  else if (h < 45) nome = L < 30 ? "marrom" : L > 70 ? "pêssego" : C > 50 ? "vermelho" : "terracota";
  else if (h < 70) nome = L < 45 ? "marrom" : L > 75 ? "bege" : C > 45 ? "laranja" : "caramelo";
  else if (h < 100) nome = L > 70 ? "dourado claro" : C > 40 ? "dourado" : "oliva";
  else if (h < 180) nome = "verde";
  else if (h < 260) nome = "azul";
  else nome = L < 35 ? "ameixa" : "malva";
  return `${nome} ${temp}`;
}

/** Estatística robusta: mediana de cada canal de uma lista de RGB. */
export function medianaRgb(lista) {
  if (!lista.length) return null;
  const med = (arr) => {
    const s = [...arr].sort((x, y) => x - y);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  return { r: med(lista.map((p) => p.r)), g: med(lista.map((p) => p.g)), b: med(lista.map((p) => p.b)) };
}
