// Medidas falsas (formato de tipos.js) para testar o cérebro da make sem foto.
// Não é arquivo de teste: só monta perfis de cliente para os testes de regras e receita.
import { hexParaLab, subtom, profundidade, ita, faixaIta, tomMonk } from "../../js/cor.js";

/**
 * @param {{pele?:string, olhos?:string, subtomForcado?:string, confiancaPele?:number, fonteBB?:string,
 *          olheira?:object, vermelhidao?:object, rosto?:object, formatoOlhos?:object, formatoBoca?:object,
 *          contraste?:string, labios?:object, sobrancelhas?:string, aprovada?:boolean}} [o]
 * @returns {import("../../js/tipos.js").Medidas}
 */
export function medidasFalsas(o = {}) {
  const peleHex = o.pele ?? "#C99A72";
  const lab = hexParaLab(peleHex);
  const st = subtom(lab);
  if (o.subtomForcado) st.subtom = /** @type {any} */ (o.subtomForcado);
  const cor = (hex, confianca = 0.8) => ({ hex, lab: hexParaLab(hex), confianca });
  return {
    qualidade: { aprovada: o.aprovada ?? true, checagens: [] },
    balancoDeBranco: { ganho: { r: 1, g: 1, b: 1 }, fonte: /** @type {any} */ (o.fonteBB ?? "branco-do-olho"), confianca: 0.9 },
    pele: {
      ...cor(peleHex, o.confiancaPele ?? 0.9),
      ita: ita(lab),
      faixaIta: faixaIta(ita(lab)),
      monk: tomMonk(lab),
      profundidade: profundidade(lab.L),
      subtom: st,
    },
    olhos: { ...cor("#5A3A22"), familia: /** @type {any} */ (o.olhos ?? "castanho") },
    labios: { ...cor("#B5655E"), pigmentacao: "media", ...(o.labios || {}) },
    sobrancelhas: cor(o.sobrancelhas ?? "#4A3426", 0.7),
    olheira: { presente: false, tipo: "nenhuma", intensidade: 0, ...(o.olheira || {}) },
    vermelhidao: { presente: false, intensidade: 0, ...(o.vermelhidao || {}) },
    rosto: { formato: "oval", proporcoes: {}, confianca: 0.7, ...(o.rosto || {}) },
    formatoOlhos: { inclinacao: "reta", distancia: "equilibrados", possivelEncapuzado: false, proporcoes: {}, ...(o.formatoOlhos || {}) },
    formatoBoca: { volume: "media", equilibrio: "equilibrada", proporcoes: {}, ...(o.formatoBoca || {}) },
    contrastePessoal: { contraste: /** @type {any} */ (o.contraste ?? "medio"), valor: 40 },
  };
}

/** Peles de referência (hex de pele real corrigida). */
export const PELES = {
  claraFria: "#F0D3C9", // clara, subtom frio
  mediaQuente: "#C08A5C", // média, subtom quente
  mediaClaraQuente: "#C99A72",
  escuraNeutra: "#6B4532", // escura, subtom neutro
  retinta: "#4A2E22",
};
