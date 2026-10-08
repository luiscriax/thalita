// Testes do "copiar make de uma foto" (referencia.js).
// As fotos de referência são fotos reais pintadas com makes CONHECIDAS pelo nosso pintor
// (scripts/pintar-fixtures.mjs): a resposta certa é o próprio estado usado para pintar.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { lerMakeDaFoto, diferencaCor } from "../../js/referencia.js";
import { criarAmostrador } from "../../js/medidas.js";

const FIX = new URL("../fixtures/", import.meta.url).pathname;
const TEM = existsSync(`${FIX}maquiadas/rosto-frontal__glam.json`) && existsSync(`${FIX}raw/rosto-frontal.rgb`);
const PULAR = TEM ? false : "fixtures ausentes: rode `npm run fixtures`";
const amostrador = (dados, l, a) => criarAmostrador({ dados, largura: l, altura: a, canais: 3 });
const limpa = (n) => {
  const dim = JSON.parse(readFileSync(`${FIX}raw/${n}.json`, "utf8"));
  return lerMakeDaFoto(JSON.parse(readFileSync(`${FIX}pontos/${n}.json`, "utf8")), amostrador(new Uint8Array(readFileSync(`${FIX}raw/${n}.rgb`)), dim.largura, dim.altura));
};
const maquiada = (n) => {
  const j = JSON.parse(readFileSync(`${FIX}maquiadas/${n}.json`, "utf8"));
  return { pintado: j.estado, lido: lerMakeDaFoto(j.deteccao, amostrador(new Uint8Array(readFileSync(`${FIX}maquiadas/${n}.rgb`)), j.largura, j.altura)) };
};
const FOTOS = ["rosto-frontal", "portrait", "rosto-luz-quente"];

describe("copiar make de uma foto", { skip: PULAR }, () => {
  test("rosto sem make: não inventa sombra, blush, iluminador, delineado nem contorno", () => {
    for (const n of ["rosto-frontal", "portrait", "business-person", "rosto-luz-fria", "rosto-luz-quente", "portrait_small", "portrait_rotated", "rosto-escuro"]) {
      const r = limpa(n);
      assert.equal(r.ok, true, n);
      for (const k of ["sombra", "blush", "iluminador", "delineado", "contorno"]) assert.equal(r.estado[k], undefined, `${n}: ${k}`);
      assert.ok(r.leituras.some((l) => l.categoria === "base" && !l.presente), "base nunca é copiada");
    }
  });

  test("boca vermelha: lê o batom com a cor certa e nada mais", () => {
    for (const f of FOTOS) {
      const { pintado, lido } = maquiada(`${f}__boca-vermelha`);
      const dE = diferencaCor(lido.estado.batom.cor, pintado.batom.cor);
      assert.ok(dE < 8, `${f}: batom ΔE ${dE.toFixed(1)}`);
      for (const k of ["sombra", "blush", "iluminador", "delineado"]) assert.equal(lido.estado[k], undefined, `${f}: ${k}`);
    }
  });

  test("glam: acha sombra colorida, blush, iluminador e batom", () => {
    for (const f of FOTOS) {
      const { pintado, lido } = maquiada(`${f}__glam`);
      for (const k of ["sombra", "blush", "iluminador", "batom"]) assert.ok(lido.estado[k], `${f}: faltou ${k}`);
      assert.equal(lido.estado.sombra.cores.length, 3);
      assert.ok(diferencaCor(lido.estado.batom.cor, pintado.batom.cor) < 9, `${f}: batom`);
      // a sombra lida tem a mesma família (roxa): matiz parecido, mesmo que o tom exato varie
      const roxo = (h) => { const n = parseInt(h.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return b > g && r > g; };
      assert.ok(roxo(lido.estado.sombra.cor), `${f}: sombra ${lido.estado.sombra.cor} não é roxa`);
    }
  });

  test("olho marcado: acha o gatinho, a máscara e o blush; avisa que sombra marrom não separa", () => {
    for (const f of FOTOS) {
      const { lido } = maquiada(`${f}__olho-esfumado`);
      assert.equal(lido.estado.delineado?.estilo, "gatinho", f);
      assert.ok(lido.estado.mascara, f);
      assert.ok(lido.estado.blush, `${f}: blush`);
      const sombra = lido.leituras.find((l) => l.categoria === "sombra");
      assert.ok(!sombra.presente && /marrom/.test(sombra.detalhe), "explica a limitação da sombra marrom");
    }
  });

  test("sem rosto ou entrada estranha: recusa com explicação", () => {
    for (const d of [null, { pontos: [] }, { pontos: new Array(478).fill({ x: 0.5, y: 0.5 }) }]) {
      const r = lerMakeDaFoto(/** @type {any} */ (d), d ? amostrador(new Uint8Array(30), 0, 0) : null);
      assert.equal(r.ok, false);
      assert.ok(r.avisos.length > 0);
    }
  });
});
