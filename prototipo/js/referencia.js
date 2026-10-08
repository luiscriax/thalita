// "Copiar make de uma foto": lê uma foto de REFERÊNCIA (alguém maquiado) e devolve as cores e a
// intensidade de cada produto, já no formato que a pintura entende (EstadoMake). Sem IA: usa os
// 478 pontos do rosto para achar boca, pálpebra, maçã do rosto, linha dos cílios etc., e compara
// cada região com a pele "limpa" da própria foto (testa e queixo, onde quase nunca vai cor).
//
// Como a cor de uma região é a mistura "pele + produto", a cor do produto é estimada pela
// extrapolação em CIELAB:  produto ≈ pele + (região − pele) / intensidade.
// Assim, pintando o produto com essa intensidade no rosto da cliente, a região fica com a mesma
// cor da referência — mas sobre a pele DELA.
//
// O que NÃO copia: a base (tem de ser o tom da cliente) e o formato exato (delineado gráfico,
// glitter). Luz e filtros da foto mudam as cores: corrigimos pelo branco do olho (medidas.js) e
// devolvemos a confiança de cada leitura.
//
// Funções puras, sem DOM.

import { medir } from "./medidas.js";
import { rgbParaLab, labParaHex, deltaE2000, hexParaLab, lch } from "./cor.js";
import { paraPixels, geometriaOlho, geometriaSombra, geometriaBlush, geometriaIluminador } from "./pintura.js";
import { corMaisProxima } from "./catalogo.js";
import { LABIOS_EXTERNO, LABIOS_INTERNO, PONTOS } from "./regioes.js";

/** @typedef {import("./tipos.js").EstadoMake} EstadoMake */
/** @typedef {import("./tipos.js").Categoria} Categoria */

/**
 * Limites calibrados com o nosso próprio pintor sobre fotos reais (testes/unit/referencia.test.mjs):
 * acima deles, a região tem produto; abaixo, é a pele/sombra natural do rosto.
 */
export const LIMITES_REFERENCIA = Object.freeze({
  // Medido em 07–08/10/2026: pálpebra limpa fica a 5,6–7,6 de "distância de cor" (a*, b*) da testa;
  // sombra colorida, 10,6–16,5. Sombra marrom/neutra fica dentro da faixa natural (não separa).
  sombra: { dC: 9.5, escura: -55 }, // esfumado preto/cinza: sem cor, mas a pálpebra fica bem mais escura (limpas: até −42)
  // Treinados em 08/10/2026 (scripts/calibrar.mjs: 190 rostos, épocas pintadas a 100% e 60% + rostos sem make),
  // escolhendo a regra que mais acha com no máximo 10% de alarme falso:
  // blush: a regra "treinada" (a* ≥ 2,74 e b* ≤ 2,33) foi ótima nas makes pintadas, mas nas 50 fotos REAIS
  // recusou blush pêssego/coral (achou 13/23). Fica a regra validada em fotos reais (achou 20/23, inventou 1/6):
  blush: { dE: 3.4, da: 1 },
  iluminador: { dLbochecha: 3.35, contraste: 5 }, // ponto de luz mais claro que a própria bochecha, sem ser reflexo de pele oleosa: 48% / 5%
  gatinho: { dL: -50 }, // depois do canto do olho: limpas ≥ −42; com gatinho: −60 a −68
  minimoPixels: 25,
});

/**
 * Quanto "puxar" a cor do produto para compensar a máscara suave do pintor (bordas esfumadas).
 * Calibrado na bancada de 50 referências reais (scripts/bancada.mjs): 1 = sem compensação.
 */
export const FORCA = Object.freeze({ sombra: 0.4, blush: 0.5 });

const lim = (v, a, b) => Math.min(b, Math.max(a, v));
const r2 = (v) => Math.round(v * 100) / 100;
const somar = (a, b, k = 1) => ({ x: a.x + b.x * k, y: a.y + b.y * k });
const interp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const luma = (p) => 0.2126 * p.r + 0.7152 * p.g + 0.0722 * p.b;

/** Mediana de uma lista de números. */
function mediana(v) {
  if (!v.length) return NaN;
  const s = [...v].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
/** Percentil (0–1) de uma lista de Lab, ordenada por L. */
function percentilL(labs, q) {
  if (!labs.length) return null;
  const s = [...labs].sort((a, b) => a.L - b.L);
  return s[lim(Math.round(q * (s.length - 1)), 0, s.length - 1)];
}
/** Mediana canal a canal em Lab (robusta a reflexos e pelos). */
function medianaLab(labs) {
  if (!labs.length) return null;
  return { L: mediana(labs.map((c) => c.L)), a: mediana(labs.map((c) => c.a)), b: mediana(labs.map((c) => c.b)) };
}
/** Cor do produto: extrapola a partir da pele até a intensidade t (mantém L e croma possíveis). */
function produto(regiao, pele, t) {
  const k = 1 / Math.max(0.2, t);
  const L = lim(pele.L + (regiao.L - pele.L) * k, 4, 97);
  let a = pele.a + (regiao.a - pele.a) * k, b = pele.b + (regiao.b - pele.b) * k;
  const C = Math.hypot(a, b), Cmax = 95;
  if (C > Cmax) { a *= Cmax / C; b *= Cmax / C; }
  return labParaHex({ L, a, b });
}

/**
 * Lê a make de uma foto de referência.
 * @param {import("./tipos.js").Deteccao} deteccao  pontos do rosto da foto de referência
 * @param {any} amostrador  criarAmostrador(...) da mesma foto
 * @returns {{ok:boolean, estado:EstadoMake, leituras:{categoria:Categoria, presente:boolean, cor?:string, cores?:string[], parecida?:string, intensidade?:number, confianca:number, detalhe:string}[], avisos:string[], pele:string|null}}
 */
export function lerMakeDaFoto(deteccao, amostrador, opcoes = {}) {
  const diag = opcoes.diagnostico ?? {}; // números crus de cada região (calibração e bastidores)
  /** @type {EstadoMake} */
  const estado = {};
  const leituras = [];
  const avisos = [];
  const pts = deteccao?.pontos;
  const W = amostrador?.largura, H = amostrador?.altura;
  if (!(pts?.length >= 468) || !W || !H) {
    return { ok: false, estado, leituras, avisos: ["Não encontramos um rosto nessa foto. Use uma foto de frente, com o rosto inteiro aparecendo."], pele: null };
  }
  if (deteccao.rostos > 1) avisos.push("A foto tem mais de um rosto: lemos o maior.");

  const M = medir(deteccao, amostrador);
  const g = M.balancoDeBranco?.ganho ?? { r: 1, g: 1, b: 1 };
  const fator = lim((M.qualidade?.aprovada ? 1 : 0.6) * (M.balancoDeBranco?.fonte === "branco-do-olho" ? 1 : 0.8), 0.3, 1);
  if (!M.qualidade?.aprovada) avisos.push("A foto tem problemas de luz, foco ou ângulo: as cores lidas são aproximadas.");
  if (M.balancoDeBranco?.fonte !== "branco-do-olho") avisos.push("Não deu para corrigir a luz pelo branco do olho: se a foto tiver filtro ou luz colorida, as cores mudam.");

  const P = paraPixels(pts, W, H);
  const u = Math.hypot(P[PONTOS.rostoLarguraEsquerda].x - P[PONTOS.rostoLarguraDireita].x, P[PONTOS.rostoLarguraEsquerda].y - P[PONTOS.rostoLarguraDireita].y);
  const corrigir = (p) => ({ r: Math.min(255, p.r * g.r), g: Math.min(255, p.g * g.g), b: Math.min(255, p.b * g.b) });
  const brilho = (p) => (p.r >= 250) + (p.g >= 250) + (p.b >= 250) >= 2 || luma(p) >= 246;
  /** Pixels de polígonos/círculos → Lab corrigido (sem reflexos estourados). */
  const labs = ({ poli = [], circ = [] }, { manterBrilho = false } = {}) => {
    let px = [];
    for (const anel of poli) if (anel?.length >= 3) px = px.concat(amostrador.poligono([anel], { maximo: 5000 }));
    for (const [c, r] of circ) if (c && r > 0) px = px.concat(amostrador.circulo(c, r, { maximo: 3000 }));
    return { todos: px.length, brilho: px.filter(brilho).length, labs: px.filter((p) => manterBrilho || !brilho(p)).map((p) => rgbParaLab(corrigir(p))) };
  };

  // Pele limpa: testa, queixo e dorso do nariz, cada um separado. Franja na testa ou sombra de cabelo
  // deixam uma região bem mais escura que as outras: ela é descartada (como em medidas.js).
  const queixo = interp(P[PONTOS.labioInferiorBase], P[PONTOS.queixo], 0.55);
  const nariz = interp(P[6], P[197], 0.5);
  const regioesPele = [[P[PONTOS.testaCentro], u * 0.07], [queixo, u * 0.05], [nariz, u * 0.03]].map((c) => {
    const l = labs({ circ: [c] }).labs.sort((a, b) => a.L - b.L);
    const meio = l.slice(Math.floor(l.length * 0.25), Math.ceil(l.length * 0.9));
    return { labs: meio, m: medianaLab(meio) };
  }).filter((r) => r.m && r.labs.length >= 8);
  const Lmax = Math.max(...regioesPele.map((r) => r.m.L));
  const usadas = regioesPele.filter((r) => r.m.L >= Lmax - 15);
  const peleLabs = usadas.flatMap((r) => r.labs);
  const pele = medianaLab(peleLabs);
  if (!pele || peleLabs.length < LIMITES_REFERENCIA.minimoPixels) {
    return { ok: false, estado, leituras, avisos: [...avisos, "Não conseguimos ler a pele da foto (testa ou queixo cobertos?)."], pele: null };
  }
  if (usadas.length < regioesPele.length) avisos.push("Parte da testa estava coberta (franja ou sombra): lemos a pele no queixo e no nariz.");
  const peleHex = labParaHex(pele);
  diag.pele = peleHex;
  const ler = (categoria, dados) => {
    const parecida = dados.cor ? corMaisProxima(categoria, dados.cor) : null;
    leituras.push({ categoria, ...dados, ...(parecida && parecida.distancia < 25 ? { parecida: parecida.cor.nome } : {}), confianca: r2(lim((dados.confianca ?? 0.7) * fator, 0, 1)) });
  };

  // ── batom ── boca inteira (anel externo menos o interno). Brilho alto e claro = gloss.
  {
    const ext = LABIOS_EXTERNO.map((i) => P[i]), int = LABIOS_INTERNO.map((i) => P[i]);
    const px = amostrador.poligono([ext, int], { maximo: 6000 });
    const comBrilho = px.filter((p) => luma(p) > luma(corrigir({ r: 255, g: 255, b: 255 })) * 0.78 || brilho(p)).length;
    const boca = medianaLab(px.filter((p) => !brilho(p)).map((p) => rgbParaLab(corrigir(p))));
    diag.regioes = { ...(diag.regioes ?? {}), batom: boca && labParaHex(boca) };
    if (boca && px.length >= LIMITES_REFERENCIA.minimoPixels) {
      const dE = deltaE2000(boca, pele);
      const fracBrilho = comBrilho / px.length;
      const acabamento = fracBrilho > 0.06 ? "gloss" : lch(boca).C > 28 && fracBrilho < 0.015 ? "matte" : "acetinado";
      const cor = labParaHex(boca); // batom cobre quase tudo: a cor da boca já é a do produto
      const intensidade = dE > 25 ? 0.85 : dE > 12 ? 0.7 : 0.5;
      estado.batom = { cor, intensidade, acabamento };
      ler("batom", { presente: true, cor, intensidade, detalhe: `${acabamento === "gloss" ? "Com brilho (gloss)" : acabamento === "matte" ? "Sem brilho (matte)" : "Acetinado"}${dE < 10 ? "; bem perto do tom natural da boca" : ""}.`, confianca: px.length > 200 ? 0.85 : 0.6 });
    }
  }

  // ── sombra ── pálpebra (até o vinco) e côncavo, nos dois olhos; três tons pelo claro/médio/escuro.
  {
    // faixa entre os cílios e o vinco, sem os cantos: os cílios (escuros) ficam de fora
    const faixas = ["direito", "esquerdo"].map((lado) => {
      const o = geometriaOlho(P, lado);
      const ids = o.cilios.map((_, i) => i).filter((i) => i >= 2 && i <= o.cilios.length - 3);
      const baixo = ids.map((i) => interp(o.cilios[i], o.vinco1[i], 0.35));
      const alto = ids.map((i) => interp(o.cilios[i], o.vinco1[i], 0.9));
      return [...baixo, ...alto.reverse()];
    });
    const regs = ["direito", "esquerdo"].map((lado) => geometriaSombra(P, lado, "palpebra"));
    const palp = labs({ poli: faixas });
    const conc = labs({ poli: regs.map((s) => s.concavo) });
    const tudo = [...palp.labs, ...conc.labs];
    const m = medianaLab(palp.labs);
    if (m && palp.labs.length >= LIMITES_REFERENCIA.minimoPixels) {
      const dE = deltaE2000(m, pele);
      // a pálpebra natural é um pouco mais escura que a testa: só conta se a COR mudou, não só a luz
      const dC = Math.hypot(m.a - pele.a, m.b - pele.b);
      // cor esperada de uma pálpebra SEM produto: a pele escurecida pela sombra natural (a e b caem junto com L)
      const k = lim(m.L / Math.max(pele.L, 1), 0.3, 1.2);
      const dCor = Math.hypot(m.a - pele.a * k, m.b - pele.b * k);
      diag.regioes = { ...(diag.regioes ?? {}), sombra: labParaHex(m) };
      const C = (c) => Math.hypot(c.a, c.b), h = (c) => (Math.atan2(c.b, c.a) * 180) / Math.PI;
      // vinco/côncavo natural x pálpebra móvel: sem make, a pálpebra (convexa) pega mais luz que o vinco
      const vincoM = medianaLab(conc.labs);
      Object.assign(diag, { sombra: { dE: r2(dE), dC: r2(dC), dCor: r2(dCor), dL: r2(m.L - pele.L), Crel: r2(C(m) / Math.max(C(pele), 1)), dh: r2(h(m) - h(pele)), dLvinco: vincoM ? r2(m.L - vincoM.L) : null } });
      const presente = dC >= LIMITES_REFERENCIA.sombra.dC || m.L - pele.L <= LIMITES_REFERENCIA.sombra.escura;
      if (presente) {
        // a pálpebra é naturalmente mais escura: a base da mistura é a pele escurecida até a claridade da região
        const t = lim(0.4 + dC / 40, 0.5, 0.9);
        const base = (c) => ({ L: c.L, a: pele.a * k, b: pele.b * k });
        // o pintor espalha a sombra com máscara suave (~70% no centro): a cor precisa ser mais forte
        const prod = (c) => produto(c, base(c), t * FORCA.sombra);
        const medio = prod(m);
        const claro = prod(percentilL(tudo, 0.85));
        const escuro = prod(medianaLab(conc.labs.length >= 15 ? conc.labs : [percentilL(tudo, 0.15)]));
        const brilhoFrac = palp.todos ? palp.brilho / palp.todos : 0;
        estado.sombra = { cor: medio, cores: [claro, medio, escuro], intensidade: r2(t), acabamento: brilhoFrac > 0.02 ? "cintilante" : "matte", estilo: "esfumado" };
        ler("sombra", { presente: true, cor: medio, cores: [claro, medio, escuro], intensidade: r2(t), detalhe: `Degradê do claro (canto interno) ao escuro (côncavo)${brilhoFrac > 0.02 ? ", com brilho" : ""}.`, confianca: 0.7 });
      } else ler("sombra", { presente: false, detalhe: "Não achamos sombra colorida. Sombra marrom ou nude se confunde com a sombra natural da pálpebra: se a referência tem, escolha a cor no espelho.", confianca: 0.5 });
    }
  }

  // ── delineado ── a linha fina rente aos cílios não se separa dos próprios cílios (já são escuros);
  // o que dá para ver é o GATINHO: a linha continua depois do canto externo do olho.
  {
    let alem = [], linha = [];
    for (const lado of ["direito", "esquerdo"]) {
      const o = geometriaOlho(P, lado);
      alem = alem.concat(labs({ circ: [[somar(somar(o.ext, o.eixo, o.larg * 0.16), o.cima, o.larg * 0.07), o.larg * 0.035]] }).labs);
      linha = linha.concat(labs({ circ: o.cilios.filter((_, i) => i <= 6).map((c) => [somar(c, o.cima, o.larg * 0.03), o.larg * 0.03]) }).labs);
    }
    const m = medianaLab(alem);
    if (m && alem.length >= 5) {
      const dL = m.L - pele.L;
      diag.delineado = { alem: r2(dL) };
      if (dL <= LIMITES_REFERENCIA.gatinho.dL) {
        const esc = percentilL([...alem, ...linha], 0.1);
        const cor = labParaHex({ L: Math.min(esc.L, 22), a: esc.a, b: esc.b });
        estado.delineado = { cor, intensidade: 0.85, acabamento: "matte", estilo: "gatinho" };
        estado.mascara = { cor: "#141012", intensidade: 0.7 };
        ler("delineado", { presente: true, cor, intensidade: 0.85, detalhe: "Gatinho: a linha passa do canto do olho.", confianca: 0.7 });
        ler("mascara", { presente: true, cor: "#141012", intensidade: 0.7, detalhe: "Deduzida do olho marcado (cílios são finos demais para medir a cor).", confianca: 0.4 });
      } else ler("delineado", { presente: false, detalhe: "Sem gatinho. Um traço fino rente aos cílios não dá para separar dos cílios na foto.", confianca: 0.5 });
    }
  }

  let bochecha = null;
  // ── blush ── centro da elipse das maçãs, comparado com a pele limpa (mais vermelho = blush).
  {
    const circ = ["direito", "esquerdo"].map((lado) => { const b = geometriaBlush(P, lado); return [b.centro, b.ry * 0.7]; });
    const m = medianaLab(labs({ circ }).labs);
    if (m) {
      bochecha = m;
      const dE = deltaE2000(m, pele), da = m.a - pele.a;
      diag.regioes = { ...(diag.regioes ?? {}), blush: labParaHex(m) };
      diag.blush = { dE: r2(dE), da: r2(da), dL: r2(m.L - pele.L), db: r2(m.b - pele.b), dC: r2(Math.hypot(m.a, m.b) - Math.hypot(pele.a, pele.b)) };
      const dL = m.L - pele.L;
      // bronzer/contorno escurece a maçã sem deixá-la rosada; blush deixa mais vermelha do que escura
      const bronzer = dL <= -5 && da < -dL * 0.8;
      diag.blush.bronzer = bronzer;
      if (dE >= LIMITES_REFERENCIA.blush.dE && da >= LIMITES_REFERENCIA.blush.da && !bronzer) {
        const t = lim(0.25 + dE / 40, 0.3, 0.7);
        const cor = produto(m, pele, t * FORCA.blush);
        estado.blush = { cor, intensidade: r2(t), acabamento: "matte" };
        ler("blush", { presente: true, cor, intensidade: r2(t), detalhe: "Nas maçãs do rosto.", confianca: 0.6 });
      } else ler("blush", { presente: false, detalhe: bronzer ? "As maçãs estão mais escuras, não rosadas: parece bronzer ou contorno, não blush." : "Maçãs no tom da pele.", confianca: 0.5 });
    }
  }

  // ── contorno ── não é lido: a luz da foto cria sombra exatamente abaixo do osso da bochecha, e nas
  // nossas medições rostos sem contorno e com contorno deram o mesmo número. Melhor dizer do que inventar.
  ler("contorno", { presente: false, detalhe: "Contorno não dá para medir com segurança numa foto (a luz faz sombra no mesmo lugar). Se a referência tem, escolha no espelho.", confianca: 0.2 });

  // ── iluminador ── topo das maçãs e dorso do nariz (mais claro e com brilho).
  {
    const il = geometriaIluminador(P);
    const circ = [...il.macaDireita, ...il.macaEsquerda].map((c) => [c, u * 0.022]);
    const a = labs({ circ }, { manterBrilho: true });
    const claro = percentilL(a.labs, 0.85);
    if (claro) {
      const dL = claro.L - pele.L;
      diag.regioes = { ...(diag.regioes ?? {}), iluminador: labParaHex(claro) };
      const med = medianaLab(a.labs);
      diag.iluminador = { dL: r2(dL), brilho: r2(a.todos ? a.brilho / a.todos : 0), dLbochecha: bochecha ? r2(claro.L - bochecha.L) : null, contraste: med ? r2(claro.L - med.L) : null, Lpele: r2(pele.L) };
      const dLb = bochecha ? claro.L - bochecha.L : 0, contraste = med ? claro.L - med.L : 99;
      if (dLb >= LIMITES_REFERENCIA.iluminador.dLbochecha && contraste <= LIMITES_REFERENCIA.iluminador.contraste) {
        const cor = labParaHex({ L: lim(claro.L + 6, 70, 96), a: claro.a * 0.8, b: claro.b + 4 });
        estado.iluminador = { cor, intensidade: 0.5, acabamento: "cintilante" };
        ler("iluminador", { presente: true, cor, intensidade: 0.5, detalhe: "Ponto de luz no topo das maçãs.", confianca: 0.45 });
      } else ler("iluminador", { presente: false, detalhe: "Sem ponto de luz marcado.", confianca: 0.4 });
    }
  }

  // ── sobrancelha ── só reforça com a cor dos fios (o formato é da cliente).
  if (M.sobrancelhas?.hex && M.sobrancelhas.confianca > 0.2) {
    estado.sobrancelha = { cor: M.sobrancelhas.hex, intensidade: 0.35 };
    ler("sobrancelha", { presente: true, cor: M.sobrancelhas.hex, intensidade: 0.35, detalhe: "Cor dos fios, para preencher de leve. O desenho segue a sobrancelha da cliente.", confianca: 0.5 });
  }

  leituras.push({ categoria: "base", presente: false, detalhe: `Não copiamos a base: ela segue o tom da pele de quem vai usar a make (a pele da foto é ${peleHex}).`, confianca: 1 });
  return { ok: true, estado, leituras, avisos, pele: peleHex };
}

/** Distância entre duas cores (para os testes e para a tela mostrar "quão parecido"). */
export const diferencaCor = (a, b) => deltaE2000(hexParaLab(a), hexParaLab(b));
