// BEAUTY BRIEF: a ficha técnica que a Thalita recebe de cada atendimento. Junta as MEDIDAS (leitura
// da foto) com a RECEITA (o que fazer) e a MALETA dela (o que ela tem), e desenha o FACE CHART a
// partir dos próprios pontos do rosto da cliente (traço, não foto). Funções puras, sem DOM.
//
// Tudo que vem da foto é ESTIMATIVA: a ficha é direção, não receita, e diz isso com todas as letras.

import { hexParaLab, deltaE2000, familia, misturar } from "./cor.js";
import {
  OVAL, LABIOS_EXTERNO, LABIOS_INTERNO, OLHO_DIREITO, OLHO_ESQUERDO, SOBRANCELHA_DIREITA, SOBRANCELHA_ESQUERDA,
} from "./regioes.js";
import { PONTOS_PADRAO } from "./rosto-padrao.js";

/** @typedef {import("./tipos.js").Medidas} Medidas */
/** @typedef {import("./tipos.js").Receita} Receita */
/** @typedef {import("./tipos.js").ItemReceita} ItemReceita */
/** @typedef {import("./tipos.js").ProdutoMaleta} ProdutoMaleta */
/** @typedef {import("./tipos.js").Brief} Brief */
/** @typedef {import("./tipos.js").Categoria} Categoria */
/** @typedef {import("./tipos.js").Ponto} Ponto */

// --- maleta de demonstração ------------------------------------------------------------------

const produto = (id, marca, nome, categoria, cor) => Object.freeze({ id, marca, nome, categoria, cor });

/**
 * Maleta FICTÍCIA de demonstração (marcas genéricas). Na produção, cada maquiadora cadastra a sua,
 * com a cor medida de cada produto (swatch fotografado com cartão de cor).
 * @type {ReadonlyArray<ProdutoMaleta>}
 */
export const MALETA_EXEMPLO = Object.freeze([
  // bases: claras a retintas, subtons rosado (frio), neutro, dourado (quente) e oliva
  produto("base-110", "Marca A", "Base 110 porcelana rosado", "base", "#F2D8CC"),
  produto("base-140", "Marca B", "Base 140 bege claro dourado", "base", "#E6C3A0"),
  produto("base-210", "Marca A", "Base 210 bege médio rosado", "base", "#D9AE98"),
  produto("base-230", "Marca B", "Base 230 bege dourado", "base", "#CFA27A"),
  produto("base-250", "Marca C", "Base 250 bege oliva", "base", "#C4A37C"),
  produto("base-310", "Marca B", "Base 310 mel dourado", "base", "#B7865C"),
  produto("base-330", "Marca C", "Base 330 caramelo neutro", "base", "#A1704F"),
  produto("base-410", "Marca C", "Base 410 canela quente", "base", "#87573A"),
  produto("base-430", "Marca A", "Base 430 castanho neutro", "base", "#6C442F"),
  produto("base-510", "Marca C", "Base 510 cacau profundo", "base", "#50311F"),
  produto("base-530", "Marca B", "Base 530 ébano rosado", "base", "#3D251E"),
  // corretivos no tom da pele e corretores de cor
  produto("corretivo-120", "Marca A", "Corretivo 120 claro", "corretivo", "#F0D6BF"),
  produto("corretivo-230", "Marca B", "Corretivo 230 médio dourado", "corretivo", "#D4AA84"),
  produto("corretivo-420", "Marca C", "Corretivo 420 escuro", "corretivo", "#7E5238"),
  produto("corretor-pessego", "Marca D", "Corretor de cor pêssego", "corretivo", "#F0B394"),
  produto("corretor-laranja", "Marca D", "Corretor de cor laranja", "corretivo", "#DE8B52"),
  produto("corretor-verde", "Marca D", "Corretor de cor verde", "corretivo", "#BACFA5"),
  // contorno
  produto("contorno-taupe", "Marca E", "Contorno em pó 01 taupe", "contorno", "#9F8573"),
  produto("contorno-caramelo", "Marca E", "Contorno em creme 02 caramelo", "contorno", "#8A6047"),
  produto("contorno-cacau", "Marca E", "Contorno em creme 03 cacau", "contorno", "#5B3C2E"),
  // blush
  produto("blush-rosa", "Marca F", "Blush rosa pétala", "blush", "#E79AA6"),
  produto("blush-pessego", "Marca F", "Blush pêssego", "blush", "#EDA585"),
  produto("blush-coral", "Marca A", "Blush coral", "blush", "#E9805F"),
  // iluminador
  produto("iluminador-champanhe", "Marca B", "Iluminador champanhe", "iluminador", "#EFD8BD"),
  produto("iluminador-dourado", "Marca F", "Iluminador dourado", "iluminador", "#E4C387"),
  // sombras (paleta de esfumado)
  produto("sombra-baunilha", "Marca D", "Sombra baunilha", "sombra", "#EDDBC5"),
  produto("sombra-champanhe", "Marca D", "Sombra champanhe cintilante", "sombra", "#E4CAA8"),
  produto("sombra-caramelo", "Marca D", "Sombra caramelo", "sombra", "#A8784F"),
  produto("sombra-cobre", "Marca E", "Sombra cobre metálica", "sombra", "#AE6131"),
  produto("sombra-chocolate", "Marca E", "Sombra chocolate", "sombra", "#573526"),
  produto("sombra-malva", "Marca F", "Sombra malva", "sombra", "#987087"),
  // olhos e sobrancelha
  produto("delineador-preto", "Marca A", "Delineador em gel preto", "delineado", "#161314"),
  produto("mascara-preta", "Marca B", "Máscara de cílios preta à prova d'água", "mascara", "#131111"),
  produto("sobrancelha-claro", "Marca C", "Lápis de sobrancelha castanho claro", "sobrancelha", "#7A5A44"),
  produto("sobrancelha-medio", "Marca C", "Sombra de sobrancelha castanho médio", "sobrancelha", "#5C402F"),
  produto("sobrancelha-escuro", "Marca C", "Lápis de sobrancelha castanho escuro", "sobrancelha", "#402D23"),
  // batons
  produto("batom-nude-canela", "Marca F", "Batom nude canela", "batom", "#B07459"),
  produto("batom-rosa-cha", "Marca A", "Batom rosa chá", "batom", "#C17F80"),
  produto("batom-coral", "Marca B", "Batom coral", "batom", "#E2634D"),
  produto("batom-vermelho", "Marca E", "Batom vermelho clássico", "batom", "#A6162F"),
]);

// --- utilidades ----------------------------------------------------------------------------

const CATEGORIAS = ["base", "corretivo", "contorno", "blush", "iluminador", "sombra", "delineado", "mascara", "sobrancelha", "batom"];
const ROTULO = {
  base: "Base", corretivo: "Corretivo", contorno: "Contorno", blush: "Blush", iluminador: "Iluminador",
  sombra: "Sombra", delineado: "Delineado", mascara: "Máscara", sobrancelha: "Sobrancelha", batom: "Batom",
};
const ehHex = (h) => typeof h === "string" && /^#[0-9a-f]{6}$/i.test(h);
const fin = (v, padrao = 0) => (typeof v === "number" && Number.isFinite(v) ? v : padrao);
const c01 = (v) => Math.max(0, Math.min(1, fin(v, 0)));
const obj = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
const txt = (v, padrao = "") => (typeof v === "string" && v.trim() ? v.trim() : padrao);
const lab0 = (l) => !!l && [l.L, l.a, l.b].every((x) => typeof x === "number" && Number.isFinite(x));
/** Número em pt-BR (vírgula decimal). */
const num = (v, casas = 0) => (Number.isFinite(v) ? v.toFixed(casas).replace(".", ",") : "–");
const pct = (v) => `${Math.round(c01(v) * 100)}%`;
const r2 = (v) => Math.round(fin(v) * 100) / 100;
/** Garantia de vocabulário: na interface é sempre "make" (e make é feminino: "uma make"). */
const ARTIGO = { o: "a", um: "uma", do: "da", no: "na", seu: "sua", esse: "essa", este: "esta", novo: "nova", os: "as", uns: "umas", dos: "das", nos: "nas", seus: "suas" };
const semLook = (s) => s
  .replace(/\b(o|um|do|no|seu|esse|este|novo|os|uns|dos|nos|seus)(\s+)looks?\b/gi, (m, art, esp) => {
    const novo = ARTIGO[art.toLowerCase()];
    const plural = /s$/i.test(m);
    return (art[0] === art[0].toUpperCase() ? primeiraMaiuscula(novo) : novo) + esp + (plural ? "makes" : "make");
  })
  .replace(/\blooks?\b/gi, (m) => (m[0] === "L" ? "Make" : "make") + (m.length > 4 ? "s" : ""));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);
const corta = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);
const primeiraMaiuscula = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Corretor de cor (pêssego, laranja, verde…) e corretivo no tom da pele não se trocam entre si. */
function ehCorretorDeCor(x) {
  const t = `${x?.produto ?? ""} ${x?.nome ?? ""}`;
  return /corretor(es)? de cor|corretor colorido/i.test(t);
}

/** Rótulo do passo, separando corretor de cor do corretivo. */
const rotuloItem = (it) => (it.categoria === "corretivo" && ehCorretorDeCor(it) ? "Corretor de cor" : ROTULO[it.categoria] ?? it.categoria);

// --- maleta --------------------------------------------------------------------------------

/**
 * Produto da maleta mais próximo (ΔE2000) de um item da receita, na MESMA categoria.
 * "combina" < 3 (diferença só vista de perto), "aproximado" < 6, acima disso "sem produto próximo"
 * (o produto mais perto ainda vem, para a Thalita saber o que ajustar). Sem nada na categoria:
 * produto null e deltaE null.
 * @param {{categoria:Categoria, cor:string, produto?:string, nomeCor?:string}} item
 * @param {ReadonlyArray<ProdutoMaleta>} maleta
 * @returns {{produto:ProdutoMaleta|null, deltaE:number|null, qualidade:"combina"|"aproximado"|"sem produto próximo"}}
 */
export function combinarComMaleta(item, maleta) {
  const vazio = { produto: null, deltaE: null, qualidade: /** @type {const} */ ("sem produto próximo") };
  if (!item || !ehHex(item.cor) || !Array.isArray(maleta)) return vazio;
  const alvo = hexParaLab(item.cor);
  const deCor = item.categoria === "corretivo" ? ehCorretorDeCor(item) : null;
  let melhor = null;
  for (const p of maleta) {
    if (!p || p.categoria !== item.categoria || !ehHex(p.cor)) continue;
    if (deCor !== null && ehCorretorDeCor(p) !== deCor) continue;
    const d = deltaE2000(alvo, hexParaLab(p.cor));
    if (Number.isFinite(d) && (!melhor || d < melhor.deltaE)) melhor = { produto: p, deltaE: d };
  }
  if (!melhor) return vazio;
  const deltaE = r2(melhor.deltaE);
  return { produto: melhor.produto, deltaE, qualidade: deltaE < 3 ? "combina" : deltaE < 6 ? "aproximado" : "sem produto próximo" };
}

/** Frase curta do produto da maleta (ou null se não há nada útil). */
function textoMaleta(m, { mesmoSemProximo = false } = {}) {
  if (!m.produto) return null;
  const nome = `${m.produto.marca} · ${m.produto.nome}`;
  if (m.qualidade === "sem produto próximo") {
    return mesmoSemProximo ? `nada próximo na maleta (o mais perto é ${nome}, ΔE ${num(m.deltaE, 1)}): ajustar com mistura` : null;
  }
  return `${nome} (ΔE ${num(m.deltaE, 1)}, ${m.qualidade})`;
}

// --- leitura das entradas (tudo opcional e à prova de dado ruim) ---------------------------

function lerCor(c) {
  c = obj(c);
  const hex = ehHex(c.hex) ? c.hex.toUpperCase() : null;
  const lab = lab0(c.lab) ? c.lab : hex ? hexParaLab(hex) : null;
  return { hex, lab, confianca: hex ? c01(c.confianca) : 0 };
}

/** Medidas normalizadas: os campos que faltarem viram "não medido" com confiança 0. */
function lerMedidas(medidas) {
  const m = obj(medidas);
  const bb = obj(m.balancoDeBranco);
  const ganho = obj(bb.ganho);
  const pele = obj(m.pele);
  const monk = obj(pele.monk);
  const st = obj(pele.subtom);
  const rosto = obj(m.rosto);
  const fo = obj(m.formatoOlhos);
  const fb = obj(m.formatoBoca);
  const olheira = obj(m.olheira);
  const verm = obj(m.vermelhidao);
  const qual = obj(m.qualidade);
  return {
    qualidade: { aprovada: qual.aprovada === true, checagens: Array.isArray(qual.checagens) ? qual.checagens.filter((c) => c && typeof c === "object") : [] },
    bb: {
      ganho: { r: fin(ganho.r, 1), g: fin(ganho.g, 1), b: fin(ganho.b, 1) },
      fonte: ["branco-do-olho", "mundo-cinza", "nenhuma"].includes(bb.fonte) ? bb.fonte : "nenhuma",
      confianca: c01(bb.confianca),
    },
    pele: {
      ...lerCor(pele),
      ita: fin(pele.ita, NaN),
      faixaIta: txt(pele.faixaIta, "não medida"),
      monk: { n: fin(monk.n, NaN), distancia: fin(monk.distancia, NaN) },
      profundidade: txt(pele.profundidade, "não medida"),
      subtom: { subtom: txt(st.subtom, "não medido"), h: fin(st.h, NaN), explicacao: txt(st.explicacao) },
    },
    olhos: { ...lerCor(m.olhos), familia: txt(obj(m.olhos).familia, "não medida") },
    labios: { ...lerCor(m.labios), pigmentacao: txt(obj(m.labios).pigmentacao, "não medida") },
    sobrancelhas: lerCor(m.sobrancelhas),
    olheira: { presente: olheira.presente === true, tipo: txt(olheira.tipo, "nenhuma"), intensidade: c01(olheira.intensidade) },
    vermelhidao: { presente: verm.presente === true, intensidade: c01(verm.intensidade) },
    rosto: { formato: txt(rosto.formato, "oval"), proporcoes: obj(rosto.proporcoes), confianca: c01(rosto.confianca) },
    formatoOlhos: {
      inclinacao: txt(fo.inclinacao, "reta"), distancia: txt(fo.distancia, "equilibrados"),
      possivelEncapuzado: fo.possivelEncapuzado === true, proporcoes: obj(fo.proporcoes),
    },
    formatoBoca: { volume: txt(fb.volume, "media"), equilibrio: txt(fb.equilibrio, "equilibrada"), proporcoes: obj(fb.proporcoes) },
    contraste: { contraste: txt(obj(m.contrastePessoal).contraste, "medio"), valor: fin(obj(m.contrastePessoal).valor, NaN) },
  };
}

/** Itens válidos da receita, na ordem de execução. */
function lerItens(receita) {
  const itens = Array.isArray(obj(receita).itens) ? receita.itens : [];
  return itens
    .filter((it) => it && typeof it === "object" && CATEGORIAS.includes(it.categoria))
    .map((it) => ({
      categoria: /** @type {Categoria} */ (it.categoria),
      produto: txt(it.produto, ROTULO[it.categoria]),
      cor: ehHex(it.cor) ? it.cor.toUpperCase() : null,
      nomeCor: txt(it.nomeCor, ehHex(it.cor) ? familia(it.cor) : "cor a definir"),
      familiaCor: txt(it.familiaCor),
      acabamento: txt(it.acabamento),
      zona: txt(it.zona),
      forma: txt(it.forma),
      intensidade: Math.max(0, Math.min(100, Math.round(fin(it.intensidade, 50)))),
      ferramenta: txt(it.ferramenta),
      cores: Array.isArray(it.cores) && it.cores.length >= 3 && it.cores.slice(0, 3).every(ehHex) ? it.cores.slice(0, 3).map((h) => h.toUpperCase()) : null,
      estilo: txt(it.estilo),
    }));
}

// --- textos da ficha -----------------------------------------------------------------------

const NOME_FORMATO = { oval: "oval", redondo: "redondo", quadrado: "quadrado", coracao: "coração", diamante: "diamante", alongado: "alongado" };
const NOME_DISTANCIA = { juntos: "olhos mais próximos", equilibrados: "distância equilibrada entre os olhos", separados: "olhos mais afastados" };
const NOME_VOLUME = { fina: "fina", media: "média", carnuda: "carnuda" };
const NOME_EQUILIBRIO = { "superior menor": "lábio de cima menor que o de baixo", equilibrada: "lábios equilibrados", "superior maior": "lábio de cima maior que o de baixo" };
const NOME_CONTRASTE = { baixo: "baixo", medio: "médio", alto: "alto" };
const NOME_NIVEL = { leve: "leve", media: "médio", alta: "alto" };
const NOME_PIGMENTACAO = { clara: "clara", media: "média", marcada: "marcada" };
const OLHOS_PLURAL = { "castanho escuro": "castanho-escuros", castanho: "castanhos", mel: "cor de mel", verde: "verdes", azul: "azuis", cinza: "acinzentados", preto: "pretos" };
const ACABAMENTO = { matte: "matte", acetinado: "acetinado", cintilante: "cintilante", gloss: "gloss", glitter: "glitter" };

/** Luz da foto, lida pelo ganho do balanço de branco (ganho alto no azul = foto amarelada). */
function textoLuz(bb) {
  const { r, b } = bb.ganho;
  const razao = r > 0 ? b / r : 1;
  const dominante = razao > 1.06 ? "a foto puxava para o amarelo (luz quente)" : razao < 0.94 ? "a foto puxava para o azul (luz fria)" : "luz perto do neutro";
  if (bb.fonte === "branco-do-olho") return `Cor corrigida pelo branco dos olhos; ${dominante}.`;
  if (bb.fonte === "mundo-cinza") return `Cor corrigida pela média da cena (menos precisa que pelo branco dos olhos); ${dominante}.`;
  return "Sem correção de luz: as cores medidas podem estar puxadas pela iluminação da foto.";
}

/** Confiança do subtom: a luz da foto pesa muito (ver regras.js). */
function confiancaSubtom(M) {
  const fator = M.bb.fonte === "branco-do-olho" ? 0.55 + 0.45 * M.bb.confianca : M.bb.fonte === "mundo-cinza" ? 0.5 : 0.35;
  return c01(M.pele.confianca * fator);
}

/** Corretor de cor sugerido pela leitura (quando a receita não trouxe um). */
function corretorSugerido(M) {
  const L = M.pele.lab?.L ?? 60;
  const lista = [];
  if (M.olheira.presente && M.olheira.tipo !== "nenhuma") {
    const laranja = L < 55;
    lista.push({
      categoria: /** @type {Categoria} */ ("corretivo"), produto: "Corretor de cor",
      cor: laranja ? "#E08A50" : "#F2B596", nomeCor: laranja ? "laranja" : "pêssego",
      motivo: `olheira ${M.olheira.tipo} (${pct(M.olheira.intensidade)}) em pele ${laranja ? "mais profunda" : "clara a média"}`,
    });
  }
  if (M.vermelhidao.presente) {
    lista.push({ categoria: /** @type {Categoria} */ ("corretivo"), produto: "Corretor de cor", cor: "#B9CFA3", nomeCor: "verde", motivo: `áreas avermelhadas na foto (${pct(M.vermelhidao.intensidade)})` });
  }
  return lista;
}

function dicaOlhos(fo) {
  const d = [];
  if (fo.inclinacao === "para baixo") d.push("levantar o esfumado e o delineado no canto externo, sem descer cor na linha de baixo");
  if (fo.possivelEncapuzado) d.push("marcar o côncavo com os olhos abertos, um pouco acima da dobra natural");
  if (fo.distancia === "juntos") d.push("luz no canto interno e a cor mais escura concentrada no canto externo");
  if (fo.distancia === "separados") d.push("puxar um pouco da cor média para o canto interno");
  return d.length ? primeiraMaiuscula(d.join("; ")) + "." : "Seguir a linha natural do olho.";
}

function dicaBoca(fb, labios) {
  const d = [];
  if (fb.volume === "fina") d.push("lápis rente à borda natural; para dar volume, só um fio por fora no centro");
  else if (fb.volume === "carnuda") d.push("contorno na borda natural, sem aumentar");
  if (fb.equilibrio === "superior menor") d.push("equilibrar o lábio de cima com o lápis rente à borda e um ponto de luz no arco do cupido");
  if (fb.equilibrio === "superior maior") d.push("um toque de luz no centro do lábio de baixo equilibra");
  if (labios.pigmentacao === "marcada") d.push("boca bem pigmentada: uma camada fina de corretivo antes de batons claros");
  return d.length ? primeiraMaiuscula(d.join("; ")) + "." : "Contorno na borda natural.";
}

/** Rótulo da adaptação pelo prefixo do id da regra (o id fica no dado, para os bastidores). */
const PREFIXO_REGRA = [
  [/^HORARIO/, "Horário"], [/^(EMOCAO|CASAMENTO|NOIVA|DEBUTANTE|ENSAIO|EVENTO)/, "Momento"], [/^FLASH/, "Fotos com flash"],
  [/^SUBTOM/, "Subtom"], [/^PELE/, "Pele"], [/^CONTRASTE/, "Contraste"], [/^OLHEIRA/, "Olheira"], [/^VERMELHIDAO/, "Vermelhidão"],
  [/^OLHOS?/, "Olhos"], [/^ROSTO/, "Formato do rosto"], [/^SOBRANCELHA/, "Sobrancelha"], [/^(BOCA|LABIOS)/, "Boca"],
  [/^ORDEM/, "Ordem"], [/^NIVEL/, "Nível"], [/^VARIACAO/, "Pedido de ajuste"], [/^PEDIDO/, "Pedido da cliente"], [/^AJUSTE-AO-VIVO/, "Ajuste no espelho"],
];
const nomeRegra = (id) => {
  const t = txt(id, "AJUSTE").toUpperCase();
  return PREFIXO_REGRA.find(([re]) => re.test(t))?.[1] ?? primeiraMaiuscula(t.toLowerCase().replace(/[-_]+/g, " "));
};

function rotuloFixacao(linha) {
  if (/durar|horas/i.test(linha)) return "Duração";
  if (/tempo de execu|minutos/i.test(linha)) return "Tempo";
  if (/prepara/i.test(linha)) return "Preparação";
  if (/retoc|bolsa/i.test(linha)) return "Retoque";
  if (/prova d|primer|spray|selar|pó|fixa/i.test(linha)) return "Fixação";
  return "Dica";
}

/** Uma linha completa da ordem de execução. */
function partesPasso(it) {
  const partes = [it.produto, it.cor ? `${it.nomeCor} (${it.cor})` : it.nomeCor];
  if (it.cores) partes.push(`tons ${it.cores.join(" / ")}`);
  if (it.zona) partes.push(it.zona);
  if (it.forma) partes.push(it.forma);
  return partes;
}

// --- confirmar pessoalmente --------------------------------------------------------------------

function listaConfirmar(receita, M, itens) {
  const base = (Array.isArray(obj(receita).confirmarPessoalmente) ? receita.confirmarPessoalmente : []).map((s) => txt(s)).filter(Boolean);
  const extras = [
    { t: "Testar a base no maxilar, com luz natural: tom e subtom foram estimados pela foto", re: /testar a base|base.*maxilar|maxilar.*base/i },
    { t: "Alergias ou sensibilidade a algum produto", re: /alergi/i },
    { t: "Traje e cor da roupa, para harmonizar as cores", re: /traje|roupa|vestido/i },
    { t: "Se usa óculos ou lentes de contato (muda delineado e fixação)", re: /óculos|lentes/i },
  ];
  if (M.formatoOlhos.possivelEncapuzado) extras.push({ t: "Ver a dobra da pálpebra com os olhos abertos: a foto sugere pálpebra encapuzada", re: /encapuz|dobra da pálpebra/i });
  if (M.bb.fonte === "nenhuma" || M.bb.confianca < 0.3 || M.pele.confianca < 0.5) {
    extras.push({ t: "A leitura da cor da pele teve pouca confiança (luz da foto): conferir tom e subtom na pele", re: /subtom/i });
  }
  if (M.olheira.presente) extras.push({ t: "Ver a olheira ao vivo antes de escolher o corretor de cor", re: /olheira/i });
  if (itens.some((i) => i.categoria === "mascara" && i.intensidade >= 80)) extras.push({ t: "Cílios postiços: se a cliente quer e se já usou antes", re: /postiç/i });
  const lista = [...base];
  for (const e of extras) if (!lista.some((l) => e.re.test(l))) lista.push(e.t);
  return [...new Set(lista)];
}

// --- montar o brief ----------------------------------------------------------------------------

/**
 * Monta o Beauty Brief (ficha técnica da Thalita).
 * @param {Medidas} medidas
 * @param {Receita} receita
 * @param {{pontos?:Ponto[], maleta?:ReadonlyArray<ProdutoMaleta>, cliente?:string, largura?:number, altura?:number}} [opcoes]
 *        largura/altura (opcionais) da foto analisada, para o face chart manter a proporção do rosto
 * @returns {Brief}
 */
export function montarBrief(medidas, receita, opcoes = {}) {
  const o = obj(opcoes);
  const maleta = Array.isArray(o.maleta) ? o.maleta : [];
  const M = lerMedidas(medidas);
  const R = obj(receita);
  const itens = lerItens(R);
  const cliente = txt(o.cliente);
  const nomeMake = txt(R.nomeMake, "Make");
  const nivel = NOME_NIVEL[R.nivel] ?? txt(R.nivel, "médio");
  const confGeo = M.rosto.confianca === 0 && !Object.keys(M.rosto.proporcoes).length ? 0 : M.qualidade.aprovada ? 0.7 : 0.45;
  const confSub = confiancaSubtom(M);
  const combina = itens.map((it) => (it.cor ? combinarComMaleta(it, maleta) : combinarComMaleta(null, maleta)));
  const doTipo = (cat) => itens.filter((i) => i.categoria === cat);
  const primeiro = (cat) => itens.find((i) => i.categoria === cat) ?? null;
  const maletaDe = (it, opc) => (it && it.cor ? textoMaleta(combinarComMaleta(it, maleta), opc) : null);
  const descreve = (it) => `${it.produto} — ${it.nomeCor}${it.cor ? ` (${it.cor})` : ""}${it.acabamento ? `, ${ACABAMENTO[it.acabamento] ?? it.acabamento}` : ""}`;
  const comForma = (it, extra) => `${descreve(it)}.${extra ? ` ${primeiraMaiuscula(extra)}${/[.!?]$/.test(extra) ? "" : "."}` : ""}`;
  const semMaleta = maleta.length === 0;
  const linhaMaleta = (it) => {
    if (semMaleta) return [];
    const t = maletaDe(it, { mesmoSemProximo: true });
    return [{ rotulo: `${rotuloItem(it)} na maleta`, valor: t ?? "nenhum produto dessa categoria na maleta" }];
  };

  /** @type {Brief["secoes"]} */
  const secoes = [];

  // 1. Leitura do rosto
  const pendentes = M.qualidade.checagens.filter((c) => c.estado && c.estado !== "ok").map((c) => txt(c.titulo)).filter(Boolean);
  const prop = fin(M.rosto.proporcoes.comprimentoLargura, NaN);
  secoes.push({
    titulo: "Leitura do rosto",
    linhas: [
      { rotulo: "Luz da foto", valor: textoLuz(M.bb), confianca: M.bb.confianca },
      { rotulo: "Foto", valor: M.qualidade.aprovada ? (pendentes.length ? `Aprovada, com atenção: ${pendentes.join("; ")}.` : "Aprovada nas checagens (rosto, ângulo, luz e foco).") : `Com ressalvas${pendentes.length ? `: ${pendentes.join("; ")}` : ""}. Leituras abaixo valem menos.` },
      { rotulo: "Formato do rosto", valor: `${primeiraMaiuscula(NOME_FORMATO[M.rosto.formato] ?? M.rosto.formato)}${Number.isFinite(prop) ? ` (comprimento ÷ largura ${num(prop, 2)})` : ""}. Lido pelas proporções dos pontos; cabelo e ângulo influenciam.`, confianca: M.rosto.confianca },
      { rotulo: "Olhos", valor: `Inclinação ${M.formatoOlhos.inclinacao}, ${NOME_DISTANCIA[M.formatoOlhos.distancia] ?? M.formatoOlhos.distancia}${M.formatoOlhos.possivelEncapuzado ? ", possível pálpebra encapuzada (só um indício na foto)" : ""}.`, confianca: confGeo },
      { rotulo: "Boca", valor: `${primeiraMaiuscula(NOME_VOLUME[M.formatoBoca.volume] ?? M.formatoBoca.volume)}, ${NOME_EQUILIBRIO[M.formatoBoca.equilibrio] ?? M.formatoBoca.equilibrio}.`, confianca: confGeo },
      { rotulo: "Contraste pessoal", valor: `${primeiraMaiuscula(NOME_CONTRASTE[M.contraste.contraste] ?? M.contraste.contraste)} (pele × sobrancelhas × olhos).`, confianca: Math.min(M.pele.confianca, Math.max(M.sobrancelhas.confianca, M.olhos.confianca)) },
    ],
  });

  // 2. Pele
  const linhasPele = [];
  // a escala Monk tem só 10 tons: longe de todos (ΔE alto) = tom entre dois degraus
  const confMonk = M.pele.confianca * (Number.isFinite(M.pele.monk.distancia) ? Math.max(0.4, Math.min(1, 1 - M.pele.monk.distancia / 25)) : 0.5);
  if (M.pele.hex) {
    linhasPele.push(
      { rotulo: "Tom (escala Monk)", valor: Number.isFinite(M.pele.monk.n) ? `Monk ${M.pele.monk.n} de 10 (estimado pela foto)` : "não medido", confianca: confMonk },
      { rotulo: "Faixa ITA", valor: `${primeiraMaiuscula(M.pele.faixaIta)}${Number.isFinite(M.pele.ita) ? ` (ITA ${num(M.pele.ita, 0)}°)` : ""}`, confianca: M.pele.confianca },
      { rotulo: "Profundidade", valor: primeiraMaiuscula(M.pele.profundidade), confianca: M.pele.confianca },
      { rotulo: "Subtom", valor: `${primeiraMaiuscula(M.pele.subtom.subtom)}${M.pele.subtom.explicacao ? ` — ${M.pele.subtom.explicacao}` : ""}${Number.isFinite(M.pele.subtom.h) ? ` (matiz ${num(M.pele.subtom.h, 0)}°)` : ""}. Estimativa: a luz da foto pesa muito no subtom.`, confianca: confSub },
      { rotulo: "Cor medida", valor: `${M.pele.hex}${M.pele.lab ? ` (L* ${num(M.pele.lab.L, 0)} · a* ${num(M.pele.lab.a, 0)} · b* ${num(M.pele.lab.b, 0)})` : ""}, bochechas e testa já com a luz corrigida`, confianca: M.pele.confianca },
    );
  } else {
    linhasPele.push({ rotulo: "Cor da pele", valor: "Não deu para medir pela foto: definir tom e subtom pessoalmente.", confianca: 0 });
  }
  const base = primeiro("base");
  if (base) linhasPele.push({ rotulo: "Base indicada", valor: comForma(base, base.forma) }, ...linhaMaleta(base));
  if (base && M.pele.hex && base.cor) {
    const d = deltaE2000(hexParaLab(base.cor), M.pele.lab ?? hexParaLab(M.pele.hex));
    if (Number.isFinite(d)) linhasPele.push({ rotulo: "Base × pele medida", valor: `ΔE ${num(d, 1)} ${d < 3 ? "(praticamente o tom medido)" : d < 6 ? "(próxima do tom medido)" : "(diferente do tom medido: conferir no maxilar)"}` });
  }
  for (const it of doTipo("corretivo")) linhasPele.push({ rotulo: rotuloItem(it), valor: comForma(it, it.zona) }, ...linhaMaleta(it));
  if (!doTipo("corretivo").some(ehCorretorDeCor)) {
    for (const s of corretorSugerido(M)) {
      const t = semMaleta ? null : textoMaleta(combinarComMaleta(s, maleta), { mesmoSemProximo: true });
      linhasPele.push({ rotulo: "Corretor de cor (sugestão)", valor: `${primeiraMaiuscula(s.nomeCor)}, por causa de ${s.motivo}.${t ? ` Na maleta: ${t}.` : ""}` });
    }
  }
  linhasPele.push({
    rotulo: "Olheira",
    valor: M.olheira.presente ? `${primeiraMaiuscula(M.olheira.tipo)}, intensidade ${pct(M.olheira.intensidade)} (estimada na foto)` : "Pouco marcada na foto",
    confianca: M.pele.confianca * 0.7,
  });
  if (M.vermelhidao.presente) linhasPele.push({ rotulo: "Vermelhidão", valor: `Áreas avermelhadas na foto, intensidade ${pct(M.vermelhidao.intensidade)}`, confianca: M.pele.confianca * 0.6 });
  secoes.push({ titulo: "Pele", linhas: linhasPele });

  // 3. Olhos
  const linhasOlhos = [{
    rotulo: "Cor dos olhos",
    valor: M.olhos.hex ? `${primeiraMaiuscula(M.olhos.familia)} (${M.olhos.hex}), lida na íris` : "Não medida na foto",
    confianca: M.olhos.confianca,
  }, { rotulo: "Formato", valor: dicaOlhos(M.formatoOlhos), confianca: confGeo }];
  const sombra = primeiro("sombra");
  if (sombra) {
    linhasOlhos.push({ rotulo: "Sombra", valor: comForma(sombra, sombra.forma) });
    if (sombra.cores) {
      const nomes = ["clara", "média", "escura"];
      linhasOlhos.push({ rotulo: "Tons da sombra", valor: sombra.cores.map((h, i) => `${nomes[i]} ${h} (${familia(h)})`).join(" · ") });
      if (!semMaleta) {
        linhasOlhos.push({
          rotulo: "Sombras na maleta",
          valor: sombra.cores.map((h, i) => `${nomes[i]}: ${textoMaleta(combinarComMaleta({ categoria: "sombra", cor: h }, maleta), { mesmoSemProximo: true }) ?? "nada na maleta"}`).join(" · "),
        });
      }
    } else linhasOlhos.push(...linhaMaleta(sombra));
  } else linhasOlhos.push({ rotulo: "Sombra", valor: "Sem sombra nesta make." });
  for (const cat of ["delineado", "mascara"]) for (const it of doTipo(cat)) linhasOlhos.push({ rotulo: ROTULO[cat], valor: comForma(it, it.forma) }, ...linhaMaleta(it));
  secoes.push({ titulo: "Olhos", linhas: linhasOlhos });

  // 4. Sobrancelhas
  const sob = primeiro("sobrancelha");
  secoes.push({
    titulo: "Sobrancelhas",
    linhas: [
      { rotulo: "Cor dos fios", valor: M.sobrancelhas.hex ? `${M.sobrancelhas.hex} (${familia(M.sobrancelhas.hex)})` : "Não medida na foto", confianca: M.sobrancelhas.confianca },
      ...(sob ? [{ rotulo: "Produto", valor: comForma(sob, sob.forma) }, ...linhaMaleta(sob)] : [{ rotulo: "Produto", valor: "Só pentear e fixar com gel." }]),
      { rotulo: "Desenho", valor: "Manter o desenho natural; ajuste de formato só pessoalmente." },
    ],
  });

  // 5. Boca
  const batom = primeiro("batom");
  secoes.push({
    titulo: "Boca",
    linhas: [
      { rotulo: "Cor natural", valor: M.labios.hex ? `${M.labios.hex}, pigmentação ${NOME_PIGMENTACAO[M.labios.pigmentacao] ?? M.labios.pigmentacao}` : "Não medida na foto", confianca: M.labios.confianca },
      { rotulo: "Formato", valor: `${primeiraMaiuscula(NOME_VOLUME[M.formatoBoca.volume] ?? M.formatoBoca.volume)}, ${NOME_EQUILIBRIO[M.formatoBoca.equilibrio] ?? M.formatoBoca.equilibrio}. ${dicaBoca(M.formatoBoca, M.labios)}`, confianca: confGeo },
      ...(batom ? [{ rotulo: "Batom", valor: comForma(batom, batom.forma) }, ...linhaMaleta(batom)] : [{ rotulo: "Batom", valor: "Só hidratante labial nesta make." }]),
    ],
  });

  // 6. Paleta
  /** @type {Brief["paleta"]} */
  const paleta = [];
  const vistos = new Set();
  const addCor = (nome, hex, uso) => {
    if (!ehHex(hex) || vistos.has(hex.toUpperCase())) return;
    vistos.add(hex.toUpperCase());
    paleta.push({ nome, hex: hex.toUpperCase(), uso });
  };
  if (M.pele.hex) addCor("Pele (medida na foto)", M.pele.hex, "referência");
  for (const it of itens) {
    if (it.cores) ["clara", "média", "escura"].forEach((n, i) => addCor(`${it.nomeCor} · ${n}`, it.cores[i], `${rotuloItem(it)} ${n}`));
    else if (it.cor) addCor(it.nomeCor, it.cor, rotuloItem(it));
  }
  secoes.push({
    titulo: "Paleta",
    linhas: paleta.length ? paleta.map((c) => ({ rotulo: c.uso, valor: `${c.nome} · ${c.hex} (${familia(c.hex)})` })) : [{ rotulo: "Cores", valor: "Ainda sem cores definidas." }],
  });

  // 7. Ordem de execução
  /** @type {Brief["ordem"]} */
  const ordem = itens.map((it, i) => {
    const m = combina[i];
    const daMaleta = textoMaleta(m) ?? undefined;
    const partes = partesPasso(it);
    if (it.ferramenta) partes.push(it.ferramenta);
    return { passo: i + 1, categoria: it.categoria, texto: `${rotuloItem(it)}: ${partes.join(" · ")}`, intensidade: it.intensidade, ...(daMaleta ? { daMaleta } : {}) };
  });
  secoes.push({
    titulo: "Ordem de execução",
    linhas: [
      ...(itens.length ? [{ rotulo: "Antes do passo 1", valor: "Preparação da pele: limpeza, hidratante e primer de acordo com a pele." }] : []),
      ...itens.map((it, i) => {
        const partes = partesPasso(it);
        partes.push(`intensidade ${it.intensidade}%`);
        if (it.ferramenta) partes.push(it.ferramenta);
        const t = textoMaleta(combina[i]);
        if (t) partes.push(`da maleta: ${t}`);
        return { rotulo: `${i + 1}. ${rotuloItem(it)}`, valor: partes.join(" · ") };
      }),
    ],
  });
  if (!itens.length) secoes[secoes.length - 1].linhas.push({ rotulo: "Receita", valor: "Ainda sem receita: escolher o estilo com a cliente." });

  // 8. O que foi adaptado
  const adaptacoes = (Array.isArray(R.adaptacoes) ? R.adaptacoes : [])
    .filter((a) => a && txt(a.motivo))
    .map((a) => ({ regra: txt(a.regra, "AJUSTE"), motivo: txt(a.motivo) }));
  secoes.push({
    titulo: "O que foi adaptado",
    linhas: adaptacoes.length ? adaptacoes.map((a) => ({ rotulo: nomeRegra(a.regra), valor: a.motivo })) : [{ rotulo: "Adaptações", valor: "Nenhuma: a make segue o estilo escolhido." }],
  });

  // 9. Confirmar pessoalmente
  const confirmarPessoalmente = listaConfirmar(R, M, itens);
  secoes.push({ titulo: "Confirmar pessoalmente", linhas: confirmarPessoalmente.map((c, i) => ({ rotulo: `${i + 1}.`, valor: c })) });

  // 10. Duração e fixação
  const fix = (Array.isArray(R.duracaoEFixacao) ? R.duracaoEFixacao : []).map((s) => txt(s)).filter(Boolean);
  secoes.push({ titulo: "Duração e fixação", linhas: fix.length ? fix.map((l) => ({ rotulo: rotuloFixacao(l), valor: l })) : [{ rotulo: "Fixação", valor: "Combinar com a Thalita conforme a duração do evento." }] });

  // resumo
  const ocasiao = txt(R.ocasiao), papel = txt(R.papel);
  const olhosPrimeiro = itens.findIndex((i) => i.categoria === "sombra") >= 0 && itens.findIndex((i) => i.categoria === "sombra") < itens.findIndex((i) => i.categoria === "base");
  const resumo = [
    `${nomeMake}${papel ? ` · ${papel}` : ""}${ocasiao ? ` · ${ocasiao}` : ""} · nível ${nivel}.`,
    M.pele.hex
      ? `Pele ${M.pele.profundidade}, subtom ${M.pele.subtom.subtom} (estimado pela foto, ${pct(confSub)} de confiança)${M.olhos.hex ? `, olhos ${OLHOS_PLURAL[M.olhos.familia] ?? M.olhos.familia}` : ""}, boca ${NOME_VOLUME[M.formatoBoca.volume] ?? M.formatoBoca.volume}.`
      : "A cor da pele não foi medida: definir pessoalmente.",
    itens.length ? `${itens.length} passos, ${olhosPrimeiro ? "olhos antes da pele" : "pele antes dos olhos"}${adaptacoes.length ? `, ${adaptacoes.length} ${adaptacoes.length === 1 ? "adaptação explicada" : "adaptações explicadas"}` : ""}.` : "",
    "Tudo aqui é estimado a partir de uma foto: é direção, não receita. Confirme pessoalmente o que está no fim da ficha.",
  ].filter(Boolean).join(" ");

  const faceChartSvg = desenharFaceChart(o.pontos, itens.length ? R : null, { olhos: M.olhos.hex, largura: o.largura, altura: o.altura, nomeMake });

  /** @type {Brief} */
  const brief = {
    titulo: cliente ? `Beauty Brief · ${cliente}` : "Beauty Brief",
    resumo: { texto: resumo },
    secoes,
    paleta,
    ordem,
    faceChartSvg,
    confirmarPessoalmente,
    adaptacoes,
  };
  return limparTextos(brief);
}

/** Passa o filtro de vocabulário em todas as strings (o SVG já sai limpo). */
function limparTextos(v, chave = "") {
  if (typeof v === "string") return chave === "faceChartSvg" ? v : semLook(v);
  if (Array.isArray(v)) return v.map((x) => limparTextos(x));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, limparTextos(x, k)]));
  return v;
}

// --- versão texto (WhatsApp / e-mail) ------------------------------------------------------------

/**
 * Ficha em texto corrido, enxuta, para colar no WhatsApp ou mandar por e-mail
 * (*negrito* e _itálico_ no formato do WhatsApp).
 * @param {Brief} brief
 * @returns {string}
 */
const REPETIDO_NA_ORDEM = /^(Base indicada|Corretivo|Corretor de cor|Sombra|Delineado|Máscara|Produto|Batom)$|na maleta$/;

export function briefParaTexto(brief) {
  const b = obj(brief);
  const secoes = Array.isArray(b.secoes) ? b.secoes : [];
  const linhas = [`*${txt(b.titulo, "Beauty Brief")}*`];
  if (txt(obj(b.resumo).texto)) linhas.push(txt(b.resumo.texto));
  const sec = (titulo) => secoes.find((s) => s && s.titulo === titulo);
  const conf = (l) => (typeof l.confianca === "number" && Number.isFinite(l.confianca) ? ` _(${pct(l.confianca)})_` : "");

  const ordem = Array.isArray(b.ordem) ? b.ordem : [];
  if (ordem.length) {
    linhas.push("", "*Ordem de execução*");
    for (const p of ordem) linhas.push(`${p.passo}. ${txt(p.texto)} · ${fin(p.intensidade)}%${p.daMaleta ? `\n   ↳ maleta: ${p.daMaleta}` : ""}`);
  }
  const paleta = Array.isArray(b.paleta) ? b.paleta : [];
  if (paleta.length) {
    linhas.push("", "*Paleta*");
    linhas.push(paleta.map((c) => `${c.uso}: ${c.hex}`).join(" · "));
  }
  for (const titulo of ["Leitura do rosto", "Pele", "Olhos", "Sobrancelhas", "Boca", "O que foi adaptado", "Duração e fixação"]) {
    const s = sec(titulo);
    if (!s || !Array.isArray(s.linhas) || !s.linhas.length) continue;
    const uteis = s.linhas.filter((l) => l && !REPETIDO_NA_ORDEM.test(txt(l.rotulo)) && !(titulo === "O que foi adaptado" && txt(l.rotulo) === "Ordem"));
    if (!uteis.length) continue;
    linhas.push("", `*${titulo}*`);
    for (const l of uteis) linhas.push(`- ${txt(l.rotulo)}: ${txt(l.valor)}${conf(l)}`);
  }
  const confirmar = Array.isArray(b.confirmarPessoalmente) ? b.confirmarPessoalmente : [];
  if (confirmar.length) {
    linhas.push("", "*Confirmar pessoalmente*");
    for (const c of confirmar) linhas.push(`- ${txt(c)}`);
  }
  linhas.push("", "_Leituras estimadas a partir de foto: direção, não receita. Percentuais = confiança de cada leitura._");
  return semLook(linhas.join("\n"));
}

// --- face chart -----------------------------------------------------------------------------------

const LARG = 400; // viewBox: largura total
const CAIXA = { x: 40, y: 46, w: 320, h: 400 }; // caixa do rosto
const TRACO = "#2B1A15"; // cacau
const APOIO = "#7A5446"; // terra
const FUNDO = "#FFFDFB";
const FONTE = "'Hanken Grotesk', 'Helvetica Neue', Arial, sans-serif";
const ALTURA_MAX = 1000; // região dos filtros (cobre o desenho todo)

const f1 = (v) => String(Math.round(fin(v) * 10) / 10);
const P2 = (p) => `${f1(p.x)} ${f1(p.y)}`;
const meio = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const interp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const soma = (a, dx, dy) => ({ x: a.x + dx, y: a.y + dy });
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const anguloGraus = (a, b) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;

/** Curva suave (Catmull-Rom → Bézier) passando pelos pontos. */
function caminho(pts, fechado = false) {
  const p = pts.filter((q) => q && Number.isFinite(q.x) && Number.isFinite(q.y));
  if (p.length < 2) return "";
  const n = p.length;
  const at = (i) => (fechado ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${P2(p[0])}`;
  const segs = fechado ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += `C${P2(c1)} ${P2(c2)} ${P2(p2)}`;
  }
  return fechado ? d + "Z" : d;
}
const poligono = (pts) => (pts.length < 3 ? "" : `M${pts.map(P2).join("L")}Z`);

/** Ponto a uma fração t (0–1) do comprimento de uma polilinha. */
function aoLongo(poly, t) {
  if (poly.length === 1) return poly[0];
  const seg = [];
  let total = 0;
  for (let i = 1; i < poly.length; i++) { const d = dist(poly[i - 1], poly[i]); seg.push(d); total += d; }
  if (!(total > 0)) return poly[0];
  let alvo = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < seg.length; i++) {
    if (alvo <= seg[i] || i === seg.length - 1) return interp(poly[i], poly[i + 1], seg[i] > 0 ? Math.min(1, alvo / seg[i]) : 0);
    alvo -= seg[i];
  }
  return poly[poly.length - 1];
}

/** Os 468 primeiros pontos precisam ser números finitos; a íris (468–477) é opcional. */
function pontosValidos(pontos) {
  if (!Array.isArray(pontos) || pontos.length < 468) return false;
  for (let i = 0; i < 468; i++) {
    const p = pontos[i];
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return false;
  }
  return true;
}

/**
 * Leva os pontos para a caixa do desenho: proporção da foto, cabeça "endireitada" (linha dos olhos
 * na horizontal, nariz para baixo) e escala para caber na caixa, centralizado.
 */
function encaixar(pontos, largura, altura) {
  const asp = largura > 0 && altura > 0 && Number.isFinite(largura / altura) ? largura / altura : 1;
  const px = pontos.map((p) => (p && Number.isFinite(p.x) && Number.isFinite(p.y) ? { x: p.x * asp, y: p.y } : null));
  const olhoD = meio(px[33], px[133]), olhoE = meio(px[263], px[362]);
  let ang = Math.atan2(olhoE.y - olhoD.y, olhoE.x - olhoD.x);
  const c = meio(olhoD, olhoE);
  const girar = (a) => {
    const cos = Math.cos(-a), sin = Math.sin(-a);
    return px.map((p) => (p ? { x: c.x + (p.x - c.x) * cos - (p.y - c.y) * sin, y: c.y + (p.x - c.x) * sin + (p.y - c.y) * cos } : null));
  };
  let r = girar(ang);
  if (r[1].y < c.y) r = girar((ang += Math.PI)); // de cabeça para baixo (selfie espelhada): vira
  const contorno = [...OVAL, ...SOBRANCELHA_DIREITA.superior, ...SOBRANCELHA_ESQUERDA.superior].map((i) => r[i]);
  const xs = contorno.map((p) => p.x), ys = contorno.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const w = x1 - x0, h = y1 - y0;
  if (!(w > 0 && h > 0)) return null;
  const esc = Math.min(CAIXA.w / w, (CAIXA.h * 0.86) / h) * 0.94; // sobra embaixo para o pescoço
  const ox = CAIXA.x + (CAIXA.w - w * esc) / 2 - x0 * esc;
  const oy = CAIXA.y + CAIXA.h * 0.03 - y0 * esc;
  return r.map((p) => (p ? { x: p.x * esc + ox, y: p.y * esc + oy } : null));
}

/** Id curto e determinístico (vários face charts na mesma página não podem repetir ids). */
function idDe(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return "fc" + (h >>> 0).toString(36);
}

/** Âncora de cada passo no desenho e o lado da legenda (D = lado direito da pessoa, à esquerda). */
function ancora(cat, vez, G) {
  const { P, D, E } = G;
  const lados = {
    base: ["E", () => interp(P(151), P(284), 0.45)],
    corretivo: [vez === 0 ? "D" : "E", (l) => G.olheira(l).centro],
    contorno: ["E", () => G.cavidade(E).centro],
    blush: ["D", () => interp(P(50), P(117), 0.4)],
    iluminador: ["E", () => G.luzMaca(E).centro],
    sombra: ["D", () => G.palpebra(D).centro],
    delineado: ["D", () => G.olho(D).externo],
    mascara: ["E", () => G.olho(E).cilios],
    sobrancelha: ["D", () => G.sobrancelha(D).centro],
    batom: ["E", () => interp(P(291), P(17), 0.45)],
  };
  const [lado, f] = lados[cat];
  return { lado, ponto: f(lado === "D" ? D : E) };
}

/**
 * Face chart: o rosto da cliente em traço fino (desenho técnico de maquiadora), com as zonas
 * pintadas nas cores da receita e os passos numerados como na ordem de execução. Não é foto.
 * @param {Ponto[]|undefined} pontos   478 pontos do MediaPipe (sem pontos: rosto ilustrativo)
 * @param {Receita|null} receita
 * @param {{olhos?:string|null, largura?:number, altura?:number, nomeMake?:string}} [opcoes]
 * @returns {string} SVG
 */
export function desenharFaceChart(pontos, receita, opcoes = {}) {
  const o = obj(opcoes);
  const itens = lerItens(receita);
  const generico = !pontosValidos(pontos);
  let pts = encaixar(generico ? PONTOS_PADRAO : pontos, generico ? 1 : fin(o.largura, 0), generico ? 1 : fin(o.altura, 0));
  let ilustrativo = generico;
  if (!pts) { pts = encaixar(PONTOS_PADRAO, 1, 1); ilustrativo = true; }
  const P = (i) => pts[i];
  const u = Math.max(1, dist(P(234), P(454))); // largura do rosto no desenho
  const nomeMake = txt(o.nomeMake, txt(obj(receita).nomeMake, "Make"));
  const id = idDe(JSON.stringify([itens.map((i) => [i.categoria, i.cor, i.intensidade, i.estilo]), f1(P(1).x), f1(P(1).y), f1(P(152).y), nomeMake]));

  // geometria por lado. D = olho/sobrancelha direitos da pessoa (à esquerda no desenho).
  const D = { olho: OLHO_DIREITO, sob: SOBRANCELHA_DIREITA, sx: -1, orelha: 93, maca: 50, maca2: 117, zig: 116, temp: 127, oval: { testa: [67, 103, 54, 21], mand: [58, 172, 136, 150] }, sulco: 207, mand: 172, mandSup: 132 };
  const E = { olho: OLHO_ESQUERDO, sob: SOBRANCELHA_ESQUERDA, sx: 1, orelha: 323, maca: 280, maca2: 346, zig: 345, temp: 356, oval: { testa: [297, 332, 284, 251], mand: [288, 397, 365, 379] }, sulco: 427, mand: 397, mandSup: 361 };
  const G = {
    P, D, E,
    olho(l) {
      const sup = [...l.olho.palpebraSuperior].reverse().map(P); // de dentro para fora
      const inf = [...l.olho.palpebraInferior].reverse().map(P);
      const interno = P(l.olho.cantoInterno), externo = P(l.olho.cantoExterno);
      const larg = Math.max(1, dist(interno, externo));
      return { sup, inf, interno, externo, larg, cilios: soma(aoLongo(sup, 0.75), 0, -larg * 0.16) };
    },
    sobrancelha(l) {
      const sup = l.sob.superior.map(P), inf = l.sob.inferior.map(P); // de fora para dentro
      return { sup, inf, centro: meio(aoLongo(sup, 0.45), aoLongo(inf, 0.45)) };
    },
    palpebra(l, estilo = "esfumado") {
      const ol = G.olho(l);
      const sobInf = [...l.sob.inferior].reverse().map(P); // de dentro para fora
      const ts = [0, 0.2, 0.4, 0.6, 0.8, 1];
      const fAlto = estilo === "palpebra" ? [0.42, 0.52] : [0.52, 0.72];
      const vinco = ts.map((t) => interp(aoLongo(ol.sup, t), aoLongo(sobInf, t), fAlto[0] + (fAlto[1] - fAlto[0]) * t));
      const asa = estilo === "asa" ? soma(ol.externo, l.sx * ol.larg * 0.3, -ol.larg * 0.22)
        : estilo === "palpebra" ? null : soma(ol.externo, l.sx * ol.larg * 0.1, -ol.larg * 0.06);
      const contorno = [...ol.sup, ...(asa ? [asa] : []), ...[...vinco].reverse()];
      const fim = asa ?? ol.externo;
      return { contorno, vinco, inicio: ol.interno, fim, centro: interp(aoLongo(ol.sup, 0.55), aoLongo(vinco, 0.55), 0.5), ol };
    },
    olheira(l, menor = false) {
      const ol = G.olho(l);
      const desce = ol.larg * 0.12;
      const a = soma(aoLongo(ol.inf, 0.04), 0, desce);
      const b = soma(aoLongo(ol.inf, menor ? 0.55 : 0.85), 0, desce);
      const c = interp(aoLongo(ol.inf, menor ? 0.3 : 0.4), P(l.maca), menor ? 0.45 : 0.62);
      return { contorno: [a, b, c], centro: { x: (a.x + b.x + c.x) / 3, y: (a.y + b.y + c.y) / 3 } };
    },
    cavidade(l) {
      // abaixo do osso da maçã: da orelha em direção ao canto da boca, parando no meio
      const linha = [interp(P(l.orelha), P(l.mandSup), 0.3), interp(P(l.orelha), P(l.sulco), 0.68)];
      return { linha, centro: interp(linha[0], linha[1], 0.6) };
    },
    luzMaca(l) {
      const centro = interp(P(l.maca2), P(l.zig), 0.4);
      return { centro, ang: anguloGraus(P(l.maca2), P(l.temp)) };
    },
  };

  const defs = [];
  const zonasPele = []; // dentro do recorte do rosto
  const zonasTraco = []; // sobre o traço (olhos, sobrancelha, boca)
  const gradientes = new Map();
  const radial = (hex) => {
    if (!gradientes.has(hex)) {
      const gid = `${id}-r${gradientes.size}`;
      gradientes.set(hex, gid);
      defs.push(`<radialGradient id="${gid}"><stop offset="0" stop-color="${hex}" stop-opacity="1"/><stop offset="0.55" stop-color="${hex}" stop-opacity="0.55"/><stop offset="1" stop-color="${hex}" stop-opacity="0"/></radialGradient>`);
    }
    return gradientes.get(hex);
  };
  const ovalD = caminho(OVAL.map(P), true);
  defs.push(`<clipPath id="${id}-rosto"><path d="${ovalD}"/></clipPath>`);
  const regiao = `filterUnits="userSpaceOnUse" x="0" y="0" width="${LARG}" height="${f1(ALTURA_MAX)}"`;
  defs.push(`<filter id="${id}-suave" ${regiao}><feGaussianBlur stdDeviation="${f1(u * 0.022)}"/></filter>`);
  defs.push(`<filter id="${id}-leve" ${regiao}><feGaussianBlur stdDeviation="${f1(u * 0.006)}"/></filter>`);
  for (const [n, l] of [["d", D], ["e", E]]) defs.push(`<clipPath id="${id}-olho-${n}"><path d="${caminho(l.olho.contorno.map(P), true)}"/></clipPath>`);

  const alfa = (it, min, faixa) => f1(Math.min(0.95, min + faixa * (it.intensidade / 100)) * 100) / 100;
  for (const it of itens) {
    if (!it.cor) continue;
    const cor = it.cor;
    const c = it.categoria;
    if (c === "base") {
      const xs = OVAL.map((i) => P(i).x), ys = OVAL.map((i) => P(i).y);
      const x0 = Math.min(...xs), y0 = Math.min(...ys);
      zonasPele.push(`<rect x="${f1(x0)}" y="${f1(y0)}" width="${f1(Math.max(...xs) - x0)}" height="${f1(Math.max(...ys) - y0)}" fill="${cor}" fill-opacity="${alfa(it, 0.6, 0.25)}"/>`);
    } else if (c === "corretivo") {
      const menor = ehCorretorDeCor(it);
      for (const l of [D, E]) zonasPele.push(`<path d="${caminho(G.olheira(l, menor).contorno, true)}" fill="${cor}" fill-opacity="${alfa(it, 0.4, 0.4)}" filter="url(#${id}-suave)"/>`);
    } else if (c === "contorno") {
      const a = alfa(it, 0.35, 0.5), w = f1(u * 0.085);
      for (const l of [D, E]) {
        const cav = G.cavidade(l).linha;
        zonasPele.push(`<path d="M${P2(cav[0])}L${P2(cav[1])}" stroke="${cor}" stroke-opacity="${a}" stroke-width="${w}" stroke-linecap="round" fill="none" filter="url(#${id}-suave)"/>`);
        zonasPele.push(`<path d="${caminho(l.oval.testa.map(P))}" stroke="${cor}" stroke-opacity="${a}" stroke-width="${f1(u * 0.07)}" stroke-linecap="round" fill="none" filter="url(#${id}-suave)"/>`);
        zonasPele.push(`<path d="${caminho(l.oval.mand.map(P))}" stroke="${cor}" stroke-opacity="${a}" stroke-width="${f1(u * 0.06)}" stroke-linecap="round" fill="none" filter="url(#${id}-suave)"/>`);
      }
    } else if (c === "blush") {
      const gid = radial(cor);
      for (const l of [D, E]) {
        const centro = interp(P(l.maca), P(l.maca2), 0.4);
        const ang = anguloGraus(centro, P(l.temp));
        const ang2 = l.sx < 0 ? ang + 180 : ang;
        zonasPele.push(`<ellipse cx="${f1(centro.x)}" cy="${f1(centro.y)}" rx="${f1(u * 0.15)}" ry="${f1(u * 0.085)}" transform="rotate(${f1(ang2)} ${f1(centro.x)} ${f1(centro.y)})" fill="url(#${gid})" fill-opacity="${alfa(it, 0.45, 0.5)}"/>`);
      }
    } else if (c === "iluminador") {
      const gid = radial(cor);
      const a = alfa(it, 0.55, 0.45);
      for (const l of [D, E]) {
        const { centro, ang } = G.luzMaca(l);
        const ang2 = l.sx < 0 ? ang + 180 : ang;
        zonasPele.push(`<ellipse cx="${f1(centro.x)}" cy="${f1(centro.y)}" rx="${f1(u * 0.1)}" ry="${f1(u * 0.035)}" transform="rotate(${f1(ang2)} ${f1(centro.x)} ${f1(centro.y)})" fill="url(#${gid})" fill-opacity="${a}"/>`);
        const canto = soma(P(l.olho.cantoInterno), -l.sx * u * 0.012, 0);
        zonasPele.push(`<circle cx="${f1(canto.x)}" cy="${f1(canto.y)}" r="${f1(u * 0.018)}" fill="url(#${gid})" fill-opacity="${a}"/>`);
      }
      zonasPele.push(`<path d="M${P2(interp(P(168), P(6), 0.5))}L${P2(P(195))}" stroke="${cor}" stroke-opacity="${a}" stroke-width="${f1(u * 0.03)}" stroke-linecap="round" filter="url(#${id}-leve)"/>`);
      const cupido = soma(P(0), 0, -u * 0.022);
      zonasPele.push(`<ellipse cx="${f1(cupido.x)}" cy="${f1(cupido.y)}" rx="${f1(u * 0.03)}" ry="${f1(u * 0.012)}" fill="url(#${gid})" fill-opacity="${a}"/>`);
    } else if (c === "sombra") {
      const [clara, media, escura] = it.cores ?? [misturar(cor, "#FFFFFF", 0.55), cor, misturar(cor, "#1B1311", 0.45)];
      // o desenho segue o texto que a Thalita lê: "esfumado em asa" na forma vence o estilo de origem
      const estilo = /em asa/i.test(it.forma) ? "asa" : ["palpebra", "esfumado", "asa"].includes(it.estilo) ? it.estilo : /degrad|esfum/i.test(it.forma) ? "esfumado" : "palpebra";
      const a = alfa(it, 0.5, 0.45);
      for (const [n, l] of [["d", D], ["e", E]]) {
        const pal = G.palpebra(l, estilo);
        const gid = `${id}-sombra-${n}`;
        const paradas = estilo === "palpebra"
          ? [[0, clara], [0.3, media], [0.8, media], [1, escura]]
          : [[0, clara], [0.38, media], [0.78, escura], [1, escura]];
        defs.push(`<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${f1(pal.inicio.x)}" y1="${f1(pal.inicio.y)}" x2="${f1(pal.fim.x)}" y2="${f1(pal.fim.y)}">${paradas.map(([of, h]) => `<stop offset="${of}" stop-color="${h}"/>`).join("")}</linearGradient>`);
        zonasTraco.push(`<path d="${caminho(pal.contorno, true)}" fill="url(#${gid})" fill-opacity="${a}" filter="url(#${id}-leve)"/>`);
        // vinco marcado na cor escura (esfumado e asa)
        if (estilo !== "palpebra") zonasTraco.push(`<path d="${caminho(pal.vinco.slice(2))}" stroke="${escura}" stroke-opacity="${f1(Number(a) * 0.6 * 100) / 100}" stroke-width="${f1(u * 0.02)}" fill="none" stroke-linecap="round" filter="url(#${id}-leve)"/>`);
      }
    } else if (c === "delineado") {
      const estilo = ["fino", "gatinho", "marcado"].includes(it.estilo) ? it.estilo : /asa definida|marcado/i.test(it.forma) ? "marcado" : /pontinha|gatinho|engrossa/i.test(it.forma) ? "gatinho" : "fino";
      for (const l of [D, E]) {
        const ol = G.olho(l);
        const ts = Array.from({ length: 12 }, (_, i) => 0.06 + (0.94 * i) / 11);
        const baixo = ts.map((t) => aoLongo(ol.sup, t));
        const esp = (t) => u * 0.006 * (0.6 + 2.2 * t * t) * (0.7 + 0.6 * (it.intensidade / 100)) * (estilo === "marcado" ? 1.5 : 1);
        const cima = ts.map((t, i) => soma(baixo[i], 0, -esp(t))).reverse();
        const ponta = estilo === "fino" ? [] : [soma(ol.externo, l.sx * ol.larg * (estilo === "marcado" ? 0.3 : 0.22), -ol.larg * (estilo === "marcado" ? 0.17 : 0.13))];
        zonasTraco.push(`<path d="${poligono([...baixo, ...ponta, ...cima])}" fill="${cor}" fill-opacity="${alfa(it, 0.7, 0.3)}" stroke="${cor}" stroke-width="0.4" stroke-linejoin="round"/>`);
        if (estilo === "marcado") {
          const inf = ol.inf.slice(Math.floor(ol.inf.length * 0.55));
          zonasTraco.push(`<path d="${caminho(inf)}" stroke="${cor}" stroke-opacity="0.45" stroke-width="${f1(u * 0.012)}" fill="none" stroke-linecap="round" filter="url(#${id}-leve)"/>`);
        }
      }
    } else if (c === "mascara") {
      for (const l of [D, E]) {
        const ol = G.olho(l);
        const fios = [];
        for (let i = 0; i < 9; i++) {
          const t = 0.22 + (0.78 * i) / 8;
          const b = aoLongo(ol.sup, t);
          const comp = ol.larg * (0.1 + 0.11 * t) * (0.75 + 0.5 * (it.intensidade / 100));
          const inclina = l.sx * (0.15 + 0.85 * t);
          const fim = soma(b, inclina * comp * 0.75, -comp);
          const ctrl = soma(b, inclina * comp * 0.1, -comp * 0.7);
          fios.push(`M${P2(b)}Q${P2(ctrl)} ${P2(fim)}`);
        }
        zonasTraco.push(`<path d="${fios.join("")}" stroke="${cor}" stroke-width="${f1(Math.max(0.6, u * 0.0035))}" fill="none" stroke-linecap="round"/>`);
      }
    } else if (c === "sobrancelha") {
      for (const l of [D, E]) {
        const s = G.sobrancelha(l);
        zonasTraco.push(`<path d="${caminho([...s.sup, ...[...s.inf].reverse()], true)}" fill="${cor}" fill-opacity="${alfa(it, 0.35, 0.45)}"/>`);
        const fios = [];
        for (let i = 0; i < 14; i++) {
          const t = i / 13;
          const a = interp(aoLongo(s.inf, t), aoLongo(s.sup, t), 0.15);
          const b = interp(aoLongo(s.inf, Math.max(0, t - 0.07)), aoLongo(s.sup, Math.max(0, t - 0.07)), 0.85);
          fios.push(`M${P2(a)}L${P2(b)}`);
        }
        zonasTraco.push(`<path d="${fios.join("")}" stroke="${cor}" stroke-opacity="0.7" stroke-width="0.7" stroke-linecap="round"/>`);
      }
    } else if (c === "batom") {
      zonasTraco.push(`<path d="${caminho(LABIOS_EXTERNO.map(P), true)}${caminho(LABIOS_INTERNO.map(P), true)}" fill="${cor}" fill-opacity="${alfa(it, 0.5, 0.45)}" fill-rule="evenodd"/>`);
    }
  }

  // traço do rosto
  const traco = [];
  const linha = (d, w = 1.1, op = 0.85, cor = TRACO) => d && traco.push(`<path d="${d}" fill="none" stroke="${cor}" stroke-width="${w}" stroke-opacity="${op}" stroke-linecap="round" stroke-linejoin="round"/>`);
  linha(ovalD, 1.5, 0.9);
  const queixoY = Math.max(...OVAL.map((i) => P(i).y));
  const fimPescoco = queixoY + u * 0.1;
  // pescoço
  for (const l of [D, E]) {
    const a = interp(P(l.mand), P(l.mand === 172 ? 136 : 365), 0.55);
    const b = { x: a.x - l.sx * u * 0.03, y: fimPescoco };
    linha(`M${P2(a)}Q${P2(soma(interp(a, b, 0.5), -l.sx * u * 0.03, 0))} ${P2(b)}`, 1.1, 0.6);
  }
  const olhos = [];
  for (const [n, l] of [["d", D], ["e", E]]) {
    const contornoOlho = caminho(l.olho.contorno.map(P), true);
    olhos.push(`<path d="${contornoOlho}" fill="#FFFFFF" fill-opacity="0.92"/>`);
    const ci = P(l.olho.irisCentro);
    const anel = l.olho.iris.map(P).filter(Boolean);
    if (ci && anel.length) {
      const raio = anel.reduce((s, q) => s + dist(ci, q), 0) / anel.length;
      if (raio > 0.5 && raio < u * 0.2) {
        const corIris = ehHex(o.olhos) ? o.olhos : "#6B4A35";
        olhos.push(`<g clip-path="url(#${id}-olho-${n})"><circle cx="${f1(ci.x)}" cy="${f1(ci.y)}" r="${f1(raio)}" fill="${corIris}" fill-opacity="0.8" stroke="${TRACO}" stroke-width="0.7"/><circle cx="${f1(ci.x)}" cy="${f1(ci.y)}" r="${f1(raio * 0.42)}" fill="#1B1311"/><circle cx="${f1(ci.x + raio * 0.3)}" cy="${f1(ci.y - raio * 0.3)}" r="${f1(raio * 0.16)}" fill="#FFFFFF"/></g>`);
      }
    }
    linha(contornoOlho, 1.1, 0.9);
    const vinco = G.palpebra(l, "palpebra").vinco;
    linha(caminho(vinco.slice(1, 5).map((q, i) => interp(aoLongo(G.olho(l).sup, 0.2 + i * 0.2), q, 0.55))), 0.8, 0.45, APOIO);
    const s = G.sobrancelha(l);
    linha(caminho([...s.sup, ...[...s.inf].reverse()], true), 0.8, 0.55, APOIO);
  }
  // nariz: asas, ponta e um leve dorso
  linha(caminho([129, 64, 98, 97, 2, 326, 327, 294, 358].map(P)), 1.1, 0.8);
  for (const [topo, asa] of [[193, 129], [417, 358]]) {
    const a = interp(P(topo), P(asa), 0.5), b = P(asa);
    linha(`M${P2(a)}Q${P2(soma(interp(a, b, 0.5), (P(1).x - b.x) * 0.08, 0))} ${P2(b)}`, 0.7, 0.3, APOIO);
  }
  // boca
  linha(caminho(LABIOS_EXTERNO.map(P), true), 1.2, 0.9);
  traco.push(`<path d="${caminho(LABIOS_INTERNO.map(P), true)}" fill="#FFFFFF" fill-opacity="0.75"/>`);
  linha(caminho(LABIOS_INTERNO.map(P), true), 0.8, 0.6);

  // marcadores numerados (mesma numeração da ordem de execução)
  const vezes = {};
  const marcas = itens.map((it, i) => {
    const vez = (vezes[it.categoria] = (vezes[it.categoria] ?? -1) + 1);
    const a = ancora(it.categoria, Math.min(1, vez), G);
    return { n: i + 1, ...a, y: a.ponto.y };
  });
  const yMin = CAIXA.y + 8, yMax = Math.min(CAIXA.y + CAIXA.h, fimPescoco) - 4, PASSO = 21;
  for (const lado of ["D", "E"]) {
    const m = marcas.filter((x) => x.lado === lado).sort((a, b) => a.y - b.y || a.n - b.n);
    for (let i = 0; i < m.length; i++) m[i].y = Math.max(yMin, i ? Math.max(m[i].y, m[i - 1].y + PASSO) : m[i].y);
    for (let i = m.length - 1; i >= 0; i--) m[i].y = Math.min(m[i].y, i === m.length - 1 ? yMax : m[i + 1].y - PASSO);
  }
  const marcadores = marcas.map((m) => {
    const x = m.lado === "D" ? 16 : LARG - 16;
    const x2 = m.lado === "D" ? x + 9 : x - 9;
    return `<g><path d="M${f1(x2)} ${f1(m.y)}L${f1((x2 + m.ponto.x) / 2)} ${f1(m.y)}L${P2(m.ponto)}" fill="none" stroke="${APOIO}" stroke-width="0.6" stroke-opacity="0.75"/><circle cx="${f1(m.ponto.x)}" cy="${f1(m.ponto.y)}" r="1.8" fill="${APOIO}"/><circle cx="${x}" cy="${f1(m.y)}" r="9" fill="${TRACO}"/><text x="${x}" y="${f1(m.y + 3.6)}" text-anchor="middle" font-size="10" font-weight="700" fill="${FUNDO}">${m.n}</text></g>`;
  });

  // legenda em duas colunas
  const topoLegenda = Math.min(CAIXA.y + CAIXA.h, fimPescoco) + 30;
  const linhasLeg = Math.ceil(itens.length / 2);
  const legenda = itens.map((it, i) => {
    const col = i < linhasLeg ? 0 : 1;
    const lin = col ? i - linhasLeg : i;
    const x = 20 + col * 186, y = topoLegenda + lin * 34;
    const cores = it.cores ?? (it.cor ? [it.cor] : []);
    const amostras = cores.map((h, k) => `<rect x="${x + 22 + k * (cores.length > 1 ? 9 : 0)}" y="${y + 2}" width="${cores.length > 1 ? 9 : 16}" height="16" rx="${cores.length > 1 ? 1.5 : 4}" fill="${h}" stroke="${TRACO}" stroke-opacity="0.15" stroke-width="0.6"/>`).join("");
    const xt = x + 22 + (cores.length > 1 ? 9 * cores.length : 16) + 6;
    const maxChars = Math.floor((186 - (xt - x) - 6) / 5.4);
    return `<g><circle cx="${x + 9}" cy="${y + 10}" r="9" fill="${TRACO}"/><text x="${x + 9}" y="${y + 13.6}" text-anchor="middle" font-size="10" font-weight="700" fill="${FUNDO}">${i + 1}</text>${amostras}<text x="${xt}" y="${y + 9}" font-size="11" font-weight="600" fill="${TRACO}">${esc(rotuloItem(it))} · ${it.intensidade}%</text><text x="${xt}" y="${y + 22}" font-size="9.5" fill="${APOIO}">${esc(corta(semLook(it.nomeCor), maxChars))}</text></g>`;
  });
  const altura = topoLegenda + linhasLeg * 34 + (itens.length ? 18 : 6) + 16;
  const rodape = ilustrativo
    ? "Rosto ilustrativo (sem os pontos da cliente). Cores aproximadas."
    : "Traçado a partir dos pontos do rosto, sem foto. Cores aproximadas: conferir na pele.";

  const titulo = semLook(`Face chart: ${nomeMake}`);
  const desc = semLook(itens.length
    ? `${ilustrativo ? "Rosto ilustrativo" : "Rosto da cliente em traço"} com as zonas da make: ${itens.map((it, i) => `${i + 1}. ${rotuloItem(it)} ${it.nomeCor} (${it.cor ?? "sem cor"}), ${it.intensidade}%`).join("; ")}.`
    : `${ilustrativo ? "Rosto ilustrativo" : "Rosto da cliente em traço"}, ainda sem zonas de make.`);

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${LARG} ${f1(altura)}" width="${LARG}" height="${f1(altura)}" role="img" aria-labelledby="${id}-t ${id}-d" font-family="${esc(FONTE)}">`,
    `<title id="${id}-t">${esc(titulo)}</title>`,
    `<desc id="${id}-d">${esc(desc)}</desc>`,
    `<defs>${defs.join("")}</defs>`,
    `<rect x="0" y="0" width="${LARG}" height="${f1(altura)}" rx="18" fill="${FUNDO}"/>`,
    `<text x="20" y="28" font-size="10" font-weight="600" letter-spacing="1.6" fill="${APOIO}">FACE CHART</text>`,
    `<text x="${LARG - 20}" y="28" font-size="13" text-anchor="end" fill="${TRACO}" font-family="'Didot', 'Bodoni 72', Georgia, serif" font-style="italic">${esc(corta(semLook(nomeMake), 34))}</text>`,
    `<g clip-path="url(#${id}-rosto)">${zonasPele.join("")}</g>`,
    `<g>${olhos.join("")}</g>`,
    `<g>${zonasTraco.join("")}</g>`,
    `<g>${traco.join("")}</g>`,
    `<g>${marcadores.join("")}</g>`,
    itens.length ? `<line x1="20" y1="${topoLegenda - 10}" x2="${LARG - 20}" y2="${topoLegenda - 10}" stroke="${APOIO}" stroke-opacity="0.25" stroke-width="0.8"/>` : "",
    `<g>${legenda.join("")}</g>`,
    `<text x="20" y="${f1(altura - 14)}" font-size="9" fill="${APOIO}">${esc(rodape)}</text>`,
    `</svg>`,
  ].join("");
}
