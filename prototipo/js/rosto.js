// Leitor de rosto: carrega o MediaPipe Face Landmarker (Apache 2.0) a partir de arquivos
// locais (nada de CDN externo) e devolve uma `Deteccao` (ver tipos.js). Roda 100% no aparelho.
import { FaceLandmarker, FilesetResolver } from "../vendor/mediapipe/vision_bundle.mjs";

let detector = null;
let carregando = null;
let modo = "IMAGE";
let delegateUsado = null;

const caminho = (rel) => new URL(rel, import.meta.url).href;

/** Carrega uma vez só (as chamadas seguintes reaproveitam). Tenta GPU e cai para CPU. */
export function carregarDetector() {
  if (detector) return Promise.resolve(detector);
  if (carregando) return carregando;
  carregando = (async () => {
    const fileset = {
      wasmLoaderPath: caminho("../vendor/mediapipe/wasm/vision_wasm_internal.js"),
      wasmBinaryPath: caminho("../vendor/mediapipe/wasm/vision_wasm_internal.wasm"),
    };
    // FilesetResolver só monta esse mesmo objeto; usamos direto para não depender de CDN.
    void FilesetResolver;
    const opcoes = (delegate) => ({
      baseOptions: { modelAssetPath: caminho("../modelos/face_landmarker.task"), delegate },
      runningMode: "IMAGE",
      numFaces: 2,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    try {
      detector = await FaceLandmarker.createFromOptions(fileset, opcoes("GPU"));
      delegateUsado = "GPU";
    } catch {
      detector = await FaceLandmarker.createFromOptions(fileset, opcoes("CPU"));
      delegateUsado = "CPU";
    }
    modo = "IMAGE";
    return detector;
  })();
  carregando.catch(() => {
    carregando = null;
  });
  return carregando;
}

export const infoDetector = () => ({ carregado: !!detector, delegate: delegateUsado });

async function garantirModo(novo) {
  const d = await carregarDetector();
  if (modo !== novo) {
    await d.setOptions({ runningMode: novo });
    modo = novo;
  }
  return d;
}

function converter(r, largura, altura) {
  const pontos = r.faceLandmarks?.[0] ?? [];
  const expressoes = {};
  for (const c of r.faceBlendshapes?.[0]?.categories ?? []) expressoes[c.categoryName] = c.score;
  return {
    pontos,
    rostos: r.faceLandmarks?.length ?? 0,
    expressoes,
    matriz: r.facialTransformationMatrixes?.[0]?.data ? Array.from(r.facialTransformationMatrixes[0].data) : null,
    largura,
    altura,
  };
}

/** Foto parada (img, canvas ou ImageBitmap). @returns {Promise<import("./tipos.js").Deteccao>} */
export async function detectarFoto(imagem) {
  const d = await garantirModo("IMAGE");
  const largura = imagem.naturalWidth || imagem.videoWidth || imagem.width;
  const altura = imagem.naturalHeight || imagem.videoHeight || imagem.height;
  return converter(d.detect(imagem), largura, altura);
}

/** Quadro de vídeo da câmera. `tempo` em ms, sempre crescente. */
export async function detectarQuadro(video, tempo) {
  const d = await garantirModo("VIDEO");
  return converter(d.detectForVideo(video, tempo), video.videoWidth, video.videoHeight);
}
