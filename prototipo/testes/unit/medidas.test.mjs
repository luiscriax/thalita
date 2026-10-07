// Testes da peça medidas.js (checagem da selfie + estudo do rosto).
// Os testes com fotos usam fixtures reais (pontos do MediaPipe + pixels crus); sem a pasta
// testes/fixtures, eles são pulados (rode `npm run fixtures`).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { criarAmostrador, checarQualidade, medir, familiaDaIris, LIMITES } from "../../js/medidas.js";
import { deltaE2000 } from "../../js/cor.js";

const FIX = fileURLToPath(new URL("../fixtures/", import.meta.url));
const TEM_FIXTURES = existsSync(`${FIX}pontos`) && existsSync(`${FIX}raw`);
const SEM_FIXTURES = "fixtures ausentes em testes/fixtures (rode `npm run fixtures` para baixar as fotos e extrair os pontos)";

/** Teste que depende das fotos: pulado com mensagem clara se elas não existirem. */
function comFotos(nome, fn) {
  test(nome, (t) => {
    if (!TEM_FIXTURES) {
      t.skip(SEM_FIXTURES);
      return;
    }
    return fn(t);
  });
}

const cache = new Map();
/** @returns {{det:any, dados:Uint8Array, largura:number, altura:number}} */
function foto(nome) {
  if (!cache.has(nome)) {
    const det = JSON.parse(readFileSync(`${FIX}pontos/${nome}.json`, "utf8"));
    const dim = JSON.parse(readFileSync(`${FIX}raw/${nome}.json`, "utf8"));
    const dados = new Uint8Array(readFileSync(`${FIX}raw/${nome}.rgb`));
    cache.set(nome, { det, dados, largura: dim.largura, altura: dim.altura });
  }
  return cache.get(nome);
}
const amostradorDe = (f, dados = f.dados) => criarAmostrador({ dados, largura: f.largura, altura: f.altura, canais: 3 });
const medirFoto = (nome, opcoes) => {
  const f = foto(nome);
  return medir(f.det, amostradorDe(f), opcoes);
};
const checagem = (q, id) => q.checagens.find((c) => c.id === id);

// ───────────────────────────── ajudantes de validação ─────────────────────────────

function naoFinitos(obj) {
  const ruins = [];
  const visitar = (v, c) => {
    if (typeof v === "number") {
      if (!Number.isFinite(v)) ruins.push(c);
    } else if (Array.isArray(v)) v.forEach((x, i) => visitar(x, `${c}[${i}]`));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) visitar(x, c ? `${c}.${k}` : k);
  };
  visitar(obj, "");
  return ruins;
}

const HEX = /^#[0-9A-F]{6}$/;
const entre = (v, a, b, rotulo) => assert.ok(typeof v === "number" && v >= a && v <= b, `${rotulo} = ${v} fora de [${a}, ${b}]`);
function validarCor(c, rotulo) {
  assert.match(c.hex, HEX, `${rotulo}.hex`);
  for (const k of ["L", "a", "b"]) assert.equal(typeof c.lab[k], "number", `${rotulo}.lab.${k}`);
  entre(c.lab.L, 0, 100, `${rotulo}.lab.L`);
  entre(c.confianca, 0, 1, `${rotulo}.confianca`);
}
function validarProporcoes(p, rotulo) {
  assert.ok(p && typeof p === "object", rotulo);
  for (const [k, v] of Object.entries(p)) assert.equal(typeof v, "number", `${rotulo}.${k}`);
}
function validarQualidade(q) {
  assert.equal(typeof q.aprovada, "boolean");
  assert.ok(Array.isArray(q.checagens) && q.checagens.length >= 1);
  for (const c of q.checagens) {
    assert.ok(["um-rosto", "frontal", "tamanho", "luz", "foco", "olhos", "expressao"].includes(c.id), `id ${c.id}`);
    assert.ok(["ok", "atencao", "erro"].includes(c.estado), `estado ${c.estado}`);
    assert.ok(typeof c.titulo === "string" && c.titulo.length > 3);
    assert.ok(typeof c.dica === "string" && c.dica.length > 3);
    assert.ok(Number.isFinite(c.valor), `valor de ${c.id}`);
  }
  assert.equal(new Set(q.checagens.map((c) => c.id)).size, q.checagens.length, "ids repetidos");
  assert.equal(q.aprovada, q.checagens.every((c) => c.estado !== "erro"));
}
/** Confere Medidas contra o contrato de tipos.js. */
function validarMedidas(m) {
  validarQualidade(m.qualidade);
  const bb = m.balancoDeBranco;
  for (const k of ["r", "g", "b"]) entre(bb.ganho[k], 0.7, 1.4, `ganho.${k}`);
  assert.ok(["branco-do-olho", "mundo-cinza", "nenhuma"].includes(bb.fonte));
  entre(bb.confianca, 0, 1, "bb.confianca");

  validarCor(m.pele, "pele");
  assert.equal(typeof m.pele.ita, "number");
  assert.equal(typeof m.pele.faixaIta, "string");
  entre(m.pele.monk.n, 1, 10, "monk.n");
  assert.match(m.pele.monk.hex, HEX);
  assert.equal(typeof m.pele.monk.distancia, "number");
  assert.equal(typeof m.pele.profundidade, "string");
  assert.ok(["frio", "neutro", "quente", "oliva"].includes(m.pele.subtom.subtom));
  assert.equal(typeof m.pele.subtom.h, "number");
  assert.equal(typeof m.pele.subtom.explicacao, "string");

  validarCor(m.olhos, "olhos");
  assert.ok(["castanho escuro", "castanho", "mel", "verde", "azul", "cinza", "preto"].includes(m.olhos.familia), m.olhos.familia);
  validarCor(m.labios, "labios");
  assert.ok(["clara", "media", "marcada"].includes(m.labios.pigmentacao));
  validarCor(m.sobrancelhas, "sobrancelhas");

  assert.equal(typeof m.olheira.presente, "boolean");
  assert.ok(["arroxeada", "azulada", "marrom", "nenhuma"].includes(m.olheira.tipo));
  entre(m.olheira.intensidade, 0, 1, "olheira.intensidade");
  assert.equal(m.olheira.presente, m.olheira.tipo !== "nenhuma");
  assert.equal(typeof m.vermelhidao.presente, "boolean");
  entre(m.vermelhidao.intensidade, 0, 1, "vermelhidao.intensidade");

  assert.ok(["oval", "redondo", "quadrado", "coracao", "diamante", "alongado"].includes(m.rosto.formato));
  validarProporcoes(m.rosto.proporcoes, "rosto.proporcoes");
  entre(m.rosto.confianca, 0, 0.6, "rosto.confianca");
  assert.ok(["para cima", "reta", "para baixo"].includes(m.formatoOlhos.inclinacao));
  assert.ok(["juntos", "equilibrados", "separados"].includes(m.formatoOlhos.distancia));
  assert.equal(typeof m.formatoOlhos.possivelEncapuzado, "boolean");
  validarProporcoes(m.formatoOlhos.proporcoes, "formatoOlhos.proporcoes");
  assert.ok(["fina", "media", "carnuda"].includes(m.formatoBoca.volume));
  assert.ok(["superior menor", "equilibrada", "superior maior"].includes(m.formatoBoca.equilibrio));
  validarProporcoes(m.formatoBoca.proporcoes, "formatoBoca.proporcoes");
  assert.ok(["baixo", "medio", "alto"].includes(m.contrastePessoal.contraste));
  assert.equal(typeof m.contrastePessoal.valor, "number");

  assert.deepEqual(naoFinitos(m), [], "números não finitos");
  assert.doesNotMatch(JSON.stringify(m), /\blook\b/i, 'a palavra "look" não pode aparecer');
}

// ───────────────────────────── imagens sintéticas ─────────────────────────────

/** Desfoque de caixa separável (raio r), RGB. */
function desfocar(dados, W, H, r) {
  const tmp = new Float32Array(dados.length), out = new Uint8Array(dados.length);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      for (let c = 0; c < 3; c++) {
        let s = 0, n = 0;
        for (let k = -r; k <= r; k++) {
          const xx = Math.min(W - 1, Math.max(0, x + k));
          s += dados[(y * W + xx) * 3 + c];
          n++;
        }
        tmp[(y * W + x) * 3 + c] = s / n;
      }
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      for (let c = 0; c < 3; c++) {
        let s = 0, n = 0;
        for (let k = -r; k <= r; k++) {
          const yy = Math.min(H - 1, Math.max(0, y + k));
          s += tmp[(yy * W + x) * 3 + c];
          n++;
        }
        out[(y * W + x) * 3 + c] = Math.round(s / n);
      }
  return out;
}
/** Reduz pela metade (média 2×2). */
function metade(dados, W, H) {
  const w = W >> 1, h = H >> 1, out = new Uint8Array(w * h * 3);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      for (let c = 0; c < 3; c++) {
        const i = (a, b) => dados[((2 * y + b) * W + 2 * x + a) * 3 + c];
        out[(y * w + x) * 3 + c] = Math.round((i(0, 0) + i(1, 0) + i(0, 1) + i(1, 1)) / 4);
      }
  return { dados: out, largura: w, altura: h };
}
const mapear = (dados, fn) => {
  const out = new Uint8Array(dados.length);
  for (let i = 0; i < dados.length; i += 3) {
    const [r, g, b] = fn(dados[i], dados[i + 1], dados[i + 2], (i / 3) | 0);
    out[i] = Math.max(0, Math.min(255, Math.round(r)));
    out[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
    out[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
  }
  return out;
};

/** Gerador pseudoaleatório determinístico (mulberry32). */
function aleatorio(semente) {
  let a = semente >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ═════════════════════════════════════ amostrador ═════════════════════════════════════

describe("criarAmostrador", () => {
  test("lê pixels de 3 e 4 canais e devolve null fora da imagem", () => {
    const rgb = criarAmostrador({ dados: new Uint8Array([1, 2, 3, 4, 5, 6]), largura: 2, altura: 1, canais: 3 });
    assert.deepEqual(rgb.pixel(1, 0), { r: 4, g: 5, b: 6 });
    assert.deepEqual(rgb.pixel(0.9, 0.2), { r: 1, g: 2, b: 3 }, "coordenada fracionária usa o pixel que a contém");
    for (const [x, y] of [[-1, 0], [2, 0], [0, 1], [NaN, 0], [0, Infinity]]) assert.equal(rgb.pixel(x, y), null);
    const rgba = criarAmostrador({ dados: new Uint8ClampedArray([10, 20, 30, 255, 40, 50, 60, 255]), largura: 2, altura: 1, canais: 4 });
    assert.deepEqual(rgba.pixel(1, 0), { r: 40, g: 50, b: 60 });
    assert.equal(rgba.luma(0, 0), 0.2126 * 10 + 0.7152 * 20 + 0.0722 * 30);
    // sem `canais`: deduz pelo tamanho
    const auto = criarAmostrador({ dados: new Uint8Array([7, 8, 9]), largura: 1, altura: 1 });
    assert.deepEqual(auto.pixel(0, 0), { r: 7, g: 8, b: 9 });
  });

  test("não quebra com dados faltando ou dimensões ruins", () => {
    const curto = criarAmostrador({ dados: new Uint8Array(5), largura: 10, altura: 10, canais: 3 });
    assert.deepEqual(curto.pixel(0, 0), { r: 0, g: 0, b: 0 });
    assert.equal(curto.pixel(5, 5), null);
    for (const args of [{}, { dados: null, largura: 3, altura: 3 }, { dados: new Uint8Array(12), largura: NaN, altura: -4 }]) {
      const a = criarAmostrador(args);
      assert.equal(a.pixel(0, 0), null);
      assert.deepEqual(a.poligono([{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: 5 }]), []);
      assert.deepEqual(a.circulo({ x: 1, y: 1 }, 3), []);
      assert.deepEqual(a.imagem(), []);
    }
    assert.doesNotThrow(() => criarAmostrador());
  });

  test("polígono (par-ímpar), círculo, teto de amostras e interpolação", () => {
    const W = 40, H = 40;
    const a = criarAmostrador({ dados: new Uint8Array(W * H * 3).fill(100), largura: W, altura: H, canais: 3 });
    const quadrado = (x0, y0, l) => [{ x: x0, y: y0 }, { x: x0 + l, y: y0 }, { x: x0 + l, y: y0 + l }, { x: x0, y: y0 + l }];
    assert.equal(a.poligono(quadrado(5, 5, 10)).length, 100);
    assert.equal(a.poligono([quadrado(5, 5, 20), quadrado(10, 10, 10)]).length, 300, "anel = externo − interno");
    assert.equal(a.poligono(quadrado(30, 30, 20)).length, 100, "corta na borda da imagem");
    assert.deepEqual(a.poligono([{ x: 1, y: 1 }, { x: NaN, y: 2 }]), [], "pontos inválidos são ignorados");
    const c = a.circulo({ x: 20, y: 20 }, 10).length;
    assert.ok(Math.abs(c - Math.PI * 100) < 12, `círculo r=10 com ${c} px`);
    assert.ok(a.poligono(quadrado(0, 0, 40), { maximo: 100 }).length <= 100);
    assert.ok(a.imagem({ maximo: 50 }).length <= 50);
    const grad = criarAmostrador({ dados: new Uint8Array([0, 0, 0, 200, 200, 200]), largura: 2, altura: 1, canais: 3 });
    assert.ok(Math.abs(grad.lumaSuave(1, 0.5) - 100) < 1e-9, "meio caminho entre os centros");
    assert.equal(grad.lumaSuave(5, 0.5), null);
  });
});

// ═════════════════════════════════════ robustez ═════════════════════════════════════

describe("robustez (dados ruins nunca quebram e sempre dão números finitos)", () => {
  const vazio = criarAmostrador({ dados: new Uint8Array(30 * 30 * 3).fill(128), largura: 30, altura: 30, canais: 3 });

  test("detecção sem pontos: erro 'Não encontramos um rosto' e Medidas completas com confiança 0", () => {
    for (const det of [{ pontos: [], rostos: 0, expressoes: {}, matriz: null, largura: 30, altura: 30 }, {}, null, undefined, { pontos: "x" }]) {
      const q = checarQualidade(det, vazio);
      assert.equal(q.aprovada, false);
      assert.deepEqual(q.checagens.map((c) => [c.id, c.estado]), [["um-rosto", "erro"]]);
      assert.equal(q.checagens[0].titulo, "Não encontramos um rosto");
      const m = medir(det, vazio);
      validarMedidas(m);
      for (const k of ["pele", "olhos", "labios", "sobrancelhas"]) assert.equal(m[k].confianca, 0, k);
      assert.equal(m.rosto.confianca, 0);
    }
  });

  test("pontos degenerados (todos iguais) e aleatórios, com NaN e matriz quebrada", () => {
    const iguais = { pontos: Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 })), rostos: 1, expressoes: {}, matriz: null, largura: 30, altura: 30 };
    validarMedidas(medir(iguais, vazio));
    const rnd = aleatorio(7);
    for (let rodada = 0; rodada < 5; rodada++) {
      const pontos = Array.from({ length: 478 }, (_, i) =>
        i % 37 === 0 ? { x: NaN, y: 0.3 } : i % 41 === 0 ? null : { x: rnd() * 1.4 - 0.2, y: rnd() * 1.4 - 0.2, z: rnd() - 0.5 },
      );
      const det = { pontos, rostos: 1 + rodada, expressoes: { eyeBlinkLeft: NaN, mouthSmileLeft: "x" }, matriz: [NaN, 1, 2], largura: 30, altura: 30 };
      validarMedidas(medir(det, vazio));
      validarQualidade(checarQualidade(det, vazio));
      validarMedidas(medir(det, null));
    }
  });

  comFotos("amostrador 1×1, sem amostrador e amostrador sem ajudantes, com pontos reais", () => {
    const { det } = foto("rosto-frontal");
    const minusculo = criarAmostrador({ dados: new Uint8Array([200, 150, 130]), largura: 1, altura: 1, canais: 3 });
    const m = medir(det, minusculo);
    validarMedidas(m);
    assert.equal(m.qualidade.aprovada, false);
    assert.equal(checagem(m.qualidade, "tamanho").estado, "erro");
    assert.equal(m.balancoDeBranco.fonte, "nenhuma");

    const semPixels = checarQualidade(det, null);
    validarQualidade(semPixels);
    assert.deepEqual(semPixels.checagens.map((c) => c.id), ["um-rosto", "frontal", "tamanho", "olhos", "expressao"], "sem pixels: só checagens geométricas");
    validarMedidas(medir(det, undefined));

    // imagem vazia com pontos reais: não dá para medir nada, então não aprova
    const vazia = medir(det, criarAmostrador({ dados: new Uint8Array(0), largura: 0, altura: 0 }));
    validarMedidas(vazia);
    assert.equal(vazia.qualidade.aprovada, false);
    assert.equal(checagem(vazia.qualidade, "luz").estado, "erro");
    assert.equal(vazia.pele.confianca, 0);

    // objeto mínimo {largura, altura, pixel} (ex.: leitor de canvas próprio) também funciona
    const f = foto("rosto-frontal");
    const base = amostradorDe(f);
    const minimo = { largura: base.largura, altura: base.altura, pixel: base.pixel };
    assert.deepEqual(medir(det, minimo), medir(det, base));
  });

  comFotos("sem íris (468 pontos), sem blendshapes e sem matriz: usa os planos B", () => {
    const f = foto("rosto-frontal");
    const det = { ...f.det, pontos: f.det.pontos.slice(0, 468), expressoes: {}, matriz: null };
    const m = medir(det, amostradorDe(f));
    validarMedidas(m);
    assert.equal(m.olhos.confianca, 0, "sem íris não há cor dos olhos");
    assert.equal(m.balancoDeBranco.fonte, "mundo-cinza");
    assert.equal(m.qualidade.aprovada, true, JSON.stringify(m.qualidade.checagens));
    assert.equal(checagem(m.qualidade, "frontal").estado, "ok", "pose pelos pontos (sem matriz)");
    assert.equal(checagem(m.qualidade, "olhos").estado, "ok", "olhos abertos pela geometria");
  });
});

// ═════════════════════════════════════ checagem da selfie ═════════════════════════════════════

describe("checarQualidade com fotos reais", () => {
  comFotos("rosto-frontal: aprovada, sem problema de foco, luz, pose ou tamanho", (t) => {
    const f = foto("rosto-frontal");
    const q = checarQualidade(f.det, amostradorDe(f));
    validarQualidade(q);
    t.diagnostic(q.checagens.map((c) => `${c.id}=${c.estado}(${c.valor})`).join(" "));
    assert.equal(q.aprovada, true);
    for (const id of ["um-rosto", "frontal", "tamanho", "luz", "foco", "olhos"]) assert.equal(checagem(q, id).estado, "ok", id);
    // ela sorri mostrando os dentes: aviso leve, que não bloqueia
    assert.equal(checagem(q, "expressao").estado, "atencao");
    assert.equal(checagem(q, "expressao").titulo, "Rosto neutro mede melhor a boca");
  });

  comFotos("man-woman-okay: atenção em 'um-rosto'", () => {
    const f = foto("man-woman-okay");
    const q = checarQualidade(f.det, amostradorDe(f));
    const c = checagem(q, "um-rosto");
    assert.equal(c.estado, "atencao");
    assert.equal(c.titulo, "Tem mais de um rosto na foto");
    assert.equal(c.valor, 2);
  });

  comFotos("rosto-escuro: foto escura demais (erro de luz); as outras variações de luz não dão erro", (t) => {
    const f = foto("rosto-escuro");
    const q = checarQualidade(f.det, amostradorDe(f));
    const luz = checagem(q, "luz");
    t.diagnostic(`luz: ${luz.estado} L*=${luz.valor}`);
    assert.equal(luz.estado, "erro");
    assert.equal(luz.titulo, "Foto escura demais");
    assert.equal(q.aprovada, false);
    for (const nome of ["rosto-frontal", "rosto-luz-fria", "rosto-luz-quente", "business-person", "portrait"]) {
      const g = foto(nome);
      assert.notEqual(checagem(checarQualidade(g.det, amostradorDe(g)), "luz").estado, "erro", nome);
    }
  });

  comFotos("foco: rosto-desfocado reprova, rosto-frontal passa, e a nota cai com o desfoque", (t) => {
    const nota = (nome, dados) => {
      const f = foto(nome);
      return checagem(checarQualidade(f.det, amostradorDe(f, dados)), "foco");
    };
    const nitida = nota("rosto-frontal"), borrada = nota("rosto-desfocado");
    t.diagnostic(`nitidez: rosto-frontal ${nitida.valor}, rosto-desfocado ${borrada.valor} (limites ${LIMITES.foco})`);
    assert.equal(nitida.estado, "ok");
    assert.equal(borrada.estado, "erro");
    assert.equal(borrada.titulo, "Foto desfocada");
    const f = foto("rosto-frontal");
    const notas = [1, 3, 6].map((r) => nota("rosto-frontal", desfocar(f.dados, f.largura, f.altura, r)).valor);
    t.diagnostic(`desfoque de caixa r=1,3,6 → ${notas.join(", ")}`);
    assert.ok(nitida.valor > notas[0] && notas[0] > notas[1] && notas[1] > notas[2], "nota diminui com o desfoque");
    assert.ok(nitida.valor > 2 * LIMITES.foco[0], "folga para fotos nítidas");
    // outras fotos nítidas também passam
    for (const nome of ["business-person", "portrait", "rosto-escuro", "rosto-luz-fria"]) assert.equal(nota(nome).estado, "ok", nome);
  });

  comFotos("tamanho: business-person com atenção; portrait_small com erro (rosto de 48 px)", (t) => {
    const bp = foto("business-person"), ps = foto("portrait_small");
    const cb = checagem(checarQualidade(bp.det, amostradorDe(bp)), "tamanho");
    const cs = checagem(checarQualidade(ps.det, amostradorDe(ps)), "tamanho");
    t.diagnostic(`business-person: rosto ${cb.valor} do menor lado (958×1358); portrait_small: ${cs.valor} (205×256)`);
    assert.equal(cb.estado, "atencao");
    assert.equal(cb.titulo, "Rosto pequeno na foto");
    // portrait_small: o rosto tem ~48 px de largura (íris com ~4 px): pequeno demais para medir cor
    assert.notEqual(cs.estado, "ok");
    assert.equal(cs.estado, "erro");
    assert.equal(checagem(checarQualidade(ps.det, amostradorDe(ps)), "tamanho").titulo, "Rosto muito pequeno na foto");
  });

  comFotos("portrait_rotated: reprovada pela rolagem (foto deitada); com e sem matriz", () => {
    const f = foto("portrait_rotated");
    for (const det of [f.det, { ...f.det, matriz: null }]) {
      const q = checarQualidade(det, amostradorDe(f));
      const c = checagem(q, "frontal");
      assert.equal(q.aprovada, false);
      assert.equal(c.estado, "erro");
      assert.equal(c.titulo, "A foto está deitada");
    }
    // a mesma foto de pé passa na pose
    const reta = foto("portrait");
    assert.equal(checagem(checarQualidade(reta.det, amostradorDe(reta)), "frontal").estado, "ok");
  });

  comFotos("luz de um lado só e luz estourada (variações sintéticas de rosto-frontal)", () => {
    const f = foto("rosto-frontal");
    const cx = ((f.det.pontos[234].x + f.det.pontos[454].x) / 2) * f.largura;
    const lado = mapear(f.dados, (r, g, b, i) => ((i % f.largura) > cx ? [r * 0.4, g * 0.4, b * 0.4] : [r, g, b]));
    const cl = checagem(checarQualidade(f.det, amostradorDe(f, lado)), "luz");
    assert.equal(cl.estado, "atencao");
    assert.equal(cl.titulo, "Luz só de um lado");
    assert.ok(cl.valor > LIMITES.luz.razaoLados);
    const estourada = mapear(f.dados, (r, g, b) => [r * 1.7, g * 1.7, b * 1.7]);
    const ce = checagem(checarQualidade(f.det, amostradorDe(f, estourada)), "luz");
    assert.equal(ce.estado, "atencao");
    assert.equal(ce.titulo, "Luz forte demais no rosto");
  });

  comFotos("olhos fechados (blendshapes) dão atenção e o balanço de branco não usa o branco do olho", () => {
    const f = foto("rosto-frontal");
    const det = { ...f.det, expressoes: { ...f.det.expressoes, eyeBlinkLeft: 0.92, eyeBlinkRight: 0.88 } };
    const m = medir(det, amostradorDe(f));
    const c = checagem(m.qualidade, "olhos");
    assert.equal(c.estado, "atencao");
    assert.equal(c.titulo, "Olhos fechados");
    assert.equal(m.qualidade.aprovada, true, "atenção não bloqueia");
    assert.equal(m.balancoDeBranco.fonte, "mundo-cinza");
    assert.ok(m.balancoDeBranco.confianca < 0.3);
  });
});

// ═════════════════════════════════════ medição ═════════════════════════════════════

describe("medir com fotos reais", () => {
  comFotos("todas as fotos: Medidas completas, números finitos, sem a palavra 'look'", () => {
    for (const nome of readdirFotos()) {
      const m = medirFoto(nome);
      try {
        validarMedidas(m);
      } catch (e) {
        e.message = `${nome}: ${e.message}`;
        throw e;
      }
    }
  });

  comFotos("balanço de branco: pele de luz fria e quente fica a ΔE2000 ≤ 4 da pele de rosto-frontal", (t) => {
    const ref = medirFoto("rosto-frontal"), ref0 = medirFoto("rosto-frontal", { balancoDeBranco: false });
    assert.equal(ref.balancoDeBranco.fonte, "branco-do-olho");
    for (const nome of ["rosto-luz-fria", "rosto-luz-quente"]) {
      const m = medirFoto(nome), m0 = medirFoto(nome, { balancoDeBranco: false });
      const antes = deltaE2000(ref0.pele.lab, m0.pele.lab);
      const depois = deltaE2000(ref.pele.lab, m.pele.lab);
      const iris = [deltaE2000(ref0.olhos.lab, m0.olhos.lab), deltaE2000(ref.olhos.lab, m.olhos.lab)];
      const labios = [deltaE2000(ref0.labios.lab, m0.labios.lab), deltaE2000(ref.labios.lab, m.labios.lab)];
      t.diagnostic(
        `${nome}: pele ΔE ${antes.toFixed(2)} → ${depois.toFixed(2)}; íris ${iris[0].toFixed(2)} → ${iris[1].toFixed(2)}; ` +
          `lábios ${labios[0].toFixed(2)} → ${labios[1].toFixed(2)}; ganho ${JSON.stringify(m.balancoDeBranco.ganho)} (conf ${m.balancoDeBranco.confianca})`,
      );
      assert.equal(m.balancoDeBranco.fonte, "branco-do-olho", nome);
      assert.ok(m.balancoDeBranco.confianca >= 0.6, `${nome}: confiança ${m.balancoDeBranco.confianca}`);
      assert.ok(antes > 6, `${nome}: a variação de luz deveria mudar a cor medida sem correção (ΔE ${antes})`);
      assert.ok(depois <= 4, `${nome}: ΔE depois da correção = ${depois}`);
      assert.ok(depois < antes / 2, `${nome}: a correção deveria reduzir bem o erro`);
      assert.ok(labios[1] <= 4 && iris[1] <= 4, `${nome}: lábios/íris também se alinham`);
    }
    // na foto equilibrada (fundo branco neutro), a correção quase não mexe
    for (const k of ["r", "g", "b"]) assert.ok(Math.abs(ref.balancoDeBranco.ganho[k] - 1) < 0.03, `ganho ${k} em rosto-frontal`);
  });

  comFotos("íris de rosto-frontal é esverdeada/acinzentada; a de business-person é castanha", (t) => {
    for (const nome of ["rosto-frontal", "rosto-luz-fria", "rosto-luz-quente"]) {
      const m = medirFoto(nome);
      t.diagnostic(`${nome}: íris ${m.olhos.hex} Lab(${m.olhos.lab.L}, ${m.olhos.lab.a}, ${m.olhos.lab.b}) → ${m.olhos.familia} (conf ${m.olhos.confianca})`);
      assert.ok(["verde", "cinza"].includes(m.olhos.familia), `${nome}: ${m.olhos.familia}`);
    }
    const bp = medirFoto("business-person");
    t.diagnostic(`business-person: íris ${bp.olhos.hex} → ${bp.olhos.familia}`);
    assert.ok(["castanho", "castanho escuro", "mel"].includes(bp.olhos.familia), bp.olhos.familia);
    assert.ok(medirFoto("rosto-frontal").olhos.confianca > 0.6);
  });

  comFotos("rosto-frontal: leituras coerentes com a foto (pele clara, sobrancelha e íris bem mais escuras)", (t) => {
    const m = medirFoto("rosto-frontal");
    t.diagnostic(
      `pele ${m.pele.hex} L*${m.pele.lab.L} ITA ${m.pele.ita} (${m.pele.faixaIta}) Monk ${m.pele.monk.n} ${m.pele.subtom.subtom}; ` +
        `lábios ${m.labios.hex} (${m.labios.pigmentacao}); sobrancelhas ${m.sobrancelhas.hex}; contraste ${m.contrastePessoal.contraste} (${m.contrastePessoal.valor}); ` +
        `rosto ${m.rosto.formato} (${m.rosto.confianca}); olhos ${m.formatoOlhos.inclinacao}/${m.formatoOlhos.distancia}; boca ${m.formatoBoca.volume}/${m.formatoBoca.equilibrio}`,
    );
    assert.ok(m.pele.lab.L > 70 && m.pele.ita > 41, "pele clara");
    assert.ok(m.pele.confianca > 0.6);
    assert.ok(m.sobrancelhas.lab.L < m.pele.lab.L - 30, "sobrancelhas castanhas escuras");
    assert.ok(m.labios.lab.a > m.pele.lab.a + 10, "lábios mais rosados que a pele");
    assert.equal(m.contrastePessoal.contraste, "alto");
    assert.equal(m.olheira.presente, false);
    assert.ok(m.rosto.confianca > 0 && m.rosto.confianca <= 0.6, "formato do rosto com confiança moderada");
  });

  comFotos("mesma foto em meia resolução e em RGBA: mesmas leituras", (t) => {
    const f = foto("rosto-frontal");
    const cheia = medir(f.det, amostradorDe(f));
    const rgba = new Uint8ClampedArray(f.largura * f.altura * 4);
    for (let i = 0, j = 0; i < f.dados.length; i += 3, j += 4) {
      rgba[j] = f.dados[i];
      rgba[j + 1] = f.dados[i + 1];
      rgba[j + 2] = f.dados[i + 2];
      rgba[j + 3] = 255;
    }
    assert.deepEqual(medir(f.det, criarAmostrador({ dados: rgba, largura: f.largura, altura: f.altura, canais: 4 })), cheia);
    const meia = metade(f.dados, f.largura, f.altura);
    const m = medir(f.det, criarAmostrador({ ...meia, canais: 3 }));
    const dE = deltaE2000(cheia.pele.lab, m.pele.lab);
    t.diagnostic(`meia resolução (${meia.largura}×${meia.altura}): pele ΔE ${dE.toFixed(2)}, foco ${checagem(m.qualidade, "foco").valor}`);
    assert.equal(m.qualidade.aprovada, true);
    assert.equal(checagem(m.qualidade, "foco").estado, "ok");
    // a referência do branco do olho fica menos precisa com menos pixels (~2% no ganho)
    assert.ok(dE <= 3, `ΔE ${dE}`);
    for (const k of ["r", "g", "b"]) assert.ok(Math.abs(m.balancoDeBranco.ganho[k] - cheia.balancoDeBranco.ganho[k]) < 0.03, `ganho ${k}`);
    assert.equal(m.olhos.familia, cheia.olhos.familia);
  });

  comFotos("determinismo: mesma entrada → mesma saída", () => {
    for (const nome of ["rosto-frontal", "man-woman-okay", "portrait_small"]) {
      const f = foto(nome);
      assert.deepEqual(medir(f.det, amostradorDe(f)), medir(structuredClone(f.det), amostradorDe(f, f.dados.slice())));
      assert.deepEqual(checarQualidade(f.det, amostradorDe(f)), checarQualidade(f.det, amostradorDe(f)));
    }
  });
});

describe("familiaDaIris", () => {
  test("classifica cores típicas", () => {
    const casos = [
      [{ L: 12, a: 3, b: 4 }, "preto"],
      [{ L: 25, a: 10, b: 15 }, "castanho escuro"],
      [{ L: 35, a: 18, b: 20 }, "castanho"],
      [{ L: 45, a: 8, b: 26 }, "mel"],
      [{ L: 40, a: -4, b: 14 }, "verde"],
      [{ L: 50, a: -3, b: -14 }, "azul"],
      [{ L: 55, a: -1, b: 2 }, "cinza"],
    ];
    for (const [lab, esperado] of casos) assert.equal(familiaDaIris(lab), esperado, JSON.stringify(lab));
  });
});

function readdirFotos() {
  return ["rosto-frontal", "rosto-luz-fria", "rosto-luz-quente", "rosto-escuro", "rosto-desfocado", "portrait", "business-person", "man-woman-okay", "portrait_rotated", "portrait_small", "face_stylizer_raw_face_demo"].filter((n) =>
    existsSync(`${FIX}pontos/${n}.json`),
  );
}
