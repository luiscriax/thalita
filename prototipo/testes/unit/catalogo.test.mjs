// Testes do catálogo: momentos e papéis do app real, makes, paletas, acabamentos e makes prontas.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  MOMENTOS, PAPEIS, MAKES, PALETAS, ACABAMENTOS, MAKES_PRONTAS, CORES_POR_FAMILIA,
  aceitaAcabamento, buscarCor, buscarPapel, corMaisProxima, prontaComPele,
} from "../../js/catalogo.js";
import { medidasFalsas } from "./medidas-falsas.mjs";

const HEX = /^#[0-9A-F]{6}$/;
const CATEGORIAS = ["base", "corretivo", "contorno", "blush", "iluminador", "sombra", "delineado", "mascara", "sobrancelha", "batom"];

describe("momentos e papéis", () => {
  test("momentos são exatamente os do app real, com frase e clima", () => {
    assert.deepEqual(
      MOMENTOS.map((m) => [m.id, m.nome]),
      [["casamento", "Casamento"], ["15-anos", "15 anos"], ["formatura", "Formatura"], ["festa", "Festa"], ["ensaio-evento", "Ensaio ou evento"]],
    );
    for (const m of MOMENTOS) {
      assert.ok(m.frase.length > 10, m.id);
      assert.ok(["dia", "noite"].includes(m.clima.horarioPadrao), m.id);
      assert.equal(typeof m.clima.luz, "string");
      assert.equal(typeof m.clima.flash, "boolean");
      assert.ok(m.clima.duracaoHoras > 0);
    }
  });

  test("cada momento tem os papéis pedidos", () => {
    const ids = (m) => PAPEIS[m].map((p) => p.id);
    assert.deepEqual(ids("casamento"), ["noiva", "madrinha", "mae-dos-noivos", "convidada"]);
    assert.deepEqual(ids("15-anos"), ["debutante", "mae-da-debutante", "madrinha", "convidada"]);
    assert.deepEqual(ids("formatura"), ["formanda", "convidada"]);
    assert.deepEqual(ids("festa"), ["aniversariante", "convidada"]);
    assert.deepEqual(ids("ensaio-evento"), ["ensaio-fotografico", "evento-corporativo", "evento-social"]);
    assert.equal(buscarPapel("casamento", "mae-dos-noivos").nome, "Mãe da noiva ou do noivo");
    assert.equal(buscarPapel("formatura", "convidada").nome, "Convidada ou família");
    assert.equal(buscarPapel("ensaio-evento", "evento-corporativo").nivelMaximo, "media");
    for (const m of MOMENTOS) for (const p of PAPEIS[m.id]) assert.ok(p.nome && p.descricao.length > 10, `${m.id}/${p.id}`);
  });
});

describe("makes", () => {
  test("as cinco makes, com nível e foco válidos", () => {
    assert.deepEqual(
      MAKES.map((m) => [m.id, m.nome]),
      [["natural", "Natural iluminada"], ["soft-glam", "Soft glam"], ["glam", "Glam"], ["olho-marcante", "Olho marcante"], ["boca-marcante", "Boca marcante"]],
    );
    for (const m of MAKES) {
      assert.ok(["leve", "media", "alta"].includes(m.nivel), m.id);
      assert.ok(["equilibrado", "olhos", "boca"].includes(m.foco), m.id);
      assert.ok(m.descricao.length > 10);
      assert.ok(aceitaAcabamento("sombra", m.config.sombraAcabamento), m.id);
      assert.ok(aceitaAcabamento("batom", m.config.batomAcabamento), m.id);
      assert.ok(aceitaAcabamento("base", m.config.baseAcabamento), m.id);
    }
    assert.equal(MAKES.find((m) => m.id === "olho-marcante").foco, "olhos");
    assert.equal(MAKES.find((m) => m.id === "boca-marcante").foco, "boca");
  });
});

describe("paletas", () => {
  test("todas as categorias têm cores com hex válido, id único e nome", () => {
    for (const cat of CATEGORIAS) {
      const lista = PALETAS[cat];
      assert.ok(Array.isArray(lista) && lista.length >= 2, cat);
      const ids = new Set();
      for (const c of lista) {
        assert.match(c.hex, HEX, `${cat}/${c.id}`);
        assert.ok(!ids.has(c.id), `id repetido ${cat}/${c.id}`);
        ids.add(c.id);
        assert.ok(c.nome && c.nome[0] === c.nome[0].toUpperCase(), `${cat}/${c.id}`);
        if (c.acabamentoPadrao) assert.ok(aceitaAcabamento(cat, c.acabamentoPadrao), `${cat}/${c.id} ${c.acabamentoPadrao}`);
        if (c.profunda) assert.ok(buscarCor("sombra", c.profunda), `parceira ${c.profunda}`);
      }
    }
  });

  test("tem os nomes da marca pedidos", () => {
    const nomes = (cat) => PALETAS[cat].map((c) => c.nome);
    for (const n of ["Nude Canela", "Rosa Chá", "Rosa Bebê", "Malva", "Vermelho Paixão", "Vinho Noite", "Coral Verão", "Terracota", "Pêssego", "Ameixa", "Marrom Café", "Pink Festa"]) {
      assert.ok(nomes("batom").includes(n), n);
    }
    for (const n of ["Champanhe", "Bronze", "Cobre", "Chocolate", "Vinho", "Ameixa", "Dourado", "Rosé", "Verde Oliva", "Azul Petróleo", "Preto Esfumado", "Terracota"]) {
      assert.ok(nomes("sombra").includes(n), n);
    }
  });

  test("famílias de pedido apontam para cores que existem", () => {
    for (const [cat, fams] of Object.entries(CORES_POR_FAMILIA)) {
      for (const [fam, ids] of Object.entries(fams)) {
        assert.ok(ids.length > 0, `${cat}/${fam}`);
        for (const id of ids) assert.ok(buscarCor(cat, id), `${cat}/${fam}/${id}`);
      }
    }
  });

  test("corMaisProxima nomeia uma cor livre e tolera lixo", () => {
    assert.equal(corMaisProxima("batom", "#A8142F").cor.id, "vermelho-paixao");
    assert.equal(corMaisProxima("batom", "não é cor"), null);
    assert.equal(corMaisProxima("inexistente", "#FFFFFF"), null);
  });
});

describe("acabamentos", () => {
  test("os cinco acabamentos com rótulo em português e categorias válidas", () => {
    assert.deepEqual(ACABAMENTOS.map((a) => a.id), ["matte", "acetinado", "cintilante", "gloss", "glitter"]);
    assert.deepEqual(ACABAMENTOS.map((a) => a.nome), ["Matte", "Acetinado", "Cintilante", "Gloss", "Glitter"]);
    for (const a of ACABAMENTOS) for (const c of a.categorias) assert.ok(CATEGORIAS.includes(c));
    assert.ok(aceitaAcabamento("batom", "gloss"));
    assert.ok(!aceitaAcabamento("base", "glitter"));
    assert.ok(!aceitaAcabamento("iluminador", "matte"));
    assert.ok(!aceitaAcabamento("batom", "inventado"));
  });
});

describe("makes prontas (Modo Ao Vivo)", () => {
  test("6 presets com EstadoMake completo e válido", () => {
    assert.deepEqual(MAKES_PRONTAS.map((p) => p.nome), ["Natural Dia", "Madrinha Soft Glam", "Formatura Noite", "Boca Vermelha Clássica", "Esfumado Marrom", "Debutante Rosé"]);
    for (const p of MAKES_PRONTAS) {
      assert.ok(MAKES.some((m) => m.id === p.makeId), p.id);
      assert.deepEqual(Object.keys(p.estado).sort(), [...CATEGORIAS].sort(), p.id);
      for (const [cat, c] of Object.entries(p.estado)) {
        if (c === null) continue;
        assert.match(c.cor, HEX, `${p.id}/${cat}`);
        assert.ok(c.intensidade >= 0 && c.intensidade <= 1, `${p.id}/${cat}`);
        if (c.acabamento) assert.ok(aceitaAcabamento(cat, c.acabamento), `${p.id}/${cat}/${c.acabamento}`);
      }
      const s = p.estado.sombra;
      assert.equal(s.cores.length, 3);
      for (const h of s.cores) assert.match(h, HEX);
      assert.ok(["palpebra", "esfumado", "asa"].includes(s.estilo), p.id);
      if (p.estado.delineado) assert.ok(["fino", "gatinho", "marcado"].includes(p.estado.delineado.estilo), p.id);
      assert.equal(p.estado.base, null, "a base vem da pele medida");
    }
  });

  test("prontaComPele usa a pele medida na base (sem clarear) e não altera o preset", () => {
    const m = medidasFalsas({ pele: "#C08A5C" });
    const e = prontaComPele("madrinha-soft-glam", m);
    assert.equal(e.base.cor, "#C08A5C");
    assert.match(e.corretivo.cor, HEX);
    assert.equal(MAKES_PRONTAS.find((p) => p.id === "madrinha-soft-glam").estado.base, null);
    assert.equal(prontaComPele("natural-dia", null).base, null);
    assert.equal(prontaComPele("nao-existe", m), null);
  });
});

test("nenhum texto do catálogo usa a palavra proibida", () => {
  const tudo = JSON.stringify({ MOMENTOS, PAPEIS, MAKES, PALETAS, ACABAMENTOS, MAKES_PRONTAS, CORES_POR_FAMILIA });
  assert.ok(!/look/i.test(tudo));
});
