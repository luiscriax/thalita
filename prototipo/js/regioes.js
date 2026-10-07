// Mapa das regiões do rosto nos 478 pontos do MediaPipe Face Landmarker.
// "direito/esquerdo" é o lado DA PESSOA (o olho direito dela aparece à esquerda numa foto sem espelho).
// Fonte dos índices: canonical face model do MediaPipe (Apache 2.0).

export const OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];

export const LABIOS_EXTERNO = [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146];
export const LABIOS_INTERNO = [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95];

export const OLHO_DIREITO = {
  contorno: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
  palpebraSuperior: [33, 246, 161, 160, 159, 158, 157, 173, 133], // de fora para dentro
  palpebraInferior: [33, 7, 163, 144, 145, 153, 154, 155, 133],
  cantoExterno: 33,
  cantoInterno: 133,
  topo: 159,
  base: 145,
  irisCentro: 468,
  iris: [469, 470, 471, 472],
  sobOlho: [111, 117, 118, 119, 120, 121], // região da olheira
};

export const OLHO_ESQUERDO = {
  contorno: [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466],
  palpebraSuperior: [263, 466, 388, 387, 386, 385, 384, 398, 362],
  palpebraInferior: [263, 249, 390, 373, 374, 380, 381, 382, 362],
  cantoExterno: 263,
  cantoInterno: 362,
  topo: 386,
  base: 374,
  irisCentro: 473,
  iris: [474, 475, 476, 477],
  sobOlho: [340, 346, 347, 348, 349, 350],
};

export const SOBRANCELHA_DIREITA = {
  superior: [70, 63, 105, 66, 107], // de fora para dentro
  inferior: [46, 53, 52, 65, 55],
  pico: 105,
};
export const SOBRANCELHA_ESQUERDA = {
  superior: [300, 293, 334, 296, 336],
  inferior: [276, 283, 282, 295, 285],
  pico: 334,
};

export const PONTOS = {
  testaTopo: 10,
  testaCentro: 151,
  entreSobrancelhas: 9,
  ponteNariz: 6,
  dorsoNariz: [6, 197, 195, 5],
  pontaNariz: 1,
  queixo: 152,
  arcoDoCupido: 0,
  bocaCantoDireito: 61,
  bocaCantoEsquerdo: 291,
  labioSuperiorTopo: 0,
  labioSuperiorBase: 13,
  labioInferiorTopo: 14,
  labioInferiorBase: 17,
  rostoLarguraDireita: 234,
  rostoLarguraEsquerda: 454,
  mandibulaDireita: 172,
  mandibulaEsquerda: 397,
  testaLarguraDireita: 54,
  testaLarguraEsquerda: 284,
  macaDireita: 50, // centro da maçã do rosto
  macaEsquerda: 280,
  zigomaticoDireito: 116, // topo do osso da bochecha
  zigomaticoEsquerdo: 345,
  temporaDireita: 127,
  temporaEsquerda: 356,
  orelhaDireita: 93,
  orelhaEsquerda: 323,
};

/** Converte pontos normalizados (0–1) do MediaPipe em pixels. */
export function emPixels(pontos, largura, altura) {
  return pontos.map((p) => ({ x: p.x * largura, y: p.y * altura, z: (p.z ?? 0) * largura }));
}

export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const meio = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
export const interp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
