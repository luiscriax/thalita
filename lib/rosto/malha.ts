// Malha do rosto: os mesmos traços do efeito de escaneamento, agora a partir dos pontos detectados no aparelho
// (MediaPipe Face Landmarker, 478 pontos). Nada sai do celular nessa etapa.

type Ponto = { x: number; y: number };

/** Índice do ponto do MediaPipe para cada traço da malha (lado esquerdo = esquerda da imagem). */
export const INDICES_MALHA = {
  testa: 10, temporaE: 54, temporaD: 284,
  sobrE: 105, sobrD: 334,
  olhoEf: 33, olhoEi: 133, olhoDi: 362, olhoDf: 263,
  ponte: 168, nariz: 1, narizE: 98, narizD: 327,
  macaE: 50, macaD: 280,
  bocaE: 61, bocaC: 0, bocaD: 291, bocaB: 17,
  mandE: 172, mandD: 397, queixoE: 149, queixo: 152, queixoD: 378,
} as const;

export type NomePonto = keyof typeof INDICES_MALHA;

/** Ligações que desenham a malha (constelação dos traços do rosto). */
export const LINHAS_MALHA: [NomePonto, NomePonto][] = [
  ["testa", "temporaE"], ["testa", "temporaD"], ["testa", "sobrE"], ["testa", "sobrD"], ["testa", "ponte"],
  ["temporaE", "sobrE"], ["temporaD", "sobrD"], ["temporaE", "olhoEf"], ["temporaD", "olhoDf"],
  ["sobrE", "olhoEf"], ["sobrE", "olhoEi"], ["sobrD", "olhoDi"], ["sobrD", "olhoDf"], ["sobrE", "ponte"], ["sobrD", "ponte"],
  ["olhoEi", "ponte"], ["olhoDi", "ponte"], ["ponte", "nariz"], ["olhoEi", "narizE"], ["olhoDi", "narizD"],
  ["narizE", "nariz"], ["narizD", "nariz"], ["olhoEf", "macaE"], ["olhoDf", "macaD"], ["macaE", "narizE"], ["macaD", "narizD"],
  ["macaE", "mandE"], ["macaD", "mandD"], ["macaE", "bocaE"], ["macaD", "bocaD"], ["narizE", "bocaE"], ["narizD", "bocaD"],
  ["nariz", "bocaC"], ["bocaE", "bocaC"], ["bocaC", "bocaD"], ["bocaE", "bocaB"], ["bocaD", "bocaB"],
  ["mandE", "queixoE"], ["mandD", "queixoD"], ["bocaE", "queixoE"], ["bocaD", "queixoD"], ["bocaB", "queixo"],
  ["queixoE", "queixo"], ["queixoD", "queixo"], ["temporaE", "mandE"], ["temporaD", "mandD"],
];

/** Pontos da malha em pixels do quadro (largura × altura). */
export function pontosDaMalha(landmarks: Ponto[], largura: number, altura: number): Record<NomePonto, [number, number]> {
  return Object.fromEntries(
    (Object.entries(INDICES_MALHA) as [NomePonto, number][]).map(([nome, i]) => [nome, [landmarks[i].x * largura, landmarks[i].y * altura]]),
  ) as Record<NomePonto, [number, number]>;
}

export type Enquadramento = "sem_rosto" | "varios" | "longe" | "perto" | "descentralizado" | "ok";

/** Diz se o rosto está bom para a foto (coordenadas normalizadas 0–1). */
export function avaliarEnquadramento(rostos: Ponto[][]): Enquadramento {
  if (rostos.length === 0) return "sem_rosto";
  if (rostos.length > 1) return "varios";
  const xs = rostos[0].map((p) => p.x);
  const ys = rostos[0].map((p) => p.y);
  const [x1, x2, y1, y2] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const altura = y2 - y1;
  if (altura < 0.35) return "longe";
  if (altura > 0.9 || x2 - x1 > 0.9) return "perto";
  const cx = (x1 + x2) / 2;
  const cy = (y1 + y2) / 2;
  if (Math.abs(cx - 0.5) > 0.15 || Math.abs(cy - 0.5) > 0.2) return "descentralizado";
  return "ok";
}

export type Luz = "escura" | "estourada" | "ok";

/** Brilho médio da imagem (0–255) → se a luz está boa para a simulação. */
export function avaliarLuz(brilhoMedio: number): Luz {
  if (brilhoMedio < 70) return "escura";
  if (brilhoMedio > 215) return "estourada";
  return "ok";
}
