"use client";

// Detector de pontos do rosto no aparelho (MediaPipe Face Landmarker). Carregado só quando a câmera ou a foto precisam.
import type { FaceLandmarker } from "@mediapipe/tasks-vision";

const WASM = "/mediapipe/wasm";
/** Modelo oficial do Google (float16, ~3,6 MB), baixado pelo aparelho na primeira vez e guardado no cache do navegador. */
const MODELO = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const instancias: Partial<Record<"VIDEO" | "IMAGE", Promise<FaceLandmarker>>> = {};

/** O MediaPipe escreve avisos informativos ("INFO: Created TensorFlow Lite…") como erro; filtramos só esses. */
let filtroInstalado = false;
function filtrarAvisosInformativos() {
  if (filtroInstalado) return;
  filtroInstalado = true;
  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === "string" && args[0].startsWith("INFO:")) return;
    original(...args);
  };
}

async function criar(modo: "VIDEO" | "IMAGE"): Promise<FaceLandmarker> {
  filtrarAvisosInformativos();
  const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const arquivos = await FilesetResolver.forVisionTasks(WASM);
  const opcoes = (delegate: "GPU" | "CPU") => ({
    baseOptions: { modelAssetPath: MODELO, delegate },
    runningMode: modo,
    numFaces: 2, // detectar 2 permite avisar "só você na câmera"
  });
  try {
    return await FaceLandmarker.createFromOptions(arquivos, opcoes("GPU"));
  } catch {
    return FaceLandmarker.createFromOptions(arquivos, opcoes("CPU"));
  }
}

/** Uma instância por modo, reaproveitada entre telas. */
export function detectorDeRosto(modo: "VIDEO" | "IMAGE"): Promise<FaceLandmarker> {
  instancias[modo] ??= criar(modo).catch((e) => {
    delete instancias[modo];
    throw e;
  });
  return instancias[modo]!;
}

/** Brilho médio (0–255) de um quadro, medido numa miniatura 24×24. */
export function brilhoMedio(fonte: HTMLVideoElement | HTMLImageElement, tela: HTMLCanvasElement): number {
  tela.width = 24;
  tela.height = 24;
  const ctx = tela.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 128;
  ctx.drawImage(fonte, 0, 0, 24, 24);
  const d = ctx.getImageData(0, 0, 24, 24).data;
  let soma = 0;
  for (let i = 0; i < d.length; i += 4) soma += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
  return soma / (d.length / 4);
}

/** Começa a baixar o detector antes de precisar dele (≈ 15 MB na primeira vez; depois fica no cache). */
export function preCarregarDetector() {
  void detectorDeRosto("IMAGE").catch(() => {});
}
