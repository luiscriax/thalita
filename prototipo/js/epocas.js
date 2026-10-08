// Makes por época (anos 70 a 2026), no formato que a pintura entende (EstadoMake), com a técnica,
// os termos que a maquiadora usa e as fontes. Servem a três coisas:
//   1) makes prontas no espelho ao vivo ("Anos 80", "Anos 2000"…);
//   2) gabarito da bancada de diversidade: pintamos cada época em rostos de vários tons de pele e
//      formatos, e o "copiar make de uma foto" tem de reconhecer e reproduzir;
//   3) vocabulário para o Beauty Brief e para a instrução da IA.
// As cores são uma interpretação técnica do que as fontes descrevem (não são de uma marca).

/** @typedef {import("./tipos.js").EstadoMake} EstadoMake */

/**
 * @type {{id:string, nome:string, decada:string, resumo:string, tecnicas:string[], termos:string[], estado:EstadoMake, fontes:string[]}[]}
 */
export const MAKES_EPOCAS = [
  {
    id: "anos-70-disco",
    nome: "Anos 70 · Disco",
    decada: "1970",
    resumo: "Pele dourada de sol, sombra cobre e dourada cintilante esfumada com lápis preto, boca com gloss.",
    tecnicas: ["Bronzer em 'três' (testa, maçãs, maxilar)", "Sombra cintilante esfumada para fora", "Lápis preto esfumado na linha dos cílios", "Gloss por cima de batom nude"],
    termos: ["bronzer", "sun-kissed", "esfumado", "cintilante", "kajal", "gloss"],
    estado: {
      contorno: { cor: "#9A6844", intensidade: 0.45 },
      blush: { cor: "#C7764F", intensidade: 0.4 },
      iluminador: { cor: "#E9C88D", intensidade: 0.55, acabamento: "cintilante" },
      sombra: { cor: "#B06A2F", cores: ["#E7C27A", "#B06A2F", "#5B3218"], intensidade: 0.8, acabamento: "cintilante", estilo: "esfumado" },
      delineado: { cor: "#1A1412", intensidade: 0.7, estilo: "fino" },
      mascara: { cor: "#141012", intensidade: 0.8 },
      batom: { cor: "#B9705C", intensidade: 0.6, acabamento: "gloss" },
    },
    fontes: [
      "https://www.charlottetilbury.com/us-es/secrets/historia-del-maquillaje/decada-70",
      "https://www.charlottetilbury.com/es/secrets/tutorial-de-maquillaje-para-ojos-disco-de-los-70",
      "https://www.beautybay.com/edited/history-of-makeup-by-decade/",
    ],
  },
  {
    id: "anos-80-pop",
    nome: "Anos 80 · Pop",
    decada: "1980",
    resumo: "Blush-cartão rosado puxado para a têmpora, sombra azul e roxa vibrante, boca rosa-choque, pele matte.",
    tecnicas: ["Blush em diagonal até a têmpora ('blush-cartão')", "Sombra colorida de cílio a sobrancelha", "Pele matte de alta cobertura", "Boca cheia em rosa-choque ou vermelho"],
    termos: ["blush-cartão", "color block", "neon", "frost", "pele matte"],
    estado: {
      blush: { cor: "#D9467A", intensidade: 0.65 },
      sombra: { cor: "#3D5FB8", cores: ["#B7A2E0", "#3D5FB8", "#4A2A7A"], intensidade: 0.85, acabamento: "cintilante", estilo: "esfumado" },
      delineado: { cor: "#1A1412", intensidade: 0.6, estilo: "fino" },
      mascara: { cor: "#141012", intensidade: 0.85 },
      batom: { cor: "#E0247A", intensidade: 0.9, acabamento: "acetinado" },
    },
    fontes: [
      "https://elle.com.br/?p=70117",
      "https://www.guiadasemana.com.br/compras/noticia/make-anos-80",
      "https://www.belezanaweb.com.br/loucas-por-beleza/maquiagem-anos-80-inspiracoes-e-como-adaptar-as-cores-para-o-visual/",
    ],
  },
  {
    id: "anos-90-supermodelo",
    nome: "Anos 90 · Supermodelo",
    decada: "1990",
    resumo: "Pele com acabamento natural, sombra marrom matte, sobrancelha fina, boca marrom com contorno esfumado.",
    tecnicas: ["Contorno de boca um tom mais escuro, levemente esfumado", "Sombra marrom matte no côncavo", "Bronze leve no rosto todo"],
    termos: ["batom marrom", "lip liner", "matte", "grunge", "nude amarronzado"],
    estado: {
      contorno: { cor: "#8C5E45", intensidade: 0.4 },
      sombra: { cor: "#7A5038", cores: ["#C9A285", "#7A5038", "#4A2E22"], intensidade: 0.6, acabamento: "matte", estilo: "esfumado" },
      mascara: { cor: "#141012", intensidade: 0.6 },
      sobrancelha: { cor: "#4A3426", intensidade: 0.3 },
      batom: { cor: "#7E4436", intensidade: 0.85, acabamento: "matte" },
    },
    fontes: [
      "https://www.em.com.br/feminino-e-masculino/2026/07/7467338-90s-supermodel-makeup-como-recriar-o-visual-das-supermodelos-em-casa.html",
      "https://www.opovo.com.br/agencia/edicase/2026/07/28/dia-do-batom-marrom-ganha-novas-versoes-e-reforca-sua-forca-na-maquiagem.html",
      "https://www.beautybay.com/edited/history-of-makeup-by-decade/",
    ],
  },
  {
    id: "anos-2000-gloss",
    nome: "Anos 2000 · Gloss",
    decada: "2000",
    resumo: "Sombra prateada e azul-turquesa iridescente, delineado preto marcado, gloss transparente rosado.",
    tecnicas: ["Sombra iridescente (frost) em toda a pálpebra", "Lápis preto na linha d'água", "Cílios volumosos", "Gloss espelhado no centro da boca"],
    termos: ["frost", "iridescente", "lip gloss", "kajal", "glitter"],
    estado: {
      sombra: { cor: "#8FB8C9", cores: ["#E3EEF2", "#8FB8C9", "#3F6C80"], intensidade: 0.75, acabamento: "cintilante", estilo: "palpebra" },
      delineado: { cor: "#141012", intensidade: 0.85, estilo: "marcado" },
      mascara: { cor: "#141012", intensidade: 0.9 },
      iluminador: { cor: "#F2E6E0", intensidade: 0.5, acabamento: "cintilante" },
      batom: { cor: "#D99AA0", intensidade: 0.6, acabamento: "gloss" },
    },
    fontes: [
      "https://www.charlottetilbury.com/us-es/secrets/historia-del-maquillaje/00s",
      "https://es.lorealparisusa.com/revista-de-belleza/maquillaje/tendencias-maquillaje/makeup-the-year-you-were-born",
      "https://www.womanandhome.com/us/beauty/makeup/iconic-makeup-looks/",
    ],
  },
  {
    id: "anos-2010-instagram",
    nome: "Anos 2010 · Instagram",
    decada: "2010",
    resumo: "Contorno marcado, iluminador forte, sobrancelha preenchida, batom nude matte (batom líquido) e gatinho.",
    tecnicas: ["Contorno e 'baking' (pó translúcido selando a olheira)", "Sobrancelha desenhada com pomada", "Delineado gatinho", "Batom líquido matte com boca contornada para fora"],
    termos: ["contorno", "baking", "strobing", "Instagram brow", "batom líquido", "overline"],
    estado: {
      contorno: { cor: "#7A5040", intensidade: 0.65 },
      iluminador: { cor: "#F3DDB0", intensidade: 0.75, acabamento: "cintilante" },
      blush: { cor: "#C98270", intensidade: 0.3 },
      sombra: { cor: "#8A5A3C", cores: ["#E6CBA6", "#8A5A3C", "#3E2418"], intensidade: 0.65, acabamento: "matte", estilo: "esfumado" },
      delineado: { cor: "#151213", intensidade: 0.9, estilo: "gatinho" },
      mascara: { cor: "#141012", intensidade: 0.85 },
      sobrancelha: { cor: "#3E2A20", intensidade: 0.6 },
      batom: { cor: "#A8705F", intensidade: 0.85, acabamento: "matte" },
    },
    fontes: [
      "https://www.broadsheet.com.au/national/fashion/article/beauty-trends-of-the-50s-to-today",
      "https://www.beautybay.com/edited/history-of-makeup-by-decade/",
      "https://www.belezanaweb.com.br/loucas-por-beleza/o-batom-marrom-voltou-com-tudo-saiba-como-usar/",
    ],
  },
  {
    id: "anos-2020-clean",
    nome: "Anos 2020 · Clean girl",
    decada: "2020",
    resumo: "Pele com viço, blush cremoso alto nas maçãs, sobrancelha penteada para cima, boca com hidratante colorido.",
    tecnicas: ["Pele leve (skin tint) com brilho natural", "Blush cremoso batido com os dedos, alto nas maçãs", "Sobrancelha com gel transparente", "Lip oil ou gloss nude"],
    termos: ["clean girl", "skin tint", "glazed skin", "lip oil", "blush cremoso", "lifting"],
    estado: {
      blush: { cor: "#E08A84", intensidade: 0.5 },
      iluminador: { cor: "#F1DCC2", intensidade: 0.45, acabamento: "cintilante" },
      mascara: { cor: "#1C1512", intensidade: 0.55 },
      sobrancelha: { cor: "#4A3426", intensidade: 0.25 },
      batom: { cor: "#C27E78", intensidade: 0.55, acabamento: "gloss" },
    },
    fontes: ["https://www.broadsheet.com.au/national/fashion/article/beauty-trends-of-the-50s-to-today", "referencias/07-tendencias-2025-2026 (Pele glaceada, Limpinha)"],
  },
  {
    id: "2026-latte-cereja",
    nome: "2026 · Latte e cereja",
    decada: "2026",
    resumo: "Olho 'latte' em caramelo e chocolate esfumado, blush esculpido, boca cereja-cola com contorno anos 90.",
    tecnicas: ["Sombra latte (caramelo a chocolate) esfumada", "Blush esculpido acima do contorno", "Boca cereja-cola com lápis um tom mais escuro"],
    termos: ["latte makeup", "blush esculpido", "boca cereja-cola", "contorno anos 90", "lifting"],
    estado: {
      contorno: { cor: "#8A5C45", intensidade: 0.4 },
      blush: { cor: "#C76E6A", intensidade: 0.5 },
      sombra: { cor: "#9A6440", cores: ["#D9B48E", "#9A6440", "#4E2E1E"], intensidade: 0.7, acabamento: "acetinado", estilo: "esfumado" },
      delineado: { cor: "#2A1A14", intensidade: 0.7, estilo: "gatinho" },
      mascara: { cor: "#141012", intensidade: 0.8 },
      batom: { cor: "#6E1E2A", intensidade: 0.85, acabamento: "acetinado" },
    },
    fontes: ["referencias/07-tendencias-2025-2026 (Latte morno, Boca cereja-cola, Blush esculpido, Boca contornada anos 90)"],
  },
];
