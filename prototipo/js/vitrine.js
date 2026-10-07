// Vitrine do protótipo: variações de estilo (como as do app real: "Soft Glam champanhe", "Soft Glam rosado"),
// preços por papel (os do app real) e medidas de demonstração para ilustrar antes da foto da cliente.
// No produto, as variações vêm da biblioteca de estilos (referencias/estilos.json) e os preços do Studio.

/** Ajustes = EstadoMake parcial aplicado por cima da receita (intensidade 0–1). */
export const VARIACOES = [
  { id: "natural-iluminada", makeId: "natural", nome: "Natural iluminada", descricao: "Pele fresca, rímel e boca de cor natural.",
    ajustes: { batom: { cor: "#C98A82", intensidade: 0.35, acabamento: "acetinado" }, iluminador: { cor: "#F1D9B5", intensidade: 0.45, acabamento: "cintilante" } } },
  { id: "natural-pessego", makeId: "natural", nome: "Natural pêssego", descricao: "Blush pêssego e brilho suave para o dia.",
    ajustes: { blush: { cor: "#E8957A", intensidade: 0.45 }, batom: { cor: "#D98C7A", intensidade: 0.4, acabamento: "gloss" } } },
  { id: "soft-glam-champanhe", makeId: "soft-glam", nome: "Soft Glam champanhe", descricao: "Esfumado quente e gatinho delicado.",
    ajustes: { sombra: { cor: "#9C6B3E", cores: ["#D8C3A5", "#9C6B3E", "#5C3A2A"], estilo: "esfumado", intensidade: 0.6, acabamento: "acetinado" }, delineado: { cor: "#2A1C18", estilo: "gatinho", intensidade: 0.7 } } },
  { id: "soft-glam-rosado", makeId: "soft-glam", nome: "Soft Glam rosado", descricao: "Romântico e iluminado.",
    ajustes: { sombra: { cor: "#C9918B", cores: ["#EBD3C8", "#C9918B", "#8E5A5E"], estilo: "esfumado", intensidade: 0.55, acabamento: "cintilante" }, blush: { cor: "#E58A9B", intensidade: 0.5 }, batom: { cor: "#C67F86", intensidade: 0.6, acabamento: "acetinado" } } },
  { id: "glam-bronze", makeId: "glam", nome: "Glam bronze", descricao: "Esfumado marcado e pele luminosa.",
    ajustes: { sombra: { cor: "#8A5A35", cores: ["#C9A24D", "#8A5A35", "#3E2A22"], estilo: "asa", intensidade: 0.8, acabamento: "cintilante" }, delineado: { cor: "#141012", estilo: "gatinho", intensidade: 0.85 } } },
  { id: "glam-noite", makeId: "glam", nome: "Glam noite", descricao: "Esfumado escuro com ponto de brilho.",
    ajustes: { sombra: { cor: "#4A3030", cores: ["#C9A24D", "#6E3A3A", "#2A2426"], estilo: "asa", intensidade: 0.85, acabamento: "glitter" }, batom: { cor: "#9E5A5A", intensidade: 0.65, acabamento: "acetinado" } } },
  { id: "esfumado-marrom", makeId: "olho-marcante", nome: "Esfumado marrom", descricao: "Olho profundo e boca neutra.",
    ajustes: { sombra: { cor: "#5C3A2A", cores: ["#B08A6A", "#6E4A34", "#2E1E18"], estilo: "esfumado", intensidade: 0.9, acabamento: "matte" }, batom: { cor: "#B07A6E", intensidade: 0.45, acabamento: "acetinado" } } },
  { id: "delineado-grafico", makeId: "olho-marcante", nome: "Delineado marcado", descricao: "Gatinho preciso e pele limpa.",
    ajustes: { delineado: { cor: "#141012", estilo: "marcado", intensidade: 1 }, sombra: { cor: "#B89A82", cores: ["#E3CFC0", "#B89A82", "#7A5E4E"], estilo: "palpebra", intensidade: 0.35 } } },
  { id: "vermelho-classico", makeId: "boca-marcante", nome: "Vermelho clássico", descricao: "Boca vermelha e olho leve.",
    ajustes: { batom: { cor: "#B3202E", intensidade: 0.9, acabamento: "matte" }, sombra: { cor: "#C8A68A", cores: ["#E8D6C6", "#C8A68A", "#8E6E58"], estilo: "palpebra", intensidade: 0.3 } } },
  { id: "vinho-noite", makeId: "boca-marcante", nome: "Vinho noite", descricao: "Boca vinho e pele aveludada.",
    ajustes: { batom: { cor: "#5E1A2A", intensidade: 0.85, acabamento: "matte" } } },
];

/** Preços "a partir de" por papel, como no app real (Noiva R$ 690, Noiva no civil R$ 380, Madrinha e Mãe dos noivos R$ 220). */
export const PRECOS = {
  noiva: 690, "noiva-civil": 380, madrinha: 220, "mae-noivos": 220, "mae-noiva": 220, "mae-noivo": 220, convidada: 180,
  debutante: 450, "mae-debutante": 220, formanda: 250, aniversariante: 220, "ensaio-fotografico": 280, "evento-corporativo": 200, "evento-social": 200,
  padrao: 200,
};

/** Medidas de demonstração (pele média de subtom neutro, olhos castanhos), só para ilustrar antes da foto. */
export const MEDIDAS_PADRAO = {
  qualidade: { aprovada: true, checagens: [] },
  balancoDeBranco: { ganho: { r: 1, g: 1, b: 1 }, fonte: "nenhuma", confianca: 0 },
  pele: {
    hex: "#C2916E", lab: { L: 64.5, a: 13.5, b: 24.5 }, confianca: 0.5,
    ita: 30.6, faixaIta: "média clara", monk: { n: 5, hex: "#D7BD96", distancia: 9 }, profundidade: "média",
    subtom: { subtom: "neutro", h: 61, explicacao: "equilíbrio entre rosado e dourado" },
  },
  olhos: { hex: "#5A3A28", lab: { L: 28, a: 9, b: 14 }, confianca: 0.5, familia: "castanho" },
  labios: { hex: "#B9776F", lab: { L: 55, a: 24, b: 15 }, confianca: 0.5, pigmentacao: "media" },
  sobrancelhas: { hex: "#4A3426", lab: { L: 24, a: 6, b: 10 }, confianca: 0.5 },
  olheira: { presente: false, tipo: "nenhuma", intensidade: 0 },
  vermelhidao: { presente: false, intensidade: 0 },
  rosto: { formato: "oval", proporcoes: {}, confianca: 0.5 },
  formatoOlhos: { inclinacao: "reta", distancia: "equilibrados", possivelEncapuzado: false, proporcoes: {} },
  formatoBoca: { volume: "media", equilibrio: "equilibrada", proporcoes: {} },
  contrastePessoal: { contraste: "medio", valor: 40 },
};
