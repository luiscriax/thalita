// Regras da Thalita: o "jeito de pensar" de uma maquiadora, escrito de forma DECLARATIVA para
// ela poder ler e revisar. Cada regra diz QUANDO vale, o que MUDA no plano da make e o MOTIVO
// (a frase que aparece no Beauty Brief). A ordem da lista importa: nível primeiro, depois pele,
// olhos, correções, formato do rosto, olhos, boca e sobrancelha.
//
// As regras não escolhem a cor final: elas ordenam candidatos, ajustam intensidade, estilo e
// técnica. Quem fecha a receita é receita.js (com a pele medida de cada cliente).

import { buscarCor, PALETAS } from "./catalogo.js";
import { deltaE2000, hexParaLab } from "./cor.js";

/** @typedef {import("./tipos.js").Categoria} Categoria */
/** @typedef {import("./tipos.js").Acabamento} Acabamento */
/** @typedef {import("./tipos.js").Adaptacao} Adaptacao */

/**
 * Plano da make que as regras vão moldando (intermediário entre as escolhas e a receita).
 * @typedef {Object} Plano
 * @property {number} nivel                      0 leve, 1 média, 2 alta
 * @property {number} nivelMaximo
 * @property {number} fatorGlobal                multiplica a intensidade das cores (não da pele)
 * @property {Partial<Record<Categoria, number>>} fatores   multiplicadores de intensidade
 * @property {Record<string, string[]>} candidatos  ids da paleta em ordem de preferência
 * @property {string[]} evitar                   famílias ("cinza", "marrom") e acabamentos ("glitter")
 * @property {string[]} evitarIds                "categoria:id" que não deve ser usado
 * @property {{sombra:string, delineado:string|null}} estilos
 * @property {Partial<Record<Categoria, Acabamento>>} acabamentos
 * @property {"nude"|"rosado"|"marcante"} tipoBatom
 * @property {"suave"|"destaque"|"neutra"} papelSombra
 * @property {Partial<Record<Categoria, string[]>>} tecnicas   notas que entram na "forma"
 * @property {Partial<Record<Categoria, string>>} zonas        substituem a zona padrão
 * @property {{id:string, zona:string, forma:string, intensidade:number}[]} corretores
 * @property {string|null} delineadoCor          id da paleta de delineado
 * @property {string|null} mascaraCor
 * @property {boolean} suavizarEscuras           troca preto por chocolate no canto externo
 * @property {boolean} provaDagua
 * @property {boolean} posticos
 * @property {"dourado"|"rosado"|"neutro"|"oliva"} fundoBase
 * @property {string[]} confirmar
 * @property {string[]} fixacao
 *
 * @typedef {Object} Contexto
 * @property {any} medidas            Medidas já normalizadas (receita.normalizarMedidas)
 * @property {any} escolhas
 * @property {import("./catalogo.js").Momento} momento
 * @property {import("./catalogo.js").Papel} papel
 * @property {import("./catalogo.js").Make} make
 * @property {"dia"|"noite"} horario
 * @property {"Mais suave"|"Como está"|"Mais intenso"} variacao
 * @property {Plano} plano
 *
 * @typedef {Object} Regra
 * @property {string} id
 * @property {Categoria} [categoria]
 * @property {string} descricao
 * @property {(c:Contexto)=>boolean} quando
 * @property {(c:Contexto)=>void} aplicar
 * @property {(c:Contexto)=>string} motivo
 */

export const NIVEIS = ["leve", "media", "alta"];

// --- Atalhos usados pelas regras ----------------------------------------------------------

const PELES_CLARAS = ["clara", "média clara"];
const PELES_MEDIAS = ["média", "média escura"];
const PELES_ESCURAS = ["escura", "retinta"];
const PELES_PROFUNDAS = ["média escura", "escura", "retinta"];

const prof = (c) => c.medidas.pele.profundidade;
const sub = (c) => c.medidas.pele.subtom.subtom;
const olhos = (c) => c.medidas.olhos;
const naoFocoBoca = (c) => c.make.foco !== "boca";

function mudarNivel(c, delta) {
  const novo = Math.max(0, Math.min(2, c.plano.nivel + delta));
  const mudou = novo !== c.plano.nivel;
  c.plano.nivel = novo;
  return mudou;
}
function multiplicar(c, categorias, fator) {
  for (const k of categorias) c.plano.fatores[k] = (c.plano.fatores[k] ?? 1) * fator;
}
/** Coloca `ids` na frente da lista de candidatos (sem repetir). */
function preferir(c, chave, ids) {
  const atual = c.plano.candidatos[chave] || [];
  c.plano.candidatos[chave] = [...ids, ...atual.filter((x) => !ids.includes(x))];
}
function definir(c, chave, ids) {
  c.plano.candidatos[chave] = [...ids];
}
function tecnica(c, categoria, texto) {
  const t = (c.plano.tecnicas[categoria] ||= []);
  if (!t.includes(texto)) t.push(texto);
}
function confirmar(c, texto) {
  if (!c.plano.confirmar.includes(texto)) c.plano.confirmar.push(texto);
}
function fixar(c, texto) {
  if (!c.plano.fixacao.includes(texto)) c.plano.fixacao.push(texto);
}
function evitarIds(c, categoria, ids) {
  for (const id of ids) {
    const k = `${categoria}:${id}`;
    if (!c.plano.evitarIds.includes(k)) c.plano.evitarIds.push(k);
  }
}
function evitar(c, ...palavras) {
  for (const p of palavras) if (!c.plano.evitar.includes(p)) c.plano.evitar.push(p);
}
/** "Cobre, Bronze e Vinho" a partir dos ids da paleta. */
function nomes(categoria, ids) {
  const n = ids.map((id) => buscarCor(categoria, id)?.nome).filter(Boolean);
  return n.length <= 1 ? n.join("") : `${n.slice(0, -1).join(", ")} e ${n[n.length - 1]}`;
}
const pct = (x) => `${Math.round(Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0)) * 100)}%`;

/**
 * Confiança do subtom (0–1). Usa a do medidor se vier; senão estima pela confiança da pele,
 * pelo balanço de branco (sem referência de branco a cor da foto engana) e pela distância
 * até a fronteira entre subtons.
 */
export function confiancaSubtom(medidas) {
  const pele = medidas?.pele || {};
  const s = pele.subtom || {};
  if (Number.isFinite(s.confianca)) return Math.max(0, Math.min(1, s.confianca));
  let c = Number.isFinite(pele.confianca) ? Math.max(0, Math.min(1, pele.confianca)) : 0;
  const bb = medidas?.balancoDeBranco || {};
  const cbb = Number.isFinite(bb.confianca) ? Math.max(0, Math.min(1, bb.confianca)) : 0;
  c *= bb.fonte === "nenhuma" || !bb.fonte ? 0.8 : 0.7 + 0.3 * cbb;
  if (Number.isFinite(s.h) && (Math.abs(s.h - 48) < 3 || Math.abs(s.h - 60) < 3)) c *= 0.85;
  return Math.round(c * 100) / 100;
}

// --- Tabelas legíveis ---------------------------------------------------------------------

/** Sombras que realçam cada cor de olho (cor complementar ou vizinha quente). */
const SOMBRA_POR_OLHO = {
  castanho: { ids: ["cobre", "bronze", "vinho", "dourado"], frase: "Olhos castanhos ganham brilho e profundidade com tons quentes metálicos" },
  "castanho escuro": { ids: ["dourado", "bronze", "vinho", "cobre"], frase: "Olhos bem escuros acendem com dourado, bronze e vinho, que trazem luz para a íris" },
  preto: { ids: ["dourado", "bronze", "vinho", "cobre"], frase: "Olhos pretos acendem com dourado, bronze e vinho, que trazem luz para a íris" },
  verde: { ids: ["ameixa", "vinho", "bronze", "cobre"], frase: "Olhos verdes ficam mais verdes perto de ameixa e vinho (tons opostos no círculo das cores)" },
  mel: { ids: ["ameixa", "vinho", "bronze", "dourado"], frase: "Olhos mel destacam o dourado e o verde da íris com ameixa, vinho e bronze" },
  azul: { ids: ["cobre", "terracota", "pessego", "bronze"], frase: "Olhos azuis ficam mais azuis com tons alaranjados (opostos ao azul), como cobre e terracota" },
  cinza: { ids: ["ameixa", "cobre", "malva", "bronze"], frase: "Olhos cinza ganham cor com ameixa (puxa o azul) ou cobre (puxa o verde)" },
};

/** Contorno, blush e luz por formato do rosto (a meta é sempre equilibrar, não mudar o rosto). */
const POR_FORMATO = {
  oval: {
    contorno: "logo abaixo do osso das maçãs, bem esfumado",
    blush: "nas maçãs, esfumado em direção às têmporas",
    iluminador: "topo das maçãs, ponte do nariz e arco do cupido",
    motivo: "Rosto oval já é equilibrado: contorno leve só para dar dimensão.",
  },
  redondo: {
    contorno: "em diagonal, da têmpora até o meio da bochecha, e nas laterais do maxilar",
    blush: "um pouco acima das maçãs, puxado para cima em diagonal",
    iluminador: "centro da testa, ponte do nariz e queixo, alongando o rosto",
    motivo: "Rosto redondo: contorno em diagonal e nas laterais alonga e dá ângulo; blush puxado para cima.",
  },
  quadrado: {
    contorno: "nos cantos do maxilar e nas laterais da testa, suavizando os ângulos",
    blush: "arredondado, no centro das maçãs",
    iluminador: "centro da testa e do queixo",
    motivo: "Rosto quadrado: suavizar os ângulos do maxilar e da testa; blush arredondado no centro das maçãs.",
  },
  coracao: {
    contorno: "nas laterais da testa e nas têmporas, leve abaixo das maçãs",
    blush: "um pouco mais baixo nas maçãs, esfumado para fora",
    iluminador: "queixo e centro da testa, bem sutil",
    motivo: "Rosto coração: contorno nas laterais da testa e luz no queixo equilibram a parte de cima, mais larga.",
  },
  diamante: {
    contorno: "logo abaixo do osso das maçãs, sem marcar as têmporas",
    blush: "no centro das maçãs, esfumado na horizontal",
    iluminador: "centro da testa e queixo, para dar largura",
    motivo: "Rosto diamante: as maçãs são a parte mais larga; luz no centro da testa e do queixo equilibra.",
  },
  alongado: {
    contorno: "na linha do cabelo no alto da testa e embaixo do queixo",
    blush: "na horizontal, das maçãs em direção às orelhas",
    iluminador: "topo das maçãs, na horizontal",
    motivo: "Rosto alongado: contorno no alto da testa e no queixo encurta; blush na horizontal alarga.",
  },
};

/** Corretor de cor para olheira arroxeada ou azulada, pela profundidade da pele. */
const CORRETOR_OLHEIRA = [
  { id: "OLHEIRA-PESSEGO", peles: PELES_CLARAS, corretor: "pessego", frase: "em pele clara, o pêssego neutraliza o roxo/azul sem acinzentar" },
  { id: "OLHEIRA-LARANJA", peles: PELES_MEDIAS, corretor: "laranja", frase: "em pele média, o laranja neutraliza o roxo/azul (o pêssego ficaria acinzentado)" },
  { id: "OLHEIRA-TERRACOTA", peles: PELES_ESCURAS, corretor: "terracota", frase: "em pele escura, o laranja-terracota neutraliza o roxo/azul sem deixar a olheira cinza" },
];

// --- As regras ----------------------------------------------------------------------------

/** @type {Regra[]} */
export const REGRAS = [
  // 1) NÍVEL — momento, papel, horário e pedido de variação
  {
    id: "HORARIO-NOITE",
    descricao: "À noite a make sobe um nível.",
    quando: (c) => c.horario === "noite",
    aplicar: (c) => {
      if (!mudarNivel(c, 1)) c.plano.fatorGlobal *= 1.1;
    },
    motivo: () => "À noite a luz é baixa e tem foto com flash: a make sobe um nível para não sumir nas fotos.",
  },
  {
    id: "VARIACAO-MAIS-SUAVE",
    descricao: "A cliente pediu a make mais suave.",
    quando: (c) => c.variacao === "Mais suave",
    aplicar: (c) => {
      if (!mudarNivel(c, -1)) c.plano.fatorGlobal *= 0.8;
    },
    motivo: () => "A cliente pediu a make mais suave: tudo um nível abaixo.",
  },
  {
    id: "VARIACAO-MAIS-INTENSA",
    descricao: "A cliente pediu a make mais intensa.",
    quando: (c) => c.variacao === "Mais intenso",
    aplicar: (c) => {
      if (!mudarNivel(c, 1)) c.plano.fatorGlobal *= 1.15;
    },
    motivo: () => "A cliente pediu a make mais intensa: tudo um nível acima.",
  },
  {
    id: "EVENTO-CORPORATIVO",
    descricao: "Evento corporativo: no máximo intensidade média, sem glitter e sem cores vibrantes.",
    quando: (c) => !!c.papel.nivelMaximo,
    aplicar: (c) => {
      const max = Math.max(0, NIVEIS.indexOf(c.papel.nivelMaximo));
      c.plano.nivelMaximo = Math.min(c.plano.nivelMaximo, max);
      c.plano.nivel = Math.min(c.plano.nivel, c.plano.nivelMaximo);
      c.plano.fatorGlobal = Math.min(c.plano.fatorGlobal, 1);
      evitar(c, "glitter");
      evitarIds(c, "batom", ["pink-festa"]);
      evitarIds(c, "sombra", ["azul-petroleo", "prateado"]);
    },
    motivo: () => "Evento corporativo: make elegante e discreta — no máximo intensidade média, sem glitter e sem cores vibrantes.",
  },
  {
    id: "CASAMENTO-DIA",
    descricao: "Casamento de dia: pele luminosa e leve, tudo à prova d'água.",
    quando: (c) => c.momento.id === "casamento" && c.horario === "dia",
    aplicar: (c) => {
      c.plano.acabamentos.base = "acetinado";
      c.plano.provaDagua = true;
      multiplicar(c, ["contorno"], 0.85);
      preferir(c, "iluminador", ["champanhe", "rose-dourado"]);
      tecnica(c, "base", "pele luminosa e fina: hidratação e primer iluminador, pó só na zona T");
      tecnica(c, "contorno", "bem esfumado — a luz do dia denuncia contorno marcado");
      fixar(c, "Tudo à prova d'água: máscara, delineado e primer de pálpebra.");
    },
    motivo: () => "Casamento de dia: pele luminosa e leve, que fica natural na luz do sol, e tudo à prova d'água para a emoção da cerimônia.",
  },
  {
    id: "EMOCAO-PROVA-DAGUA",
    descricao: "Momento de emoção ou dia longo: à prova d'água e fixação reforçada.",
    quando: (c) => !!(c.momento.clima.emocao || c.papel.provaDagua),
    aplicar: (c) => {
      c.plano.provaDagua = true;
      fixar(c, "Máscara e delineado à prova d'água.");
      fixar(c, "Primer de pálpebra para a sombra não marcar a dobra.");
      fixar(c, "Spray fixador no final.");
    },
    motivo: (c) => `${c.papel.nome} em ${c.momento.nome.toLowerCase()}: momento de emoção e abraço — máscara e delineado à prova d'água, primer de pálpebra e spray fixador.`,
  },
  {
    id: "NOIVA-TESTE",
    descricao: "Noiva: teste de make recomendado e cílios para as fotos.",
    quando: (c) => !!c.papel.teste,
    aplicar: (c) => {
      confirmar(c, "Fazer o teste de make antes do grande dia");
      if (c.plano.nivel >= 1) c.plano.posticos = true;
    },
    motivo: () => "Noiva: vale fazer o teste de make antes, para acertar base, cílios e batom com calma.",
  },
  {
    id: "DEBUTANTE-PELE-FRESCA",
    categoria: "base",
    descricao: "Debutante: pele leve e fresca, brilho liberado nos olhos.",
    quando: (c) => c.papel.id === "debutante",
    aplicar: (c) => {
      multiplicar(c, ["base"], 0.8);
      c.plano.acabamentos.base = "acetinado";
      if (c.plano.acabamentos.sombra === "matte") c.plano.acabamentos.sombra = "cintilante";
      tecnica(c, "base", "cobertura só onde precisa, deixando a textura da pele aparecer");
    },
    motivo: () => "Debutante: pele fresca e leve (cobertura só onde precisa) e brilho liberado nos olhos — é festa de 15 anos!",
  },
  {
    id: "ENSAIO-CAMERA",
    descricao: "Ensaio fotográfico: pele sem brilho na zona T e traços um pouco mais definidos.",
    quando: (c) => !!c.papel.camera,
    aplicar: (c) => {
      c.plano.acabamentos.base = "matte";
      multiplicar(c, ["contorno"], 1.15);
      multiplicar(c, ["sobrancelha"], 1.1);
      multiplicar(c, ["iluminador"], 0.85);
      tecnica(c, "base", "selar a zona T com pó translúcido; nada de brilho na testa e no nariz");
    },
    motivo: () => "Ensaio fotográfico: a câmera achata os traços e realça o brilho — pele matte na zona T, contorno e sobrancelha um pouco mais definidos.",
  },
  {
    id: "FLASH-SEM-FLASHBACK",
    categoria: "base",
    descricao: "Foto com flash: evitar pó com sílica em excesso e base com FPS alto.",
    quando: (c) => !!(c.momento.clima.flash || c.papel.flash),
    aplicar: (c) => {
      confirmar(c, "Conferir se a base e o pó não têm FPS alto nem sílica em excesso (flashback nas fotos com flash)");
      tecnica(c, "base", "sem FPS alto e sem pó com sílica em excesso, por causa do flash");
    },
    motivo: () => "Vai ter foto com flash: base sem FPS alto e pó sem excesso de sílica, para o rosto não ficar branco nas fotos (confirmar os produtos).",
  },

  // 2) SUBTOM — base, blush, iluminador, batom nude e luz dos olhos
  {
    id: "SUBTOM-QUENTE",
    descricao: "Subtom quente: base com fundo dourado, blush pêssego/coral, iluminador dourado, nudes acaramelados.",
    quando: (c) => sub(c) === "quente",
    aplicar: (c) => {
      c.plano.fundoBase = "dourado";
      definir(c, "blush", ["pessego-suave", "coral", "terracota", "bronze-rosado"]);
      definir(c, "iluminador", ["dourado", "champanhe", "bronze-dourado"]);
      definir(c, "batomNude", ["nude-canela", "pessego", "nude-caramelo", "nude-cacau"]);
      definir(c, "batomRosado", ["pessego", "coral-verao", "rosa-cha"]);
      definir(c, "batomMarcante", ["vermelho-tijolo", "terracota", "coral-verao", "vinho-noite"]);
      definir(c, "sombraClara", ["champanhe", "dourado"]);
      definir(c, "sombraTransicao", ["areia", "caramelo", "pessego"]);
      preferir(c, "contorno", ["areia-escura", "caramelo", "chocolate"]);
    },
    motivo: () => "Subtom quente (puxa para o dourado): base com fundo dourado, blush pêssego ou coral, iluminador dourado e nudes acaramelados.",
  },
  {
    id: "SUBTOM-FRIO",
    descricao: "Subtom frio: base com fundo rosado, blush rosa/malva, iluminador perolado, nudes rosados.",
    quando: (c) => sub(c) === "frio",
    aplicar: (c) => {
      c.plano.fundoBase = "rosado";
      definir(c, "blush", ["rosa-petala", "rosa-queimado", "malva-rosado", "ameixa-suave"]);
      definir(c, "iluminador", ["perolado", "champanhe", "rose-dourado"]);
      definir(c, "batomNude", ["nude-petala", "rosa-cha", "malva", "nude-cacau"]);
      definir(c, "batomRosado", ["rosa-cha", "rosa-bebe", "malva"]);
      definir(c, "batomMarcante", ["vermelho-paixao", "vinho-noite", "pink-festa", "ameixa"]);
      definir(c, "sombraClara", ["champanhe", "rose"]);
      definir(c, "sombraTransicao", ["taupe", "malva", "areia"]);
      preferir(c, "contorno", ["taupe-frio", "areia-escura", "chocolate"]);
    },
    motivo: () => "Subtom frio (puxa para o rosado): base com fundo rosado, blush rosa ou malva, iluminador perolado e nudes rosados; vermelhos puxados para o azul.",
  },
  {
    id: "SUBTOM-NEUTRO",
    descricao: "Subtom neutro: champanhe, rosa queimado e nudes equilibrados.",
    quando: (c) => sub(c) === "neutro",
    aplicar: (c) => {
      c.plano.fundoBase = "neutro";
      definir(c, "blush", ["rosa-queimado", "pessego-suave", "malva-rosado", "terracota", "bronze-rosado"]);
      definir(c, "iluminador", ["champanhe", "rose-dourado", "dourado", "bronze-dourado"]);
      definir(c, "batomNude", ["nude-canela", "rosa-cha", "nude-petala", "nude-caramelo", "nude-cacau"]);
      definir(c, "batomRosado", ["rosa-cha", "malva", "pessego"]);
      definir(c, "batomMarcante", ["vermelho-paixao", "vinho-noite", "terracota"]);
      definir(c, "sombraClara", ["champanhe", "rose"]);
      definir(c, "sombraTransicao", ["areia", "taupe", "caramelo"]);
      preferir(c, "contorno", ["areia-escura", "taupe-frio", "caramelo"]);
    },
    motivo: () => "Subtom neutro: aceita tons quentes e frios — champanhe, rosa queimado e nudes equilibrados.",
  },
  {
    id: "SUBTOM-OLIVA",
    descricao: "Subtom oliva: base com fundo amarelo-esverdeado, nada de base rosada.",
    quando: (c) => sub(c) === "oliva",
    aplicar: (c) => {
      c.plano.fundoBase = "oliva";
      definir(c, "blush", ["pessego-suave", "terracota", "rosa-queimado", "bronze-rosado"]);
      definir(c, "iluminador", ["dourado", "champanhe", "bronze-dourado"]);
      definir(c, "batomNude", ["nude-canela", "nude-caramelo", "rosa-cha", "nude-cacau"]);
      definir(c, "batomRosado", ["rosa-cha", "pessego", "malva"]);
      definir(c, "batomMarcante", ["vermelho-tijolo", "vinho-noite", "terracota", "ameixa"]);
      definir(c, "sombraClara", ["champanhe", "dourado"]);
      definir(c, "sombraTransicao", ["areia", "caramelo", "taupe"]);
      preferir(c, "contorno", ["areia-escura", "caramelo", "taupe-frio"]);
      tecnica(c, "base", "fundo oliva (amarelo-esverdeado): base rosada deixaria a pele acinzentada");
    },
    motivo: () => "Subtom oliva: base com fundo amarelo-esverdeado (base rosada acinzenta), blush pêssego ou terracota e iluminador dourado.",
  },
  {
    id: "SUBTOM-INCERTO",
    categoria: "base",
    descricao: "Subtom estimado com pouca confiança: testar a base pessoalmente.",
    quando: (c) => confiancaSubtom(c.medidas) < 0.7,
    aplicar: (c) => confirmar(c, "Testar a base no maxilar em luz natural (o subtom foi estimado com pouca confiança)"),
    motivo: (c) => `Subtom estimado com pouca confiança (${pct(confiancaSubtom(c.medidas))}): as cores partem da leitura da foto, mas a base precisa ser testada no maxilar em luz natural.`,
  },

  // 3) PROFUNDIDADE DA PELE — pigmentação
  {
    id: "PELE-CLARA-PIGMENTO-DOSADO",
    descricao: "Pele clara: pigmento em camadas finas.",
    quando: (c) => prof(c) === "clara",
    aplicar: (c) => {
      multiplicar(c, ["contorno"], 0.85);
      multiplicar(c, ["blush"], 0.9);
      if (c.plano.nivel === 0) c.plano.delineadoCor = c.plano.delineadoCor || "marrom-cafe";
      tecnica(c, "blush", "pouco produto no pincel, construindo aos poucos");
    },
    motivo: () => "Pele clara: a cor aparece rápido — contorno e blush em camadas finas, construídos aos poucos.",
  },
  {
    id: "PELE-PROFUNDA-PIGMENTO",
    descricao: "Pele profunda: cores mais pigmentadas, iluminador dourado/bronze e nada acinzentado.",
    quando: (c) => PELES_PROFUNDAS.includes(prof(c)),
    aplicar: (c) => {
      multiplicar(c, ["sombra", "blush", "batom", "iluminador", "delineado"], 1.15);
      evitar(c, "cinza");
      evitarIds(c, "iluminador", ["perolado"]);
      evitarIds(c, "contorno", ["taupe-frio"]);
      evitarIds(c, "sombra", ["cinza-fume", "prateado", "taupe"]);
      preferir(c, "iluminador", ["bronze-dourado", "dourado"]);
      preferir(c, "blush", ["terracota", "bronze-rosado", "ameixa-suave"]);
      definir(c, "sombraClara", ["dourado", "bronze", "cobre"]);
      definir(c, "sombraTransicao", ["caramelo", "terracota", "bronze"]);
      tecnica(c, "sombra", "primer colorido ou base de sombra para o pigmento render");
    },
    motivo: (c) => `Pele ${prof(c)}: cores mais pigmentadas para aparecer de verdade, iluminador dourado ou bronze e nada de tons acinzentados (cinza e perolado deixam a pele opaca).`,
  },

  // 4) COR DOS OLHOS — sombra que realça
  ...Object.entries(SOMBRA_POR_OLHO).map(([familia, t]) => ({
    id: `OLHO-${familia.toUpperCase().replace(/\s+/g, "-")}`,
    categoria: /** @type {Categoria} */ ("sombra"),
    descricao: `${t.frase}.`,
    quando: (c) => olhos(c).familia === familia && olhos(c).confianca >= 0.3 && naoFocoBoca(c),
    aplicar: (c) => definir(c, "sombraDestaque", t.ids),
    motivo: () => `${t.frase}: ${nomes("sombra", t.ids)}.`,
  })),

  // 5) CONTRASTE PESSOAL — pele × sobrancelha × olhos
  {
    id: "CONTRASTE-BAIXO",
    descricao: "Contraste pessoal baixo: make mais suave, sem preto puro.",
    quando: (c) => c.medidas.contrastePessoal.contraste === "baixo",
    aplicar: (c) => {
      multiplicar(c, ["sombra", "delineado"], 0.85);
      multiplicar(c, ["batom"], 0.9);
      c.plano.suavizarEscuras = true;
      if (c.plano.estilos.delineado !== "marcado") c.plano.delineadoCor = "marrom-cafe";
    },
    motivo: () => "Contraste pessoal baixo (pele, sobrancelha e olhos em tons próximos): cores médias e esfumado suave harmonizam; preto puro e cores muito escuras pesariam.",
  },
  {
    id: "CONTRASTE-ALTO",
    descricao: "Contraste pessoal alto: sustenta cores profundas e delineado preto.",
    quando: (c) => c.medidas.contrastePessoal.contraste === "alto",
    aplicar: (c) => {
      multiplicar(c, ["sombra", "delineado"], 1.1);
      c.plano.delineadoCor = "preto-intenso";
    },
    motivo: () => "Contraste pessoal alto: o rosto sustenta cores profundas e delineado preto sem pesar.",
  },

  // 6) CORREÇÃO — olheira e vermelhidão
  ...CORRETOR_OLHEIRA.map((t) => ({
    id: t.id,
    categoria: /** @type {Categoria} */ ("corretivo"),
    descricao: `Olheira arroxeada ou azulada: ${t.frase}.`,
    quando: (c) =>
      c.medidas.olheira.presente && ["arroxeada", "azulada"].includes(c.medidas.olheira.tipo) && t.peles.includes(prof(c)),
    aplicar: (c) => {
      c.plano.corretores.push({
        id: t.corretor,
        zona: "olheira, só na parte arroxeada (perto do canto interno)",
        forma: "camada fina batida com a ponta do dedo; o corretivo no tom da pele vai por cima",
        intensidade: Math.round(30 + 30 * c.medidas.olheira.intensidade),
      });
      confirmar(c, "Conferir a olheira ao vivo (a cor na foto pode enganar)");
    },
    motivo: (c) => `Olheira ${c.medidas.olheira.tipo}: corretor ${buscarCor("corretivo", t.corretor)?.nome.replace("Corretor ", "").toLowerCase()} — ${t.frase}.`,
  })),
  {
    id: "OLHEIRA-MARROM",
    categoria: "corretivo",
    descricao: "Olheira marrom (pigmentação): corretor pêssego ou laranja só onde escurece.",
    quando: (c) => c.medidas.olheira.presente && c.medidas.olheira.tipo === "marrom",
    aplicar: (c) => {
      c.plano.corretores.push({
        id: PELES_CLARAS.includes(prof(c)) ? "pessego" : "laranja",
        zona: "só onde a olheira escurece",
        forma: "bem pouco produto, batido; depois corretivo no tom da pele",
        intensidade: Math.round(25 + 25 * c.medidas.olheira.intensidade),
      });
    },
    motivo: (c) =>
      `Olheira marrom (pigmentação): corretor ${PELES_CLARAS.includes(prof(c)) ? "pêssego" : "laranja"} só onde escurece e corretivo no tom da pele por cima — corretivo muito claro deixaria a olheira acinzentada.`,
  },
  {
    id: "VERMELHIDAO-VERDE",
    categoria: "corretivo",
    descricao: "Vermelhidão: corretor verde, leve e pontual.",
    quando: (c) => c.medidas.vermelhidao.presente,
    aplicar: (c) => {
      c.plano.corretores.push({
        id: "verde",
        zona: "áreas avermelhadas (laterais do nariz, bochechas, queixo)",
        forma: "pontual e bem fino, só onde precisa; a base vem por cima batida com esponja",
        intensidade: Math.round(20 + 20 * c.medidas.vermelhidao.intensidade),
      });
    },
    motivo: () => "Vermelhidão na pele: corretor verde leve e pontual neutraliza o vermelho e evita base grossa.",
  },

  // 7) FORMATO DO ROSTO — contorno, blush e luz
  ...Object.entries(POR_FORMATO).map(([formato, t]) => ({
    id: `ROSTO-${formato.toUpperCase()}`,
    categoria: /** @type {Categoria} */ ("contorno"),
    descricao: t.motivo,
    quando: (c) => c.medidas.rosto.formato === formato && c.medidas.rosto.confianca >= 0.4,
    aplicar: (c) => {
      c.plano.zonas.contorno = t.contorno;
      c.plano.zonas.blush = t.blush;
      c.plano.zonas.iluminador = t.iluminador;
    },
    motivo: () => t.motivo,
  })),

  // 8) FORMATO DOS OLHOS — técnica
  {
    id: "OLHO-ENCAPUZADO",
    categoria: "sombra",
    descricao: "Olho encapuzado: esfumado acima da dobra e delineado fino.",
    quando: (c) => c.medidas.formatoOlhos.possivelEncapuzado,
    aplicar: (c) => {
      if (c.plano.estilos.sombra === "palpebra") c.plano.estilos.sombra = "esfumado";
      if (c.plano.estilos.delineado) c.plano.estilos.delineado = "fino";
      tecnica(c, "sombra", "esfumar com o olho ABERTO, levando a cor um pouco acima da dobra para ela aparecer");
      if (c.plano.acabamentos.sombra !== "matte") tecnica(c, "sombra", "brilho só no centro da pálpebra; matte na dobra");
      tecnica(c, "delineado", "linha fina rente aos cílios; se tiver asa, desenhar com o olho aberto");
      confirmar(c, "Conferir a dobra da pálpebra com o olho aberto antes de esfumar");
    },
    motivo: () => "Pálpebra possivelmente encapuzada: a dobra esconde parte da pálpebra, então o esfumado sobe acima da dobra (feito com o olho aberto) e o delineado fica fino para não sumir nem borrar.",
  },
  {
    id: "OLHO-CAIDO",
    categoria: "sombra",
    descricao: "Olho caído: puxar o esfumado e o delineado para cima.",
    quando: (c) => c.medidas.formatoOlhos.inclinacao === "para baixo",
    aplicar: (c) => {
      c.plano.estilos.sombra = "asa";
      if (c.plano.estilos.delineado === "fino" && !c.medidas.formatoOlhos.possivelEncapuzado) c.plano.estilos.delineado = "gatinho";
      tecnica(c, "sombra", "puxar o esfumado para cima, em direção à cauda da sobrancelha; não escurecer o canto externo de baixo");
      tecnica(c, "delineado", "asa levantada, na direção da cauda da sobrancelha (não seguir a curva do olho para baixo)");
    },
    motivo: () => "Canto externo do olho mais baixo: esfumado e delineado puxados para cima levantam o olhar.",
  },
  {
    id: "OLHO-PARA-CIMA",
    categoria: "delineado",
    descricao: "Olho puxado para cima: acompanhar a inclinação e equilibrar embaixo.",
    quando: (c) => c.medidas.formatoOlhos.inclinacao === "para cima",
    aplicar: (c) => {
      tecnica(c, "delineado", "acompanhar a inclinação natural, sem exagerar a asa");
      tecnica(c, "sombra", "um toque da cor média no canto externo de baixo equilibra o olhar");
    },
    motivo: () => "Olhos já inclinados para cima: o delineado acompanha a inclinação e um toque de sombra embaixo equilibra.",
  },
  {
    id: "OLHOS-JUNTOS",
    categoria: "sombra",
    descricao: "Olhos mais juntos: luz no canto interno, escuro no externo.",
    quando: (c) => c.medidas.formatoOlhos.distancia === "juntos",
    aplicar: (c) => {
      tecnica(c, "sombra", "luz (cor clara) no canto interno; cor escura concentrada do meio para fora");
      tecnica(c, "delineado", "começar o delineado do meio do olho para fora");
      tecnica(c, "iluminador", "um ponto de luz no canto interno dos olhos");
    },
    motivo: () => "Olhos mais próximos: luz no canto interno e cor escura no canto externo afastam visualmente os olhos.",
  },
  {
    id: "OLHOS-SEPARADOS",
    categoria: "sombra",
    descricao: "Olhos mais separados: cor média até perto do canto interno.",
    quando: (c) => c.medidas.formatoOlhos.distancia === "separados",
    aplicar: (c) => {
      tecnica(c, "sombra", "levar a cor média até perto do canto interno; sem luz forte ali");
      tecnica(c, "delineado", "delineado do canto interno ao externo, um pouco mais marcado no começo");
    },
    motivo: () => "Olhos mais afastados: cor média levada para perto do canto interno aproxima visualmente os olhos.",
  },

  // 9) BOCA — técnica
  {
    id: "BOCA-FINA",
    categoria: "batom",
    descricao: "Boca fina: tons médios e acetinados, contorno rente à borda e luz no centro.",
    quando: (c) => c.medidas.formatoBoca.volume === "fina",
    aplicar: (c) => {
      if (c.plano.acabamentos.batom === "matte") c.plano.acabamentos.batom = "acetinado";
      preferir(c, "batomMarcante", ["vermelho-paixao", "vermelho-tijolo", "coral-verao"]);
      tecnica(c, "batom", "contorno rente à borda (no máximo 1 mm para fora no centro) e um ponto de luz no centro do lábio inferior");
    },
    motivo: () => "Boca fina: tons médios e acabamento acetinado dão volume (cores muito escuras e matte afinam). Contorno rente à borda e luz no centro.",
  },
  {
    id: "BOCA-SUPERIOR-MENOR",
    categoria: "batom",
    descricao: "Lábio de cima menor: equilibrar no arco do cupido.",
    quando: (c) => c.medidas.formatoBoca.equilibrio === "superior menor",
    aplicar: (c) => tecnica(c, "batom", "lápis levemente por fora no arco do cupido para equilibrar com o lábio de baixo"),
    motivo: () => "Lábio de cima menor que o de baixo: o lápis sobe levemente no arco do cupido para equilibrar.",
  },
  {
    id: "BOCA-SUPERIOR-MAIOR",
    categoria: "batom",
    descricao: "Lábio de cima maior: equilibrar no centro do lábio de baixo.",
    quando: (c) => c.medidas.formatoBoca.equilibrio === "superior maior",
    aplicar: (c) => tecnica(c, "batom", "lápis levemente por fora no centro do lábio de baixo e um toque de luz ali"),
    motivo: () => "Lábio de cima maior que o de baixo: o lápis aumenta levemente o centro do lábio de baixo para equilibrar.",
  },
  {
    id: "LABIOS-PIGMENTADOS",
    categoria: "batom",
    descricao: "Lábios bem pigmentados: uniformizar antes de nudes e cores claras.",
    quando: (c) => c.medidas.labios.pigmentacao === "marcada",
    aplicar: (c) => tecnica(c, "batom", "uniformizar a boca com um pouco de corretivo antes de nudes e cores claras"),
    motivo: () => "Lábios bem pigmentados: um pouco de corretivo antes do batom deixa a cor fiel (sem contorno escuro aparecendo).",
  },

  // 10) SOBRANCELHA — no tom dos fios
  {
    id: "SOBRANCELHA-TOM",
    categoria: "sobrancelha",
    descricao: "Sobrancelha no tom dos fios medidos na foto.",
    quando: (c) => !!c.medidas.sobrancelhas.hex && c.medidas.sobrancelhas.confianca >= 0.3,
    aplicar: (c) => {
      const alvo = hexParaLab(c.medidas.sobrancelhas.hex);
      let melhor = null;
      for (const cor of PALETAS.sobrancelha) {
        const d = deltaE2000(alvo, hexParaLab(cor.hex));
        if (!melhor || d < melhor.d) melhor = { id: cor.id, d };
      }
      if (melhor) definir(c, "sobrancelha", [melhor.id]);
    },
    motivo: (c) => `Sobrancelha em ${buscarCor("sobrancelha", c.plano.candidatos.sobrancelha?.[0])?.nome ?? "tom dos fios"}, no tom dos fios medidos na foto.`,
  },
];

/**
 * Roda as regras em ordem sobre o contexto e devolve as adaptações (regra + motivo).
 * Uma regra que falhar com dado inesperado é pulada, sem derrubar a receita.
 * @param {Contexto} ctx
 * @param {Regra[]} [regras]
 * @returns {Adaptacao[]}
 */
export function rodarRegras(ctx, regras = REGRAS) {
  /** @type {Adaptacao[]} */
  const adaptacoes = [];
  for (const r of regras) {
    let vale = false;
    try {
      vale = !!r.quando(ctx);
    } catch {
      vale = false;
    }
    if (!vale) continue;
    try {
      r.aplicar(ctx);
      adaptacoes.push({ regra: r.id, motivo: r.motivo(ctx) });
    } catch {
      // dado inesperado: a regra não entra
    }
  }
  return adaptacoes;
}
