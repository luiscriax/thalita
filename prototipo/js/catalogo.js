// Catálogo da Thalita: momentos, papéis, makes, paletas com nomes da marca, acabamentos e
// makes prontas para o Modo Ao Vivo. Só dados e pequenos atalhos de busca, sem DOM.
// Na interface é sempre "make".

import { hexParaLab, deltaE2000, misturar } from "./cor.js";

/** @typedef {import("./tipos.js").Categoria} Categoria */
/** @typedef {import("./tipos.js").Acabamento} Acabamento */
/** @typedef {import("./tipos.js").EstadoMake} EstadoMake */
/** @typedef {import("./tipos.js").Camada} Camada */
/** @typedef {import("./tipos.js").Medidas} Medidas */

/**
 * @typedef {Object} Clima
 * @property {"dia"|"noite"} horarioPadrao   quando não for informado
 * @property {string} luz                    luz típica do lugar
 * @property {boolean} flash                 costuma ter foto com flash
 * @property {number} duracaoHoras           quanto tempo a make precisa aguentar
 * @property {boolean} emocao                momento de choro e abraço (pede prova d'água)
 *
 * @typedef {{id:string, nome:string, frase:string, clima:Clima}} Momento
 */

/** Os momentos do app real ("Cada momento pede uma make"). @type {Momento[]} */
export const MOMENTOS = [
  {
    id: "casamento",
    nome: "Casamento",
    frase: "Do sim à pista: uma make que aguenta emoção, abraço e muita foto.",
    clima: { horarioPadrao: "noite", luz: "luz natural na cerimônia de dia, luz quente e baixa no salão à noite", flash: true, duracaoHoras: 10, emocao: true },
  },
  {
    id: "15-anos",
    nome: "15 anos",
    frase: "Uma noite para brilhar, dançar a valsa e ser fotografada a cada minuto.",
    clima: { horarioPadrao: "noite", luz: "salão com luz baixa, telão e flash", flash: true, duracaoHoras: 7, emocao: true },
  },
  {
    id: "formatura",
    nome: "Formatura",
    frase: "Da colação ao baile: elegante no palco, poderosa na pista.",
    clima: { horarioPadrao: "noite", luz: "palco bem iluminado na colação, luz baixa no baile", flash: true, duracaoHoras: 8, emocao: true },
  },
  {
    id: "festa",
    nome: "Festa",
    frase: "Aniversário, jantar ou balada: a make certa para a sua noite.",
    clima: { horarioPadrao: "noite", luz: "luz baixa e colorida, foto de celular com flash", flash: true, duracaoHoras: 6, emocao: false },
  },
  {
    id: "ensaio-evento",
    nome: "Ensaio ou evento",
    frase: "Câmera, palco ou reunião: make pensada para onde você vai estar.",
    clima: { horarioPadrao: "dia", luz: "luz natural ou de estúdio, com a câmera de perto", flash: false, duracaoHoras: 5, emocao: false },
  },
];

/**
 * @typedef {Object} Papel
 * @property {string} id
 * @property {string} nome
 * @property {string} descricao             frase para a cliente
 * @property {"leve"|"media"|"alta"} [nivelMaximo]
 * @property {boolean} [provaDagua]         pede tudo à prova d'água
 * @property {boolean} [flash]              tem flash mesmo quando o momento não tem
 * @property {boolean} [camera]             make pensada para a câmera
 * @property {boolean} [teste]              teste de make recomendado
 */

/** Papéis por momento. Cada papel tem um cuidado (e, no app, um preço). @type {Record<string, Papel[]>} */
export const PAPEIS = {
  casamento: [
    { id: "noiva", nome: "Noiva", descricao: "A protagonista do dia: make que dura da cerimônia ao fim da festa, resiste à emoção e fica linda em todas as fotos.", provaDagua: true, teste: true },
    { id: "madrinha", nome: "Madrinha", descricao: "Em harmonia com as outras madrinhas e com a cor do vestido.", provaDagua: true },
    { id: "mae-dos-noivos", nome: "Mãe da noiva ou do noivo", descricao: "Elegante e confortável para receber os convidados e se emocionar sem precisar de retoque.", provaDagua: true },
    { id: "convidada", nome: "Convidada", descricao: "Bonita e na medida, para curtir a festa inteira." },
  ],
  "15-anos": [
    { id: "debutante", nome: "Debutante", descricao: "A estrela da noite: make fresca e iluminada, que respeita a pele e brilha na valsa.", provaDagua: true },
    { id: "mae-da-debutante", nome: "Mãe da debutante", descricao: "Elegante para receber os convidados e se emocionar na valsa.", provaDagua: true },
    { id: "madrinha", nome: "Madrinha", descricao: "Combina com a festa e com o vestido, sem roubar a cena da debutante." },
    { id: "convidada", nome: "Convidada", descricao: "Pronta para dançar a noite toda." },
  ],
  formatura: [
    { id: "formanda", nome: "Formanda", descricao: "Impecável no palco da colação e firme até o fim do baile.", provaDagua: true },
    { id: "convidada", nome: "Convidada ou família", descricao: "Elegante para a cerimônia e confortável para a festa." },
  ],
  festa: [
    { id: "aniversariante", nome: "Aniversariante", descricao: "A dona da festa merece destaque do começo ao parabéns." },
    { id: "convidada", nome: "Convidada", descricao: "Bonita do jeito que você gosta, para aproveitar a noite." },
  ],
  "ensaio-evento": [
    { id: "ensaio-fotografico", nome: "Ensaio fotográfico", descricao: "Make que fotografa bem: pele sem brilho excessivo e traços um pouco mais definidos para a câmera.", flash: true, camera: true },
    { id: "evento-corporativo", nome: "Evento corporativo", descricao: "Elegante e discreta, para transmitir confiança em palestra, reunião ou premiação.", nivelMaximo: "media" },
    { id: "evento-social", nome: "Evento social", descricao: "Para jantares, batizados, coquetéis e outros encontros especiais." },
  ],
};

/**
 * Como cada make se monta antes das regras (a receita parte daqui).
 * @typedef {Object} ConfigMake
 * @property {"palpebra"|"esfumado"|"asa"} sombraEstilo
 * @property {"suave"|"destaque"|"neutra"} sombraPapel   suave: luz + transição + toque de cor; destaque: cor no centro; neutra: olhos limpos
 * @property {Acabamento} sombraAcabamento
 * @property {"fino"|"gatinho"|"marcado"|null} delineado
 * @property {"nude"|"rosado"|"marcante"} batom
 * @property {Acabamento} batomAcabamento
 * @property {Acabamento} baseAcabamento
 * @property {boolean} posticos             cílios postiços
 *
 * @typedef {Object} Make
 * @property {string} id
 * @property {string} nome
 * @property {string} descricao
 * @property {"leve"|"media"|"alta"} nivel
 * @property {"equilibrado"|"olhos"|"boca"} foco
 * @property {ConfigMake} config
 */

/** @type {Make[]} */
export const MAKES = [
  {
    id: "natural",
    nome: "Natural iluminada",
    descricao: "Pele leve e luminosa, olhos limpos e boca nude. Você, só que mais descansada.",
    nivel: "leve",
    foco: "equilibrado",
    config: { sombraEstilo: "palpebra", sombraPapel: "suave", sombraAcabamento: "acetinado", delineado: null, batom: "nude", batomAcabamento: "acetinado", baseAcabamento: "acetinado", posticos: false },
  },
  {
    id: "soft-glam",
    nome: "Soft glam",
    descricao: "Esfumado suave, pele iluminada e boca rosada. Arrumada sem pesar.",
    nivel: "media",
    foco: "equilibrado",
    config: { sombraEstilo: "esfumado", sombraPapel: "destaque", sombraAcabamento: "cintilante", delineado: "fino", batom: "rosado", batomAcabamento: "acetinado", baseAcabamento: "acetinado", posticos: false },
  },
  {
    id: "glam",
    nome: "Glam",
    descricao: "Pele impecável, olho esfumado com brilho, delineado gatinho e cílios. Para brilhar a noite toda.",
    nivel: "alta",
    foco: "equilibrado",
    config: { sombraEstilo: "esfumado", sombraPapel: "destaque", sombraAcabamento: "cintilante", delineado: "gatinho", batom: "nude", batomAcabamento: "matte", baseAcabamento: "matte", posticos: true },
  },
  {
    id: "olho-marcante",
    nome: "Olho marcante",
    descricao: "O olhar é o centro: esfumado profundo e delineado marcado, com a boca em nude.",
    nivel: "alta",
    foco: "olhos",
    config: { sombraEstilo: "esfumado", sombraPapel: "destaque", sombraAcabamento: "matte", delineado: "marcado", batom: "nude", batomAcabamento: "acetinado", baseAcabamento: "matte", posticos: true },
  },
  {
    id: "boca-marcante",
    nome: "Boca marcante",
    descricao: "Batom de impacto com olhos limpos e pele bem-feita. Clássica e poderosa.",
    nivel: "media",
    foco: "boca",
    config: { sombraEstilo: "palpebra", sombraPapel: "neutra", sombraAcabamento: "matte", delineado: "fino", batom: "marcante", batomAcabamento: "matte", baseAcabamento: "acetinado", posticos: false },
  },
];

/**
 * Cor de produto. `tags` são famílias em palavras simples, usadas para atender pedidos como
 * "nada de marrom" ou "batom vermelho".
 * @typedef {Object} CorCatalogo
 * @property {string} id
 * @property {string} nome
 * @property {string} hex
 * @property {Acabamento} [acabamentoPadrao]
 * @property {"quente"|"fria"|"neutra"} [temperatura]
 * @property {string[]} [tags]
 * @property {string} [profunda]           (sombra) parceira mais escura para o canto externo
 */

/** Paletas por categoria. Hex aproximados de produtos reais. @type {Record<Categoria, CorCatalogo[]>} */
export const PALETAS = {
  // Referência de tons (Modo Ao Vivo e nomes). Na receita, a base usa a cor MEDIDA da pele.
  base: [
    { id: "porcelana", nome: "Porcelana", hex: "#F3DECB", acabamentoPadrao: "acetinado", temperatura: "neutra", tags: ["clara"] },
    { id: "marfim", nome: "Marfim", hex: "#EBCFB4", acabamentoPadrao: "acetinado", temperatura: "neutra", tags: ["clara"] },
    { id: "bege-claro", nome: "Bege Claro", hex: "#E2BE9C", acabamentoPadrao: "acetinado", temperatura: "quente", tags: ["clara"] },
    { id: "bege-medio", nome: "Bege Médio", hex: "#CFA47F", acabamentoPadrao: "acetinado", temperatura: "quente", tags: ["media"] },
    { id: "mel", nome: "Mel", hex: "#B98559", acabamentoPadrao: "acetinado", temperatura: "quente", tags: ["media"] },
    { id: "caramelo", nome: "Caramelo", hex: "#A06B44", acabamentoPadrao: "acetinado", temperatura: "quente", tags: ["media"] },
    { id: "canela", nome: "Canela", hex: "#855433", acabamentoPadrao: "acetinado", temperatura: "quente", tags: ["escura"] },
    { id: "castanho", nome: "Castanho", hex: "#6B4129", acabamentoPadrao: "acetinado", temperatura: "neutra", tags: ["escura"] },
    { id: "cacau", nome: "Cacau", hex: "#4E2F20", acabamentoPadrao: "acetinado", temperatura: "neutra", tags: ["escura"] },
    { id: "ebano", nome: "Ébano", hex: "#3A231A", acabamentoPadrao: "acetinado", temperatura: "neutra", tags: ["escura"] },
  ],
  // Corretores de cor (neutralizam) — o corretivo no tom da pele é derivado da pele medida.
  corretivo: [
    { id: "verde", nome: "Corretor Verde", hex: "#B9CFA3", acabamentoPadrao: "acetinado", tags: ["verde"] },
    { id: "pessego", nome: "Corretor Pêssego", hex: "#F2B596", acabamentoPadrao: "acetinado", tags: ["pessego"] },
    { id: "laranja", nome: "Corretor Laranja", hex: "#E08A50", acabamentoPadrao: "acetinado", tags: ["laranja"] },
    { id: "terracota", nome: "Corretor Terracota", hex: "#B65E3A", acabamentoPadrao: "acetinado", tags: ["terracota"] },
  ],
  contorno: [
    { id: "taupe-frio", nome: "Taupe Frio", hex: "#A08674", acabamentoPadrao: "matte", temperatura: "fria", tags: ["marrom", "cinza"] },
    { id: "areia-escura", nome: "Areia Escura", hex: "#A9826A", acabamentoPadrao: "matte", temperatura: "neutra", tags: ["marrom"] },
    { id: "caramelo", nome: "Caramelo", hex: "#8D6148", acabamentoPadrao: "matte", temperatura: "quente", tags: ["marrom"] },
    { id: "chocolate", nome: "Chocolate", hex: "#5D3C2D", acabamentoPadrao: "matte", temperatura: "neutra", tags: ["marrom"] },
    { id: "cacau-profundo", nome: "Cacau Profundo", hex: "#3E2920", acabamentoPadrao: "matte", temperatura: "neutra", tags: ["marrom"] },
  ],
  blush: [
    { id: "rosa-petala", nome: "Rosa Pétala", hex: "#E99CA8", acabamentoPadrao: "acetinado", temperatura: "fria", tags: ["rosa"] },
    { id: "rosa-queimado", nome: "Rosa Queimado", hex: "#C47878", acabamentoPadrao: "matte", temperatura: "neutra", tags: ["rosa"] },
    { id: "malva-rosado", nome: "Malva Rosado", hex: "#B3778A", acabamentoPadrao: "matte", temperatura: "fria", tags: ["malva", "rosa"] },
    { id: "pessego-suave", nome: "Pêssego Suave", hex: "#EFA787", acabamentoPadrao: "acetinado", temperatura: "quente", tags: ["pessego"] },
    { id: "coral", nome: "Coral", hex: "#EC7E62", acabamentoPadrao: "acetinado", temperatura: "quente", tags: ["coral", "laranja"] },
    { id: "terracota", nome: "Terracota", hex: "#B25F47", acabamentoPadrao: "matte", temperatura: "quente", tags: ["terracota", "marrom"] },
    { id: "bronze-rosado", nome: "Bronze Rosado", hex: "#9C5A48", acabamentoPadrao: "acetinado", temperatura: "quente", tags: ["bronze", "marrom"] },
    { id: "ameixa-suave", nome: "Ameixa Suave", hex: "#8A4558", acabamentoPadrao: "matte", temperatura: "fria", tags: ["ameixa", "vinho"] },
  ],
  iluminador: [
    { id: "perolado", nome: "Perolado", hex: "#F2E6E6", acabamentoPadrao: "cintilante", temperatura: "fria", tags: ["prata", "perolado"] },
    { id: "champanhe", nome: "Champanhe", hex: "#F0D9BC", acabamentoPadrao: "cintilante", temperatura: "neutra", tags: ["champanhe"] },
    { id: "rose-dourado", nome: "Rosé Dourado", hex: "#EBBFA8", acabamentoPadrao: "cintilante", temperatura: "neutra", tags: ["rosa", "dourado"] },
    { id: "dourado", nome: "Dourado", hex: "#E6C485", acabamentoPadrao: "cintilante", temperatura: "quente", tags: ["dourado"] },
    { id: "bronze-dourado", nome: "Bronze Dourado", hex: "#C4904F", acabamentoPadrao: "cintilante", temperatura: "quente", tags: ["bronze", "dourado"] },
  ],
  sombra: [
    { id: "baunilha", nome: "Baunilha", hex: "#EEDCC4", acabamentoPadrao: "matte", temperatura: "neutra", tags: ["nude", "clara"], profunda: "areia" },
    { id: "champanhe", nome: "Champanhe", hex: "#E6CBA6", acabamentoPadrao: "cintilante", temperatura: "neutra", tags: ["champanhe", "dourado"], profunda: "areia" },
    { id: "rose", nome: "Rosé", hex: "#D9A398", acabamentoPadrao: "cintilante", temperatura: "fria", tags: ["rosa"], profunda: "malva" },
    { id: "dourado", nome: "Dourado", hex: "#C99B45", acabamentoPadrao: "cintilante", temperatura: "quente", tags: ["dourado"], profunda: "bronze" },
    { id: "pessego", nome: "Pêssego", hex: "#E0A27F", acabamentoPadrao: "matte", temperatura: "quente", tags: ["pessego", "laranja"], profunda: "terracota" },
    { id: "areia", nome: "Areia", hex: "#CDA987", acabamentoPadrao: "matte", temperatura: "neutra", tags: ["nude", "marrom"], profunda: "caramelo" },
    { id: "caramelo", nome: "Caramelo", hex: "#A9774E", acabamentoPadrao: "matte", temperatura: "quente", tags: ["marrom"], profunda: "chocolate" },
    { id: "taupe", nome: "Taupe", hex: "#8C786C", acabamentoPadrao: "matte", temperatura: "fria", tags: ["marrom", "cinza"], profunda: "chocolate" },
    { id: "malva", nome: "Malva", hex: "#9A7086", acabamentoPadrao: "matte", temperatura: "fria", tags: ["malva", "rosa", "ameixa"], profunda: "ameixa" },
    { id: "bronze", nome: "Bronze", hex: "#9E6A36", acabamentoPadrao: "cintilante", temperatura: "quente", tags: ["bronze", "marrom"], profunda: "chocolate" },
    { id: "cobre", nome: "Cobre", hex: "#B0602E", acabamentoPadrao: "cintilante", temperatura: "quente", tags: ["cobre", "laranja"], profunda: "chocolate" },
    { id: "terracota", nome: "Terracota", hex: "#A2553A", acabamentoPadrao: "matte", temperatura: "quente", tags: ["terracota", "marrom"], profunda: "chocolate" },
    { id: "chocolate", nome: "Chocolate", hex: "#563424", acabamentoPadrao: "matte", temperatura: "quente", tags: ["marrom"], profunda: "preto-esfumado" },
    { id: "vinho", nome: "Vinho", hex: "#692536", acabamentoPadrao: "matte", temperatura: "fria", tags: ["vinho"], profunda: "ameixa" },
    { id: "ameixa", nome: "Ameixa", hex: "#5A3050", acabamentoPadrao: "matte", temperatura: "fria", tags: ["ameixa", "vinho"], profunda: "preto-esfumado" },
    { id: "verde-oliva", nome: "Verde Oliva", hex: "#66663A", acabamentoPadrao: "cintilante", temperatura: "quente", tags: ["verde"], profunda: "chocolate" },
    { id: "azul-petroleo", nome: "Azul Petróleo", hex: "#1F4D59", acabamentoPadrao: "cintilante", temperatura: "fria", tags: ["azul"], profunda: "preto-esfumado" },
    { id: "prateado", nome: "Prateado", hex: "#B8B6BA", acabamentoPadrao: "cintilante", temperatura: "fria", tags: ["prata", "cinza"], profunda: "cinza-fume" },
    { id: "cinza-fume", nome: "Cinza Fumê", hex: "#66625F", acabamentoPadrao: "matte", temperatura: "fria", tags: ["cinza"], profunda: "preto-esfumado" },
    { id: "preto-esfumado", nome: "Preto Esfumado", hex: "#262120", acabamentoPadrao: "matte", temperatura: "neutra", tags: ["preto"], profunda: "preto-esfumado" },
  ],
  delineado: [
    { id: "preto-intenso", nome: "Preto Intenso", hex: "#151213", acabamentoPadrao: "matte", tags: ["preto"] },
    { id: "marrom-cafe", nome: "Marrom Café", hex: "#3D2A21", acabamentoPadrao: "matte", tags: ["marrom"] },
    { id: "vinho", nome: "Vinho", hex: "#4B1A27", acabamentoPadrao: "matte", tags: ["vinho", "ameixa"] },
    { id: "azul-marinho", nome: "Azul Marinho", hex: "#1C2742", acabamentoPadrao: "matte", tags: ["azul"] },
    { id: "verde-musgo", nome: "Verde Musgo", hex: "#2F3A22", acabamentoPadrao: "matte", tags: ["verde"] },
    { id: "dourado", nome: "Dourado", hex: "#C9A04A", acabamentoPadrao: "glitter", tags: ["dourado"] },
  ],
  mascara: [
    { id: "preta", nome: "Preta", hex: "#121010", acabamentoPadrao: "matte", tags: ["preto"] },
    { id: "marrom", nome: "Marrom", hex: "#3A291F", acabamentoPadrao: "matte", tags: ["marrom"] },
  ],
  sobrancelha: [
    { id: "louro-acinzentado", nome: "Louro Acinzentado", hex: "#9A8569", acabamentoPadrao: "matte", tags: ["louro"] },
    { id: "castanho-claro", nome: "Castanho Claro", hex: "#7B5A43", acabamentoPadrao: "matte", tags: ["marrom"] },
    { id: "castanho-medio", nome: "Castanho Médio", hex: "#5B3F2F", acabamentoPadrao: "matte", tags: ["marrom"] },
    { id: "castanho-escuro", nome: "Castanho Escuro", hex: "#3F2C22", acabamentoPadrao: "matte", tags: ["marrom"] },
    { id: "preto-suave", nome: "Preto Suave", hex: "#2A2321", acabamentoPadrao: "matte", tags: ["preto"] },
  ],
  batom: [
    { id: "nude-petala", nome: "Nude Pétala", hex: "#D29A8E", acabamentoPadrao: "acetinado", temperatura: "fria", tags: ["nude", "rosa"] },
    { id: "nude-canela", nome: "Nude Canela", hex: "#B07359", acabamentoPadrao: "acetinado", temperatura: "quente", tags: ["nude", "marrom"] },
    { id: "nude-caramelo", nome: "Nude Caramelo", hex: "#95593F", acabamentoPadrao: "acetinado", temperatura: "quente", tags: ["nude", "marrom"] },
    { id: "nude-cacau", nome: "Nude Cacau", hex: "#6B3F33", acabamentoPadrao: "acetinado", temperatura: "neutra", tags: ["nude", "marrom"] },
    { id: "rosa-cha", nome: "Rosa Chá", hex: "#C27E80", acabamentoPadrao: "acetinado", temperatura: "neutra", tags: ["rosa", "nude"] },
    { id: "rosa-bebe", nome: "Rosa Bebê", hex: "#E3A1B0", acabamentoPadrao: "gloss", temperatura: "fria", tags: ["rosa"] },
    { id: "malva", nome: "Malva", hex: "#9E5F72", acabamentoPadrao: "acetinado", temperatura: "fria", tags: ["malva", "rosa"] },
    { id: "pessego", nome: "Pêssego", hex: "#E0957A", acabamentoPadrao: "acetinado", temperatura: "quente", tags: ["pessego", "nude"] },
    { id: "coral-verao", nome: "Coral Verão", hex: "#E3624C", acabamentoPadrao: "acetinado", temperatura: "quente", tags: ["coral", "laranja"] },
    { id: "terracota", nome: "Terracota", hex: "#A44A33", acabamentoPadrao: "matte", temperatura: "quente", tags: ["terracota", "marrom"] },
    { id: "vermelho-paixao", nome: "Vermelho Paixão", hex: "#A8142F", acabamentoPadrao: "matte", temperatura: "fria", tags: ["vermelho"] },
    { id: "vermelho-tijolo", nome: "Vermelho Tijolo", hex: "#9E3322", acabamentoPadrao: "matte", temperatura: "quente", tags: ["vermelho", "terracota"] },
    { id: "vinho-noite", nome: "Vinho Noite", hex: "#5E1A2B", acabamentoPadrao: "matte", temperatura: "fria", tags: ["vinho"] },
    { id: "ameixa", nome: "Ameixa", hex: "#5A2442", acabamentoPadrao: "matte", temperatura: "fria", tags: ["ameixa", "vinho"] },
    { id: "marrom-cafe", nome: "Marrom Café", hex: "#6A3E32", acabamentoPadrao: "matte", temperatura: "quente", tags: ["marrom"] },
    { id: "pink-festa", nome: "Pink Festa", hex: "#CF2F78", acabamentoPadrao: "acetinado", temperatura: "fria", tags: ["pink", "rosa"] },
  ],
};

/**
 * Acabamentos e as categorias que aceitam cada um.
 * @type {{id:Acabamento, nome:string, descricao:string, categorias:Categoria[]}[]}
 */
export const ACABAMENTOS = [
  { id: "matte", nome: "Matte", descricao: "Sem brilho, aveludado, dura mais.", categorias: ["base", "corretivo", "contorno", "blush", "sombra", "delineado", "mascara", "sobrancelha", "batom"] },
  { id: "acetinado", nome: "Acetinado", descricao: "Brilho suave de pele saudável.", categorias: ["base", "corretivo", "contorno", "blush", "sombra", "delineado", "batom"] },
  { id: "cintilante", nome: "Cintilante", descricao: "Partículas finas de luz.", categorias: ["blush", "iluminador", "sombra", "delineado", "batom"] },
  { id: "gloss", nome: "Gloss", descricao: "Efeito molhado, espelhado.", categorias: ["sombra", "batom"] },
  { id: "glitter", nome: "Glitter", descricao: "Brilho intenso em flocos.", categorias: ["sombra", "delineado"] },
];

/** A categoria aceita esse acabamento? */
export function aceitaAcabamento(categoria, acabamento) {
  const a = ACABAMENTOS.find((x) => x.id === acabamento);
  return !!a && a.categorias.includes(categoria);
}

/** Atalhos de busca (devolvem undefined se não achar). */
export const buscarMomento = (id) => MOMENTOS.find((m) => m.id === id);
export const buscarPapel = (momentoId, papelId) => (PAPEIS[momentoId] || []).find((p) => p.id === papelId);
export const buscarMake = (id) => MAKES.find((m) => m.id === id);
/** @returns {CorCatalogo|undefined} */
export const buscarCor = (categoria, id) => (PALETAS[categoria] || []).find((c) => c.id === id);

/** Cor da paleta mais próxima de um hex (ΔE2000), para dar nome a uma cor escolhida livremente. */
export function corMaisProxima(categoria, hex) {
  const lista = PALETAS[categoria] || [];
  if (!lista.length || typeof hex !== "string" || !/^#[0-9a-f]{6}$/i.test(hex)) return null;
  const alvo = hexParaLab(hex);
  let melhor = null;
  for (const c of lista) {
    const d = deltaE2000(alvo, hexParaLab(c.hex));
    if (!melhor || d < melhor.distancia) melhor = { cor: c, distancia: d };
  }
  return melhor;
}

/**
 * Cores sugeridas quando a cliente pede uma família ("batom vermelho", "olho dourado").
 * A receita escolhe entre elas a que combina com a pele; o Modo Ao Vivo usa a primeira.
 * @type {Partial<Record<Categoria, Record<string, string[]>>>}
 */
export const CORES_POR_FAMILIA = {
  batom: {
    vermelho: ["vermelho-paixao", "vermelho-tijolo"],
    vinho: ["vinho-noite", "ameixa"],
    rosa: ["rosa-cha", "rosa-bebe", "malva"],
    pink: ["pink-festa"],
    nude: ["nude-canela", "nude-petala", "rosa-cha", "nude-caramelo", "nude-cacau", "pessego"],
    coral: ["coral-verao", "pessego"],
    pessego: ["pessego", "coral-verao"],
    terracota: ["terracota", "vermelho-tijolo"],
    marrom: ["marrom-cafe", "nude-cacau", "nude-caramelo"],
    ameixa: ["ameixa", "vinho-noite"],
    malva: ["malva", "rosa-cha"],
  },
  sombra: {
    dourado: ["dourado", "champanhe"],
    cobre: ["cobre", "terracota"],
    bronze: ["bronze", "caramelo"],
    marrom: ["chocolate", "caramelo", "bronze"],
    preto: ["preto-esfumado", "cinza-fume"],
    verde: ["verde-oliva"],
    azul: ["azul-petroleo"],
    rosa: ["rose", "malva"],
    vinho: ["vinho", "ameixa"],
    ameixa: ["ameixa", "malva", "vinho"],
    champanhe: ["champanhe", "baunilha"],
    terracota: ["terracota", "cobre"],
    pessego: ["pessego", "rose"],
    prata: ["prateado", "cinza-fume"],
    malva: ["malva", "ameixa"],
    nude: ["areia", "baunilha", "caramelo"],
    coral: ["pessego", "cobre"],
    cinza: ["cinza-fume", "taupe"],
  },
  blush: {
    rosa: ["rosa-petala", "rosa-queimado", "malva-rosado"],
    pessego: ["pessego-suave", "coral"],
    coral: ["coral", "pessego-suave"],
    terracota: ["terracota", "bronze-rosado"],
    bronze: ["bronze-rosado", "terracota"],
    ameixa: ["ameixa-suave", "malva-rosado"],
    vinho: ["ameixa-suave"],
    malva: ["malva-rosado", "ameixa-suave"],
    nude: ["rosa-queimado", "pessego-suave"],
  },
  delineado: {
    preto: ["preto-intenso"],
    marrom: ["marrom-cafe"],
    vinho: ["vinho"],
    ameixa: ["vinho"],
    azul: ["azul-marinho"],
    verde: ["verde-musgo"],
    dourado: ["dourado"],
  },
  iluminador: {
    dourado: ["dourado", "bronze-dourado"],
    bronze: ["bronze-dourado"],
    champanhe: ["champanhe"],
    rosa: ["rose-dourado"],
    prata: ["perolado"],
  },
  mascara: { preto: ["preta"], marrom: ["marrom"] },
  sobrancelha: { marrom: ["castanho-medio", "castanho-claro", "castanho-escuro"], preto: ["preto-suave"] },
};

// --- Makes prontas para o Modo Ao Vivo ---------------------------------------------------

/** Monta uma camada a partir da paleta (assim um id errado aparece logo nos testes). */
function cam(categoria, id, intensidade, extra = {}) {
  const c = buscarCor(categoria, id);
  if (!c) throw new Error(`cor inexistente no catálogo: ${categoria}/${id}`);
  return { cor: c.hex, intensidade, acabamento: c.acabamentoPadrao || "matte", ...extra };
}
/** Sombra em degradê [clara, média, escura]; a cor principal é a média. */
function sombra(ids, intensidade, estilo, acabamento) {
  const cores = ids.map((id) => {
    const c = buscarCor("sombra", id);
    if (!c) throw new Error(`cor inexistente no catálogo: sombra/${id}`);
    return c.hex;
  });
  return { cor: cores[1], cores, intensidade, estilo, acabamento };
}

/**
 * Presets do Modo Ao Vivo. Todas as categorias aparecem; `base` e `corretivo` ficam null porque
 * dependem da pele de cada uma — use prontaComPele() para preencher com a pele medida.
 * @type {{id:string, nome:string, descricao:string, makeId:string, estado:EstadoMake}[]}
 */
export const MAKES_PRONTAS = [
  {
    id: "natural-dia",
    nome: "Natural Dia",
    descricao: "Pele leve, sombra clarinha, cílios e boca nude.",
    makeId: "natural",
    estado: {
      base: null,
      corretivo: null,
      contorno: cam("contorno", "areia-escura", 0.2),
      blush: cam("blush", "pessego-suave", 0.3),
      iluminador: cam("iluminador", "champanhe", 0.35),
      sombra: sombra(["champanhe", "areia", "caramelo"], 0.3, "palpebra", "acetinado"),
      delineado: null,
      mascara: cam("mascara", "preta", 0.6),
      sobrancelha: cam("sobrancelha", "castanho-medio", 0.4),
      batom: cam("batom", "nude-canela", 0.45, { acabamento: "acetinado" }),
    },
  },
  {
    id: "madrinha-soft-glam",
    nome: "Madrinha Soft Glam",
    descricao: "Esfumado bronze suave, boca rosada e pele iluminada.",
    makeId: "soft-glam",
    estado: {
      base: null,
      corretivo: null,
      contorno: cam("contorno", "areia-escura", 0.35),
      blush: cam("blush", "rosa-queimado", 0.45),
      iluminador: cam("iluminador", "champanhe", 0.45),
      sombra: sombra(["champanhe", "bronze", "chocolate"], 0.55, "esfumado", "cintilante"),
      delineado: cam("delineado", "preto-intenso", 0.6, { estilo: "fino" }),
      mascara: cam("mascara", "preta", 0.8),
      sobrancelha: cam("sobrancelha", "castanho-medio", 0.55),
      batom: cam("batom", "rosa-cha", 0.6, { acabamento: "acetinado" }),
    },
  },
  {
    id: "formatura-noite",
    nome: "Formatura Noite",
    descricao: "Esfumado dourado e cobre, gatinho e boca nude matte.",
    makeId: "glam",
    estado: {
      base: null,
      corretivo: null,
      contorno: cam("contorno", "caramelo", 0.5),
      blush: cam("blush", "terracota", 0.5),
      iluminador: cam("iluminador", "dourado", 0.6),
      sombra: sombra(["dourado", "cobre", "chocolate"], 0.75, "esfumado", "cintilante"),
      delineado: cam("delineado", "preto-intenso", 0.85, { estilo: "gatinho" }),
      mascara: cam("mascara", "preta", 0.9),
      sobrancelha: cam("sobrancelha", "castanho-medio", 0.65),
      batom: cam("batom", "nude-canela", 0.65, { acabamento: "matte" }),
    },
  },
  {
    id: "boca-vermelha-classica",
    nome: "Boca Vermelha Clássica",
    descricao: "Vermelho matte, gatinho preto e olhos limpos.",
    makeId: "boca-marcante",
    estado: {
      base: null,
      corretivo: null,
      contorno: cam("contorno", "areia-escura", 0.3),
      blush: cam("blush", "rosa-queimado", 0.3),
      iluminador: cam("iluminador", "champanhe", 0.4),
      sombra: sombra(["baunilha", "areia", "taupe"], 0.3, "palpebra", "matte"),
      delineado: cam("delineado", "preto-intenso", 0.75, { estilo: "gatinho" }),
      mascara: cam("mascara", "preta", 0.85),
      sobrancelha: cam("sobrancelha", "castanho-medio", 0.55),
      batom: cam("batom", "vermelho-paixao", 0.9, { acabamento: "matte" }),
    },
  },
  {
    id: "esfumado-marrom",
    nome: "Esfumado Marrom",
    descricao: "Esfumado em tons de marrom, delineado marcado e boca caramelo.",
    makeId: "olho-marcante",
    estado: {
      base: null,
      corretivo: null,
      contorno: cam("contorno", "caramelo", 0.4),
      blush: cam("blush", "terracota", 0.4),
      iluminador: cam("iluminador", "dourado", 0.45),
      sombra: sombra(["areia", "caramelo", "chocolate"], 0.8, "esfumado", "matte"),
      delineado: cam("delineado", "marrom-cafe", 0.8, { estilo: "marcado" }),
      mascara: cam("mascara", "preta", 0.9),
      sobrancelha: cam("sobrancelha", "castanho-medio", 0.6),
      batom: cam("batom", "nude-caramelo", 0.6, { acabamento: "acetinado" }),
    },
  },
  {
    id: "debutante-rose",
    nome: "Debutante Rosé",
    descricao: "Rosé com brilho, blush rosado e gloss: fresca e iluminada.",
    makeId: "soft-glam",
    estado: {
      base: null,
      corretivo: null,
      contorno: cam("contorno", "areia-escura", 0.25),
      blush: cam("blush", "rosa-petala", 0.45),
      iluminador: cam("iluminador", "rose-dourado", 0.55),
      sombra: sombra(["champanhe", "rose", "malva"], 0.55, "esfumado", "glitter"),
      delineado: cam("delineado", "marrom-cafe", 0.55, { estilo: "fino" }),
      mascara: cam("mascara", "preta", 0.8),
      sobrancelha: cam("sobrancelha", "castanho-claro", 0.5),
      batom: cam("batom", "rosa-bebe", 0.55, { acabamento: "gloss" }),
    },
  },
];

/**
 * Make pronta com a base (e um corretivo leve) tirados da pele medida.
 * Sem medidas confiáveis, devolve o preset como está (base e corretivo null).
 * @param {string} id
 * @param {Partial<Medidas>} [medidas]
 * @returns {EstadoMake|null}
 */
export function prontaComPele(id, medidas) {
  const p = MAKES_PRONTAS.find((x) => x.id === id);
  if (!p) return null;
  /** @type {EstadoMake} */
  const estado = JSON.parse(JSON.stringify(p.estado));
  const hex = medidas?.pele?.hex;
  if (typeof hex === "string" && /^#[0-9a-f]{6}$/i.test(hex)) {
    const leve = p.makeId === "natural";
    estado.base = { cor: hex.toUpperCase(), intensidade: leve ? 0.35 : 0.55, acabamento: "acetinado" };
    estado.corretivo = { cor: misturar(hex, "#FFFFFF", 0.08), intensidade: 0.4, acabamento: "acetinado" };
  }
  return estado;
}
