// Telas do protótipo. Liga as peças do motor (tipos.js descreve o contrato) sem conhecer o
// funcionamento interno de cada uma: rosto → medidas → receita → pintura → brief / ia.
import { carregarDetector, detectarFoto, detectarQuadro, infoDetector } from "./rosto.js";
import { criarAmostrador, medir, checarQualidade } from "./medidas.js";
import { MOMENTOS, PAPEIS, MAKES, PALETAS, MAKES_PRONTAS, ACABAMENTOS } from "./catalogo.js";
import { montarReceita, paraEstado, interpretarPedido } from "./receita.js";
import { criarPintor, ESTILOS_SOMBRA, ESTILOS_DELINEADO } from "./pintura.js";
import { montarBrief, briefParaTexto, MALETA_EXEMPLO } from "./brief.js";
import { instrucaoParaIA, conferirResultado } from "./ia.js";
import { prepararFoto, analisarTexto } from "./seguranca.js";
import { PONTOS_PADRAO } from "./rosto-padrao.js";
import { VARIACOES, PRECOS, MEDIDAS_PADRAO } from "./vitrine.js";
import { ajustar } from "./cor.js";
import { lerMakeDaFoto } from "./referencia.js";
import { MAKES_EPOCAS } from "./epocas.js";
const PRONTAS_E_EPOCAS = [...MAKES_PRONTAS, ...MAKES_EPOCAS];

// ---------------------------------------------------------------- estado
const E = {
  momento: null, papel: null, makeId: null, variacaoId: null, horario: "noite",
  foto: null, // {blob, url, largura, altura, checagens, img}
  pedido: "", pedidoAnalise: null, consentiu: false,
  deteccao: null, medidas: null, receita: null, variacao: "Como está",
  tempos: {}, conferencia: null, instrucao: null,
  agendamento: { dia: null, hora: null, local: "espaco" },
  aoVivo: { categoria: "batom", estado: {}, pronta: null },
  historico: [],
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const reais = (v) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const pct = (v) => `${Math.round(v * 100)}%`;
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const quadro = () => new Promise((r) => requestAnimationFrame(() => r()));

const ICONE = {
  voltar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 8V6a2 2 0 012-2h2M16 4h2a2 2 0 012 2v2M20 16v2a2 2 0 01-2 2h-2M8 20H6a2 2 0 01-2-2v-2"/><path d="M9 10h.01M15 10h.01M9.5 15a3.5 3.5 0 005 0"/></svg>',
  enviar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5M5 20h14"/></svg>',
  espelho: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="10" r="6.5"/><path d="M12 16.5V21M8.5 21h7M9.5 8.5c.6-1 1.5-1.5 2.5-1.5"/></svg>',
  pincel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4.5l5 5L11 18l-5-5 8.5-8.5z"/><path d="M6 13c-2 0-3 1.5-3 3.5S2 20 2 20s3 .5 4.5-1S8 17 8 15"/></svg>',
  ficha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M9 8h6M9 12h6M9 16h3"/></svg>',
  engrenagem: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/></svg>',
  olho: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21"/></svg>',
};
const selo = `<span class="selo" aria-hidden="true">${ICONE.check}</span>`;

// ---------------------------------------------------------------- navegação
const fluxo = $("#fluxo");
const acoes = $("#acoes");
// o fim da tela reserva a altura real da barra de botões (ela muda: botão, obturador, links)
new ResizeObserver(() => document.documentElement.style.setProperty("--altura-acoes", `${acoes.hidden ? 0 : Math.ceil(acoes.getBoundingClientRect().height)}px`)).observe(acoes);
let telaAtual = null;
let limpeza = [];

function aoSair(fn) { limpeza.push(fn); }

function ir(nome, { substituir = false } = {}) {
  for (const fn of limpeza.splice(0)) try { fn(); } catch { /* nada */ }
  if (telaAtual && !substituir) E.historico.push(telaAtual);
  telaAtual = nome;
  TELAS[nome]();
  fluxo.focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}
function voltar() {
  const anterior = E.historico.pop();
  if (anterior) { telaAtual = null; ir(anterior, { substituir: true }); telaAtual = anterior; }
  else ir("inicio", { substituir: true });
}

function montar({ palco = false, progresso = null, comVoltar = true, corpo, botoes = "", legenda }) {
  document.body.toggleAttribute("data-palco", palco);
  const topo = comVoltar || progresso !== null
    ? `<div class="topo">${comVoltar ? `<button class="voltar" data-acao="voltar" aria-label="Voltar">${ICONE.voltar}</button>` : ""}${progresso !== null ? `<div class="progresso" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(progresso * 100)}"><i style="width:${progresso * 100}%"></i></div>` : ""}</div>`
    : "";
  fluxo.innerHTML = topo + corpo;
  acoes.innerHTML = botoes;
  acoes.hidden = !botoes;
  if (legenda !== undefined) $("#painel-legenda").textContent = legenda;
  $$("[data-acao=voltar]").forEach((b) => b.addEventListener("click", voltar));
}

function avisar(texto, ms = 2600) {
  const t = document.createElement("div");
  t.className = "toast";
  t.role = "status";
  t.textContent = texto;
  $("#avisos").append(t);
  setTimeout(() => t.remove(), ms);
}

// ---------------------------------------------------------------- painel visual (computador)
const painel = { canvas: null, anim: 0, modo: "malha" };
const ARESTAS = (() => {
  // "constelação" dourada: ~40 pontos-chave ligados aos vizinhos mais próximos
  const chaves = [10, 297, 389, 454, 361, 397, 378, 152, 149, 172, 132, 234, 162, 67, 33, 133, 362, 263, 159, 386, 70, 105, 107, 336, 334, 300, 6, 4, 98, 327, 61, 0, 291, 17, 50, 280, 205, 425, 151, 9];
  const p = PONTOS_PADRAO;
  const ar = new Set();
  for (const a of chaves) {
    const viz = chaves.filter((b) => b !== a).map((b) => [b, Math.hypot(p[a].x - p[b].x, p[a].y - p[b].y)]).sort((x, y) => x[1] - y[1]).slice(0, 3);
    for (const [b] of viz) ar.add(a < b ? `${a}-${b}` : `${b}-${a}`);
  }
  return { chaves, arestas: [...ar].map((s) => s.split("-").map(Number)) };
})();

function desenharMalha(ctx, pontos, w, h, { ox = 0, oy = 0, escala = 1, alfa = 1, espelhar = false } = {}) {
  const P = (i) => {
    const x = espelhar ? 1 - pontos[i].x : pontos[i].x;
    return [ox + x * w * escala, oy + pontos[i].y * h * escala];
  };
  ctx.save();
  ctx.globalAlpha = alfa;
  ctx.strokeStyle = "rgba(244, 226, 196, .75)";
  ctx.lineWidth = Math.max(1, w / 500);
  ctx.beginPath();
  for (const [a, b] of ARESTAS.arestas) { const [x1, y1] = P(a), [x2, y2] = P(b); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }
  ctx.stroke();
  const r = Math.max(2.5, w / 160);
  for (const i of ARESTAS.chaves) {
    const [x, y] = P(i);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = "#D6B588"; ctx.fill();
    ctx.lineWidth = Math.max(1, r / 2.5); ctx.strokeStyle = "rgba(255,248,238,.9)"; ctx.stroke();
  }
  ctx.restore();
}

function animarMalha(canvas) {
  const ctx = canvas.getContext("2d");
  let t0 = performance.now();
  const passo = (t) => {
    const w = (canvas.width = canvas.clientWidth * devicePixelRatio);
    const h = (canvas.height = canvas.clientHeight * devicePixelRatio);
    ctx.fillStyle = "#1B1311"; ctx.fillRect(0, 0, w, h);
    const g = ctx.createRadialGradient(w * .5, h * .45, 0, w * .5, h * .45, Math.max(w, h) * .7);
    g.addColorStop(0, "rgba(122, 84, 70, .55)"); g.addColorStop(1, "rgba(27, 19, 17, 0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const lado = Math.min(w, h) * 1.05;
    const fase = ((t - t0) / 2600) % 1;
    desenharMalha(ctx, PONTOS_PADRAO, lado, lado, { ox: (w - lado) / 2, oy: (h - lado) / 2 - h * .02, alfa: .9 });
    const y = (Math.sin(fase * Math.PI * 2) * .5 + .5) * h * .6 + h * .18;
    const gr = ctx.createLinearGradient(0, y - h * .08, 0, y + h * .08);
    gr.addColorStop(0, "rgba(255,244,232,0)"); gr.addColorStop(.5, "rgba(255,244,232,.18)"); gr.addColorStop(1, "rgba(255,244,232,0)");
    ctx.fillStyle = gr; ctx.fillRect(w * .1, y - h * .08, w * .8, h * .16);
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) return requestAnimationFrame(passo);
  };
  return requestAnimationFrame(passo);
}

function painelMalha(legenda) {
  if (!matchMedia("(min-width: 1000px)").matches) { $("#painel-legenda").textContent = legenda ?? ""; return; }
  const fundo = $("#painel-fundo");
  if (painel.modo !== "malha" || !fundo.firstChild) {
    cancelAnimationFrame(painel.anim);
    fundo.innerHTML = "<canvas></canvas>";
    painel.anim = animarMalha(fundo.firstChild);
    painel.modo = "malha";
  }
  if (legenda !== undefined) $("#painel-legenda").textContent = legenda;
}

function painelImagem(fonte, legenda) {
  const fundo = $("#painel-fundo");
  cancelAnimationFrame(painel.anim);
  painel.modo = "imagem";
  const c = document.createElement("canvas");
  c.width = fonte.width || fonte.naturalWidth; c.height = fonte.height || fonte.naturalHeight;
  c.getContext("2d").drawImage(fonte, 0, 0);
  fundo.replaceChildren(c);
  if (legenda !== undefined) $("#painel-legenda").textContent = legenda;
}

// ---------------------------------------------------------------- ilustrações (face chart dos estilos)
const cacheChart = new Map();
function chartDoEstilo(makeId, ajustes, chave) {
  if (cacheChart.has(chave)) return cacheChart.get(chave);
  let svg = "";
  try {
    const receita = montarReceita({ makeId, momento: E.momento ?? "casamento", papel: E.papel ?? "convidada", horario: "noite", ajustes }, MEDIDAS_PADRAO);
    svg = montarBrief(MEDIDAS_PADRAO, receita, { pontos: PONTOS_PADRAO, maleta: [] }).faceChartSvg;
  } catch (e) { console.warn("face chart", e); }
  cacheChart.set(chave, svg);
  return svg;
}

// ---------------------------------------------------------------- telas
const TELAS = {};

TELAS.inicio = () => {
  E.historico = [];
  montar({
    comVoltar: false,
    legenda: "Maquiagem com a sua cara.",
    corpo: `
      <div class="capa">
        <span class="marca" style="font-size:24px"><span class="monograma">TM</span>Thalita Mariano</span>
        <div class="hero"><canvas aria-hidden="true"></canvas></div>
        <div>
          <h1>A make certa para o seu momento.</h1>
          <p class="apoio" style="font-size:19px;margin-top:12px">Escolha um estilo, veja como fica em você e agende com a Thalita.</p>
        </div>
        <div class="modos">
          <button class="modo" data-ir="momento"><span class="icone">${ICONE.scan}</span><span><strong>Testar uma make</strong><small>Estudo do seu rosto, sua receita e a prévia em você.</small></span></button>
          <button class="modo" data-ir="aovivo"><span class="icone">${ICONE.espelho}</span><span><strong>Espelho ao vivo</strong><small>Brinque com batom, sombra e blush na câmera. Grátis.</small></span></button>
          <button class="modo" data-ir="studio"><span class="icone">${ICONE.ficha}</span><span><strong>O que a Thalita recebe</strong><small>Beauty Brief com face chart, cores e ordem de execução.</small></span></button>
          <button class="modo" data-ir="bastidores"><span class="icone">${ICONE.engrenagem}</span><span><strong>Bastidores do motor</strong><small>O que é medida, o que é regra e onde entra a IA.</small></span></button>
        </div>
        <p class="nota">Protótipo de teste. Tudo roda no seu aparelho: nenhuma foto sai daqui.</p>
      </div>`,
  });
  painelMalha("Maquiagem com a sua cara.");
  const hero = $(".hero canvas");
  if (getComputedStyle(hero.parentElement).display !== "none") { const id = animarMalha(hero); aoSair(() => cancelAnimationFrame(id)); }
  $$("[data-ir]").forEach((b) => b.addEventListener("click", () => ir(b.dataset.ir)));
  carregarDetector().catch(() => {}); // aquece o leitor de rosto enquanto a cliente escolhe
};

TELAS.momento = () => {
  montar({
    progresso: 1 / 7,
    legenda: "Cada momento pede uma make. Escolha o seu.",
    corpo: `
      <div><h1>Para qual momento é a sua make?</h1><p class="apoio">Ilustrações com as cores típicas de cada momento.</p></div>
      <div class="grade-momentos">${MOMENTOS.map((m) => `
        <button class="card-momento" data-id="${m.id}" aria-pressed="${E.momento === m.id}">
          <span class="arte" aria-hidden="true"></span>${selo}<span>${esc(m.nome)}</span>
        </button>`).join("")}</div>`,
    botoes: `<button class="botao principal" id="continuar" ${E.momento ? "" : "disabled"}>Continuar</button>`,
  });
  painelMalha("Cada momento pede uma make. Escolha o seu.");
  const tipicas = { casamento: "soft-glam", "15-anos": "glam", formatura: "glam", festa: "boca-marcante", "ensaio-evento": "natural" };
  $$(".card-momento").forEach((b) => {
    const arte = $(".arte", b);
    arte.innerHTML = chartDoEstilo(tipicas[b.dataset.id] ?? "soft-glam", undefined, `m-${b.dataset.id}`);
    const svg = $("svg", arte);
    if (svg) { svg.setAttribute("preserveAspectRatio", "xMidYMid slice"); arte.style.cssText = "position:absolute;inset:0;background:#F3E6DE"; }
    b.addEventListener("click", () => {
      E.momento = b.dataset.id; E.papel = null;
      $$(".card-momento").forEach((x) => x.setAttribute("aria-pressed", x === b));
      $("#continuar").disabled = false;
    });
  });
  $("#continuar").addEventListener("click", () => ir("papel"));
};

TELAS.papel = () => {
  const m = MOMENTOS.find((x) => x.id === E.momento);
  const papeis = PAPEIS[E.momento] ?? [];
  montar({
    progresso: 2 / 7,
    legenda: m?.nome,
    corpo: `
      <div><h1>${esc(m?.nome)}: qual é o seu papel?</h1><p class="apoio">Cada papel tem um cuidado e um preço diferente.</p></div>
      <div class="lista-papeis" role="radiogroup" aria-label="Papel">${papeis.map((p) => `
        <button class="card-papel" role="radio" data-id="${p.id}" aria-checked="${E.papel === p.id}">
          <span><strong>${esc(p.nome)}</strong><small>${esc(p.descricao)}</small></span>
          <span class="preco">a partir de<b class="tabular">${reais(PRECOS[p.id] ?? PRECOS.padrao)}</b></span>
          ${selo}
        </button>`).join("")}</div>`,
    botoes: `<button class="botao principal" id="continuar" ${E.papel ? "" : "disabled"}>Continuar</button>`,
  });
  painelMalha(m?.nome);
  $$(".card-papel").forEach((b) => b.addEventListener("click", () => {
    E.papel = b.dataset.id;
    $$(".card-papel").forEach((x) => x.setAttribute("aria-checked", x === b));
    $("#continuar").disabled = false;
  }));
  $("#continuar").addEventListener("click", () => ir("estilo"));
};

TELAS.estilo = () => {
  let filtro = "todos";
  montar({
    progresso: 3 / 7,
    legenda: "Escolha o estilo. Depois a gente adapta ao seu rosto.",
    corpo: `
      <h1>Escolha o seu estilo</h1>
      <div class="chips" id="filtros">
        <button class="chip" data-f="todos" aria-pressed="true">Todos</button>
        ${MAKES.map((mk) => `<button class="chip" data-f="${mk.id}" aria-pressed="false">${esc(mk.nome.replace(" iluminada", ""))}</button>`).join("")}
      </div>
      <div class="carrossel" id="estilos" aria-label="Estilos"></div>
      <button class="link" id="ir-referencia" style="align-self:flex-start">Tenho uma foto de referência: copiar a make dela</button>
      <p class="nota" style="text-align:left">Ilustração técnica de cada estilo (face chart). No app final aqui ficam as fotos "Inspiração com IA" geradas a partir da biblioteca de estilos.</p>`,
    botoes: `<button class="botao principal" id="continuar" ${E.variacaoId ? "" : "disabled"}>Ver em mim</button>`,
  });
  painelMalha("Escolha o estilo. Depois a gente adapta ao seu rosto.");
  const desenhar = () => {
    const lista = VARIACOES.filter((v) => filtro === "todos" || v.makeId === filtro);
    $("#estilos").innerHTML = lista.map((v) => `
      <button class="card-estilo" data-id="${v.id}" aria-pressed="${E.variacaoId === v.id}">
        <span class="ilustra"><span class="etiqueta">Face chart do estilo</span>${chartDoEstilo(v.makeId, v.ajustes, `v-${v.id}`)}</span>
        <span><strong>${esc(v.nome)}</strong><small>${esc(v.descricao)}</small></span>
      </button>`).join("");
    $$(".card-estilo").forEach((b) => b.addEventListener("click", () => {
      const v = VARIACOES.find((x) => x.id === b.dataset.id);
      E.variacaoId = v.id; E.makeId = v.makeId;
      $$(".card-estilo").forEach((x) => x.setAttribute("aria-pressed", x === b));
      $("#continuar").disabled = false;
      $("#painel-legenda").textContent = `${v.nome}: ${v.descricao}`;
    }));
  };
  $$("#filtros .chip").forEach((c) => c.addEventListener("click", () => {
    filtro = c.dataset.f;
    $$("#filtros .chip").forEach((x) => x.setAttribute("aria-pressed", x === c));
    desenhar();
  }));
  desenhar();
  $("#continuar").addEventListener("click", () => ir("foto"));
  $("#ir-referencia").addEventListener("click", () => { E.referencia = { origem: "estilo", ...(E.referencia ?? {}) }; E.referencia.origem = "estilo"; ir("referencia"); });
};

TELAS.foto = () => {
  const v = VARIACOES.find((x) => x.id === E.variacaoId);
  const temCamera = !!navigator.mediaDevices?.getUserMedia;
  montar({
    progresso: 4 / 7,
    legenda: v ? `Você escolheu: ${v.nome}` : "",
    corpo: `
      <div><h1>Vamos ver essa make em você?</h1><p class="apoio">Rosto de frente, com luz no rosto e sem filtro.</p></div>
      <div class="moldura-foto" style="aspect-ratio:4/3.4;background:#E9DCD3">
        <svg viewBox="0 0 400 340" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%">
          <rect width="400" height="340" fill="#E9DCD3"/>
          <ellipse cx="200" cy="175" rx="78" ry="100" fill="#D9C2B4"/>
          <path d="M122 175c0-70 34-110 78-110s78 40 78 110" fill="none" stroke="#7A5446" stroke-width="2" opacity=".35"/>
          <circle cx="172" cy="165" r="5" fill="#7A5446" opacity=".55"/><circle cx="228" cy="165" r="5" fill="#7A5446" opacity=".55"/>
          <path d="M184 222c10 8 22 8 32 0" stroke="#A76966" stroke-width="4" fill="none" stroke-linecap="round"/>
        </svg>
        <div class="cantos"><i></i><i></i><i></i><i></i></div>
        <span class="exemplo">Exemplo de enquadramento</span>
      </div>
      <input type="file" id="arquivo" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="user" class="so-leitor">
      <p class="nota">Sua foto é usada só para criar a simulação e você pode apagá-la quando quiser. Neste protótipo ela nem sai do seu aparelho.</p>`,
    botoes: `
      ${temCamera ? `<button class="botao principal" id="escanear">${ICONE.scan} Escanear meu rosto</button>` : ""}
      <button class="botao ${temCamera ? "secundario" : "principal"}" id="enviar">${ICONE.enviar} Enviar uma foto</button>`,
  });
  painelMalha(v ? `Você escolheu: ${v.nome}` : "");
  $("#escanear")?.addEventListener("click", () => ir("camera"));
  $("#enviar").addEventListener("click", () => $("#arquivo").click());
  $("#arquivo").addEventListener("change", async (ev) => {
    const f = ev.target.files?.[0];
    if (f) await receberFoto(f);
  });
};

async function receberFoto(arquivo) {
  const r = await prepararFoto(arquivo).catch((e) => ({ ok: false, checagens: [{ id: "erro", estado: "erro", titulo: "Não conseguimos abrir essa imagem", dica: String(e?.message ?? e) }] }));
  if (!r.ok) {
    const erro = r.checagens.find((c) => c.estado === "erro");
    avisar(`${erro?.titulo ?? "Foto recusada"}. ${erro?.dica ?? ""}`, 4200);
    E.seguranca = r.checagens;
    return;
  }
  const img = new Image();
  img.src = r.url;
  await img.decode();
  E.foto = { ...r, img };
  E.seguranca = r.checagens;
  E.deteccao = E.medidas = E.receita = null;
  ir("confirmar");
}

TELAS.camera = () => {
  montar({
    palco: true,
    progresso: 5 / 7,
    corpo: `
      <div class="moldura-foto" id="moldura">
        <video playsinline muted autoplay></video>
        <canvas class="sobre"></canvas>
        <div class="cantos"><i></i><i></i><i></i><i></i></div>
        <div class="faixa-scan"></div>
        <span class="pilula" id="pilula">Abrindo a câmera…</span>
      </div>`,
    botoes: `<button class="obturador" id="obturador" aria-label="Tirar foto" disabled></button>`,
  });
  const video = $("video"), sobre = $("canvas.sobre"), pilula = $("#pilula");
  let ativo = true, stream = null, ultimo = null;
  aoSair(() => { ativo = false; stream?.getTracks().forEach((t) => t.stop()); });
  (async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
      video.srcObject = stream; video.style.transform = "scaleX(-1)";
      await video.play();
      await carregarDetector();
    } catch (e) {
      pilula.textContent = "Câmera indisponível aqui. Use “Enviar uma foto”.";
      pilula.className = "pilula erro";
      return;
    }
    const ctx = sobre.getContext("2d");
    const loop = async () => {
      if (!ativo) return;
      if (video.readyState >= 2) {
        const d = await detectarQuadro(video, performance.now());
        sobre.width = video.videoWidth; sobre.height = video.videoHeight;
        ctx.clearRect(0, 0, sobre.width, sobre.height);
        if (d.pontos.length) desenharMalha(ctx, d.pontos, sobre.width, sobre.height, { espelhar: true, alfa: .9 });
        const q = d.pontos.length ? checarQualidadeRapida(d) : { estado: "erro", texto: "Procurando seu rosto…" };
        pilula.textContent = q.texto; pilula.className = `pilula ${q.estado === "ok" ? "" : q.estado}`;
        $("#obturador").disabled = q.estado === "erro";
        ultimo = d;
      }
      requestAnimationFrame(loop);
    };
    loop();
  })();
  $("#obturador").addEventListener("click", async () => {
    const c = document.createElement("canvas");
    c.width = video.videoWidth; c.height = video.videoHeight;
    c.getContext("2d").drawImage(video, 0, 0); // foto sem espelho (geometria real do rosto)
    const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.92));
    await receberFoto(new File([blob], "selfie.jpg", { type: "image/jpeg" }));
  });
};

/** Checagem leve para a câmera ao vivo (a completa roda na foto). */
function checarQualidadeRapida(d) {
  if (d.rostos > 1) return { estado: "atencao", texto: "Só uma pessoa na foto" };
  const p = d.pontos;
  const larg = Math.abs(p[454].x - p[234].x);
  if (larg < 0.28) return { estado: "atencao", texto: "Chegue um pouco mais perto" };
  if (larg > 0.75) return { estado: "atencao", texto: "Afaste um pouco o celular" };
  const centro = (p[454].x + p[234].x) / 2;
  const guinada = (p[1].x - centro) / larg;
  if (Math.abs(guinada) > 0.09) return { estado: "atencao", texto: "Olhe direto para a câmera" };
  const rol = Math.atan2(p[263].y - p[33].y, p[263].x - p[33].x) * 180 / Math.PI;
  if (Math.abs(rol) > 8) return { estado: "atencao", texto: "Deixe a cabeça reta" };
  return { estado: "ok", texto: "Perfeito, pode tirar a foto" };
}

TELAS.confirmar = () => {
  const avisosSeg = (E.seguranca ?? []).filter((c) => c.estado !== "ok" || /removid|recriad/i.test(c.titulo + (c.dica ?? "")));
  montar({
    progresso: 5 / 7,
    legenda: "Confira a foto antes de seguir.",
    corpo: `
      <h1>Ficou boa?</h1>
      <div class="moldura-foto" style="aspect-ratio:auto"><img alt="Sua foto" src="${E.foto.url}"></div>
      <ul class="checks" aria-label="Segurança da foto">
        <li>Foto recriada do zero no seu aparelho (${E.foto.largura}×${E.foto.altura} px)<small>Qualquer conteúdo escondido no arquivo foi descartado.</small></li>
        ${avisosSeg.map((c) => `<li class="${c.estado === "ok" ? "" : c.estado}">${esc(c.titulo)}${c.dica ? `<small>${esc(c.dica)}</small>` : ""}</li>`).join("")}
      </ul>
      <div class="campo">
        <label for="pedido">Quer mudar algo? (opcional)</label>
        <div class="caixa-texto">
          <textarea id="pedido" maxlength="300" placeholder="Ex.: olho mais leve, boca mais rosada">${esc(E.pedido)}</textarea>
          <button class="mic" id="mic" aria-label="Falar o pedido">${ICONE.mic}</button>
        </div>
        <span class="ajuda" id="contador">Só ajustes de make. ${E.pedido.length}/300</span>
        <div id="entendido" class="ajuda"></div>
      </div>
      <label class="consentimento"><input type="checkbox" id="consentir" ${E.consentiu ? "checked" : ""}><span>Autorizo o uso desta foto só para criar a simulação. Sem agendamento, ela é apagada em 7 dias.</span></label>`,
    botoes: `<button class="botao principal" id="usar" ${E.consentiu ? "" : "disabled"}>Usar esta foto</button><button class="link" id="outra">Tirar outra</button>`,
  });
  painelImagem(E.foto.img, "Confira a foto antes de seguir.");
  const campo = $("#pedido");
  const atualizar = () => {
    const a = analisarTexto(campo.value, { limite: 300 });
    E.pedido = a.texto;
    $("#contador").textContent = `Só ajustes de make. ${campo.value.length}/300`;
    if (!campo.value.trim()) { $("#entendido").textContent = ""; return; }
    const p = interpretarPedido(a.texto);
    E.pedidoAnalise = { ...p, alertas: a.alertas, suspeito: a.suspeito };
    $("#entendido").innerHTML = [
      p.entendidos.length ? `Entendi: <b>${esc(p.entendidos.join(", "))}</b>.` : "",
      a.suspeito || p.ignorados.length ? `Vou ignorar o que não é ajuste de make${p.ignorados.length ? `: ${esc(p.ignorados.join(", "))}` : ""}.` : "",
    ].filter(Boolean).join(" ");
  };
  campo.addEventListener("input", atualizar);
  atualizar();
  const Reconhecimento = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Reconhecimento) $("#mic").hidden = true;
  $("#mic").addEventListener("click", () => {
    try {
      const r = new Reconhecimento(); r.lang = "pt-BR"; r.interimResults = false;
      r.onresult = (e) => { campo.value = (campo.value + " " + e.results[0][0].transcript).trim().slice(0, 300); atualizar(); };
      r.onerror = () => avisar("Não deu para ouvir agora. Pode digitar.");
      r.start(); avisar("Pode falar…", 1800);
    } catch { avisar("Microfone indisponível aqui. Pode digitar."); }
  });
  $("#consentir").addEventListener("change", (e) => { E.consentiu = e.target.checked; $("#usar").disabled = !E.consentiu; });
  $("#usar").addEventListener("click", () => ir("estudo"));
  $("#outra").addEventListener("click", voltar);
};

// ---------------------------------------------------------------- estudo do rosto (o motor rodando)
async function pixelsDe(fonte, largura, altura) {
  const c = document.createElement("canvas");
  c.width = largura; c.height = altura;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(fonte, 0, 0, largura, altura);
  return { canvas: c, amostrador: criarAmostrador({ dados: ctx.getImageData(0, 0, largura, altura).data, largura, altura, canais: 4 }) };
}

function escolhas() {
  const v = VARIACOES.find((x) => x.id === E.variacaoId);
  const ajustes = { ...(v?.ajustes ?? {}), ...(E.pedidoAnalise?.ajustes ?? {}) };
  const variacao = E.variacao !== "Como está" ? E.variacao : (E.pedidoAnalise?.ajustes?.variacao ?? "Como está");
  delete ajustes.variacao;
  return { makeId: E.makeId ?? "soft-glam", momento: E.momento ?? "festa", papel: E.papel ?? "convidada", horario: E.horario, variacao, pedido: E.pedido, ajustes };
}

TELAS.estudo = () => {
  const etapas = [
    ["detectar", "Encontrando seu rosto", "478 pontos, no seu aparelho"],
    ["qualidade", "Conferindo a foto", "frente, luz, foco, olhos e tamanho"],
    ["luz", "Corrigindo a luz pelo branco do olho", "para a cor da pele não sair amarelada nem azulada"],
    ["medir", "Medindo tom, subtom, olhos e boca", "escala Monk, ângulo ITA e CIELAB"],
    ["receita", "Montando a sua receita", "regras da Thalita para o seu rosto"],
    ["pintar", "Pintando a prévia", "cores e intensidades da receita"],
  ];
  montar({
    palco: true,
    progresso: 6 / 7,
    corpo: `
      <div class="moldura-foto" style="aspect-ratio:auto"><img alt="" src="${E.foto.url}"><canvas class="sobre"></canvas><div class="faixa-scan"></div></div>
      <ul class="checks" id="etapas">${etapas.map(([id, t, s]) => `<li class="espera" data-id="${id}">${t}<small>${s}</small></li>`).join("")}</ul>
      <div id="problemas"></div>`,
  });
  const marcar = (id, estado, extra) => {
    const li = $(`#etapas [data-id="${id}"]`);
    if (!li) return;
    li.className = estado;
    if (extra) $("small", li).textContent = extra;
  };
  let ativo = true;
  aoSair(() => { ativo = false; });
  (async () => {
    const t = {};
    const cron = async (id, fn) => { marcar(id, "ativo"); const t0 = performance.now(); const r = await fn(); t[id] = Math.round(performance.now() - t0); await espera(260); return r; };
    try {
      const img = E.foto.img;
      const det = await cron("detectar", async () => { await carregarDetector(); return detectarFoto(img); });
      if (!ativo) return;
      E.deteccao = det;
      marcar("detectar", det.pontos.length ? "" : "erro", det.pontos.length ? `${det.pontos.length} pontos em ${t.detectar} ms (${infoDetector().delegate})` : "Não encontramos um rosto");
      const sobre = $("canvas.sobre");
      if (det.pontos.length && sobre) {
        sobre.width = det.largura; sobre.height = det.altura;
        desenharMalha(sobre.getContext("2d"), det.pontos, det.largura, det.altura, { alfa: .9 });
      }
      const { canvas, amostrador } = await pixelsDe(img, det.largura, det.altura);
      E.amostrador = amostrador; E.canvasOriginal = canvas;
      const q = await cron("qualidade", async () => checarQualidade(det, amostrador));
      const problemas = q.checagens.filter((c) => c.estado !== "ok");
      marcar("qualidade", q.aprovada ? (problemas.length ? "atencao" : "") : "erro", q.aprovada ? (problemas.length ? problemas.map((c) => c.titulo).join(" · ") : "Tudo certo") : "A foto precisa melhorar");
      if (!q.aprovada) {
        $("#problemas").innerHTML = `<div class="aviso" style="background:var(--palco-2)"><b>Vamos tirar outra?</b><ul class="checks">${q.checagens.filter((c) => c.estado === "erro").map((c) => `<li class="erro">${esc(c.titulo)}<small>${esc(c.dica ?? "")}</small></li>`).join("")}</ul></div>`;
        acoes.hidden = false;
        acoes.innerHTML = `<button class="botao claro" id="outra">Tirar outra foto</button>`;
        $("#outra").addEventListener("click", () => ir("foto"));
        return;
      }
      const m = await cron("luz", async () => medir(det, amostrador));
      E.medidas = m;
      const bb = m.balancoDeBranco;
      marcar("luz", "", bb.fonte === "branco-do-olho" ? `Corrigido pelo branco do olho (confiança ${pct(bb.confianca)})` : "Sem branco do olho visível: correção aproximada");
      await cron("medir", async () => m);
      marcar("medir", "", `Monk ${m.pele.monk.n} · subtom ${m.pele.subtom.subtom} · olhos ${m.olhos.familia}`);
      const rec = await cron("receita", async () => montarReceita(escolhas(), m));
      E.receita = rec;
      marcar("receita", "", `${rec.itens.length} produtos · ${rec.adaptacoes.length} adaptações ao seu rosto`);
      await cron("pintar", async () => { await quadro(); return null; });
      E.tempos = t;
      if (ativo) ir("resultado", { substituir: true });
    } catch (e) {
      console.error(e);
      $("#problemas").innerHTML = `<div class="aviso" style="background:var(--palco-2)"><b>O motor travou nesta etapa.</b><span>${esc(e?.message ?? e)}</span><span>Se estiver abrindo pelo visualizador do Claude, tente a versão publicada no GitHub Pages.</span></div>`;
      acoes.hidden = false;
      acoes.innerHTML = `<button class="botao claro" id="outra">Voltar</button>`;
      $("#outra").addEventListener("click", () => ir("foto"));
    }
  })();
};

// ---------------------------------------------------------------- resultado
let pintorResultado = null;
TELAS.resultado = () => {
  const m = E.medidas, rec = E.receita;
  const v = VARIACOES.find((x) => x.id === E.variacaoId);
  const fichas = [
    ["Tom de pele", `Monk ${m.pele.monk.n} · ${m.pele.profundidade}`, `ITA ${Math.round(m.pele.ita)}° (${m.pele.faixaIta})`, m.pele.hex],
    ["Subtom", m.pele.subtom.subtom, m.pele.subtom.explicacao, null],
    ["Olhos", m.olhos.familia, `confiança ${pct(m.olhos.confianca)}`, m.olhos.hex],
    ["Rosto", m.rosto.formato, `olhos ${m.formatoOlhos.inclinacao} · boca ${m.formatoBoca.volume}`, null],
  ];
  montar({
    progresso: 1,
    legenda: v ? `${v.nome}, adaptada para você.` : "Sua make.",
    corpo: `
      <div><h1>Sua make</h1><p class="apoio">${esc(v?.nome ?? rec.nomeMake)}, adaptada ao seu rosto. Prévia ilustrativa, não é promessa de resultado.</p></div>
      <div class="comparar" id="comparar" style="aspect-ratio:${E.deteccao.largura}/${E.deteccao.altura}">
        <canvas class="antes" aria-label="Antes"></canvas><canvas class="depois" aria-label="Depois"></canvas>
        <span class="divisor"></span><span class="rot a">Antes</span><span class="rot d">Prévia</span>
      </div>
      <div class="chips" id="variacoes" aria-label="Intensidade">${["Mais suave", "Como está", "Mais intenso"].map((x) => `<button class="chip" aria-pressed="${E.variacao === x}">${x}</button>`).join("")}</div>
      <section><p class="rotulo">Seu estudo</p>
        <div class="grade-estudo" style="margin-top:10px">${fichas.map(([r, b, s, hex]) => `<div class="ficha"><span class="rotulo">${r}</span><b>${hex ? `<i class="amostra" style="background:${hex};width:18px;height:18px;margin-right:6px"></i>` : ""}${esc(b)}</b><small>${esc(s)}</small></div>`).join("")}</div>
      </section>
      <section><p class="rotulo">Sua paleta</p><div class="linha-amostras" style="margin-top:10px">${rec.itens.map((i) => `<i class="amostra" title="${esc(i.nomeCor)} (${esc(i.categoria)})" style="background:${i.cor}"></i>`).join("")}</div></section>
      <section class="aviso"><b>Por que essa make fica bem em você</b><ul class="lista-motivos">${rec.adaptacoes.slice(0, 5).map((a) => `<li>${esc(a.motivo)}</li>`).join("")}</ul></section>
      <section class="aviso champanhe"><b>No app final</b><span>Esta prévia é desenhada pelo nosso motor. No produto, a mesma receita vira a instrução da IA, que gera uma foto realista. Depois o motor confere a foto gerada (mesmo rosto? cores certas?) antes de mostrar para você.</span></section>
      <details id="det-ia"><summary>Como a IA receberia esta make</summary><pre id="instrucao"></pre></details>
      <details id="det-conf"><summary>Conferência automática da prévia</summary><div id="conferencia" class="ajuda">Abra para rodar a conferência.</div></details>`,
    botoes: `<button class="botao principal" id="agendar">Agendar com a Thalita</button><button class="link" id="ver-brief">Ver o que a Thalita recebe</button>`,
  });
  const antes = $("#comparar .antes"), depois = $("#comparar .depois");
  antes.width = E.canvasOriginal.width; antes.height = E.canvasOriginal.height;
  antes.getContext("2d").drawImage(E.canvasOriginal, 0, 0);
  pintorResultado = criarPintor(depois);
  const repintar = () => {
    E.receita = montarReceita(escolhas(), E.medidas);
    pintorResultado.desenhar(E.canvasOriginal, E.deteccao.pontos, paraEstado(E.receita));
    painelImagem(depois, v ? `${v.nome}, adaptada para você.` : "Sua make.");
    E.instrucao = instrucaoParaIA(E.receita, E.medidas, { pedidoLimpo: E.pedido });
    $("#instrucao").textContent = `SISTEMA\n${E.instrucao.sistema}\n\nUSUÁRIO\n${E.instrucao.usuario}`;
    E.conferencia = null;
    $("#conferencia").textContent = "Abra para rodar a conferência.";
    if ($("#det-conf").open) conferir();
  };
  repintar();
  aoSair(() => pintorResultado?.liberar?.());
  // arrastar para comparar
  const comp = $("#comparar");
  const mover = (x) => { const r = comp.getBoundingClientRect(); comp.style.setProperty("--corte", `${Math.min(100, Math.max(0, ((x - r.left) / r.width) * 100))}%`); };
  comp.addEventListener("pointerdown", (e) => { comp.setPointerCapture(e.pointerId); mover(e.clientX); });
  comp.addEventListener("pointermove", (e) => { if (e.buttons) mover(e.clientX); });
  comp.tabIndex = 0;
  comp.setAttribute("role", "slider"); comp.setAttribute("aria-label", "Comparar antes e depois"); comp.setAttribute("aria-valuemin", "0"); comp.setAttribute("aria-valuemax", "100");
  comp.addEventListener("keydown", (e) => {
    const atual = parseFloat(getComputedStyle(comp).getPropertyValue("--corte")) || 50;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") { comp.style.setProperty("--corte", `${Math.min(100, Math.max(0, atual + (e.key === "ArrowLeft" ? -5 : 5)))}%`); e.preventDefault(); }
  });
  $$("#variacoes .chip").forEach((c) => c.addEventListener("click", () => {
    E.variacao = c.textContent;
    $$("#variacoes .chip").forEach((x) => x.setAttribute("aria-pressed", x === c));
    repintar();
  }));
  const conferir = async () => {
    $("#conferencia").textContent = "Conferindo…";
    try {
      const det = await detectarFoto(depois);
      const { amostrador } = await pixelsDe(depois, depois.width, depois.height);
      E.conferencia = conferirResultado({ original: { deteccao: E.deteccao, medidas: E.medidas }, gerada: { deteccao: det, amostrador }, receita: E.receita });
      const c = E.conferencia;
      $("#conferencia").innerHTML = `
        <p><b>${c.aprovado ? "Aprovada" : "Pediria para gerar de novo"}</b> — mesmo rosto: ${c.identidade.ok ? "sim" : "não"} (distância ${c.identidade.distancia.toFixed(3)})</p>
        <ul class="checks" style="margin-top:8px">${c.cores.map((x) => `<li class="${x.ok ? "" : "atencao"}">${esc(x.categoria)}: ΔE ${x.deltaE.toFixed(1)}<small>alvo <i class="amostra" style="width:14px;height:14px;background:${x.alvo}"></i> ${x.alvo} · medido <i class="amostra" style="width:14px;height:14px;background:${x.medido}"></i> ${x.medido}</small></li>`).join("")}</ul>
        ${c.motivos.length ? `<p style="margin-top:8px">${esc(c.motivos.join(" "))}</p>` : ""}`;
    } catch (e) { $("#conferencia").textContent = `Não deu para conferir: ${e?.message ?? e}`; }
  };
  $("#det-conf").addEventListener("toggle", (e) => { if (e.target.open && !E.conferencia) conferir(); });
  $("#agendar").addEventListener("click", () => ir("agendar"));
  $("#ver-brief").addEventListener("click", () => ir("studio"));
};

// ---------------------------------------------------------------- copiar make de uma foto
const NOMES_CAT = { batom: "Batom", sombra: "Sombra", delineado: "Delineado", mascara: "Máscara", blush: "Blush", contorno: "Contorno", iluminador: "Iluminador", sobrancelha: "Sobrancelha", base: "Base" };

TELAS.referencia = () => {
  const R = E.referencia ?? (E.referencia = { origem: "estilo" });
  const lido = R.lido;
  const amostras = (l) => (l.cores ?? [l.cor]).map((h) => `<i class="amostra" style="background:${h}"></i>`).join("");
  montar({
    progresso: R.origem === "estilo" ? 3 / 7 : null,
    legenda: "A gente lê as cores da make da foto e testa no seu rosto.",
    corpo: `
      <div><h1>Copiar make de uma foto</h1>
      <p class="apoio">Mande a foto de uma make que você gostou. O motor lê as cores de cada produto e aplica no <b>seu</b> rosto, com a base no seu tom. A foto de referência não é guardada.</p></div>
      ${lido ? `
        <div class="moldura-foto" style="aspect-ratio:auto;max-height:46vh"><img alt="Foto de referência" src="${R.url}" style="object-fit:contain;max-height:46vh"></div>
        ${lido.avisos.length ? `<section class="aviso">${lido.avisos.map((a) => `<span>${esc(a)}</span>`).join("")}</section>` : ""}
        <ul class="checks" id="leituras" aria-label="O que lemos na foto">
          ${lido.leituras.map((l) => `<li class="${l.presente ? "" : "espera"}"><span><b>${NOMES_CAT[l.categoria] ?? esc(l.categoria)}</b> ${l.presente ? `${amostras(l)} <span class="tabular">${Math.round((l.intensidade ?? 0) * 100)}%</span>${l.parecida ? ` · parecida com ${esc(l.parecida)}` : ""}` : ""}<small>${esc(l.detalhe)}${l.presente ? ` Confiança ${Math.round(l.confianca * 100)}%.` : ""}</small></span></li>`).join("")}
        </ul>
        <p class="nota" style="text-align:left">Leitura feita no seu aparelho, sem IA. Contorno e sombras marrons se confundem com a luz da foto: ajuste no espelho se precisar.</p>` : `
        <section class="aviso champanhe"><b>Funciona melhor com</b><span>Rosto de frente, inteiro, com luz do dia e sem filtro.</span></section>`}
      <input type="file" id="arquivo-ref" accept="image/jpeg,image/png,image/webp" class="so-leitor">`,
    botoes: lido
      ? `<button class="botao principal" id="ref-usar">${R.origem === "aovivo" ? "Testar no espelho" : "Ver em mim"}</button><button class="link" id="ref-outra">${R.origem === "aovivo" ? "Escolher outra foto" : "Testar no espelho ao vivo"}</button>`
      : `<button class="botao principal" id="ref-enviar">${ICONE.enviar} Escolher a foto de referência</button>`,
  });
  painelMalha("A gente lê as cores da make da foto e testa no seu rosto.");
  $("#ref-enviar")?.addEventListener("click", () => $("#arquivo-ref").click());
  $("#ref-outra")?.addEventListener("click", () => {
    if (R.origem === "aovivo") $("#arquivo-ref").click();
    else { E.aoVivo.estado = structuredClone(lido.estado); E.aoVivo.pronta = null; ir("aovivo"); }
  });
  $("#ref-usar")?.addEventListener("click", () => {
    if (R.origem === "aovivo") { E.aoVivo.estado = structuredClone(lido.estado); E.aoVivo.pronta = null; voltar(); return; }
    const est = lido.estado;
    E.makeId = est.sombra || est.delineado ? (est.batom?.intensidade >= 0.8 ? "glam" : "olho-marcante") : est.batom?.intensidade >= 0.8 ? "boca-marcante" : "soft-glam";
    E.variacaoId = null;
    E.pedidoAnalise = { ajustes: structuredClone(est), entendidos: ["cores copiadas da foto de referência"], ignorados: [] };
    ir("foto");
  });
  $("#arquivo-ref").addEventListener("change", async (ev) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    const r = await prepararFoto(f).catch((e) => ({ ok: false, checagens: [{ estado: "erro", titulo: "Não conseguimos abrir essa imagem", dica: String(e?.message ?? e) }] }));
    if (!r.ok) { const e = r.checagens.find((c) => c.estado === "erro"); avisar(`${e?.titulo ?? "Foto recusada"}. ${e?.dica ?? ""}`, 4200); return; }
    avisar("Lendo as cores da make…", 1600);
    try {
      const img = new Image(); img.src = r.url; await img.decode();
      await carregarDetector();
      const det = await detectarFoto(img);
      const { amostrador } = await pixelsDe(img, det.largura, det.altura);
      const res = lerMakeDaFoto(det, amostrador);
      if (!res.ok) { avisar(res.avisos[0] ?? "Não conseguimos ler essa foto.", 4200); return; }
      if (R.url) URL.revokeObjectURL(R.url);
      R.url = r.url; R.lido = res;
      ir("referencia", { substituir: true });
    } catch (e) { avisar(`Não deu para ler a foto: ${e?.message ?? e}`, 4200); }
  });
};

// ---------------------------------------------------------------- agendar
TELAS.agendar = () => {
  const preco = PRECOS[E.papel] ?? PRECOS.padrao;
  const hoje = new Date();
  const dias = Array.from({ length: 10 }, (_, i) => new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 3 + i)).filter((d) => d.getDay() !== 1).slice(0, 7);
  const horas = ["7h", "9h30", "12h", "14h30", "17h"];
  const A = E.agendamento;
  const papel = (PAPEIS[E.momento] ?? []).find((p) => p.id === E.papel);
  montar({
    progresso: null,
    legenda: "Escolha o dia e o horário. A Thalita confirma com você.",
    corpo: `
      <div><h1>Quando é o seu dia?</h1><p class="apoio">Escolha o dia e o horário. A Thalita confirma com você.</p></div>
      <section><p class="rotulo">Dia</p><div class="chips rolagem" id="dias" style="margin-top:10px">${dias.map((d, i) => `<button class="chip tabular" data-i="${i}" aria-pressed="${A.dia === i}">${d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}</button>`).join("")}</div></section>
      <section><p class="rotulo">Horário</p><div class="chips" id="horas" style="margin-top:10px">${horas.map((h) => `<button class="chip tabular" aria-pressed="${A.hora === h}">${h}</button>`).join("")}</div>${A.hora === "7h" ? "" : ""}</section>
      <section><p class="rotulo">Onde</p><div class="chips" id="local" style="margin-top:10px"><button class="chip" data-v="espaco" aria-pressed="${A.local === "espaco"}">No espaço da Thalita</button><button class="chip" data-v="casa" aria-pressed="${A.local === "casa"}">Na minha casa</button></div>
        <p class="ajuda" style="margin-top:8px">${A.local === "casa" ? "A taxa de deslocamento é calculada pelo CEP e a Thalita confirma o valor." : "Endereço enviado depois da confirmação."}</p></section>
      <section class="aviso">
        <div class="brief-linha" style="border:0"><span>${esc(papel?.nome ?? "Atendimento")}</span><span class="tabular" style="text-align:right">${reais(preco)}</span></div>
        <div class="brief-linha"><span>Sinal para garantir o horário (30%)</span><span class="tabular" style="text-align:right"><b>${reais(Math.round(preco * 0.3))}</b></span></div>
        <span class="ajuda">Você só paga o sinal depois que a Thalita aceitar. No app final o Pix aparece no seu pedido.</span>
      </section>`,
    botoes: `<button class="botao principal" id="enviar" ${A.dia !== null && A.hora ? "" : "disabled"}>Enviar pedido</button>`,
  });
  painelMalha("Escolha o dia e o horário. A Thalita confirma com você.");
  const pronto = () => { $("#enviar").disabled = !(A.dia !== null && A.hora); };
  $$("#dias .chip").forEach((c) => c.addEventListener("click", () => { A.dia = +c.dataset.i; A.diaTexto = c.textContent; $$("#dias .chip").forEach((x) => x.setAttribute("aria-pressed", x === c)); pronto(); }));
  $$("#horas .chip").forEach((c) => c.addEventListener("click", () => { A.hora = c.textContent; $$("#horas .chip").forEach((x) => x.setAttribute("aria-pressed", x === c)); pronto(); }));
  $$("#local .chip").forEach((c) => c.addEventListener("click", () => { A.local = c.dataset.v; ir("agendar", { substituir: true }); }));
  $("#enviar").addEventListener("click", () => ir("enviado"));
};

TELAS.enviado = () => {
  montar({
    comVoltar: false,
    legenda: "Agora é com a Thalita.",
    corpo: `
      <div><h1>Agora é com a Thalita.</h1><p class="apoio">Seu pedido para ${esc(E.agendamento.diaTexto ?? "")}, ${esc(E.agendamento.hora ?? "")}, foi enviado com a sua make e a ficha técnica.</p></div>
      <ul class="checks">
        <li>Pedido enviado<small>com a receita e o Beauty Brief</small></li>
        <li class="espera">A Thalita confere e aceita<small>normalmente no mesmo dia</small></li>
        <li class="espera">Você paga o sinal pelo app<small>Pix, e o horário fica seu</small></li>
        <li class="espera">Lembrete na véspera<small>por WhatsApp e e-mail</small></li>
      </ul>`,
    botoes: `<button class="botao principal" id="brief">Ver o que a Thalita recebe</button><button class="link" id="inicio">Ir para o início</button>`,
  });
  painelMalha("Agora é com a Thalita.");
  $("#brief").addEventListener("click", () => ir("studio"));
  $("#inicio").addEventListener("click", () => ir("inicio"));
};

// ---------------------------------------------------------------- studio (Beauty Brief)
TELAS.studio = () => {
  const exemplo = !E.medidas;
  const medidas = E.medidas ?? MEDIDAS_PADRAO;
  const receita = E.receita ?? montarReceita({ makeId: "soft-glam", momento: "casamento", papel: "madrinha", horario: "noite" }, MEDIDAS_PADRAO);
  const pontos = E.deteccao?.pontos?.length ? E.deteccao.pontos : PONTOS_PADRAO;
  const brief = montarBrief(medidas, receita, { pontos, maleta: MALETA_EXEMPLO, cliente: exemplo ? "Cliente de exemplo" : "Sua cliente" });
  const momento = MOMENTOS.find((x) => x.id === receita.ocasiao)?.nome ?? receita.ocasiao;
  const papel = (PAPEIS[receita.ocasiao] ?? []).find((p) => p.id === receita.papel)?.nome ?? receita.papel;
  montar({
    legenda: "Beauty Brief: a ficha técnica de cada atendimento.",
    corpo: `
      <div class="brief">
        <div class="brief-cab">
          <p class="rotulo">Studio · Beauty Brief${exemplo ? " · exemplo" : ""}</p>
          <h1 style="font-size:clamp(28px,6vw,40px)">${esc(brief.titulo)}</h1>
          <p class="apoio">${esc(momento)} · ${esc(papel)} · ${esc(receita.nomeMake)} · nível ${esc(receita.nivel)}${E.agendamento.diaTexto ? ` · ${esc(E.agendamento.diaTexto)} ${esc(E.agendamento.hora ?? "")}` : ""}</p>
          ${exemplo ? `<p class="aviso" style="margin-top:8px">Exemplo com rosto ilustrado e medidas de demonstração. Faça o "Testar uma make" para ver a ficha do seu rosto.</p>` : ""}
        </div>
        <p>${esc(brief.resumo.texto)}</p>
        <div class="brief-chart">${brief.faceChartSvg}</div>
        <section class="brief-secao"><h3>Paleta</h3><div class="paleta">${brief.paleta.map((c) => `<div><i style="background:${c.hex}"></i><span>${esc(c.nome)}<small>${esc(c.uso)} · ${c.hex}</small></span></div>`).join("")}</div></section>
        <section class="brief-secao"><h3>Ordem de execução</h3><ol class="ordem">${brief.ordem.map((o) => `<li><span>${esc(o.texto)}<small>Intensidade ${o.intensidade}%${o.daMaleta ? ` · da maleta: ${esc(o.daMaleta)}` : ""}</small></span></li>`).join("")}</ol></section>
        ${brief.secoes.map((s) => `<section class="brief-secao"><h3>${esc(s.titulo)}</h3>${s.linhas.map((l) => `<div class="brief-linha"><span>${esc(l.rotulo)}</span><span>${esc(l.valor)}${typeof l.confianca === "number" ? `<span class="conf">${pct(l.confianca)}</span>` : ""}</span></div>`).join("")}</section>`).join("")}
        <section class="brief-secao"><h3>Confirmar pessoalmente</h3><ul class="lista-motivos">${brief.confirmarPessoalmente.map((c) => `<li>${esc(c)}</li>`).join("")}</ul></section>
        <details><summary>Receita em dados (o que o motor usa)</summary><pre>${esc(JSON.stringify(receita, null, 2))}</pre></details>
      </div>`,
    botoes: `<button class="botao principal" id="copiar">Copiar ficha para o WhatsApp</button>`,
  });
  painelMalha("Beauty Brief: a ficha técnica de cada atendimento.");
  $("#copiar").addEventListener("click", async () => {
    const texto = briefParaTexto(brief);
    try { await navigator.clipboard.writeText(texto); avisar("Ficha copiada. É só colar no WhatsApp."); }
    catch { const pre = document.createElement("pre"); pre.textContent = texto; fluxo.append(pre); avisar("Selecione o texto no fim da página para copiar."); }
  });
};

// ---------------------------------------------------------------- bastidores
TELAS.bastidores = () => {
  const t = E.tempos;
  const m = E.medidas;
  const etapas = [
    ["medida", "Recriar a foto e checar o arquivo", "Formato real pelos bytes, tamanho, conteúdo escondido, metadados e GPS removidos.", "seguranca.js", null],
    ["medida", "Encontrar o rosto", "MediaPipe Face Landmarker: 478 pontos 3D, expressões e rotação da cabeça.", "rosto.js", t.detectar],
    ["medida", "Conferir a foto", "Rosto único, de frente, tamanho, luz, foco, olhos abertos.", "medidas.js", t.qualidade],
    ["medida", "Corrigir a luz", "Balanço de branco pelo branco do olho (esclera).", "medidas.js", t.luz],
    ["medida", "Medir", "Pele em CIELAB, ITA, escala Monk, subtom; íris; boca; sobrancelha; olheira; formatos.", "medidas.js + cor.js", t.medir],
    ["regra", "Montar a receita", "Regras declarativas da Thalita: cada adaptação tem um motivo escrito.", "regras.js + receita.js", t.receita],
    ["medida", "Prévia", "Pintura da receita sobre a foto (a mesma usada no espelho ao vivo).", "pintura.js", t.pintar],
    ["ia", "Foto realista (produção)", "A receita vira a instrução da IA de imagem. A foto e o texto da cliente entram só como dados.", "ia.js", null],
    ["medida", "Conferência automática", "Mesmo rosto? Cores dentro da tolerância (ΔE2000)? Se não, gera de novo.", "ia.js", null],
    ["ia", "Beauty Brief (produção)", "Os números vêm da medida e da receita. A IA só redige o texto.", "brief.js", null],
  ];
  montar({
    legenda: "O que é medida, o que é regra e onde entra a IA.",
    corpo: `
      <div><h1>Bastidores do motor</h1><p class="apoio">O que é medida (código no aparelho), o que é regra (conhecimento da Thalita) e onde entra a IA.</p></div>
      <ol class="etapas-motor">${etapas.map(([tipo, titulo, desc, arq, ms], i) => `<li><span class="tabular" style="color:var(--terra)">${i + 1}</span><span><b>${titulo}</b><br><span class="ajuda">${desc}</span><br><small class="ajuda">${arq}</small></span><span style="text-align:right"><span class="tipo ${tipo}">${tipo === "ia" ? "IA" : tipo}</span>${typeof ms === "number" ? `<br><small class="tabular ajuda">${ms} ms</small>` : ""}</span></li>`).join("")}</ol>
      <div class="aviso"><b>Leitor de rosto</b><span id="info-detector">${infoDetector().carregado ? `Carregado (${infoDetector().delegate}).` : "Ainda não carregado."}</span></div>
      ${m ? `
        <details><summary>Checagens da foto</summary><ul class="checks">${m.qualidade.checagens.map((c) => `<li class="${c.estado === "ok" ? "" : c.estado}">${esc(c.titulo)} <span class="tabular">(${typeof c.valor === "number" ? c.valor.toFixed(2) : "—"})</span>${c.dica ? `<small>${esc(c.dica)}</small>` : ""}</li>`).join("")}</ul></details>
        <details><summary>Medidas completas</summary><pre>${esc(JSON.stringify(m, (k, v) => (typeof v === "number" ? Math.round(v * 1000) / 1000 : v), 2))}</pre></details>
        <details><summary>Segurança do arquivo</summary><pre>${esc(JSON.stringify(E.seguranca, null, 2))}</pre></details>
        ${E.instrucao ? `<details><summary>Instrução para a IA</summary><pre>${esc(`${E.instrucao.sistema}\n\n${E.instrucao.usuario}`)}</pre></details>` : ""}` : `<p class="aviso">Rode o "Testar uma make" para ver aqui os números reais de cada etapa.</p>`}`,
  });
  painelMalha("O que é medida, o que é regra e onde entra a IA.");
  carregarDetector().then(() => { const el = $("#info-detector"); if (el) el.textContent = `Carregado (${infoDetector().delegate}).`; }).catch((e) => { const el = $("#info-detector"); if (el) el.textContent = `Não carregou neste navegador: ${e?.message ?? e}`; });
};

// ---------------------------------------------------------------- espelho ao vivo
const CATEGORIAS_AO_VIVO = [
  ["batom", "Batom"], ["sombra", "Sombra"], ["delineado", "Delineado"], ["mascara", "Máscara"], ["blush", "Blush"],
  ["contorno", "Contorno"], ["iluminador", "Iluminador"], ["sobrancelha", "Sobrancelha"], ["base", "Base"],
];

TELAS.aovivo = () => {
  const AV = E.aoVivo;
  // começa sem make: a pessoa maquia do zero, ou escolhe uma make pronta como ponto de partida
  montar({
    palco: true,
    corpo: `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><h2>Espelho ao vivo</h2><span style="display:flex;gap:16px"><button class="link" id="copiar-ref">Copiar de uma foto</button><button class="link" id="trocar-fonte">Usar uma foto</button></span></div>
      <div class="chips rolagem" id="prontas" aria-label="Makes prontas"><button class="chip" id="zerar" aria-pressed="${!Object.values(AV.estado).some(Boolean)}">Sem make</button>${PRONTAS_E_EPOCAS.map((p) => `<button class="chip" data-id="${p.id}" aria-pressed="${AV.pronta === p.id}" title="${esc(p.descricao ?? p.resumo ?? "")}">${esc(p.nome)}</button>`).join("")}</div>
      <div class="espelho" id="espelho">
        <video playsinline muted autoplay></video><canvas aria-label="Seu rosto com a make"></canvas>
        <span class="estado-espelho" id="estado-espelho">Abrindo a câmera…</span>
        <button class="comparar-btn" id="segurar" aria-label="Segure para ver sem make">${ICONE.olho}</button>
      </div>
      <div class="abas" role="tablist">${CATEGORIAS_AO_VIVO.map(([id, nome]) => `<button class="aba" role="tab" data-c="${id}" aria-selected="${AV.categoria === id}">${nome}</button>`).join("")}</div>
      <div id="controles" style="display:flex;flex-direction:column;gap:14px"></div>
      <input type="file" id="arquivo-av" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" class="so-leitor">
      <p class="nota">A câmera é processada no seu aparelho. Nada é gravado nem enviado.</p>`,
    botoes: `<button class="obturador" id="foto-av" aria-label="Tirar foto com a make"></button>`,
  });
  const video = $("#espelho video"), tela = $("#espelho canvas"), status = $("#estado-espelho");
  const pintor = criarPintor(tela);
  let ativo = true, stream = null, fonte = null, pontos = [], suave = null, segurando = false, fotoParada = null;
  aoSair(() => { ativo = false; stream?.getTracks().forEach((t) => t.stop()); pintor.liberar?.(); });

  const estadoAtual = () => (segurando ? {} : AV.estado);
  const suavizar = (novos) => {
    if (!suave || suave.length !== novos.length) return (suave = novos.map((p) => ({ ...p })));
    const a = 0.55;
    for (let i = 0; i < novos.length; i++) { suave[i].x += (novos[i].x - suave[i].x) * a; suave[i].y += (novos[i].y - suave[i].y) * a; suave[i].z = novos[i].z; }
    return suave;
  };
  const desenhar = () => { if (fonte) pintor.desenhar(fonte, pontos, estadoAtual(), { espelhar: !fotoParada }); };

  const iniciarCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("sem câmera");
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } }, audio: false });
      video.srcObject = stream; await video.play();
      await carregarDetector();
      fonte = video; fotoParada = null;
      status.textContent = "Ao vivo";
      let ultimo = 0, n = 0, soma = 0;
      const loop = async () => {
        if (!ativo || fotoParada) return;
        if (video.readyState >= 2) {
          const t0 = performance.now();
          const d = await detectarQuadro(video, t0);
          pontos = d.pontos.length ? suavizar(d.pontos) : [];
          desenhar();
          soma += performance.now() - t0; n++;
          if (t0 - ultimo > 1000) { status.textContent = `Ao vivo · ${Math.round(1000 / Math.max(1, soma / n))} qps máx.`; ultimo = t0; n = 0; soma = 0; }
        }
        requestAnimationFrame(loop);
      };
      loop();
    } catch {
      status.textContent = "Câmera indisponível aqui. Use uma foto.";
      $("#trocar-fonte").textContent = "Escolher foto";
      if (E.foto?.img) usarFoto(E.foto.img);
    }
  };
  const usarFoto = async (img) => {
    stream?.getTracks().forEach((t) => t.stop()); stream = null;
    fotoParada = img; fonte = img;
    status.textContent = "Lendo o rosto…";
    try {
      await carregarDetector();
      const d = await detectarFoto(img);
      pontos = d.pontos;
      status.textContent = pontos.length ? "Foto · mexa nas cores" : "Não achamos um rosto nessa foto";
    } catch (e) { status.textContent = `Leitor de rosto indisponível: ${e?.message ?? e}`; pontos = []; }
    desenhar();
  };
  $("#trocar-fonte").addEventListener("click", () => $("#arquivo-av").click());
  $("#copiar-ref").addEventListener("click", () => { E.referencia = { ...(E.referencia ?? {}), origem: "aovivo" }; ir("referencia"); });
  $("#arquivo-av").addEventListener("change", async (ev) => {
    const f = ev.target.files?.[0]; if (!f) return;
    const r = await prepararFoto(f);
    if (!r.ok) { avisar(r.checagens.find((c) => c.estado === "erro")?.titulo ?? "Foto recusada"); return; }
    const img = new Image(); img.src = r.url; await img.decode();
    usarFoto(img);
  });

  const segurar = $("#segurar");
  const ligar = (v) => (e) => { e.preventDefault(); segurando = v; desenhar(); };
  segurar.addEventListener("pointerdown", ligar(true));
  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => segurar.addEventListener(ev, ligar(false)));

  $$("#prontas .chip").forEach((c) => c.addEventListener("click", () => {
    const p = PRONTAS_E_EPOCAS.find((x) => x.id === c.dataset.id);
    AV.estado = p ? structuredClone(p.estado) : {}; AV.pronta = p?.id ?? null; // "Sem make" zera tudo
    $$("#prontas .chip").forEach((x) => x.setAttribute("aria-pressed", x === c));
    renderControles(); desenhar();
  }));
  $$(".aba").forEach((a) => a.addEventListener("click", () => {
    AV.categoria = a.dataset.c;
    $$(".aba").forEach((x) => x.setAttribute("aria-selected", x === a));
    renderControles();
  }));

  function renderControles() {
    const cat = AV.categoria;
    const camada = AV.estado[cat];
    const cores = PALETAS[cat] ?? [];
    const acabs = (ACABAMENTOS ?? []).filter((a) => !a.categorias || a.categorias.includes(cat));
    const estilos = cat === "sombra" ? ESTILOS_SOMBRA : cat === "delineado" ? ESTILOS_DELINEADO : null;
    // cor escolhida no seletor do aparelho (não está na paleta da Thalita)
    const livre = camada?.cor && !cores.some((c) => c.hex.toUpperCase() === camada.cor.toUpperCase()) ? camada.cor.toUpperCase() : null;
    const nomeCat = (CATEGORIAS_AO_VIVO.find(([id]) => id === cat)?.[1] ?? "make").toLowerCase();
    const nomeEstilo = { palpebra: "Pálpebra", esfumado: "Esfumado", asa: "Asa", fino: "Fino", gatinho: "Gatinho", marcado: "Marcado" };
    $("#controles").innerHTML = `
      <div class="cores" role="listbox" aria-label="Cores">
        <button class="cor nenhuma" data-hex="" aria-pressed="${!camada}"><i></i>Sem</button>
        ${cores.map((c) => `<button class="cor" data-hex="${c.hex}" data-id="${c.id}" aria-pressed="${camada?.cor?.toUpperCase() === c.hex.toUpperCase()}"><i style="background:${c.hex}"></i>${esc(c.nome)}</button>`).join("")}
        <label class="cor outra${livre ? " escolhida" : ""}" ${livre ? `style="--cor-livre:${livre}"` : ""}><i><b aria-hidden="true">+</b></i>${livre ? livre : "Outra cor"}<input type="color" id="cor-livre" value="${livre ?? cores[0]?.hex?.toLowerCase() ?? "#b5655e"}" aria-label="Escolher outra cor de ${esc(nomeCat)}"></label>
      </div>
      ${camada ? `
        ${acabs.length ? `<div class="chips rolagem" id="acabamentos">${acabs.map((a) => `<button class="chip" data-a="${a.id}" aria-pressed="${(camada.acabamento ?? "matte") === a.id}">${esc(a.nome)}</button>`).join("")}</div>` : ""}
        ${estilos ? `<div class="chips" id="estilos-av">${estilos.map((s) => `<button class="chip" data-s="${s}" aria-pressed="${(camada.estilo ?? estilos[0]) === s}">${nomeEstilo[s] ?? s}</button>`).join("")}</div>` : ""}
        <label class="controle"><span>Leve</span><input type="range" id="intensidade" min="0" max="100" value="${Math.round((camada.intensidade ?? 0.6) * 100)}" aria-label="Intensidade"><span>Forte</span></label>` : ""}`;
    $$(".cor").forEach((b) => b.addEventListener("click", () => {
      const hex = b.dataset.hex;
      if (!hex) AV.estado[cat] = null;
      else {
        const anterior = AV.estado[cat] ?? {};
        const def = cores.find((c) => c.hex === hex);
        AV.estado[cat] = { intensidade: 0.6, acabamento: def?.acabamentoPadrao ?? "matte", ...anterior, cor: hex };
        if (cat === "sombra") {
          const i = cores.findIndex((c) => c.hex === hex);
          AV.estado[cat].cores = [cores[Math.max(0, i - 1)]?.hex ?? hex, hex, cores[Math.min(cores.length - 1, i + 1)]?.hex ?? hex];
        }
      }
      AV.pronta = null; $$("#prontas .chip").forEach((x) => x.setAttribute("aria-pressed", "false"));
      navigator.vibrate?.(8);
      renderControles(); desenhar();
    }));
    // seletor de cor do próprio aparelho: pinta enquanto a pessoa arrasta e só redesenha os controles ao fechar
    const seletor = $("#cor-livre");
    const aplicarLivre = (hex) => {
      if (!/^#[0-9a-f]{6}$/i.test(hex)) return;
      hex = hex.toUpperCase();
      const acabPadrao = cat === "batom" ? "acetinado" : (ACABAMENTOS.find((a) => a.categorias.includes(cat))?.id ?? "matte");
      AV.estado[cat] = { intensidade: 0.6, acabamento: acabPadrao, ...(AV.estado[cat] ?? {}), cor: hex };
      if (cat === "sombra") AV.estado[cat].cores = [ajustar(hex, { dL: 18, croma: 0.7 }), hex, ajustar(hex, { dL: -22, croma: 1.05 })];
      AV.pronta = null; $$("#prontas .chip").forEach((x) => x.setAttribute("aria-pressed", "false"));
      desenhar();
    };
    seletor.addEventListener("input", (e) => aplicarLivre(e.target.value));
    seletor.addEventListener("change", (e) => { aplicarLivre(e.target.value); navigator.vibrate?.(8); renderControles(); });
    $$("#acabamentos .chip").forEach((b) => b.addEventListener("click", () => { AV.estado[cat].acabamento = b.dataset.a; renderControles(); desenhar(); }));
    $$("#estilos-av .chip").forEach((b) => b.addEventListener("click", () => { AV.estado[cat].estilo = b.dataset.s; renderControles(); desenhar(); }));
    $("#intensidade")?.addEventListener("input", (e) => { AV.estado[cat].intensidade = e.target.value / 100; desenhar(); });
  }
  renderControles();

  $("#foto-av").addEventListener("click", async () => {
    const blob = await fotoComMoldura(tela);
    await entregarFoto(blob);
  });
  acoes.insertAdjacentHTML("beforeend", `<button class="link" id="quero">Quero essa make: ver estudo completo</button>`);
  $("#quero").addEventListener("click", () => {
    E.variacaoId = E.variacaoId ?? "soft-glam-champanhe"; E.makeId = E.makeId ?? "soft-glam";
    E.pedidoAnalise = { ajustes: structuredClone(AV.estado), entendidos: ["cores escolhidas no espelho"], ignorados: [] };
    ir(E.momento ? "foto" : "momento");
  });
  iniciarCamera();
};

async function fotoComMoldura(tela) {
  const w = tela.width, h = tela.height, faixa = Math.round(h * 0.11);
  const c = document.createElement("canvas");
  c.width = w; c.height = h + faixa;
  const ctx = c.getContext("2d");
  ctx.drawImage(tela, 0, 0);
  ctx.fillStyle = "#2B1A15"; ctx.fillRect(0, h, w, faixa);
  ctx.fillStyle = "#D6B588"; ctx.font = `400 ${Math.round(faixa * 0.42)}px "Bodoni Moda", Georgia, serif`;
  ctx.textBaseline = "middle"; ctx.fillText("TM", faixa * 0.35, h + faixa / 2);
  ctx.fillStyle = "#F7EDE8"; ctx.fillText("Thalita Mariano", faixa * 1.25, h + faixa / 2);
  ctx.font = `400 ${Math.round(faixa * 0.2)}px "Hanken Grotesk", system-ui, sans-serif`;
  ctx.textAlign = "right"; ctx.fillStyle = "#BFA99C";
  ctx.fillText("Make feita no espelho do app", w - faixa * 0.35, h + faixa / 2);
  return new Promise((r) => c.toBlob(r, "image/jpeg", 0.92));
}

async function entregarFoto(blob) {
  const nome = `make-thalita-mariano-${Date.now()}.jpg`;
  const arquivo = new File([blob], nome, { type: "image/jpeg" });
  try {
    if (navigator.canShare?.({ files: [arquivo] })) { await navigator.share({ files: [arquivo], title: "Minha make", text: "Make feita no app da Thalita Mariano" }); return; }
  } catch (e) { if (e?.name === "AbortError") return; }
  try {
    const downloads = await window.claude?.use?.("downloads");
    if (downloads) { await downloads.save({ filename: nome, data: blob }); avisar("Foto pronta para salvar."); return; }
  } catch { /* segue para o próximo jeito */ }
  const url = URL.createObjectURL(blob);
  const sob = document.createElement("div");
  sob.className = "sobreposicao";
  sob.innerHTML = `<img alt="Sua foto com a make" src="${url}"><p>Pressione e segure a foto para salvar ou compartilhar.</p><a class="botao claro" href="${url}" download="${nome}">Baixar foto</a><button class="link" style="color:#fff">Fechar</button>`;
  sob.querySelector("button").addEventListener("click", () => { sob.remove(); URL.revokeObjectURL(url); });
  document.body.append(sob);
}

// ---------------------------------------------------------------- início
ir("inicio");
window.__thalita = { E, ir }; // usado pelos testes de ponta a ponta
