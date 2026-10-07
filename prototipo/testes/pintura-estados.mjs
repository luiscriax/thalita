// Estados de make usados no teste visual da pintura (scripts/render-pintura.mjs).
export const ESTADOS = {
  "batom-vermelho-matte": { batom: { cor: "#A3162B", intensidade: 0.9, acabamento: "matte" } },
  "batom-nude-gloss": { batom: { cor: "#C4877A", intensidade: 0.85, acabamento: "gloss" } },
  "sombra-esfumada-gatinho": {
    sombra: { cor: "#8A5A3C", cores: ["#C9A27E", "#8A5A3C", "#4A2C20"], estilo: "esfumado", intensidade: 0.85, acabamento: "matte" },
    delineado: { cor: "#1A1210", estilo: "gatinho", intensidade: 0.95 },
  },
  "soft-glam": {
    base: { cor: "#E2BFA6", intensidade: 0.5 },
    corretivo: { cor: "#EFD3BC", intensidade: 0.5 },
    contorno: { cor: "#8C6A55", intensidade: 0.5 },
    blush: { cor: "#D98C86", intensidade: 0.55 },
    iluminador: { cor: "#F5DFC4", intensidade: 0.55, acabamento: "cintilante" },
    sombra: { cor: "#B98B6E", cores: ["#E6C7A8", "#B98B6E", "#7A5040"], estilo: "palpebra", intensidade: 0.65, acabamento: "cintilante" },
    delineado: { cor: "#2B1A15", estilo: "fino", intensidade: 0.75 },
    mascara: { cor: "#141010", intensidade: 0.8 },
    sobrancelha: { cor: "#5E4234", intensidade: 0.5 },
    batom: { cor: "#C27378", intensidade: 0.7, acabamento: "acetinado" },
  },
  "glam-noite-glitter": {
    base: { cor: "#E0BCA2", intensidade: 0.6 },
    corretivo: { cor: "#EFD3BC", intensidade: 0.55 },
    contorno: { cor: "#7E5C48", intensidade: 0.7 },
    blush: { cor: "#B9655F", intensidade: 0.55 },
    iluminador: { cor: "#F7E2C2", intensidade: 0.75, acabamento: "cintilante" },
    sombra: { cor: "#7A4A2E", cores: ["#D9B07A", "#7A4A2E", "#2E1A14"], estilo: "asa", intensidade: 0.9, acabamento: "glitter" },
    delineado: { cor: "#0E0A09", estilo: "marcado", intensidade: 1 },
    mascara: { cor: "#050404", intensidade: 1 },
    sobrancelha: { cor: "#4A3228", intensidade: 0.7 },
    batom: { cor: "#7A1C2C", intensidade: 0.9, acabamento: "matte" },
  },
  "batom-glitter": { batom: { cor: "#B0303F", intensidade: 0.85, acabamento: "glitter" } },
  "intensidade-zero": {
    base: { cor: "#E2BFA6", intensidade: 0 }, blush: { cor: "#D98C86", intensidade: 0 },
    sombra: { cor: "#7A4A2E", intensidade: 0, estilo: "asa" }, delineado: { cor: "#000000", intensidade: 0, estilo: "gatinho" },
    mascara: { cor: "#000000", intensidade: 0 }, batom: { cor: "#A3162B", intensidade: 0 },
  },
};
