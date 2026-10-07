// Testes do Beauty Brief (brief.js): ficha, face chart, maleta e versão texto.
// Medidas e receita são FALSAS mas completas (construtores locais seguindo tipos.js); os pontos são
// REAIS (fixtures do MediaPipe). Testes com fixtures são pulados se a pasta não existir.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { montarBrief, combinarComMaleta, briefParaTexto, desenharFaceChart, MALETA_EXEMPLO } from "../../js/brief.js";
import { hexParaLab, deltaE2000, ita, faixaIta, tomMonk, profundidade, subtom } from "../../js/cor.js";

const AQUI = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(AQUI, "..", "fixtures", "pontos");
const RESULTADOS = join(AQUI, "..", "resultados");
const temFixtures = existsSync(join(FIXTURES, "rosto-frontal.json"));
const PULAR = "fixtures ausentes: rode `npm run fixtures` (o CI baixa depois)";
const deteccao = (nome) => JSON.parse(readFileSync(join(FIXTURES, `${nome}.json`), "utf8"));

// --- construtores locais (formato de tipos.js) -------------------------------------------------

/** @returns {import("../../js/tipos.js").Medidas} */
function medidasTeste(o = {}) {
  const peleHex = o.pele ?? "#C99A72";
  const lab = hexParaLab(peleHex);
  const cor = (hex, confianca = 0.8) => ({ hex, lab: hexParaLab(hex), confianca });
  return {
    qualidade: { aprovada: true, checagens: [{ id: "luz", estado: "ok", titulo: "Luz boa" }, { id: "foco", estado: "atencao", titulo: "Foto um pouco tremida" }] },
    balancoDeBranco: { ganho: { r: 0.92, g: 1, b: 1.12 }, fonte: "branco-do-olho", confianca: 0.85 },
    pele: { ...cor(peleHex, 0.88), ita: ita(lab), faixaIta: faixaIta(ita(lab)), monk: tomMonk(lab), profundidade: profundidade(lab.L), subtom: subtom(lab) },
    olhos: { ...cor("#5A3A22", 0.75), familia: "castanho" },
    labios: { ...cor("#B5655E", 0.8), pigmentacao: "media" },
    sobrancelhas: cor("#4A3426", 0.7),
    olheira: { presente: true, tipo: "arroxeada", intensidade: 0.35 },
    vermelhidao: { presente: false, intensidade: 0.05 },
    rosto: { formato: "oval", proporcoes: { comprimentoLargura: 1.32 }, confianca: 0.55 },
    formatoOlhos: { inclinacao: "para baixo", distancia: "equilibrados", possivelEncapuzado: true, proporcoes: { confiancaEncapuzado: 0.3 } },
    formatoBoca: { volume: "fina", equilibrio: "superior menor", proporcoes: {} },
    contrastePessoal: { contraste: "medio", valor: 38 },
    ...o.extra,
  };
}

const item = (categoria, cor, nomeCor, extra = {}) => ({
  categoria, cor, nomeCor, produto: `${categoria} de teste`, familiaCor: "teste", acabamento: "acetinado",
  zona: `zona do ${categoria}`, forma: `forma do ${categoria}`, intensidade: 60, ferramenta: `ferramenta do ${categoria}`, ...extra,
});

/** @returns {import("../../js/tipos.js").Receita} */
function receitaTeste(o = {}) {
  return {
    makeId: "soft-glam", nomeMake: "Soft glam", ocasiao: "Casamento (à noite)", papel: "Madrinha", nivel: "alta",
    itens: [
      item("sombra", "#B0602E", "Cobre", { cores: ["#E6CBA6", "#B0602E", "#563424"], estilo: "asa", acabamento: "cintilante", intensidade: 75 }),
      item("delineado", "#151213", "Preto Intenso", { estilo: "gatinho", acabamento: "matte", intensidade: 70 }),
      item("base", "#C99A72", "Bege médio dourado", { intensidade: 75 }),
      item("corretivo", "#F2B596", "Corretor Pêssego", { produto: "Corretor de cor cremoso", intensidade: 40 }),
      item("corretivo", "#CEA27D", "Meio tom mais claro que a pele"),
      item("contorno", "#8D6148", "Caramelo", { acabamento: "matte", intensidade: 50 }),
      item("blush", "#EC7E62", "Coral", { intensidade: 55 }),
      item("iluminador", "#E6C485", "Dourado", { acabamento: "cintilante" }),
      item("mascara", "#121010", "Preta", { acabamento: "matte", intensidade: 90 }),
      item("sobrancelha", "#3F2C22", "Castanho Escuro", { acabamento: "matte" }),
      item("batom", "#C27E80", "Rosa Chá", { intensidade: 70 }),
    ],
    adaptacoes: [
      { regra: "HORARIO-NOITE", motivo: "À noite a make sobe um nível para não sumir nas fotos." },
      { regra: "OLHO-CAIDO", motivo: "Olho com o canto externo para baixo: esfumado e delineado levantados." },
    ],
    confirmarPessoalmente: ["Alergias ou sensibilidade a algum produto", "Traje e cor do vestido"],
    duracaoEFixacao: ["Pensada para durar cerca de 10 horas.", "Spray fixador no final.", "Tempo de execução: cerca de 80 minutos."],
    confianca: 0.8,
    ...o,
  };
}

const SECOES = ["Leitura do rosto", "Pele", "Olhos", "Sobrancelhas", "Boca", "Paleta", "Ordem de execução", "O que foi adaptado", "Confirmar pessoalmente", "Duração e fixação"];

/** Checagem estrutural do SVG: tags balanceadas, viewBox, title/desc, ids únicos e referências válidas. */
function conferirSvg(svg) {
  assert.match(svg, /^<svg [^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  const vb = svg.match(/viewBox="([^"]+)"/);
  assert.ok(vb, "tem viewBox");
  const nums = vb[1].split(/\s+/).map(Number);
  assert.equal(nums.length, 4);
  assert.ok(nums.every(Number.isFinite) && nums[2] > 0 && nums[3] > 0, "viewBox válido");
  assert.match(svg, /<title id="[^"]+">[^<]+<\/title>/);
  assert.match(svg, /<desc id="[^"]+">[^<]+<\/desc>/);
  assert.match(svg, /role="img"/);
  assert.doesNotMatch(svg, /NaN|undefined|Infinity|null/);
  // tags balanceadas
  const pilha = [];
  for (const m of svg.matchAll(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>/g)) {
    const [, fecha, nome, , auto] = m;
    if (auto) continue;
    if (fecha) assert.equal(pilha.pop(), nome, `fecha </${nome}> na ordem`);
    else pilha.push(nome);
  }
  assert.equal(pilha.length, 0, "todas as tags fechadas");
  // atributos numéricos finitos
  for (const m of svg.matchAll(/\s(?:x|y|x1|y1|x2|y2|cx|cy|r|rx|ry|width|height|stroke-width|fill-opacity|stroke-opacity|stdDeviation)="([^"]*)"/g)) {
    assert.ok(Number.isFinite(Number(m[1])), `atributo numérico: ${m[0]}`);
  }
  for (const m of svg.matchAll(/\sd="([^"]*)"/g)) assert.doesNotMatch(m[1], /[^MLCQZ0-9.\s-]/, "path só com comandos e números");
  const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(new Set(ids).size, ids.length, "ids únicos");
  for (const m of svg.matchAll(/url\(#([^)]+)\)/g)) assert.ok(ids.includes(m[1]), `referência #${m[1]} existe`);
  return nums;
}

// --- testes -----------------------------------------------------------------------------------------

test("MALETA_EXEMPLO: 30–40 produtos fictícios, válidos e variados", () => {
  assert.ok(MALETA_EXEMPLO.length >= 30 && MALETA_EXEMPLO.length <= 40, `tamanho ${MALETA_EXEMPLO.length}`);
  const ids = new Set();
  for (const p of MALETA_EXEMPLO) {
    assert.match(p.cor, /^#[0-9A-F]{6}$/i);
    assert.match(p.marca, /^Marca [A-Z]$/, "só marcas genéricas");
    assert.ok(!ids.has(p.id)); ids.add(p.id);
    assert.ok(["base", "corretivo", "contorno", "blush", "iluminador", "sombra", "delineado", "mascara", "sobrancelha", "batom"].includes(p.categoria));
  }
  for (const c of ["base", "corretivo", "contorno", "blush", "iluminador", "sombra", "delineado", "sobrancelha", "batom"]) {
    assert.ok(MALETA_EXEMPLO.some((p) => p.categoria === c), `tem ${c}`);
  }
  const bases = MALETA_EXEMPLO.filter((p) => p.categoria === "base").map((p) => hexParaLab(p.cor).L);
  assert.ok(Math.max(...bases) > 85 && Math.min(...bases) < 30, "bases de muito claras a retintas");
  for (const cor of ["pêssego", "laranja", "verde"]) assert.ok(MALETA_EXEMPLO.some((p) => p.nome.includes(`Corretor de cor ${cor}`)), `corretor ${cor}`);
  assert.ok(MALETA_EXEMPLO.filter((p) => p.categoria === "base").every((p) => /^Base \d{3} /.test(p.nome)), "numeração tipo 230");
});

test("combinarComMaleta: menor ΔE2000, mesma categoria e faixas de qualidade", () => {
  for (const alvo of ["#C99A72", "#F0D3C9", "#4A2E22", "#8A5A40"]) {
    const r = combinarComMaleta({ categoria: "base", cor: alvo }, MALETA_EXEMPLO);
    const melhor = Math.min(...MALETA_EXEMPLO.filter((p) => p.categoria === "base").map((p) => deltaE2000(hexParaLab(alvo), hexParaLab(p.cor))));
    assert.equal(r.produto.categoria, "base");
    assert.ok(Math.abs(r.deltaE - melhor) < 0.01, `${alvo}: ΔE ${r.deltaE} ≈ ${melhor}`);
  }
  // categoria vence a cor: um batom igual a uma sombra da maleta não vira sombra
  const maleta = [
    { id: "s", marca: "Marca A", nome: "Sombra", categoria: "sombra", cor: "#AA3344" },
    { id: "b1", marca: "Marca B", nome: "Batom longe", categoria: "batom", cor: "#E8A0A8" },
    { id: "b2", marca: "Marca B", nome: "Batom perto", categoria: "batom", cor: "#AE3848" },
  ];
  const r = combinarComMaleta({ categoria: "batom", cor: "#AA3344" }, maleta);
  assert.equal(r.produto.id, "b2");
  assert.equal(r.qualidade, "combina");
  assert.equal(combinarComMaleta({ categoria: "batom", cor: "#AA3344" }, [maleta[0]]).produto, null);
  // faixas
  const so = (cor) => combinarComMaleta({ categoria: "blush", cor: "#E07060" }, [{ id: "x", marca: "Marca A", nome: "x", categoria: "blush", cor }]);
  assert.equal(so("#E07060").qualidade, "combina");
  assert.equal(so("#E07060").deltaE, 0);
  const aprox = so("#D0705A");
  assert.ok(aprox.deltaE >= 3 && aprox.deltaE < 6 ? aprox.qualidade === "aproximado" : true);
  const longe = so("#3060C0");
  assert.equal(longe.qualidade, "sem produto próximo");
  assert.ok(longe.produto, "o mais perto ainda vem");
  // corretor de cor só casa com corretor de cor (e vice-versa)
  const pessego = combinarComMaleta({ categoria: "corretivo", cor: "#F2B596", produto: "Corretor de cor cremoso" }, MALETA_EXEMPLO);
  assert.match(pessego.produto.nome, /Corretor de cor pêssego/);
  const tom = combinarComMaleta({ categoria: "corretivo", cor: "#F0B394", produto: "Corretivo líquido" }, MALETA_EXEMPLO);
  assert.doesNotMatch(tom.produto.nome, /Corretor de cor/);
  // dado ruim
  for (const ruim of [null, {}, { categoria: "base", cor: "bege" }, { categoria: "base" }]) {
    assert.deepEqual(combinarComMaleta(/** @type {any} */ (ruim), MALETA_EXEMPLO), { produto: null, deltaE: null, qualidade: "sem produto próximo" });
  }
  assert.equal(combinarComMaleta({ categoria: "base", cor: "#C99A72" }, /** @type {any} */ (null)).produto, null);
  assert.equal(combinarComMaleta({ categoria: "base", cor: "#C99A72" }, [/** @type {any} */ (null), { categoria: "base", cor: "xx" }]).produto, null);
});

test("montarBrief: ficha completa com pontos reais", { skip: !temFixtures && PULAR }, () => {
  const det = deteccao("rosto-frontal");
  const receita = receitaTeste();
  const brief = montarBrief(medidasTeste(), receita, { pontos: det.pontos, maleta: MALETA_EXEMPLO, cliente: "Ana", largura: det.largura, altura: det.altura });

  assert.equal(brief.titulo, "Beauty Brief · Ana");
  assert.deepEqual(brief.secoes.map((s) => s.titulo), SECOES);
  for (const s of brief.secoes) {
    assert.ok(s.linhas.length > 0, `${s.titulo} tem linhas`);
    for (const l of s.linhas) {
      assert.ok(l.rotulo && l.valor, `${s.titulo}: linha preenchida`);
      if (l.confianca !== undefined) assert.ok(Number.isFinite(l.confianca) && l.confianca >= 0 && l.confianca <= 1);
    }
  }
  const sec = (t) => brief.secoes.find((s) => s.titulo === t);
  const textoDe = (t) => sec(t).linhas.map((l) => `${l.rotulo}: ${l.valor}`).join("\n");

  // leitura do rosto: luz, formato, olhos e boca, todos com confiança
  const leitura = sec("Leitura do rosto").linhas;
  for (const r of ["Luz da foto", "Formato do rosto", "Olhos", "Boca"]) assert.equal(typeof leitura.find((l) => l.rotulo === r)?.confianca, "number", r);
  assert.match(textoDe("Leitura do rosto"), /branco dos olhos.*amarelo/);
  assert.match(textoDe("Leitura do rosto"), /Foto um pouco tremida/);
  // pele
  const pele = textoDe("Pele");
  for (const re of [/Monk \d+ de 10/, /ITA -?\d+°/, /Profundidade/, /Subtom: Quente — puxa para o dourado/, /#C99A72/, /Base indicada/, /Base na maleta: Marca . · Base \d{3}.*ΔE \d/, /Corretor de cor/, /Corretivo/, /estimad/i]) assert.match(pele, re);
  // olhos, sobrancelhas, boca
  assert.match(textoDe("Olhos"), /Castanho \(#5A3A22\)/);
  assert.match(textoDe("Olhos"), /Levantar o esfumado/);
  assert.match(textoDe("Olhos"), /clara #E6CBA6.*média #B0602E.*escura #563424/);
  assert.match(textoDe("Sobrancelhas"), /#4A3426/);
  assert.match(textoDe("Boca"), /Rosa Chá \(#C27E80\)/);
  assert.match(textoDe("Boca"), /pigmentação média/);
  // paleta e ordem
  for (const it of receita.itens) {
    assert.ok(brief.paleta.some((c) => c.hex === it.cor.toUpperCase()), `paleta tem ${it.cor}`);
  }
  assert.equal(brief.ordem.length, receita.itens.length);
  brief.ordem.forEach((o, i) => {
    assert.equal(o.passo, i + 1);
    assert.equal(o.categoria, receita.itens[i].categoria);
    assert.equal(o.intensidade, receita.itens[i].intensidade);
    for (const parte of [receita.itens[i].produto, receita.itens[i].cor.toUpperCase(), receita.itens[i].zona, receita.itens[i].forma, receita.itens[i].ferramenta]) assert.ok(o.texto.includes(parte), `passo ${o.passo}: ${parte}`);
  });
  assert.ok(brief.ordem.some((o) => o.daMaleta), "produto da maleta quando houver");
  const linhasOrdem = sec("Ordem de execução").linhas.filter((l) => /^\d+\./.test(l.rotulo));
  assert.equal(linhasOrdem.length, receita.itens.length);
  assert.ok(linhasOrdem.every((l) => /intensidade \d+%/.test(l.valor)));
  assert.match(linhasOrdem[0].rotulo, /^1\. Sombra/);
  assert.match(linhasOrdem[3].rotulo, /^4\. Corretor de cor/);
  // adaptado, confirmar, duração
  assert.deepEqual(brief.adaptacoes.map((a) => a.regra), ["HORARIO-NOITE", "OLHO-CAIDO"]);
  assert.match(textoDe("O que foi adaptado"), /Horário: À noite/);
  assert.ok(brief.confirmarPessoalmente.some((c) => /Testar a base/.test(c)));
  assert.ok(brief.confirmarPessoalmente.some((c) => /encapuzada/.test(c)));
  assert.ok(brief.confirmarPessoalmente.some((c) => /óculos/.test(c)));
  assert.equal(brief.confirmarPessoalmente.filter((c) => /alergi/i.test(c)).length, 1, "sem repetir alergia");
  assert.match(textoDe("Duração e fixação"), /Duração: Pensada para durar/);
  assert.match(brief.resumo.texto, /estimado a partir de uma foto/);
  // sem "look", sem buracos
  const json = JSON.stringify(brief);
  assert.doesNotMatch(json, /\blooks?\b/i);
  assert.doesNotMatch(json.replace(brief.faceChartSvg, ""), /NaN|undefined|Infinity|\[object/);
});

test("face chart: SVG bem formado, com viewBox, as cores da receita e a numeração da ordem", { skip: !temFixtures && PULAR }, () => {
  const det = deteccao("rosto-frontal");
  const receita = receitaTeste();
  const { faceChartSvg: svg, ordem } = montarBrief(medidasTeste(), receita, { pontos: det.pontos, maleta: MALETA_EXEMPLO, largura: det.largura, altura: det.altura });
  const [, , w, h] = conferirSvg(svg);
  assert.equal(w, 400);
  assert.ok(h > 400 && h < 900, `altura ${h}`);
  const svgMaiusculo = svg.toUpperCase();
  for (const it of receita.itens) {
    for (const cor of [it.cor, ...(it.cores ?? [])]) assert.ok(svgMaiusculo.includes(`"${cor.toUpperCase()}"`), `cor ${cor} no SVG`);
  }
  // as zonas são pintadas com as cores (não só a legenda): batom no lábio, base no rosto, sombra em degradê
  assert.match(svg, /fill="#C27E80"[^>]*fill-rule="evenodd"/i, "batom pintado nos lábios");
  assert.match(svg, /<rect [^>]*fill="#C99A72" fill-opacity/i, "base em transparência");
  assert.match(svg, /<linearGradient[^>]*>(<stop[^>]*>){4}<\/linearGradient>/, "sombra em degradê");
  assert.match(svg, /stop-color="#E6CBA6".*stop-color="#B0602E".*stop-color="#563424"/s);
  assert.match(svg, /<radialGradient/, "blush/iluminador esfumados");
  // marcadores e legenda: cada passo aparece duas vezes (no rosto e na legenda)
  for (const o of ordem) assert.ok((svg.match(new RegExp(`>${o.passo}</text>`, "g")) ?? []).length >= 2, `número ${o.passo}`);
  assert.match(svg, /Traçado a partir dos pontos do rosto/);
  assert.doesNotMatch(svg, /<image|data:image|base64/, "não leva foto");
  // determinístico
  assert.equal(montarBrief(medidasTeste(), receita, { pontos: det.pontos, largura: 768, altura: 768 }).faceChartSvg, svg);
  // o traço vem dos pontos da cliente: outro rosto dá outro desenho
  const outro = desenharFaceChart(deteccao("portrait").pontos, receita);
  assert.notEqual(outro, svg);
  conferirSvg(outro);
});

test("face chart: rostos difíceis (rotacionado, pequeno, dois rostos) continuam válidos e de pé", { skip: !temFixtures && PULAR }, () => {
  for (const nome of ["portrait_rotated", "portrait_small", "man-woman-okay", "business-person", "rosto-escuro"]) {
    const det = deteccao(nome);
    if (!det.pontos?.length) continue;
    const svg = desenharFaceChart(det.pontos, receitaTeste(), { largura: det.largura, altura: det.altura });
    conferirSvg(svg);
    assert.match(svg, /Traçado a partir dos pontos/, nome);
    // de pé: a boca (batom) fica abaixo dos olhos (sombra) no desenho
    const yBoca = Number(svg.match(/<path d="M[\d.]+ ([\d.]+)[^"]*" fill="#C27E80"/i)[1]);
    const ySombra = Number(svg.match(/<path d="M[\d.]+ ([\d.]+)[^"]*" fill="url\(#[^)]+-sombra-d\)"/)[1]);
    assert.ok(yBoca > ySombra, `${nome}: boca abaixo dos olhos (${yBoca} > ${ySombra})`);
  }
});

test("robustez: sem maleta, sem pontos, pontos quebrados e medidas/receita vazias", () => {
  // sem maleta: nada de "na maleta" e nenhum daMaleta
  const semMaleta = montarBrief(medidasTeste(), receitaTeste(), {});
  assert.equal(semMaleta.ordem.filter((o) => o.daMaleta).length, 0);
  assert.ok(!semMaleta.secoes.some((s) => s.linhas.some((l) => /na maleta/.test(l.rotulo))));
  // sem pontos → rosto ilustrativo, SVG válido
  for (const pontos of [undefined, [], [{ x: 0.5, y: 0.5 }], Array.from({ length: 478 }, () => ({ x: NaN, y: 0 })), Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5 })), "lixo"]) {
    const b = montarBrief(medidasTeste(), receitaTeste(), { pontos: /** @type {any} */ (pontos), maleta: MALETA_EXEMPLO });
    conferirSvg(b.faceChartSvg);
    assert.match(b.faceChartSvg, /Rosto ilustrativo/);
    assert.ok(b.faceChartSvg.toUpperCase().includes("#C27E80"));
  }
  // medidas e receita vazias, nulas ou com tipos errados
  for (const [m, r] of [[{}, {}], [null, null], [undefined, undefined], [{ pele: { hex: "rosa", confianca: "alta" } }, { itens: [null, { categoria: "batom" }, { categoria: "xx", cor: "#FFFFFF" }], adaptacoes: "x" }]]) {
    const b = montarBrief(/** @type {any} */ (m), /** @type {any} */ (r), /** @type {any} */ ({ maleta: "nada" }));
    assert.deepEqual(b.secoes.map((s) => s.titulo), SECOES);
    conferirSvg(b.faceChartSvg);
    const json = JSON.stringify(b);
    assert.doesNotMatch(json, /NaN|undefined|Infinity|\[object/);
    assert.ok(b.secoes.every((s) => s.linhas.length > 0));
    const t = briefParaTexto(b);
    assert.ok(t.length > 100);
  }
  // opções ausentes
  assert.doesNotThrow(() => montarBrief(medidasTeste(), receitaTeste()));
  // item sem cor válida não quebra o desenho
  const r = receitaTeste({ itens: [item("batom", "vermelho", "Vermelho"), item("blush", "#EC7E62", "Coral")] });
  conferirSvg(montarBrief(medidasTeste(), r, {}).faceChartSvg);
});

test("vários face charts na mesma página não repetem ids", () => {
  const a = desenharFaceChart(undefined, receitaTeste());
  const b = desenharFaceChart(undefined, receitaTeste({ nomeMake: "Glam", itens: [item("batom", "#A8142F", "Vermelho")] }));
  const ids = (s) => [...s.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(ids(a).filter((x) => ids(b).includes(x)).length, 0);
});

test("briefParaTexto: enxuto, formatado e sem a palavra proibida", { skip: !temFixtures && PULAR }, () => {
  const det = deteccao("rosto-frontal");
  const receita = receitaTeste({ adaptacoes: [{ regra: "PEDIDO-CLIENTE", motivo: "A cliente pediu um look mais leve." }] });
  const brief = montarBrief(medidasTeste(), receita, { pontos: det.pontos, maleta: MALETA_EXEMPLO, cliente: "Ana" });
  assert.doesNotMatch(JSON.stringify(brief), /\blook/i, "vocabulário corrigido também no que vem da receita");
  assert.ok(brief.adaptacoes[0].motivo.includes("pediu uma make mais leve"), brief.adaptacoes[0].motivo);
  const t = briefParaTexto(brief);
  assert.doesNotMatch(t, /\blook/i);
  assert.match(t, /^\*Beauty Brief · Ana\*\n/);
  for (const h of ["*Ordem de execução*", "*Paleta*", "*Pele*", "*Olhos*", "*Boca*", "*Confirmar pessoalmente*", "*Duração e fixação*"]) assert.ok(t.includes(h), h);
  assert.match(t, /\n1\. Sombra: .*75%/);
  assert.match(t, /↳ maleta: Marca/);
  assert.match(t, /_\(\d+%\)_/, "confiança em %");
  assert.match(t, /direção, não receita/);
  assert.doesNotMatch(t, /\n\n\n/, "sem buracos");
  assert.doesNotMatch(t, /Base na maleta|\n- Batom: /, "o que está na ordem não se repete");
  assert.ok(t.split("\n").length < 80, `${t.split("\n").length} linhas`);
  assert.equal(typeof briefParaTexto(/** @type {any} */ (null)), "string");
});

test("gera o exemplo em testes/resultados (brief-exemplo.svg e .txt)", { skip: !temFixtures && PULAR }, async () => {
  const det = deteccao("rosto-frontal");
  // o exemplo usa a receita de verdade (receita.js) quando ela carrega; senão, a receita falsa local
  let medidas = medidasTeste(), receita = receitaTeste();
  try {
    const { montarReceita } = await import("../../js/receita.js");
    const real = montarReceita({ makeId: "soft-glam", momento: "casamento", papel: "madrinha", horario: "noite" }, medidas);
    if (real?.itens?.length) receita = real;
  } catch { /* receita.js indisponível: segue com a falsa */ }
  const brief = montarBrief(medidas, receita, { pontos: det.pontos, maleta: MALETA_EXEMPLO, cliente: "Cliente de exemplo", largura: det.largura, altura: det.altura });
  conferirSvg(brief.faceChartSvg);
  mkdirSync(RESULTADOS, { recursive: true });
  writeFileSync(join(RESULTADOS, "brief-exemplo.svg"), brief.faceChartSvg);
  writeFileSync(join(RESULTADOS, "brief-exemplo.txt"), briefParaTexto(brief));
  assert.ok(existsSync(join(RESULTADOS, "brief-exemplo.svg")));
});
