// O "cérebro" da make: junta as escolhas da cliente (make, momento, papel, horário, pedido) com as
// medidas do rosto e devolve a RECEITA da Thalita, já na ordem de execução, com o porquê de cada
// adaptação. Também converte a receita para o Modo Ao Vivo (paraEstado) e entende pedidos escritos
// em português do dia a dia (interpretarPedido). Funções puras e determinísticas, sem DOM.

import {
  MOMENTOS, PAPEIS, MAKES, PALETAS, CORES_POR_FAMILIA,
  buscarMomento, buscarPapel, buscarMake, buscarCor, aceitaAcabamento, corMaisProxima,
} from "./catalogo.js";
import { REGRAS, NIVEIS, rodarRegras } from "./regras.js";
import {
  hexParaLab, labParaHex, deltaE2000, familia, misturar, ajustar, subtom as lerSubtom, profundidade as lerProfundidade,
} from "./cor.js";

/** @typedef {import("./tipos.js").Categoria} Categoria */
/** @typedef {import("./tipos.js").Acabamento} Acabamento */
/** @typedef {import("./tipos.js").ItemReceita} ItemReceita */
/** @typedef {import("./tipos.js").Receita} Receita */
/** @typedef {import("./tipos.js").EstadoMake} EstadoMake */
/** @typedef {import("./tipos.js").Camada} Camada */
/** @typedef {import("./tipos.js").Medidas} Medidas */
/** @typedef {import("./tipos.js").Adaptacao} Adaptacao */
/** @typedef {import("./regras.js").Plano} Plano */

/**
 * Ajuste de uma camada: igual à Camada, mas tudo opcional, mais `fator` (multiplica a intensidade)
 * e `familia` (ex.: "vermelho" — a receita escolhe o vermelho que combina com a pele).
 * @typedef {Partial<Camada> & {fator?:number, familia?:string}} AjusteCamada
 * @typedef {Partial<Record<Categoria, AjusteCamada|null>> & {variacao?:"Mais suave"|"Como está"|"Mais intenso", evitar?:string[]}} Ajustes
 *
 * @typedef {Object} Escolhas
 * @property {string} makeId
 * @property {string} momento
 * @property {string} papel
 * @property {"dia"|"noite"} [horario]
 * @property {"Mais suave"|"Como está"|"Mais intenso"} [variacao]
 * @property {string} [pedido]           texto livre da cliente (tratado como DADO)
 * @property {Ajustes} [ajustes]         vindos do Modo Ao Vivo
 */

export const CATEGORIAS = /** @type {Categoria[]} */ (["base", "corretivo", "contorno", "blush", "iluminador", "sombra", "delineado", "mascara", "sobrancelha", "batom"]);
export const ORDEM_PELE_PRIMEIRO = [...CATEGORIAS];
export const ORDEM_OLHOS_PRIMEIRO = /** @type {Categoria[]} */ (["sombra", "delineado", "base", "corretivo", "contorno", "blush", "iluminador", "mascara", "sobrancelha", "batom"]);
const VARIACOES = ["Mais suave", "Como está", "Mais intenso"];

/** Intensidade de partida (0–100) por nível: [leve, média, alta]. */
const INTENSIDADE = {
  base: [35, 55, 75],
  corretivo: [30, 45, 60],
  contorno: [20, 35, 50],
  blush: [30, 42, 55],
  iluminador: [30, 45, 60],
  sombra: [30, 55, 75],
  delineado: [50, 65, 80],
  mascara: [60, 75, 90],
  sobrancelha: [40, 55, 65],
  batom: [45, 60, 75],
};
/** Sombra a partir desta intensidade conta como "intensa": olhos antes da pele. */
const SOMBRA_INTENSA = 60;
/** Peso da ordem de preferência das regras na escolha por cor (ΔE + peso × posição). */
const PESO_ORDEM = 2.5;
/** Categorias em que o fatorGlobal (variação/noite no limite) vale. A pele fica de fora. */
const CORES = new Set(["contorno", "blush", "iluminador", "sombra", "delineado", "mascara", "sobrancelha", "batom"]);
/** Categorias em que "evitar marrom/cinza/…" se aplica (sobrancelha e contorno seguem a pele). */
const EVITAVEIS = new Set(["sombra", "batom", "blush", "delineado", "iluminador", "mascara"]);

const FERRAMENTA = {
  base: "esponja úmida ou pincel de base",
  corretivo: "pincel pequeno de corretivo ou ponta do dedo",
  contorno: "pincel de contorno anguloso",
  blush: "pincel de blush macio",
  iluminador: "pincel leque pequeno ou ponta do dedo",
  sombra: "pincel chato para a pálpebra e pincel de esfumar",
  delineado: "pincel chanfrado fino ou caneta delineadora",
  mascara: "escovinha da máscara (e pinça para os cílios postiços)",
  sobrancelha: "pincel chanfrado e escovinha",
  batom: "lápis de boca e pincel de lábios",
};
const ZONA = {
  base: "rosto todo, esfumando no pescoço",
  corretivo: "centro da olheira (triângulo invertido), cantos do nariz e da boca",
  contorno: "abaixo das maçãs, laterais da testa e do maxilar",
  blush: "maçãs do rosto, esfumando em direção às têmporas",
  iluminador: "topo das maçãs, ponte do nariz e arco do cupido",
  sombra: "pálpebra móvel e côncavo",
  delineado: "rente aos cílios de cima",
  mascara: "cílios de cima e, de leve, os de baixo",
  sobrancelha: "falhas e contorno dos fios",
  batom: "lábios inteiros",
};
const FORMA_BASE = [
  "camada fina, só uniformizando — a pele aparece",
  "cobertura média, construída em camadas finas",
  "alta cobertura em camadas finas, selada com pó só na zona T",
];
const FORMA_SOMBRA = {
  palpebra: "cor média na pálpebra móvel, luz no canto interno e transição suave no côncavo",
  esfumado: "esfumado em degradê: clara no canto interno, média na pálpebra, escura no canto externo e no côncavo",
  asa: "esfumado em asa, subindo para a cauda da sobrancelha, com a cor escura no canto externo",
};
const FORMA_DELINEADO = {
  fino: "linha fina rente aos cílios, sem asa",
  gatinho: "linha fina que engrossa no canto externo, com a pontinha levantada",
  marcado: "traço marcado, com asa definida e a linha de baixo esfumada no canto externo",
};
const TOM_BASE = {
  clara: "Bege claro",
  "média clara": "Bege médio claro",
  média: "Bege médio",
  "média escura": "Castanho médio",
  escura: "Castanho escuro",
  retinta: "Cacau profundo",
};
const FUNDO_NOME = { quente: "dourado", frio: "rosado", neutro: "neutro", oliva: "oliva" };
const ACAB_FEM = { matte: "matte", acetinado: "acetinada", cintilante: "cintilante", gloss: "com efeito gloss", glitter: "com glitter" };
const ACAB_MASC = { matte: "matte", acetinado: "acetinado", cintilante: "cintilante", gloss: "com efeito gloss", glitter: "com glitter" };
/** Se um acabamento não puder (categoria não aceita ou a cliente pediu para evitar), tenta o próximo. */
const CADEIA_ACABAMENTO = {
  glitter: ["glitter", "cintilante", "acetinado", "matte"],
  cintilante: ["cintilante", "acetinado", "matte"],
  gloss: ["gloss", "acetinado", "matte"],
  acetinado: ["acetinado", "matte"],
  matte: ["matte", "acetinado"],
};
/** Famílias "fortes": quando a cliente pede, o batom não fica aguado mesmo numa make leve. */
const FAMILIAS_FORTES = ["vermelho", "vinho", "pink", "ameixa", "terracota"];

// --- utilidades -----------------------------------------------------------------------------

const ehHex = (h) => typeof h === "string" && /^#[0-9a-f]{6}$/i.test(h);
const fin = (v, padrao) => (typeof v === "number" && Number.isFinite(v) ? v : padrao);
const c01 = (v) => Math.max(0, Math.min(1, fin(v, 0)));
const c100 = (v) => Math.max(0, Math.min(100, Math.round(fin(v, 0))));
const r2 = (v) => Math.round(fin(v, 0) * 100) / 100;
const obj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
const umDe = (v, lista, padrao) => (lista.includes(v) ? v : padrao);
const lab0 = (l) => l && [l.L, l.a, l.b].every((x) => typeof x === "number" && Number.isFinite(x));

// --- medidas e escolhas ---------------------------------------------------------------------

const PELE_PADRAO = "#C69C7B";
const PROFUNDIDADES = ["clara", "média clara", "média", "média escura", "escura", "retinta"];
const SUBTONS = ["frio", "neutro", "quente", "oliva"];
const FAMILIAS_OLHO = ["castanho escuro", "castanho", "mel", "verde", "azul", "cinza", "preto"];

/**
 * Completa e valida as medidas (qualquer campo faltando ou estranho vira um padrão seguro com
 * confiança 0). `lida` diz se havia uma cor de pele de verdade.
 * @param {Partial<Medidas>|null|undefined} medidas
 */
export function normalizarMedidas(medidas) {
  const m = obj(medidas);
  const p = obj(m.pele);
  const lida = ehHex(p.hex);
  const hex = (lida ? p.hex : PELE_PADRAO).toUpperCase();
  const lab = lida && lab0(p.lab) ? { L: p.lab.L, a: p.lab.a, b: p.lab.b } : hexParaLab(hex);
  const st = obj(p.subtom);
  const calc = lerSubtom(lab);
  const subtom = {
    subtom: umDe(st.subtom, SUBTONS, calc.subtom),
    h: fin(st.h, calc.h),
    explicacao: typeof st.explicacao === "string" ? st.explicacao : calc.explicacao,
    ...(Number.isFinite(st.confianca) ? { confianca: c01(st.confianca) } : {}),
  };
  const corOuNulo = (x) => {
    const o = obj(x);
    return { ...o, hex: ehHex(o.hex) ? o.hex.toUpperCase() : null, confianca: ehHex(o.hex) ? c01(fin(o.confianca, 0.5)) : 0 };
  };
  const olhos = corOuNulo(m.olhos);
  const labios = corOuNulo(m.labios);
  const sobrancelhas = corOuNulo(m.sobrancelhas);
  const olheira = obj(m.olheira);
  const verm = obj(m.vermelhidao);
  const rosto = obj(m.rosto);
  const fo = obj(m.formatoOlhos);
  const fb = obj(m.formatoBoca);
  const cp = obj(m.contrastePessoal);
  const bb = obj(m.balancoDeBranco);
  const q = obj(m.qualidade);
  const tipoOlheira = umDe(olheira.tipo, ["arroxeada", "azulada", "marrom", "nenhuma"], "nenhuma");
  return {
    lida,
    qualidade: { ...q, aprovada: typeof q.aprovada === "boolean" ? q.aprovada : lida, checagens: Array.isArray(q.checagens) ? q.checagens : [] },
    balancoDeBranco: { ...bb, fonte: umDe(bb.fonte, ["branco-do-olho", "mundo-cinza", "nenhuma"], "nenhuma"), confianca: c01(bb.confianca) },
    pele: {
      ...p,
      hex,
      lab,
      confianca: lida ? c01(fin(p.confianca, 0.5)) : 0,
      profundidade: umDe(p.profundidade, PROFUNDIDADES, lerProfundidade(lab.L)),
      subtom,
    },
    olhos: { ...olhos, familia: umDe(obj(m.olhos).familia, FAMILIAS_OLHO, null), confianca: umDe(obj(m.olhos).familia, FAMILIAS_OLHO, null) ? c01(fin(obj(m.olhos).confianca, 0.5)) : 0 },
    labios: { ...labios, pigmentacao: umDe(obj(m.labios).pigmentacao, ["clara", "media", "marcada"], "media") },
    sobrancelhas,
    olheira: { presente: olheira.presente === true && tipoOlheira !== "nenhuma", tipo: tipoOlheira, intensidade: c01(olheira.intensidade) },
    vermelhidao: { presente: verm.presente === true, intensidade: c01(verm.intensidade) },
    rosto: { ...rosto, formato: umDe(rosto.formato, ["oval", "redondo", "quadrado", "coracao", "diamante", "alongado"], null), confianca: c01(rosto.confianca) },
    formatoOlhos: {
      ...fo,
      inclinacao: umDe(fo.inclinacao, ["para cima", "reta", "para baixo"], "reta"),
      distancia: umDe(fo.distancia, ["juntos", "equilibrados", "separados"], "equilibrados"),
      possivelEncapuzado: fo.possivelEncapuzado === true,
    },
    formatoBoca: {
      ...fb,
      volume: umDe(fb.volume, ["fina", "media", "carnuda"], "media"),
      equilibrio: umDe(fb.equilibrio, ["superior menor", "equilibrada", "superior maior"], "equilibrada"),
    },
    contrastePessoal: { contraste: umDe(cp.contraste, ["baixo", "medio", "alto"], "medio"), valor: fin(cp.valor, 0) },
  };
}

function normalizarEscolhas(escolhas) {
  const e = obj(escolhas);
  const make = buscarMake(e.makeId) || MAKES[0];
  const momento = buscarMomento(e.momento) || MOMENTOS.find((m) => m.id === "festa") || MOMENTOS[0];
  const papel = buscarPapel(momento.id, e.papel) || PAPEIS[momento.id][0];
  return {
    make,
    momento,
    papel,
    horario: umDe(e.horario, ["dia", "noite"], momento.clima.horarioPadrao),
    variacao: umDe(e.variacao, VARIACOES, null),
    pedido: typeof e.pedido === "string" ? e.pedido : "",
    ajustes: obj(e.ajustes),
  };
}

/** Confiança geral da receita (0–1), herdada das medidas. */
function confiancaGeral(m) {
  if (!m.lida) return 0;
  const c =
    0.35 * m.pele.confianca + 0.15 * m.olhos.confianca + 0.1 * m.labios.confianca + 0.1 * m.sobrancelhas.confianca +
    0.15 * m.rosto.confianca + 0.15 * m.balancoDeBranco.confianca;
  return r2(c01(c * (m.qualidade.aprovada ? 1 : 0.6)));
}

// --- plano ----------------------------------------------------------------------------------

/** @returns {Plano & Record<string, any>} */
function planoInicial(make) {
  const cfg = make.config;
  return {
    nivel: Math.max(0, NIVEIS.indexOf(make.nivel)),
    nivelMaximo: 2,
    fatorGlobal: 1,
    fatores: {},
    candidatos: {
      blush: ["rosa-queimado", "pessego-suave", "terracota", "bronze-rosado", "ameixa-suave"],
      iluminador: ["champanhe", "rose-dourado", "dourado", "bronze-dourado"],
      batomNude: ["nude-canela", "rosa-cha", "nude-petala", "nude-caramelo", "nude-cacau"],
      batomRosado: ["rosa-cha", "malva", "pessego"],
      batomMarcante: ["vermelho-paixao", "vinho-noite", "vermelho-tijolo"],
      sombraClara: ["champanhe", "baunilha", "rose", "dourado"],
      sombraTransicao: ["areia", "caramelo", "taupe"],
      sombraDestaque: ["bronze", "cobre", "vinho", "dourado"],
      contorno: ["areia-escura", "taupe-frio", "caramelo", "chocolate", "cacau-profundo"],
      sobrancelha: [],
    },
    evitar: [],
    evitarIds: [],
    estilos: { sombra: cfg.sombraEstilo, delineado: cfg.delineado },
    acabamentos: { base: cfg.baseAcabamento, sombra: cfg.sombraAcabamento, batom: cfg.batomAcabamento },
    tipoBatom: cfg.batom,
    papelSombra: cfg.sombraPapel,
    tecnicas: {},
    zonas: {},
    corretores: [],
    delineadoCor: null,
    mascaraCor: null,
    suavizarEscuras: false,
    provaDagua: false,
    posticos: cfg.posticos,
    fundoBase: "neutro",
    confirmar: [],
    fixacao: [],
    // pedidos da cliente (preenchidos por aplicarAjustesNoPlano)
    remover: new Set(),
    corFixa: {},
    coresFixas: null,
    familiaPedida: {},
    intensidadeFixa: {},
  };
}

/** Junta os ajustes do pedido escrito com os do Modo Ao Vivo (o Ao Vivo vence por categoria). */
function mesclarAjustes(doPedido, doVivo) {
  const a = obj(doPedido), b = obj(doVivo);
  /** @type {Ajustes} */
  const r = {};
  for (const cat of CATEGORIAS) {
    if (cat in b) r[cat] = b[cat];
    else if (cat in a) r[cat] = a[cat];
  }
  const evitar = [...(Array.isArray(a.evitar) ? a.evitar : []), ...(Array.isArray(b.evitar) ? b.evitar : [])].filter((x) => typeof x === "string");
  if (evitar.length) r.evitar = [...new Set(evitar)];
  const variacao = umDe(b.variacao, VARIACOES, null) || umDe(a.variacao, VARIACOES, null);
  if (variacao) r.variacao = variacao;
  return r;
}

/** Leva os ajustes (pedido + Ao Vivo) para o plano. A cliente vence as regras. */
function aplicarAjustesNoPlano(ctx, ajustes) {
  const p = ctx.plano;
  const mexidas = [];
  for (const cat of CATEGORIAS) {
    if (!(cat in ajustes)) continue;
    const a = ajustes[cat];
    if (a === null) {
      p.remover.add(cat);
      mexidas.push(cat);
      continue;
    }
    if (!a || typeof a !== "object") continue;
    p.remover.delete(cat);
    mexidas.push(cat);
    const temFamilia = typeof a.familia === "string" && !!CORES_POR_FAMILIA[cat]?.[a.familia];
    if (temFamilia) p.familiaPedida[cat] = a.familia;
    else if (ehHex(a.cor)) p.corFixa[cat] = a.cor.toUpperCase();
    if (Number.isFinite(a.intensidade)) p.intensidadeFixa[cat] = c01(a.intensidade);
    if (Number.isFinite(a.fator) && a.fator > 0) p.fatores[cat] = (p.fatores[cat] ?? 1) * Math.max(0.2, Math.min(3, a.fator));
    if (typeof a.acabamento === "string" && aceitaAcabamento(cat, a.acabamento)) {
      p.acabamentos[cat] = a.acabamento;
      if (p.evitar.includes(a.acabamento)) {
        p.evitar = p.evitar.filter((x) => x !== a.acabamento);
        if (ctx.papel.nivelMaximo) p.confirmar.push(`A cliente pediu ${a.acabamento} num ${ctx.papel.nome.toLowerCase()}: alinhar com ela`);
      }
    }
    if (typeof a.estilo === "string") {
      if (cat === "sombra" && FORMA_SOMBRA[a.estilo]) p.estilos.sombra = a.estilo;
      if (cat === "delineado" && FORMA_DELINEADO[a.estilo]) p.estilos.delineado = a.estilo;
      if (cat === "mascara" && (a.estilo === "posticos" || a.estilo === "sem-posticos")) p.posticos = a.estilo === "posticos";
    }
    // pediu algo de delineado numa make sem delineado: entra um fino
    if (cat === "delineado" && !p.estilos.delineado) p.estilos.delineado = "fino";
    if (cat === "sombra" && Array.isArray(a.cores) && a.cores.length === 3 && a.cores.every(ehHex)) p.coresFixas = a.cores.map((h) => h.toUpperCase());
    if (cat === "base" && ehHex(a.cor)) p.confirmar.push("A cliente escolheu outro tom de base no Modo Ao Vivo: testar no maxilar em luz natural");
  }
  return mexidas;
}

// --- escolha de cores -----------------------------------------------------------------------

function evitado(cat, cor, p) {
  if (p.evitarIds.includes(`${cat}:${cor.id}`)) return true;
  if (!EVITAVEIS.has(cat)) return false;
  return (cor.tags || []).some((t) => p.evitar.includes(t));
}

/** Escolhe da lista (na ordem das regras), sem o que deve ser evitado; com alvo, pesa a distância de cor. */
function escolher(cat, ids, p, alvoHex) {
  const paleta = PALETAS[cat] || [];
  const daLista = (ids || []).map((id) => buscarCor(cat, id)).filter(Boolean);
  let lista = daLista.filter((c) => !evitado(cat, c, p));
  if (!lista.length) lista = paleta.filter((c) => !evitado(cat, c, p));
  if (!lista.length) lista = daLista.length ? daLista : paleta;
  if (!lista.length) return null;
  if (!ehHex(alvoHex)) return lista[0];
  const alvo = hexParaLab(alvoHex);
  let melhor = null;
  lista.forEach((c, i) => {
    const s = deltaE2000(alvo, hexParaLab(c.hex)) + PESO_ORDEM * i;
    if (!melhor || s < melhor.s) melhor = { c, s };
  });
  return melhor.c;
}

/** Cores-alvo derivadas da pele medida (para escolher por proximidade). */
function alvos(m) {
  const { L, a, b } = m.pele.lab;
  const lim = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const labios = m.labios.hex && m.labios.confianca >= 0.3 ? m.labios.hex : null;
  const nudeBase = labios ? misturar(m.pele.hex, labios, 0.6) : labParaHex({ L: lim(L - 10, 10, 90), a: a * 1.4 + 4, b });
  return {
    contorno: labParaHex({ L: lim(L - 18, 12, 85), a: a * 0.8, b: b * 0.75 }),
    blush: labParaHex({ L: lim(L - 8, 38, 76), a: a * 1.6 + 6, b: b * 1.1 }),
    iluminador: labParaHex({ L: lim(L + 18, 40, 96), a: a * 0.6, b: b * 0.9 }),
    transicao: labParaHex({ L: lim(L - 14, 25, 80), a: a * 0.9, b: b * 0.9 }),
    nude: ajustar(nudeBase, { dL: -5 }),
  };
}

/** Cor pedida por família, escolhida para a pele (preferindo o que as regras puseram na frente). */
function escolherFamilia(cat, fam, p, preferencia, alvoHex) {
  const ids = CORES_POR_FAMILIA[cat]?.[fam] || [];
  const pos = (id) => {
    const i = preferencia.indexOf(id);
    return i < 0 ? 999 : i;
  };
  const ordenados = [...ids].sort((x, y) => pos(x) - pos(y));
  return escolher(cat, ordenados, p, alvoHex);
}

function acabamentoFinal(cat, desejado, p) {
  for (const a of CADEIA_ACABAMENTO[desejado] || [desejado, "matte"]) if (aceitaAcabamento(cat, a) && !p.evitar.includes(a)) return a;
  for (const a of ["matte", "acetinado", "cintilante"]) if (aceitaAcabamento(cat, a)) return a;
  return "matte";
}

function corLivre(cat, hex) {
  const prox = corMaisProxima(cat, hex);
  const nome = prox && prox.distancia < 3 ? prox.cor.nome : prox ? `Parecida com ${prox.cor.nome}` : "Cor escolhida pela cliente";
  return { id: "livre", nome, hex: hex.toUpperCase(), acabamentoPadrao: prox?.cor.acabamentoPadrao };
}

// --- montagem dos itens ---------------------------------------------------------------------

function focoExtra(foco, cat) {
  if (foco === "olhos") return { sombra: 15, delineado: 10, batom: -10 }[cat] || 0;
  if (foco === "boca") return { batom: 25, sombra: -15 }[cat] || 0;
  return 0;
}

function intensidade(cat, ctx, extra = 0) {
  const p = ctx.plano;
  if (Number.isFinite(p.intensidadeFixa[cat])) return c100(p.intensidadeFixa[cat] * 100);
  const v = INTENSIDADE[cat][p.nivel] + extra + focoExtra(ctx.make.foco, cat);
  const f = (p.fatores[cat] ?? 1) * (CORES.has(cat) ? p.fatorGlobal : 1);
  return c100(v * f);
}

function forma(texto, p, cat) {
  return [texto, ...(p.tecnicas[cat] || [])].join("; ");
}

/** @returns {ItemReceita} */
function item(cat, cor, campos) {
  return {
    categoria: cat,
    produto: campos.produto,
    cor: cor.hex.toUpperCase(),
    nomeCor: cor.nome,
    familiaCor: familia(cor.hex),
    acabamento: campos.acabamento,
    zona: campos.zona,
    forma: campos.forma,
    intensidade: c100(campos.intensidade),
    ferramenta: FERRAMENTA[cat],
    ...(campos.cores ? { cores: campos.cores } : {}),
    ...(campos.estilo ? { estilo: campos.estilo } : {}),
  };
}

function nomeTomBase(m) {
  if (!m.lida) return "Tom a definir pessoalmente";
  return `${TOM_BASE[m.pele.profundidade] || "Bege médio"} ${FUNDO_NOME[m.pele.subtom.subtom] || "neutro"}`;
}

function sobrancelhaPadrao(prof) {
  return { clara: "castanho-claro", "média clara": "castanho-claro", média: "castanho-medio", "média escura": "castanho-escuro", escura: "castanho-escuro", retinta: "preto-suave" }[prof] || "castanho-medio";
}

function construirItens(ctx) {
  const p = ctx.plano, m = ctx.medidas, make = ctx.make;
  const alvo = alvos(m);
  /** @type {ItemReceita[]} */
  const itens = [];

  // BASE — a cor medida da pele (nunca clareada)
  {
    const acab = acabamentoFinal("base", p.acabamentos.base || "acetinado", p);
    const cor = p.corFixa.base ? corLivre("base", p.corFixa.base) : { hex: m.pele.hex, nome: nomeTomBase(m) };
    const cobertura = [`Base fluida leve ${ACAB_FEM[acab]}`, `Base líquida ${ACAB_FEM[acab]} de média cobertura`, `Base líquida ${ACAB_FEM[acab]} de alta cobertura e longa duração`][p.nivel];
    itens.push(item("base", cor, {
      produto: `${cobertura}, fundo ${p.fundoBase}`,
      acabamento: acab,
      zona: p.zonas.base || ZONA.base,
      forma: forma(FORMA_BASE[p.nivel], p, "base"),
      intensidade: intensidade("base", ctx),
    }));
  }

  // CORRETIVO — corretores de cor (das regras) e corretivo no tom da pele por cima
  for (const k of p.corretores) {
    const cor = buscarCor("corretivo", k.id);
    if (!cor) continue;
    itens.push(item("corretivo", cor, { produto: "Corretor de cor cremoso", acabamento: "acetinado", zona: k.zona, forma: k.forma, intensidade: k.intensidade }));
  }
  if (p.corretores.length || p.nivel >= 1 || p.corFixa.corretivo) {
    const cor = p.corFixa.corretivo ? corLivre("corretivo", p.corFixa.corretivo) : { hex: misturar(m.pele.hex, "#FFFFFF", 0.08), nome: "Meio tom mais claro que a pele" };
    const temOlheira = p.corretores.some((k) => k.id !== "verde");
    itens.push(item("corretivo", cor, {
      produto: "Corretivo líquido no tom da pele",
      acabamento: acabamentoFinal("corretivo", "acetinado", p),
      zona: temOlheira ? "por cima do corretor de cor, no centro da olheira, e cantos do nariz" : ZONA.corretivo,
      forma: forma("pouco produto, esfumado com esponja úmida", p, "corretivo"),
      intensidade: intensidade("corretivo", ctx),
    }));
  }

  // CONTORNO
  {
    const cor = p.corFixa.contorno ? corLivre("contorno", p.corFixa.contorno)
      : p.familiaPedida.contorno ? escolherFamilia("contorno", p.familiaPedida.contorno, p, p.candidatos.contorno, alvo.contorno)
      : escolher("contorno", p.candidatos.contorno, p, alvo.contorno);
    if (cor) {
      itens.push(item("contorno", cor, {
        produto: p.nivel === 2 ? "Contorno em creme matte" : p.nivel === 0 ? "Contorno em pó matte, bem suave" : "Contorno em pó matte",
        acabamento: acabamentoFinal("contorno", "matte", p),
        zona: p.zonas.contorno || ZONA.contorno,
        forma: forma("esfumado até não sobrar linha marcada", p, "contorno"),
        intensidade: intensidade("contorno", ctx),
      }));
    }
  }

  // BLUSH
  {
    const cor = p.corFixa.blush ? corLivre("blush", p.corFixa.blush)
      : p.familiaPedida.blush ? escolherFamilia("blush", p.familiaPedida.blush, p, p.candidatos.blush, alvo.blush)
      : escolher("blush", p.candidatos.blush, p, alvo.blush);
    if (cor) {
      const desejado = p.acabamentos.blush || (make.id === "natural" ? "acetinado" : cor.acabamentoPadrao || "matte");
      const acab = acabamentoFinal("blush", desejado, p);
      itens.push(item("blush", cor, {
        produto: make.id === "natural" ? `Blush em creme ${ACAB_MASC[acab]}` : `Blush em pó ${ACAB_MASC[acab]}`,
        acabamento: acab,
        zona: p.zonas.blush || ZONA.blush,
        forma: forma("esfumado em movimentos circulares, sem marcar borda", p, "blush"),
        intensidade: intensidade("blush", ctx),
      }));
    }
  }

  // ILUMINADOR
  {
    const cor = p.corFixa.iluminador ? corLivre("iluminador", p.corFixa.iluminador)
      : p.familiaPedida.iluminador ? escolherFamilia("iluminador", p.familiaPedida.iluminador, p, p.candidatos.iluminador, alvo.iluminador)
      : escolher("iluminador", p.candidatos.iluminador, p, alvo.iluminador);
    if (cor) {
      const poucoBrilho = p.evitar.includes("cintilante");
      itens.push(item("iluminador", cor, {
        produto: "Iluminador em pó cintilante",
        acabamento: "cintilante",
        zona: p.zonas.iluminador || ZONA.iluminador,
        forma: forma(poucoBrilho ? "só um toque, bem sutil (a cliente pediu pouco brilho)" : "toques leves só nos pontos altos", p, "iluminador"),
        intensidade: intensidade("iluminador", ctx) * (poucoBrilho ? 0.5 : 1),
      }));
    }
  }

  // SOMBRA — degradê [clara, média, escura], sem repetir cor
  {
    const usados = [];
    const pegar = (ids, alvoHex) => {
      const c = escolher("sombra", ids, { ...p, evitarIds: [...p.evitarIds, ...usados.map((id) => `sombra:${id}`)] }, alvoHex);
      if (c) usados.push(c.id);
      return c;
    };
    const maisEscura = (id) => {
      let prox = buscarCor("sombra", id)?.profunda || "chocolate";
      if (p.suavizarEscuras && prox === "preto-esfumado") prox = "chocolate";
      return pegar([prox, "chocolate", "vinho", "ameixa", "preto-esfumado"]);
    };
    let principal, trio;
    if (p.familiaPedida.sombra || p.papelSombra === "destaque") {
      principal = p.familiaPedida.sombra
        ? escolherFamilia("sombra", p.familiaPedida.sombra, p, p.candidatos.sombraDestaque, null)
        : escolher("sombra", p.candidatos.sombraDestaque, p);
      usados.push(principal.id);
      const escura = maisEscura(principal.id);
      // cor de destaque clara (dourado, champanhe...): ela mesma faz a luz e o degradê desce dela
      trio = hexParaLab(principal.hex).L >= 60 ? [principal, escura, maisEscura(escura.id)] : [pegar(p.candidatos.sombraClara), principal, escura];
    } else if (p.papelSombra === "suave") {
      const clara = pegar(p.candidatos.sombraClara);
      principal = pegar(p.candidatos.sombraTransicao, alvo.transicao);
      trio = [clara, principal, pegar(p.candidatos.sombraDestaque)];
    } else {
      const clara = pegar(p.candidatos.sombraClara);
      principal = pegar(p.candidatos.sombraTransicao, alvo.transicao);
      trio = [clara, principal, maisEscura(principal.id)];
    }
    trio.sort((a, b) => hexParaLab(b.hex).L - hexParaLab(a.hex).L);
    let cores = trio.map((c) => c.hex.toUpperCase());
    const outras = trio.filter((c) => c !== principal).map((c) => c.nome);
    let nome = `${principal.nome} com ${outras.join(" e ")}`;
    if (p.coresFixas) {
      cores = p.coresFixas;
      principal = corLivre("sombra", cores[1]);
      nome = principal.nome;
    } else if (p.corFixa.sombra) {
      principal = corLivre("sombra", p.corFixa.sombra);
      cores = [cores[0], principal.hex, cores[2]];
      nome = principal.nome;
    }
    const acab = acabamentoFinal("sombra", p.acabamentos.sombra || "matte", p);
    const produto = {
      matte: "Sombras em pó matte",
      acetinado: "Sombras em pó acetinadas",
      cintilante: "Sombras em pó: matte para esfumar e cintilante na pálpebra",
      gloss: "Sombras matte com gloss de pálpebra no centro",
      glitter: "Sombras matte com glitter em gel na pálpebra",
    }[acab];
    const estilo = FORMA_SOMBRA[p.estilos.sombra] ? p.estilos.sombra : "palpebra";
    itens.push(item("sombra", { hex: principal.hex, nome }, {
      produto: p.provaDagua ? `${produto}, com primer de pálpebra` : produto,
      acabamento: acab,
      zona: p.zonas.sombra || (estilo === "palpebra" ? "pálpebra móvel" : ZONA.sombra),
      forma: forma(FORMA_SOMBRA[estilo], p, "sombra"),
      intensidade: intensidade("sombra", ctx),
      cores,
      estilo,
    }));
  }

  // DELINEADO
  if (p.estilos.delineado && FORMA_DELINEADO[p.estilos.delineado]) {
    const estilo = p.estilos.delineado;
    const padrao = p.delineadoCor || (p.nivel === 0 ? "marrom-cafe" : "preto-intenso");
    const cor = p.corFixa.delineado ? corLivre("delineado", p.corFixa.delineado)
      : p.familiaPedida.delineado ? escolherFamilia("delineado", p.familiaPedida.delineado, p, [], null)
      : escolher("delineado", [padrao, "preto-intenso", "marrom-cafe", "vinho"], p);
    if (cor) {
      const acab = acabamentoFinal("delineado", p.acabamentos.delineado || cor.acabamentoPadrao || "matte", p);
      const tipo = acab === "glitter" ? "Delineador com glitter" : estilo === "fino" ? "Delineador em gel" : "Delineador líquido";
      itens.push(item("delineado", cor, {
        produto: p.provaDagua && acab !== "glitter" ? `${tipo} à prova d'água` : tipo,
        acabamento: acab,
        zona: ZONA.delineado,
        forma: forma(FORMA_DELINEADO[estilo], p, "delineado"),
        intensidade: intensidade("delineado", ctx, { fino: -10, gatinho: 0, marcado: 10 }[estilo]),
        estilo,
      }));
    }
  }

  // MÁSCARA
  {
    const padrao = p.mascaraCor || (ctx.medidas.contrastePessoal.contraste === "baixo" && p.nivel === 0 ? "marrom" : "preta");
    const cor = p.corFixa.mascara ? corLivre("mascara", p.corFixa.mascara)
      : p.familiaPedida.mascara ? escolherFamilia("mascara", p.familiaPedida.mascara, p, [], null)
      : escolher("mascara", [padrao, "preta", "marrom"], p);
    if (cor) {
      const produto = `Máscara para cílios${p.provaDagua ? " à prova d'água" : ""}${p.posticos ? " + cílios postiços em tufos" : ""}`;
      itens.push(item("mascara", cor, {
        produto,
        acabamento: "matte",
        zona: ZONA.mascara,
        forma: forma(`da raiz às pontas, em zigue-zague${p.posticos ? "; tufos de cílios postiços do meio para o canto externo" : ""}`, p, "mascara"),
        intensidade: intensidade("mascara", ctx),
        estilo: p.posticos ? "posticos" : undefined,
      }));
    }
  }

  // SOBRANCELHA
  {
    const id = p.candidatos.sobrancelha?.[0] || sobrancelhaPadrao(m.pele.profundidade);
    const cor = p.corFixa.sobrancelha ? corLivre("sobrancelha", p.corFixa.sobrancelha)
      : p.familiaPedida.sobrancelha ? escolherFamilia("sobrancelha", p.familiaPedida.sobrancelha, p, [id], null)
      : buscarCor("sobrancelha", id) || PALETAS.sobrancelha[2];
    itens.push(item("sobrancelha", cor, {
      produto: "Lápis ou sombra de sobrancelha + gel fixador",
      acabamento: "matte",
      zona: ZONA.sobrancelha,
      forma: forma("preencher as falhas fio a fio e pentear os fios para cima com gel", p, "sobrancelha"),
      intensidade: intensidade("sobrancelha", ctx),
    }));
  }

  // BATOM
  {
    const fam = p.familiaPedida.batom;
    const pref = [...p.candidatos.batomMarcante, ...p.candidatos.batomRosado, ...p.candidatos.batomNude];
    const comAlvo = (f) => (FAMILIAS_FORTES.includes(f) ? null : alvo.nude);
    const cor = p.corFixa.batom ? corLivre("batom", p.corFixa.batom)
      : fam ? escolherFamilia("batom", fam, p, pref, comAlvo(fam))
      : p.tipoBatom === "marcante" ? escolher("batom", p.candidatos.batomMarcante, p)
      : p.tipoBatom === "rosado" ? escolher("batom", p.candidatos.batomRosado, p, alvo.nude)
      : escolher("batom", p.candidatos.batomNude, p, alvo.nude);
    if (cor) {
      const acab = acabamentoFinal("batom", p.acabamentos.batom || cor.acabamentoPadrao || "acetinado", p);
      const produto = { matte: "Batom líquido matte de longa duração", acetinado: "Batom cremoso acetinado", gloss: "Gloss labial", cintilante: "Batom cintilante", glitter: "Batom cintilante" }[acab];
      const forte = p.tipoBatom === "marcante" || FAMILIAS_FORTES.includes(fam);
      let int = intensidade("batom", ctx);
      if (fam && FAMILIAS_FORTES.includes(fam) && !Number.isFinite(p.intensidadeFixa.batom)) int = Math.max(int, 70);
      itens.push(item("batom", cor, {
        produto: `${produto} e lápis de boca no mesmo tom`,
        acabamento: acab,
        zona: ZONA.batom,
        forma: forma(forte
          ? "contorno preciso com lápis da mesma cor e duas camadas finas, tirando o excesso com papel entre elas"
          : "lápis no tom da boca para contornar e preencher, batom por cima com pincel", p, "batom"),
        intensidade: int,
      }));
    }
  }

  return itens.filter((i) => !p.remover.has(i.categoria));
}

// --- receita --------------------------------------------------------------------------------

const ROTULO = {
  base: "base", corretivo: "corretivo", contorno: "contorno", blush: "blush", iluminador: "iluminador",
  sombra: "sombra", delineado: "delineado", mascara: "máscara de cílios", sobrancelha: "sobrancelha", batom: "batom",
};

function textoOrdem(itens, olhosPrimeiro) {
  const nomesEm = (cats) => cats.filter((c) => itens.some((i) => i.categoria === c)).map((c) => ROTULO[c]);
  const lista = (n) => (n.length <= 1 ? n.join("") : `${n.slice(0, -1).join(", ")} e ${n[n.length - 1]}`);
  if (olhosPrimeiro) {
    return `Ordem: preparação da pele (limpeza, hidratante e primer) e, como a sombra é intensa, olhos antes da pele (${lista(nomesEm(["sombra", "delineado"]))}) — o pigmento que cai sai sem estragar a base. Depois ${lista(nomesEm(["base", "corretivo", "contorno", "blush", "iluminador", "mascara", "sobrancelha", "batom"]))}.`;
  }
  return `Ordem: preparação da pele (limpeza, hidratante e primer), depois pele (${lista(nomesEm(["base", "corretivo", "contorno", "blush", "iluminador"]))}), olhos (${lista(nomesEm(["sombra", "delineado", "mascara"]))}), sobrancelha e, por último, batom.`;
}

/**
 * Monta a receita profissional da make para esta cliente.
 * @param {Escolhas} escolhas
 * @param {Partial<Medidas>} medidas
 * @returns {Receita}
 */
export function montarReceita(escolhas, medidas) {
  const e = normalizarEscolhas(escolhas);
  const m = normalizarMedidas(medidas);
  const pedido = e.pedido.trim() ? interpretarPedido(e.pedido) : null;
  const ajustes = mesclarAjustes(pedido?.ajustes, e.ajustes);
  const variacao = e.variacao || ajustes.variacao || "Como está";

  const ctx = { medidas: m, escolhas: e, momento: e.momento, papel: e.papel, make: e.make, horario: e.horario, variacao, plano: planoInicial(e.make) };
  /** @type {Adaptacao[]} */
  const adaptacoes = rodarRegras(ctx, REGRAS);
  const p = ctx.plano;
  p.nivel = Math.min(p.nivel, p.nivelMaximo);
  for (const x of ajustes.evitar || []) if (!p.evitar.includes(x)) p.evitar.push(x);

  const mexidasVivo = aplicarAjustesNoPlano(ctx, ajustes).filter((c) => c in obj(e.ajustes));
  if (pedido && pedido.entendidos.length) adaptacoes.push({ regra: "PEDIDO-CLIENTE", motivo: `Pedido da cliente atendido: ${pedido.entendidos.join("; ")}.` });
  if (mexidasVivo.length) adaptacoes.push({ regra: "AJUSTE-AO-VIVO", motivo: `Ajustado pela cliente no Modo Ao Vivo: ${mexidasVivo.map((c) => ROTULO[c]).join(", ")}.` });

  let itens = construirItens(ctx);
  const sombra = itens.find((i) => i.categoria === "sombra");
  const olhosPrimeiro = !!sombra && sombra.intensidade >= SOMBRA_INTENSA;
  const ordem = olhosPrimeiro ? ORDEM_OLHOS_PRIMEIRO : ORDEM_PELE_PRIMEIRO;
  itens = itens.map((it, i) => ({ it, i })).sort((a, b) => ordem.indexOf(a.it.categoria) - ordem.indexOf(b.it.categoria) || a.i - b.i).map((x) => x.it);
  adaptacoes.push({ regra: olhosPrimeiro ? "ORDEM-OLHOS-PRIMEIRO" : "ORDEM-PELE-PRIMEIRO", motivo: textoOrdem(itens, olhosPrimeiro) });

  // o que a Thalita confirma pessoalmente
  const confirmarPessoalmente = [
    "Alergias ou sensibilidade a algum produto",
    "Traje e cor do vestido, para harmonizar as cores",
    "Se usa óculos ou lentes de contato (muda delineado e fixação)",
    ...p.confirmar,
  ];
  if (!m.lida) confirmarPessoalmente.push("Sem leitura confiável da pele na foto: escolher a base pessoalmente");
  else if (!m.qualidade.aprovada) confirmarPessoalmente.push("A foto não passou em todas as checagens: confirmar as cores pessoalmente");
  if (m.rosto.formato && m.rosto.confianca < 0.4) confirmarPessoalmente.push("Conferir o formato do rosto pessoalmente antes do contorno");
  if (pedido && pedido.ignorados.length) confirmarPessoalmente.push("Ler com a cliente o pedido escrito: uma parte não foi interpretada automaticamente");

  // duração e fixação
  const horas = e.momento.clima.duracaoHoras;
  const batom = itens.find((i) => i.categoria === "batom");
  const duracaoEFixacao = [
    `Pensada para durar cerca de ${horas} horas.`,
    "Preparação da pele: limpeza, hidratante e primer de acordo com a pele.",
    ...p.fixacao,
  ];
  if (p.nivel >= 1 || horas >= 7) duracaoEFixacao.push("Selar a zona T com pó translúcido, sem excesso.");
  if (!duracaoEFixacao.some((t) => /spray/i.test(t)) && (p.nivel >= 1 || horas >= 7)) duracaoEFixacao.push("Spray fixador no final.");
  if (batom) duracaoEFixacao.push(batom.acabamento === "matte" ? "Batom matte de longa duração: retocar só depois de comer, se precisar." : "Levar o batom na bolsa para retocar depois de comer.");
  const minutos = [45, 60, 80][p.nivel] + (p.posticos ? 10 : 0) + (e.papel.teste ? 15 : 0);
  duracaoEFixacao.push(`Tempo de execução: cerca de ${minutos} minutos.`);

  return {
    makeId: e.make.id,
    nomeMake: e.make.nome,
    ocasiao: `${e.momento.nome} (${e.horario === "dia" ? "de dia" : "à noite"})`,
    papel: e.papel.nome,
    nivel: /** @type {"leve"|"media"|"alta"} */ (NIVEIS[p.nivel]),
    itens,
    adaptacoes,
    confirmarPessoalmente: [...new Set(confirmarPessoalmente)],
    duracaoEFixacao: [...new Set(duracaoEFixacao)],
    confianca: confiancaGeral(m),
  };
}

/**
 * Converte a receita no estado que a pintura entende (intensidade 0–1). Toda categoria aparece:
 * as que não estão na receita ficam null. No corretivo vale o último (o do tom da pele, por cima).
 * @param {Receita} receita
 * @returns {EstadoMake}
 */
export function paraEstado(receita) {
  /** @type {EstadoMake} */
  const estado = {};
  for (const cat of CATEGORIAS) estado[cat] = null;
  const itens = Array.isArray(receita?.itens) ? receita.itens : [];
  for (const it of itens) {
    if (!it || !CATEGORIAS.includes(it.categoria) || !ehHex(it.cor)) continue;
    if (estado[it.categoria] && it.categoria !== "corretivo") continue;
    /** @type {Camada} */
    const camada = { cor: it.cor.toUpperCase(), intensidade: r2(c01(fin(it.intensidade, 0) / 100)) };
    if (it.acabamento) camada.acabamento = it.acabamento;
    if (Array.isArray(it.cores) && it.cores.every(ehHex)) camada.cores = it.cores.map((h) => h.toUpperCase());
    if (typeof it.estilo === "string") camada.estilo = it.estilo;
    estado[it.categoria] = camada;
  }
  return estado;
}

/**
 * Aplica ajustes (de interpretarPedido ou do Modo Ao Vivo) direto num EstadoMake, sem medidas.
 * Útil para o Modo Ao Vivo reagir na hora a "boca mais rosada".
 * @param {EstadoMake} estado
 * @param {Ajustes} ajustes
 * @returns {EstadoMake}
 */
export function aplicarAjustes(estado, ajustes) {
  /** @type {EstadoMake} */
  const novo = {};
  const base = obj(estado);
  for (const cat of CATEGORIAS) novo[cat] = base[cat] && ehHex(base[cat].cor) ? { ...base[cat] } : null;
  const a = obj(ajustes);
  for (const cat of CATEGORIAS) {
    if (!(cat in a)) continue;
    const aj = a[cat];
    if (aj === null) {
      novo[cat] = null;
      continue;
    }
    if (!aj || typeof aj !== "object") continue;
    const ids = typeof aj.familia === "string" ? CORES_POR_FAMILIA[cat]?.[aj.familia] : null;
    const daFamilia = ids ? buscarCor(cat, ids[0])?.hex : null;
    const corPedida = ehHex(aj.cor) ? aj.cor.toUpperCase() : daFamilia || null;
    let c = novo[cat];
    if (!c) {
      const padrao = corPedida || (cat === "delineado" ? buscarCor("delineado", "preto-intenso").hex : null);
      if (!padrao) continue;
      c = { cor: padrao, intensidade: 0.6 };
    }
    if (corPedida) {
      c.cor = corPedida;
      if (cat === "sombra" && Array.isArray(c.cores) && c.cores.length === 3) c.cores = [c.cores[0], corPedida, c.cores[2]];
    }
    if (Number.isFinite(aj.intensidade)) c.intensidade = c01(aj.intensidade);
    if (Number.isFinite(aj.fator) && aj.fator > 0) c.intensidade = r2(c01(c.intensidade * aj.fator));
    if (typeof aj.acabamento === "string" && aceitaAcabamento(cat, aj.acabamento)) c.acabamento = aj.acabamento;
    if (typeof aj.estilo === "string") c.estilo = aj.estilo;
    if (cat === "sombra" && Array.isArray(aj.cores) && aj.cores.length === 3 && aj.cores.every(ehHex)) c.cores = aj.cores.map((h) => h.toUpperCase());
    novo[cat] = c;
  }
  const f = a.variacao === "Mais suave" ? 0.75 : a.variacao === "Mais intenso" ? 1.25 : 1;
  const evitar = Array.isArray(a.evitar) ? a.evitar : [];
  const p = { evitar, evitarIds: [] };
  for (const cat of CATEGORIAS) {
    const c = novo[cat];
    if (!c) continue;
    if (f !== 1 && CORES.has(cat)) c.intensidade = r2(c01(c.intensidade * f));
    if (c.acabamento && evitar.includes(c.acabamento)) c.acabamento = acabamentoFinal(cat, c.acabamento, p);
    if (EVITAVEIS.has(cat) && evitar.length) {
      const troca = (hex) => {
        const prox = corMaisProxima(cat, hex);
        if (!prox || prox.distancia > 6 || !evitado(cat, prox.cor, p)) return hex;
        const alvo = hexParaLab(hex);
        let melhor = null;
        for (const x of PALETAS[cat]) {
          if (evitado(cat, x, p)) continue;
          const d = deltaE2000(alvo, hexParaLab(x.hex));
          if (!melhor || d < melhor.d) melhor = { hex: x.hex, d };
        }
        return melhor ? melhor.hex : hex;
      };
      c.cor = troca(c.cor);
      if (Array.isArray(c.cores)) c.cores = c.cores.map(troca);
    }
  }
  return novo;
}

// --- pedido escrito -------------------------------------------------------------------------

const LIMITE_PEDIDO = 500;

/** Minúsculas e sem acento, para comparar. */
function normalizarTexto(t) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’`´]/g, "'");
}

/** Trecho seguro para devolver (sem símbolos de código, curto, e "make" no lugar daquela palavra). */
function trechoSeguro(t) {
  const s = t.replace(/[^\p{L}\p{N}\s'-]/gu, " ").replace(/\blooks?\b/gi, "make").replace(/\s+/g, " ").trim();
  return s.length > 60 ? `${s.slice(0, 57)}...` : s;
}

const RE_LINK = /\b(?:https?:\/\/|www\.)\S+|\b[\w.+-]+@[\w-]+\.[\w.]+\b|\b[\w-]+\.(?:com|br|net|org|io|ly|me|app|dev|xyz|info|site|link)(?:\.[a-z]{2})?(?:\/\S*)?/gi;
const RE_BLOCO = /```[\s\S]*?```|<([a-z][\w-]*)\b[^>]{0,200}>[\s\S]*?<\/\1\s*>|<[^>]{0,200}>/gi;
const RE_CODIGO = /[{}[\]<>`$\\|]|=>|\bfunction\b|\bscript\b|\bselect\b[\s\S]*\bfrom\b|\bdrop\s+table\b|\bimport\s|\bconsole\.|\beval\s*\(|\bfetch\s*\(|\brequire\s*\(/i;
const RE_INJECAO = [
  /\b(?:ignor\w*|desconsider\w*|esquec\w*|disregard|forget|override|bypass)\b.*\b(?:instruc\w*|regra\w*|comando\w*|prompt\w*|anterior\w*|acima|sistema|system|tudo o que|everything|previous|above|rules?)\b/,
  /\b(?:prompt|system prompt|jailbreak|modo desenvolvedor|developer mode|assistente|assistant|chatgpt|gpt|openai|gemini|claude|llm|modelo de linguagem)\b/,
  /\b(?:voce (?:agora )?(?:e|eh|sera) (?:um|uma|o|a)|aja como|finja (?:que|ser)|act as|you are|pretend|revele|reveal|senha|password|token|api|chave secreta|credenciais?|admin|sudo|root)\b/,
  /\b(?:instruc(?:ao|oes)|instructions?|ordens? anteriores)\b/,
];

/** Agendamento, preço e pagamento: não é pedido de make (vai para a Thalita, sem repetir o texto). */
const RE_NEGOCIO = /\b(?:desconto|cupom|gratis|de graca|preco|precos|valor|pagamento|pagar|pix|sinal|reembolso|estorno|aprovar|aprovad[oa]|agendamento|horario|remarcar|cancelar)\b/;

/** Vocabulário do pedido. A ordem é a prioridade: o que vem antes "ganha" o trecho do texto. */
const VOCAB = [
  { tipo: "global", valor: "Como está", re: /\b(?:como esta|assim mesmo|do jeito que esta|ta (?:otim[oa]|perfeit[oa]|lind[oa])|esta (?:otim[oa]|perfeit[oa])|ficou (?:otim[oa]|perfeit[oa])|nao (?:muda|mude|mudar) nada|pode manter|manter assim)\b/g },
  { tipo: "estilo", cat: "mascara", valor: "posticos", re: /\b(?:cilios? )?postic[oa]s?\b|\bcilios? (?:em |de )?tufos?\b/g },
  { tipo: "estilo", cat: "delineado", valor: "gatinho", re: /\b(?:gatinho|gatinha|cat ?eye|delineado puxado)\b/g },
  { tipo: "estilo", cat: "sombra", valor: "esfumado", re: /\b(?:esfumad[oa]s?|esfumacad[oa]s?|smok(?:e|ey|y)(?: eyes?)?)\b/g },
  { tipo: "estilo", cat: "sombra", valor: "asa", re: /\b(?:em asa|asa|puxad[oa] pra cima|puxad[oa] para cima)\b/g },
  { tipo: "cor", valor: "pink", re: /\b(?:pink|fucsia|rosa choque)\b/g },
  { tipo: "cor", valor: "nude", re: /\b(?:nude|nudes|cor de boca)\b/g },
  { tipo: "mais", cat: "blush", re: /\b(?:mais )?corad[oa]s?\b/g },
  { tipo: "acab", valor: "gloss", re: /\b(?:gloss|glossy|molhadinh[oa]|efeito molhado|brilhos[oa])\b/g },
  { tipo: "acab", valor: "glitter", re: /\b(?:glitter|glitters|purpurina|brilho grosso)\b/g },
  { tipo: "acab", valor: "matte", re: /\b(?:matte|mate|matt|fosc[oa]|sequinh[oa])\b/g },
  { tipo: "acab", valor: "acetinado", re: /\b(?:acetinad[oa]|cremos[oa])\b/g },
  { tipo: "acab", valor: "brilho", re: /\b(?:brilho|brilhos|brilhinho|brilhante|cintilante|shimmer|iluminad[oa]|glow)\b/g },
  { tipo: "neg", re: /\b(?:nada de|nao (?:quero|precisa(?: de)?|coloca(?:r)?|coloque|usa(?:r)?|use|gosto de|curto|faz(?:er)?|faca)|sem|nada|nem|zero|dispenso|evit(?:a|ar|e)|tir(?:a|ar|e|em)|remov(?:e|er|a)|nao)\b/g },
  { tipo: "menos", re: /\bmenos (?:fortes?|intens[oa]s?|marcad[oa]s?|carregad[oa]s?|escur[oa]s?|pesad[oa]s?|chamativ[oa]s?|pigmentad[oa]s?|cor)\b/g },
  { tipo: "mais", re: /\bmenos (?:clar[oa]s?|suaves?|leves?|apagad[oa]s?|discret[oa]s?|palid[oa]s?)\b/g },
  { tipo: "menos", re: /\bmenos\b/g },
  { tipo: "mais", re: /\b(?:mais (?:fortes?|intens[oa]s?|marcad[oa]s?|pigmentad[oa]s?|escur[oa]s?|chamativ[oa]s?|carregad[oa]s?|pesad[oa]s?|dramatic[oa]s?|poderos[oa]s?|ousad[oa]s?|destacad[oa]s?|vibrantes?|viv[oa]s?|evidentes?|glam|cor|destaque|presenca|definid[oa]s?)|fortes?|fortinh[oa]s?|intens[oa]s?|marcantes?|marcad[oa]s?|pigmentad[oa]s?|carregad[oa]s?|pesad[oa]s?|dramatic[oa]s?|poderos[oa]s?|ousad[oa]s?|chamativ[oa]s?|vibrantes?|bafonic[oa]s?|arrasador(?:a|as|es)?|caprich\w*|exager\w*|escurinh[oa]s?|destaque)\b/g },
  { tipo: "mais", soCor: true, re: /\bescur[oa]s?\b/g },
  { tipo: "menos", re: /\b(?:mais (?:leves?|suaves?|sutil|sutis|discret[oa]s?|delicad[oa]s?|clar[oa]s?|frac[oa]s?|naturais|natural|clean|apagad[oa]s?|basic[oa]s?|simples)|leves?|levinh[oa]s?|suaves?|suavinh[oa]s?|sutil|sutis|discret[oa]s?|delicad[oa]s?|clarinh[oa]s?|fraquinh[oa]s?|clean|naturais|natural|naturalzinh[oa]s?|basiquinh[oa]s?|simples)\b/g },
  { tipo: "menos", soCor: true, re: /\bclar[oa]s?\b/g },
  { tipo: "estiloDel", valor: "fino", re: /\b(?:fin[oa]|fininh[oa])\b/g },
  { tipo: "estiloDel", valor: "marcado", re: /\b(?:gross[oa]|grossinh[oa])\b/g },
  { tipo: "cat", valor: "olho", re: /\b(?:olh(?:o|os|inho|inhos)|palpebras?)\b/g },
  { tipo: "cat", valor: "sombra", re: /\bsombras?\b/g },
  { tipo: "cat", valor: "batom", re: /\b(?:boca|bocas|boquinha|batom|batons|labios?|labial)\b/g },
  { tipo: "cat", valor: "delineado", re: /\b(?:delineado|delineador|delinear|delineados|risco|risquinho)\b/g },
  { tipo: "cat", valor: "blush", re: /\b(?:blush|blushes|rouge|bochechas?|macas do rosto)\b/g },
  { tipo: "cat", valor: "base", re: /\b(?:pele|base|cobertura)\b/g },
  { tipo: "cat", valor: "contorno", re: /\b(?:contorno|contornos|contornad[oa]|bronzer)\b/g },
  { tipo: "cat", valor: "iluminador", re: /\b(?:iluminador|iluminadores|highlight)\b/g },
  { tipo: "cat", valor: "mascara", re: /\b(?:rimel|mascara(?: de cilios)?|cilios)\b/g },
  { tipo: "cat", valor: "sobrancelha", re: /\bsobrancelhas?\b/g },
  { tipo: "cat", valor: "corretivo", re: /\b(?:corretivo|olheiras?)\b/g },
  { tipo: "cat", valor: "tudo", re: /\b(?:tudo|make toda|maquiagem toda|rosto todo)\b/g },
  { tipo: "cor", valor: "vermelho", re: /\b(?:vermelh[oa]s?|vermelhinh[oa]|red)\b/g },
  { tipo: "cor", valor: "vinho", re: /\b(?:vinho|vinhos|bordo|bordeaux|marsala|cereja)\b/g },
  { tipo: "cor", valor: "rosa", re: /\b(?:rosa|rosas|rosad[oa]s?|rosinh[oa]|rose)\b/g },
  { tipo: "cor", valor: "coral", re: /\b(?:coral|corais|laranja|alaranjad[oa])\b/g },
  { tipo: "cor", valor: "pessego", re: /\bpessego\b/g },
  { tipo: "cor", valor: "terracota", re: /\b(?:terracota|tijolo)\b/g },
  { tipo: "cor", valor: "marrom", re: /\b(?:marrom|marrons|marronzinh[oa]|chocolate)\b/g },
  { tipo: "cor", valor: "preto", re: /\b(?:pret[oa]s?|pretinh[oa]|black)\b/g },
  { tipo: "cor", valor: "dourado", re: /\b(?:dourad[oa]s?|douradinh[oa]|ouro|gold)\b/g },
  { tipo: "cor", valor: "prata", re: /\b(?:prata|pratead[oa]s?|silver)\b/g },
  { tipo: "cor", valor: "cobre", re: /\b(?:cobre|acobread[oa])\b/g },
  { tipo: "cor", valor: "bronze", re: /\b(?:bronze|bronzead[oa]s?)\b/g },
  { tipo: "cor", valor: "champanhe", re: /\b(?:champanhe|champagne)\b/g },
  { tipo: "cor", valor: "verde", re: /\b(?:verde|verdes|esverdead[oa])\b/g },
  { tipo: "cor", valor: "azul", re: /\b(?:azul|azuis|azulad[oa])\b/g },
  { tipo: "cor", valor: "ameixa", re: /\b(?:ameixa|rox[oa]s?|roxinh[oa]|lilas|berinjela|purpura|uva)\b/g },
  { tipo: "cor", valor: "malva", re: /\bmalva\b/g },
  { tipo: "cor", valor: "cinza", re: /\b(?:cinza|cinzas|acinzentad[oa])\b/g },
  { tipo: "incluir", re: /\b(?:quero|queria|gostaria|com|coloca\w*|coloque|bota\w*|adiciona\w*|poe|usa\w*|use|inclui\w*|tenha)\b/g },
];

const STOP = new Set(
  ("a o as os um uma uns umas de da do das dos no na nos nas em com pra para pro pros por favor pfv pf pls mais bem muito muita " +
    "muitos muitas pouco pouquinho bastante deixa deixar deixe fica ficar fique ficou que q ser seja esteja mesmo so ai ok oi ola " +
    "obrigada obrigado thalita make maquiagem look eu me minha meu meus minhas tipo assim tambem ta esta estiver algo ainda toque " +
    "tom tons cor cores nao e ou mas porem quero queria gostaria pode poderia podia acho achei se isso essa esse dela dele ela ele " +
    "voce vc vcs pode tbm tb hj hoje la aqui agora fazer faz faca coloca colocar usar usa use").split(/\s+/),
);

/** Categoria padrão quando a cliente fala a cor sem dizer onde ("quero vermelho"). */
const COR_PADRAO = {
  vermelho: "batom", vinho: "batom", rosa: "batom", pink: "batom", nude: "batom", coral: "batom", pessego: "batom",
  terracota: "batom", malva: "batom", marrom: "sombra", dourado: "sombra", prata: "sombra", cobre: "sombra",
  bronze: "sombra", champanhe: "sombra", verde: "sombra", azul: "sombra", ameixa: "sombra", cinza: "sombra", preto: "delineado",
};
const NOME_FAMILIA = { pessego: "pêssego", rosa: "rosa", nude: "nude" };
const ACAB_PADRAO = { glitter: "sombra", gloss: "batom", matte: "batom", acetinado: "batom", brilho: "sombra" };
const DO = {
  base: "da base", corretivo: "do corretivo", contorno: "do contorno", blush: "do blush", iluminador: "do iluminador",
  sombra: "da sombra", delineado: "do delineado", mascara: "da máscara", sobrancelha: "da sobrancelha", batom: "do batom",
};
const ROTULO_PEDIDO = { ...ROTULO, base: "pele" };
const NOME_ESTILO = {
  "delineado:gatinho": "delineado gatinho", "delineado:fino": "delineado fino", "delineado:marcado": "delineado marcado",
  "sombra:esfumado": "sombra esfumada", "sombra:asa": "sombra em asa", "sombra:palpebra": "sombra só na pálpebra",
  "mascara:posticos": "com cílios postiços", "mascara:sem-posticos": "sem cílios postiços",
};
const NAO_ESCURECER = new Set(["base", "corretivo", "contorno", "sobrancelha", "mascara"]);

/** Acha as palavras conhecidas numa parte do pedido (sem sobreposição; a ordem do VOCAB é a prioridade). */
function tokenizar(parte) {
  const usados = [];
  const toks = [];
  for (const v of VOCAB) {
    v.re.lastIndex = 0;
    for (const mm of parte.matchAll(v.re)) {
      const ini = mm.index, fim = mm.index + mm[0].length;
      if (usados.some(([a, b]) => ini < b && fim > a)) continue;
      usados.push([ini, fim]);
      toks.push({ tipo: v.tipo, valor: v.valor, cat: v.cat, soCor: !!v.soCor, texto: mm[0], pos: ini });
    }
  }
  toks.sort((a, b) => a.pos - b.pos);
  let resto = parte;
  for (const [a, b] of usados) resto = resto.slice(0, a) + " ".repeat(b - a) + resto.slice(b);
  const sobras = resto.split(/[^a-z0-9']+/).filter((w) => w.length > 1 && !STOP.has(w));
  return { toks, sobras };
}

/**
 * Entende um pedido escrito pela cliente. O texto é DADO: links, código e qualquer instrução que
 * não seja de maquiagem são descartados e listados em `ignorados` (sem repetir o conteúdo suspeito).
 * @param {string} texto
 * @returns {{ajustes: Ajustes, entendidos: string[], ignorados: string[]}}
 */
export function interpretarPedido(texto) {
  /** @type {Ajustes} */
  const ajustes = {};
  const entendidos = [];
  const ignorados = [];
  let acoes = 0; // conta tudo o que foi entendido (mesmo repetido), para saber se uma parte rendeu algo
  const entendi = (t) => {
    acoes++;
    if (!entendidos.includes(t)) entendidos.push(t);
  };
  const ignorei = (t) => {
    if (!ignorados.includes(t)) ignorados.push(t);
  };
  if (typeof texto !== "string") {
    if (texto != null) ignorei("pedido em formato inválido");
    return { ajustes, entendidos, ignorados };
  }

  let t = texto;
  if (t.length > LIMITE_PEDIDO) {
    t = t.slice(0, LIMITE_PEDIDO);
    ignorei(`texto acima de ${LIMITE_PEDIDO} caracteres (o resto foi cortado)`);
  }
  t = t.replace(RE_BLOCO, () => {
    ignorei("código (ignorado)");
    return " . ";
  });
  t = t.replace(RE_LINK, () => {
    ignorei("link (ignorado)");
    return " . ";
  });

  const camada = (cat) => {
    if (!ajustes[cat] || typeof ajustes[cat] !== "object") ajustes[cat] = {};
    return /** @type {AjusteCamada} */ (ajustes[cat]);
  };
  const evitarAlgo = (x, rotulo) => {
    ajustes.evitar = [...new Set([...(ajustes.evitar || []), ...x])];
    entendi(`evitar ${rotulo}`);
  };
  const variar = (v) => {
    ajustes.variacao = v;
    entendi(v === "Mais suave" ? "make mais suave" : v === "Mais intenso" ? "make mais intensa" : "make como está");
  };
  const fatorEm = (cat, f) => {
    const c = camada(cat);
    c.fator = Math.round((c.fator ?? 1) * f * 100) / 100;
    entendi(`${ROTULO_PEDIDO[cat]} com ${f > 1 ? "mais" : "menos"} intensidade`);
  };
  const expandir = (cat, para) => (cat === "olho" ? (para === "intensidade" || para === "remover" ? ["sombra", "delineado"] : ["sombra"]) : [cat]);

  for (const frase of t.split(/[\n\r.;!?]+/)) {
    if (!frase.trim()) continue;
    const n = normalizarTexto(frase);
    if (RE_CODIGO.test(frase)) {
      ignorei("código (ignorado)");
      continue;
    }
    if (RE_INJECAO.some((re) => re.test(n))) {
      ignorei("instrução que não é pedido de make (ignorada)");
      continue;
    }
    if (RE_NEGOCIO.test(n)) {
      ignorei("assunto de agendamento ou pagamento (combinar com a Thalita)");
      continue;
    }
    const partes = n.split(/,|\s+(?:mas|porem|tambem|e|so que|alem disso|alias)\s+/);
    let pendentes = [];
    let ultimaNegada = false;
    let ultimasCats = [];
    for (const parte of partes) {
      const { toks, sobras } = tokenizar(parte);
      const uteis = toks.filter((x) => x.tipo !== "incluir");
      if (!uteis.length) {
        if (sobras.length) ignorei(`não entendi: "${trechoSeguro(parte)}"`);
        continue;
      }
      // só categoria ("olho e boca mais leves"): espera o que vem na próxima parte
      if (uteis.every((x) => x.tipo === "cat") && !toks.some((x) => x.tipo === "incluir")) {
        pendentes.push(...uteis.map((x) => ({ ...x, pos: -1 })));
        continue;
      }
      const lista = [...pendentes, ...toks];
      pendentes = [];
      const negIdx = lista.findIndex((x) => x.tipo === "neg");
      const herdaNeg = negIdx < 0 && ultimaNegada && uteis.every((x) => x.tipo === "cor" || x.tipo === "acab");
      const positivos = herdaNeg ? [] : negIdx < 0 ? lista : lista.slice(0, negIdx);
      const negados = herdaNeg ? lista : negIdx < 0 ? [] : lista.slice(negIdx + 1).filter((x) => x.tipo !== "neg");
      const antes = acoes;

      // --- parte positiva
      const cats = positivos.filter((x) => x.tipo === "cat");
      // estilos também dizem onde ("esfumado preto" é sombra)
      const ancoras = [...cats, ...positivos.filter((x) => x.tipo === "estilo").map((x) => ({ ...x, valor: x.cat }))].sort((a, b) => a.pos - b.pos);
      const alvoDe = (tok) => {
        let antesC = null, depois = null;
        for (const c of ancoras) {
          if (c.pos <= tok.pos) antesC = c;
          else if (!depois) depois = c;
        }
        const c = antesC || depois;
        return c ? c.valor : ultimasCats[0] || null;
      };
      const tocadas = new Set();
      for (const tok of positivos) {
        if (tok.tipo === "global") variar(tok.valor);
        else if (tok.tipo === "cor") {
          let cat = alvoDe(tok);
          if (cat === "olho") cat = "sombra";
          if (!cat || cat === "tudo") cat = COR_PADRAO[tok.valor];
          if (!CORES_POR_FAMILIA[cat]?.[tok.valor]) {
            ignorei(`cor ${NOME_FAMILIA[tok.valor] || tok.valor} para ${ROTULO_PEDIDO[cat] || "essa parte"} (não está na paleta)`);
            continue;
          }
          const c = camada(cat);
          c.familia = tok.valor;
          c.cor = buscarCor(cat, CORES_POR_FAMILIA[cat][tok.valor][0]).hex;
          tocadas.add(cat);
          entendi(`cor ${DO[cat]}: ${NOME_FAMILIA[tok.valor] || tok.valor}`);
        } else if (tok.tipo === "acab") {
          let cat = alvoDe(tok);
          const lista2 = !cat ? [ACAB_PADRAO[tok.valor]] : cat === "tudo" ? ["base", "sombra", "blush", "batom"] : expandir(cat, "cor");
          if (!cat && tok.valor === "brilho" && /^ilumin|^glow/.test(tok.texto)) {
            fatorEm("iluminador", 1.3);
            tocadas.add("iluminador");
            continue;
          }
          for (const k of lista2) {
            let a = tok.valor;
            if (a === "brilho") a = { batom: "gloss", base: "acetinado", sombra: "cintilante", blush: "cintilante", delineado: "glitter" }[k] || null;
            if (k === "iluminador") {
              fatorEm("iluminador", 1.3);
              continue;
            }
            if (a && !aceitaAcabamento(k, a)) a = a === "glitter" && aceitaAcabamento(k, "cintilante") ? "cintilante" : null;
            if (!a) continue;
            camada(k).acabamento = a;
            tocadas.add(k);
            entendi(`acabamento ${DO[k]}: ${a}`);
            if (k === "base" && tok.valor === "brilho") fatorEm("iluminador", 1.2);
          }
        } else if (tok.tipo === "estilo") {
          camada(tok.cat).estilo = tok.valor;
          tocadas.add(tok.cat);
          entendi(NOME_ESTILO[`${tok.cat}:${tok.valor}`]);
        } else if (tok.tipo === "estiloDel" && (cats.some((c) => c.valor === "delineado") || ultimasCats.includes("delineado"))) {
          camada("delineado").estilo = tok.valor;
          tocadas.add("delineado");
          entendi(NOME_ESTILO[`delineado:${tok.valor}`]);
        }
      }
      for (const tok of positivos) {
        if (tok.tipo !== "mais" && tok.tipo !== "menos") continue;
        const f = tok.tipo === "mais" ? 1.3 : 0.7;
        let alvosI = new Set([...cats.flatMap((c) => (c.valor === "tudo" ? [] : expandir(c.valor, "intensidade"))), ...tocadas]);
        if (tok.cat) alvosI.add(tok.cat);
        if (tok.soCor) alvosI = new Set([...alvosI].filter((k) => !NAO_ESCURECER.has(k)));
        if (!alvosI.size) {
          if (tok.soCor) continue;
          variar(f > 1 ? "Mais intenso" : "Mais suave");
        } else for (const k of alvosI) fatorEm(k, f);
      }
      // "quero delineado" numa parte só com a categoria: entra
      if (positivos.every((x) => x.tipo === "cat" || x.tipo === "incluir") && cats.length) {
        for (const c of cats) {
          for (const k of expandir(c.valor, "cor")) {
            if (k === "tudo") continue;
            if (k === "delineado") camada("delineado").estilo = camada("delineado").estilo || "fino";
            else camada(k);
            entendi(`com ${ROTULO_PEDIDO[k]}`);
          }
        }
      }

      // --- parte negada ("sem", "nada de", "não quero"...)
      if (negados.length) {
        const catsN = negados.filter((x) => x.tipo === "cat");
        const outros = negados.filter((x) => x.tipo !== "cat");
        for (const tok of outros) {
          if (tok.tipo === "cor") evitarAlgo([tok.valor], NOME_FAMILIA[tok.valor] || tok.valor);
          else if (tok.tipo === "acab") {
            if (tok.valor === "brilho") evitarAlgo(["glitter", "cintilante", "gloss"], "brilho");
            else evitarAlgo([tok.valor], tok.valor);
          } else if (tok.tipo === "estilo") {
            const troca = { gatinho: ["delineado", "fino"], esfumado: ["sombra", "palpebra"], asa: ["sombra", "esfumado"], posticos: ["mascara", "sem-posticos"] }[tok.valor];
            if (troca) {
              camada(troca[0]).estilo = troca[1];
              entendi(NOME_ESTILO[`${troca[0]}:${troca[1]}`]);
            }
          } else if (tok.tipo === "mais") {
            const alvosN = catsN.flatMap((c) => (c.valor === "tudo" ? [] : expandir(c.valor, "intensidade"))).filter((k) => !tok.soCor || !NAO_ESCURECER.has(k));
            if (alvosN.length) for (const k of alvosN) fatorEm(k, 0.7);
            else variar("Mais suave");
          }
        }
        const soCategorias = !outros.some((x) => ["cor", "acab", "estilo", "mais", "menos", "estiloDel"].includes(x.tipo));
        if (soCategorias) {
          for (const c of catsN) {
            if (c.valor === "tudo") continue;
            for (const k of expandir(c.valor, "remover")) {
              ajustes[k] = null;
              entendi(`sem ${ROTULO_PEDIDO[k]}`);
            }
          }
        }
      }

      const entendeuAqui = acoes > antes;
      if (!entendeuAqui && (sobras.length || uteis.length)) ignorei(`não entendi: "${trechoSeguro(parte)}"`);
      ultimaNegada = negados.length > 0;
      const catsPos = cats.map((c) => c.valor).filter((v) => v !== "tudo");
      if (catsPos.length) ultimasCats = catsPos;
    }
    if (pendentes.length && ultimaNegada) {
      // "sem delineado e rímel": a categoria solta no fim herda a negação
      for (const c of pendentes) {
        if (c.valor === "tudo") continue;
        for (const k of expandir(c.valor, "remover")) {
          ajustes[k] = null;
          entendi(`sem ${ROTULO_PEDIDO[k]}`);
        }
      }
    } else if (pendentes.length) ignorei(`não entendi: "${trechoSeguro(pendentes.map((x) => x.texto).join(" e "))}"`);
  }
  return { ajustes, entendidos, ignorados };
}
