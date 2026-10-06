import { describe, expect, it } from "vitest";
import { avaliarEnquadramento, avaliarLuz, INDICES_MALHA, pontosDaMalha } from "./malha";

/** Rosto falso: 478 pontos espalhados num retângulo (centro cx,cy; largura w; altura h, em fração do quadro). */
function rosto(cx = 0.5, cy = 0.5, w = 0.45, h = 0.6) {
  return Array.from({ length: 478 }, (_, i) => ({ x: cx - w / 2 + ((i * 37) % 100) / 100 * w, y: cy - h / 2 + ((i * 53) % 100) / 100 * h }));
}

describe("pontosDaMalha", () => {
  it("converte os pontos normalizados para pixels, um por traço da malha", () => {
    const lm = rosto();
    const p = pontosDaMalha(lm, 1000, 2000);
    expect(Object.keys(p)).toEqual(Object.keys(INDICES_MALHA));
    const i = INDICES_MALHA.nariz;
    expect(p.nariz).toEqual([lm[i].x * 1000, lm[i].y * 2000]);
  });
});

describe("avaliarEnquadramento", () => {
  it("sem rosto", () => expect(avaliarEnquadramento([])).toBe("sem_rosto"));
  it("mais de um rosto", () => expect(avaliarEnquadramento([rosto(0.3), rosto(0.7)])).toBe("varios"));
  it("rosto pequeno: chegar mais perto", () => expect(avaliarEnquadramento([rosto(0.5, 0.5, 0.18, 0.25)])).toBe("longe"));
  it("rosto enorme: afastar", () => expect(avaliarEnquadramento([rosto(0.5, 0.5, 0.95, 0.98)])).toBe("perto"));
  it("rosto no canto: centralizar", () => expect(avaliarEnquadramento([rosto(0.25, 0.5)])).toBe("descentralizado"));
  it("rosto bem enquadrado", () => expect(avaliarEnquadramento([rosto()])).toBe("ok"));
});

describe("avaliarLuz (brilho médio 0–255)", () => {
  it("escura", () => expect(avaliarLuz(45)).toBe("escura"));
  it("estourada", () => expect(avaliarLuz(235)).toBe("estourada"));
  it("boa", () => expect(avaliarLuz(130)).toBe("ok"));
});
