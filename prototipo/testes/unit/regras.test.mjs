// Testes das regras: para cada perfil de cliente, as regras certas disparam (e as erradas não).
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { REGRAS, rodarRegras, confiancaSubtom } from "../../js/regras.js";
import { montarReceita } from "../../js/receita.js";
import { buscarCor, PALETAS } from "../../js/catalogo.js";
import { medidasFalsas, PELES } from "./medidas-falsas.mjs";

const disparadas = (r) => r.adaptacoes.map((a) => a.regra);
const temRegra = (r, id) => assert.ok(disparadas(r).includes(id), `esperava ${id} em ${disparadas(r).join(", ")}`);
const semRegra = (r, id) => assert.ok(!disparadas(r).includes(id), `não esperava ${id}`);
const itemDe = (r, cat) => r.itens.find((i) => i.categoria === cat);
const hexDe = (cat, ...ids) => ids.map((id) => buscarCor(cat, id).hex);
const receita = (medidasOpc, escolhas = {}) =>
  montarReceita({ makeId: "soft-glam", momento: "festa", papel: "convidada", horario: "dia", ...escolhas }, medidasFalsas(medidasOpc));

describe("estrutura das regras", () => {
  test("toda regra é declarativa: id único, descrição, quando/aplicar/motivo", () => {
    const ids = new Set();
    for (const r of REGRAS) {
      assert.match(r.id, /^[A-Z0-9-]+$/, r.id);
      assert.ok(!ids.has(r.id), `id repetido ${r.id}`);
      ids.add(r.id);
      assert.ok(typeof r.descricao === "string" && r.descricao.length > 10, r.id);
      for (const f of ["quando", "aplicar", "motivo"]) assert.equal(typeof r[f], "function", `${r.id}.${f}`);
    }
    assert.ok(REGRAS.length >= 30, `só ${REGRAS.length} regras`);
  });

  test("rodarRegras não derruba a receita com regra quebrada", () => {
    const quebrada = [
      { id: "X", descricao: "quebra no quando", quando: () => { throw new Error("x"); }, aplicar: () => {}, motivo: () => "" },
      { id: "Y", descricao: "quebra no aplicar", quando: () => true, aplicar: () => { throw new Error("y"); }, motivo: () => "" },
      { id: "Z", descricao: "funciona", quando: () => true, aplicar: () => {}, motivo: () => "ok" },
    ];
    assert.deepEqual(rodarRegras(/** @type {any} */ ({}), /** @type {any} */ (quebrada)), [{ regra: "Z", motivo: "ok" }]);
  });

  test("nenhuma descrição ou motivo usa a palavra proibida", () => {
    assert.ok(!/look/i.test(REGRAS.map((r) => r.descricao).join(" ")));
  });
});

describe("perfis de cliente → regras", () => {
  test("pele clara fria, olhos azuis", () => {
    const r = receita({ pele: PELES.claraFria, olhos: "azul" });
    for (const id of ["SUBTOM-FRIO", "OLHO-AZUL", "PELE-CLARA-PIGMENTO-DOSADO"]) temRegra(r, id);
    for (const id of ["SUBTOM-QUENTE", "PELE-PROFUNDA-PIGMENTO", "OLHO-CASTANHO"]) semRegra(r, id);
    // sombra realça o azul com tons alaranjados
    assert.ok(hexDe("sombra", "cobre", "terracota", "pessego", "bronze").includes(itemDe(r, "sombra").cor));
    assert.ok(["rosa-petala", "rosa-queimado", "malva-rosado", "ameixa-suave"].map((id) => buscarCor("blush", id).nome).includes(itemDe(r, "blush").nomeCor));
    assert.ok(["Perolado", "Champanhe", "Rosé Dourado"].includes(itemDe(r, "iluminador").nomeCor));
    assert.equal(itemDe(r, "base").nomeCor, "Bege claro rosado");
  });

  test("pele média quente, olhos castanhos", () => {
    const r = receita({ pele: PELES.mediaQuente, olhos: "castanho" });
    for (const id of ["SUBTOM-QUENTE", "OLHO-CASTANHO"]) temRegra(r, id);
    for (const id of ["SUBTOM-FRIO", "PELE-CLARA-PIGMENTO-DOSADO", "PELE-PROFUNDA-PIGMENTO"]) semRegra(r, id);
    assert.ok(hexDe("sombra", "cobre", "bronze", "vinho", "dourado").includes(itemDe(r, "sombra").cor));
    assert.ok(["Dourado", "Champanhe", "Bronze Dourado"].includes(itemDe(r, "iluminador").nomeCor));
    assert.equal(itemDe(r, "base").nomeCor, "Bege médio dourado");
    assert.equal(itemDe(r, "base").cor, PELES.mediaQuente, "a base usa a cor medida, sem clarear");
  });

  test("pele escura neutra, olhos pretos: mais pigmento e nada acinzentado", () => {
    const r = receita({ pele: PELES.escuraNeutra, olhos: "preto" });
    for (const id of ["SUBTOM-NEUTRO", "PELE-PROFUNDA-PIGMENTO", "OLHO-PRETO"]) temRegra(r, id);
    semRegra(r, "PELE-CLARA-PIGMENTO-DOSADO");
    assert.ok(hexDe("sombra", "dourado", "bronze", "vinho", "cobre").includes(itemDe(r, "sombra").cor));
    const cinzas = hexDe("sombra", "cinza-fume", "prateado", "taupe");
    for (const h of itemDe(r, "sombra").cores) assert.ok(!cinzas.includes(h), "sombra acinzentada em pele escura");
    assert.ok(["Dourado", "Bronze Dourado"].includes(itemDe(r, "iluminador").nomeCor));
    assert.notEqual(itemDe(r, "contorno").nomeCor, "Taupe Frio");
    // mesma make em pele clara tem menos pigmento
    const clara = receita({ pele: PELES.claraFria, olhos: "preto" });
    assert.ok(itemDe(r, "sombra").intensidade > itemDe(clara, "sombra").intensidade);
    assert.ok(itemDe(r, "blush").intensidade > itemDe(clara, "blush").intensidade);
  });

  test("olheira arroxeada: pêssego na pele clara, laranja na média, terracota na escura", () => {
    const olheira = { presente: true, tipo: "arroxeada", intensidade: 0.6 };
    const casos = [
      [PELES.claraFria, "OLHEIRA-PESSEGO", "pessego"],
      [PELES.mediaQuente, "OLHEIRA-LARANJA", "laranja"],
      [PELES.escuraNeutra, "OLHEIRA-TERRACOTA", "terracota"],
    ];
    for (const [pele, regra, corretor] of casos) {
      const r = receita({ pele, olheira });
      temRegra(r, regra);
      const corretivos = r.itens.filter((i) => i.categoria === "corretivo");
      assert.equal(corretivos[0].cor, buscarCor("corretivo", corretor).hex, regra);
      assert.ok(corretivos.length >= 2, "corretor de cor + corretivo no tom da pele");
      for (const outra of casos.filter((c) => c[1] !== regra)) semRegra(r, outra[1]);
    }
    const azulada = receita({ pele: PELES.claraFria, olheira: { presente: true, tipo: "azulada", intensidade: 0.4 } });
    temRegra(azulada, "OLHEIRA-PESSEGO");
    const marrom = receita({ pele: PELES.escuraNeutra, olheira: { presente: true, tipo: "marrom", intensidade: 0.4 } });
    temRegra(marrom, "OLHEIRA-MARROM");
    semRegra(receita({ olheira: { presente: false, tipo: "arroxeada", intensidade: 0.6 } }), "OLHEIRA-LARANJA");
  });

  test("vermelhidão: corretor verde leve", () => {
    const r = receita({ vermelhidao: { presente: true, intensidade: 0.5 } });
    temRegra(r, "VERMELHIDAO-VERDE");
    const verde = r.itens.find((i) => i.categoria === "corretivo" && i.cor === buscarCor("corretivo", "verde").hex);
    assert.ok(verde && verde.intensidade <= 50);
  });

  test("evento corporativo: no máximo média, sem glitter, mesmo à noite e pedindo mais intenso", () => {
    const r = receita({}, { makeId: "olho-marcante", momento: "ensaio-evento", papel: "evento-corporativo", horario: "noite", variacao: "Mais intenso" });
    temRegra(r, "EVENTO-CORPORATIVO");
    assert.equal(r.nivel, "media");
    for (const i of r.itens) assert.notEqual(i.acabamento, "glitter");
    assert.notEqual(itemDe(r, "batom").nomeCor, "Pink Festa");
    // se a cliente pedir glitter mesmo assim, ela é atendida e a Thalita alinha pessoalmente
    const pediu = receita({}, { makeId: "soft-glam", momento: "ensaio-evento", papel: "evento-corporativo", pedido: "sombra com glitter" });
    assert.equal(itemDe(pediu, "sombra").acabamento, "glitter");
    assert.ok(pediu.confirmarPessoalmente.includes("A cliente pediu glitter num evento corporativo: alinhar com ela"));
    const livre = receita({}, { makeId: "olho-marcante", momento: "ensaio-evento", papel: "evento-social", horario: "noite" });
    semRegra(livre, "EVENTO-CORPORATIVO");
    assert.equal(livre.nivel, "alta");
  });

  test("noite sobe um nível", () => {
    const dia = receita({}, { makeId: "natural", horario: "dia" });
    const noite = receita({}, { makeId: "natural", horario: "noite" });
    semRegra(dia, "HORARIO-NOITE");
    temRegra(noite, "HORARIO-NOITE");
    assert.equal(dia.nivel, "leve");
    assert.equal(noite.nivel, "media");
    assert.ok(itemDe(noite, "sombra").intensidade > itemDe(dia, "sombra").intensidade);
  });

  test("casamento de dia: luminosa e à prova d'água", () => {
    const r = receita({}, { momento: "casamento", papel: "convidada", horario: "dia" });
    temRegra(r, "CASAMENTO-DIA");
    temRegra(r, "EMOCAO-PROVA-DAGUA");
    assert.equal(itemDe(r, "base").acabamento, "acetinado");
    assert.match(itemDe(r, "mascara").produto, /prova d'água/);
    semRegra(receita({}, { momento: "casamento", papel: "convidada", horario: "noite" }), "CASAMENTO-DIA");
  });

  test("noiva: teste de make; ensaio fotográfico: pele matte; debutante: pele fresca", () => {
    const noiva = receita({}, { momento: "casamento", papel: "noiva" });
    temRegra(noiva, "NOIVA-TESTE");
    assert.ok(noiva.confirmarPessoalmente.some((t) => /teste de make/i.test(t)));
    const ensaio = receita({}, { momento: "ensaio-evento", papel: "ensaio-fotografico" });
    temRegra(ensaio, "ENSAIO-CAMERA");
    assert.equal(itemDe(ensaio, "base").acabamento, "matte");
    temRegra(receita({}, { momento: "15-anos", papel: "debutante" }), "DEBUTANTE-PELE-FRESCA");
  });

  test("foto com flash: evitar flashback (confirmar pessoalmente)", () => {
    const r = receita({}, { momento: "formatura", papel: "formanda" });
    temRegra(r, "FLASH-SEM-FLASHBACK");
    assert.ok(r.confirmarPessoalmente.some((t) => /sílica/.test(t) && /FPS/.test(t)));
    semRegra(receita({}, { momento: "ensaio-evento", papel: "evento-social" }), "FLASH-SEM-FLASHBACK");
  });

  test("olho encapuzado: esfumado acima da dobra e delineado fino", () => {
    const r = receita({ formatoOlhos: { possivelEncapuzado: true } }, { makeId: "glam" });
    temRegra(r, "OLHO-ENCAPUZADO");
    assert.equal(itemDe(r, "delineado").estilo, "fino");
    assert.equal(itemDe(r, "sombra").estilo, "esfumado");
    assert.match(itemDe(r, "sombra").forma, /acima da dobra/);
    assert.ok(r.confirmarPessoalmente.some((t) => /dobra/.test(t)));
    const natural = receita({ formatoOlhos: { possivelEncapuzado: true } }, { makeId: "natural" });
    assert.equal(itemDe(natural, "sombra").estilo, "esfumado");
    assert.equal(itemDe(natural, "delineado"), undefined, "make sem delineado continua sem");
  });

  test("olho caído puxa para cima; olhos juntos e separados mexem nos cantos", () => {
    const caido = receita({ formatoOlhos: { inclinacao: "para baixo" } });
    temRegra(caido, "OLHO-CAIDO");
    assert.equal(itemDe(caido, "sombra").estilo, "asa");
    assert.equal(itemDe(caido, "delineado").estilo, "gatinho");
    const juntos = receita({ formatoOlhos: { distancia: "juntos" } });
    temRegra(juntos, "OLHOS-JUNTOS");
    assert.match(itemDe(juntos, "sombra").forma, /canto interno/);
    const separados = receita({ formatoOlhos: { distancia: "separados" } });
    temRegra(separados, "OLHOS-SEPARADOS");
    semRegra(separados, "OLHOS-JUNTOS");
  });

  test("formato do rosto define o contorno (só com confiança)", () => {
    const r = receita({ rosto: { formato: "redondo", confianca: 0.8 } });
    temRegra(r, "ROSTO-REDONDO");
    assert.match(itemDe(r, "contorno").zona, /diagonal/);
    for (const f of ["quadrado", "coracao", "diamante", "alongado", "oval"]) temRegra(receita({ rosto: { formato: f, confianca: 0.8 } }), `ROSTO-${f.toUpperCase()}`);
    const incerto = receita({ rosto: { formato: "redondo", confianca: 0.2 } });
    semRegra(incerto, "ROSTO-REDONDO");
    assert.ok(incerto.confirmarPessoalmente.some((t) => /formato do rosto/.test(t)));
  });

  test("boca fina e assimétrica: técnica de lápis", () => {
    const fina = receita({ formatoBoca: { volume: "fina", equilibrio: "superior menor" } }, { makeId: "boca-marcante" });
    temRegra(fina, "BOCA-FINA");
    temRegra(fina, "BOCA-SUPERIOR-MENOR");
    assert.notEqual(itemDe(fina, "batom").acabamento, "matte");
    assert.match(itemDe(fina, "batom").forma, /arco do cupido/);
    temRegra(receita({ formatoBoca: { equilibrio: "superior maior" } }), "BOCA-SUPERIOR-MAIOR");
    temRegra(receita({ labios: { pigmentacao: "marcada" } }), "LABIOS-PIGMENTADOS");
  });

  test("contraste pessoal baixo deixa a make mais suave; alto aceita preto", () => {
    // olhos verdes → ameixa, cuja parceira escura é o preto esfumado
    const preto = buscarCor("sombra", "preto-esfumado").hex;
    const base = receita({ contraste: "medio", olhos: "verde" }, { makeId: "olho-marcante" });
    const baixo = receita({ contraste: "baixo", olhos: "verde" }, { makeId: "olho-marcante" });
    temRegra(baixo, "CONTRASTE-BAIXO");
    assert.ok(itemDe(base, "sombra").cores.includes(preto), "sem contraste baixo o canto externo vai ao preto");
    assert.ok(itemDe(baixo, "sombra").intensidade < itemDe(base, "sombra").intensidade);
    assert.ok(!itemDe(baixo, "sombra").cores.includes(preto));
    const alto = receita({ contraste: "alto" }, { makeId: "soft-glam" });
    temRegra(alto, "CONTRASTE-ALTO");
    assert.equal(itemDe(alto, "delineado").nomeCor, "Preto Intenso");
  });

  test("olhos verdes/mel pedem ameixa e vinho; boca marcante não mexe nos olhos", () => {
    for (const f of ["verde", "mel"]) {
      const r = receita({ olhos: f });
      temRegra(r, `OLHO-${f.toUpperCase()}`);
      assert.ok(hexDe("sombra", "ameixa", "vinho", "bronze", "cobre", "dourado").includes(itemDe(r, "sombra").cor));
    }
    semRegra(receita({ olhos: "verde" }, { makeId: "boca-marcante" }), "OLHO-VERDE");
  });

  test("sobrancelha no tom medido", () => {
    const r = receita({ sobrancelhas: PALETAS.sobrancelha[0].hex });
    temRegra(r, "SOBRANCELHA-TOM");
    assert.equal(itemDe(r, "sobrancelha").cor, PALETAS.sobrancelha[0].hex);
  });
});

describe("confiança do subtom", () => {
  test("alta com boa foto; baixa sem referência de branco ou com pele incerta", () => {
    assert.ok(confiancaSubtom(medidasFalsas({ pele: PELES.mediaQuente })) >= 0.7);
    assert.ok(confiancaSubtom(medidasFalsas({ pele: PELES.mediaQuente, confiancaPele: 0.5 })) < 0.7);
    assert.ok(confiancaSubtom(medidasFalsas({ pele: PELES.mediaQuente, fonteBB: "nenhuma", confiancaPele: 0.8 })) < 0.7);
    assert.equal(confiancaSubtom({ pele: { subtom: { confianca: 0.42 } } }), 0.42);
    assert.equal(confiancaSubtom(undefined), 0);
  });

  test("abaixo de 0,7 pede para testar a base no maxilar", () => {
    const incerta = receita({ pele: PELES.mediaQuente, confiancaPele: 0.5 });
    temRegra(incerta, "SUBTOM-INCERTO");
    assert.ok(incerta.confirmarPessoalmente.some((t) => /testar a base no maxilar em luz natural/i.test(t)));
    const certa = receita({ pele: PELES.mediaQuente });
    semRegra(certa, "SUBTOM-INCERTO");
    assert.ok(!certa.confirmarPessoalmente.some((t) => /maxilar/i.test(t)));
  });
});
