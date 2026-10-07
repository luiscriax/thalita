// Blindagem da foto e do texto da cliente. Tudo roda no aparelho, antes de qualquer envio.
//
// FOTO: o arquivo nunca é usado como chegou. Primeiro olhamos os bytes (o tipo verdadeiro, não o
// nome nem o "mime" que o navegador informa), recusamos o que não é foto (SVG, HTML, PDF, executável
// disfarçado de .jpg), conferimos as dimensões no cabeçalho ANTES de decodificar (contra "bomba de
// descompressão") e então a imagem é RECRIADA do zero num canvas e exportada como JPEG novo.
// Com isso somem: localização (GPS), dados da câmera (EXIF), perfis, comentários e qualquer coisa
// escondida depois do fim da imagem (arquivos "poliglotas"). O que vai para a IA é só pixel.
//
// TEXTO: o pedido da cliente é DADO, nunca instrução. Limpamos caracteres invisíveis e de controle,
// tiramos tags, links, e-mails e telefones, e cortamos trechos que tentam mandar na IA
// ("ignore as instruções", "mostre a chave da API", "aprove desconto"…). Na instrução da IA o
// texto ainda vai entre delimitadores e marcado como dado (ver ia.js) — são duas camadas.
//
// Funções puras (inspecionarBytes, analisarTexto) rodam também no Node, para os testes.

/** @typedef {import("./tipos.js").Checagem} Checagem */

export const LIMITES_FOTO = Object.freeze({
  bytesMax: 15 * 1024 * 1024, // 15 MB
  ladoMin: 320, // menor lado em pixels
  ladoMax: 12000, // maior lado aceito no cabeçalho
  megapixelsMax: 50, // acima disso pode ser bomba de descompressão
  ladoSaida: 1600, // a foto recriada tem no máximo isto no maior lado
  qualidadeJpeg: 0.92,
});

const checagem = (id, estado, titulo, dica) => (dica ? { id, estado, titulo, dica } : { id, estado, titulo });

// ───────────────────────────── bytes ─────────────────────────────

const u16be = (b, i) => (b[i] << 8) | b[i + 1];
const u16le = (b, i) => b[i] | (b[i + 1] << 8);
const u24le = (b, i) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
const u32be = (b, i) => ((b[i] << 24) >>> 0) + ((b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]);
const ascii = (b, i, n) => {
  let s = "";
  const fim = Math.min(b.length, i + n);
  for (let k = i; k < fim; k += 8192) s += String.fromCharCode.apply(null, b.subarray(k, Math.min(fim, k + 8192)));
  return s;
};

/** Tipo verdadeiro pelo começo do arquivo ("número mágico"). */
export function tipoPelosBytes(b) {
  if (!b || b.length < 12) return "desconhecido";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b[0] === 0x89 && ascii(b, 1, 3) === "PNG" && b[4] === 0x0d && b[5] === 0x0a) return "png";
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return "webp";
  if (ascii(b, 4, 4) === "ftyp") {
    const marca = ascii(b, 8, 4);
    if (/^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(marca)) return "heic";
    if (/^avi[fs]$/.test(marca)) return "avif";
    return "video";
  }
  if (ascii(b, 0, 3) === "GIF") return "gif";
  if (ascii(b, 0, 2) === "BM") return "bmp";
  if (ascii(b, 0, 4) === "%PDF") return "pdf";
  if (b[0] === 0x4d && b[1] === 0x5a) return "executavel";
  if (ascii(b, 0, 4) === "PK\u0003\u0004") return "zip";
  // texto: SVG, HTML, XML, script
  const inicio = ascii(b, 0, Math.min(b.length, 512)).replace(/^(\u00EF\u00BB\u00BF|\uFEFF|\s)+/, "").toLowerCase();
  if (/^<(\?xml|svg|!doctype|html|script|body|head)/.test(inicio) || inicio.includes("<svg")) return "texto-marcado";
  return "desconhecido";
}

/** Lê dimensões e "extras" de um JPEG. */
function lerJpeg(b) {
  const r = { largura: 0, altura: 0, exif: false, gps: false, fimEm: -1, comentario: false, segmentosApp: 0 };
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m === 0xff) { i++; continue; }
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
    if (m === 0xd9) { r.fimEm = i + 2; break; }
    const tam = u16be(b, i + 2);
    if (tam < 2) break;
    if (m >= 0xe0 && m <= 0xef) r.segmentosApp++;
    if (m === 0xe1 && ascii(b, i + 4, 4) === "Exif") {
      r.exif = true;
      // a tag GPS (0x8825) aparece no diretório do EXIF; procura nos dois sentidos de bytes
      const fim = Math.min(b.length - 1, i + 2 + tam);
      for (let k = i + 10; k < fim; k++) if ((b[k] === 0x88 && b[k + 1] === 0x25) || (b[k] === 0x25 && b[k + 1] === 0x88)) { r.gps = true; break; }
    }
    if (m === 0xfe) r.comentario = true;
    // SOF0..SOF15 (menos DHT 0xC4, JPG 0xC8, DAC 0xCC) trazem as dimensões
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc && !r.largura) {
      r.altura = u16be(b, i + 5);
      r.largura = u16be(b, i + 7);
    }
    if (m === 0xda) {
      // dados comprimidos: pula até o próximo marcador que não seja recheio (FF00) nem reinício
      i += 2 + tam;
      while (i + 1 < b.length && !(b[i] === 0xff && b[i + 1] !== 0x00 && !(b[i + 1] >= 0xd0 && b[i + 1] <= 0xd7))) i++;
      continue;
    }
    i += 2 + tam;
  }
  return r;
}

/** Lê dimensões e "extras" de um PNG. */
function lerPng(b) {
  const r = { largura: 0, altura: 0, exif: false, gps: false, fimEm: -1, comentario: false };
  let i = 8;
  while (i + 12 <= b.length) {
    const tam = u32be(b, i);
    const tipo = ascii(b, i + 4, 4);
    if (tipo === "IHDR") { r.largura = u32be(b, i + 8); r.altura = u32be(b, i + 12); }
    if (tipo === "eXIf") r.exif = true;
    if (tipo === "tEXt" || tipo === "zTXt" || tipo === "iTXt") r.comentario = true;
    if (tipo === "IEND") { r.fimEm = i + 12 + tam; break; }
    if (tam > b.length) break;
    i += 12 + tam;
  }
  return r;
}

/** Lê dimensões e "extras" de um WebP. */
function lerWebp(b) {
  const r = { largura: 0, altura: 0, exif: false, gps: false, fimEm: -1, comentario: false };
  r.fimEm = 8 + (b[4] | (b[5] << 8) | (b[6] << 16) | ((b[7] << 24) >>> 0));
  let i = 12;
  while (i + 8 <= b.length && i < r.fimEm) {
    const tipo = ascii(b, i, 4);
    const tam = u16le(b, i + 4) + (u16le(b, i + 6) << 16);
    const d = i + 8;
    if (tipo === "VP8X" && !r.largura) { r.largura = 1 + u24le(b, d + 4); r.altura = 1 + u24le(b, d + 7); }
    if (tipo === "VP8 " && !r.largura) { r.largura = u16le(b, d + 6) & 0x3fff; r.altura = u16le(b, d + 8) & 0x3fff; }
    if (tipo === "VP8L" && !r.largura) {
      const v = b[d + 1] | (b[d + 2] << 8) | (b[d + 3] << 16) | (b[d + 4] << 24);
      r.largura = 1 + (v & 0x3fff); r.altura = 1 + ((v >>> 14) & 0x3fff);
    }
    if (tipo === "EXIF") r.exif = true;
    if (tipo === "XMP ") r.comentario = true;
    i = d + tam + (tam & 1);
  }
  return r;
}

/** Procura "cheiro" de código escondido dentro dos bytes (só um alerta: a recriação já descarta tudo). */
function procurarCodigo(b) {
  const amostra = ascii(b, 0, Math.min(b.length, 2 * 1024 * 1024)).toLowerCase();
  return /<script|<\?php|javascript:|<iframe|onerror\s*=|eval\(|powershell|#!\/bin\/(ba)?sh/.test(amostra);
}

/**
 * Inspeciona os bytes de um arquivo de foto. Função pura (roda no Node).
 * @param {Uint8Array} b
 * @param {{nome?:string, mimeInformado?:string}} [info]
 * @returns {{ok:boolean, tipo:string, largura:number, altura:number, checagens:Checagem[]}}
 */
export function inspecionarBytes(b, info = {}) {
  const L = LIMITES_FOTO;
  /** @type {Checagem[]} */
  const checagens = [];
  const tipo = tipoPelosBytes(b);
  const recusar = (titulo, dica) => {
    checagens.push(checagem("tipo", "erro", titulo, dica));
    return { ok: false, tipo, largura: 0, altura: 0, checagens };
  };
  if (!b || !b.length) return recusar("Arquivo vazio", "Escolha uma foto do seu rosto.");
  if (b.length > L.bytesMax) {
    checagens.push(checagem("tamanho-arquivo", "erro", "Arquivo grande demais", `Use uma foto com até ${Math.round(L.bytesMax / 1048576)} MB.`));
    return { ok: false, tipo, largura: 0, altura: 0, checagens };
  }
  if (tipo === "heic") return recusar("Formato HEIC ainda não é aceito aqui", "No iPhone, mande pela câmera do app ou exporte como JPG.");
  if (!["jpeg", "png", "webp"].includes(tipo)) {
    const disfarce = /\.(jpe?g|png|webp|heic)$/i.test(info.nome ?? "") || /^image\//.test(info.mimeInformado ?? "");
    return recusar(disfarce ? "Esse arquivo não é uma foto de verdade" : "Formato não aceito", "Envie uma foto JPG, PNG ou WebP.");
  }
  checagens.push(checagem("tipo", "ok", `Foto ${tipo.toUpperCase()} verdadeira`));

  const d = tipo === "jpeg" ? lerJpeg(b) : tipo === "png" ? lerPng(b) : lerWebp(b);
  if (!d.largura || !d.altura) return recusar("Não conseguimos ler essa foto", "Ela pode estar corrompida. Tente outra.");
  if (Math.max(d.largura, d.altura) > L.ladoMax || (d.largura * d.altura) / 1e6 > L.megapixelsMax) {
    checagens.push(checagem("dimensoes", "erro", "Foto grande demais para abrir com segurança", "Use uma foto comum do celular."));
    return { ok: false, tipo, largura: d.largura, altura: d.altura, checagens };
  }
  if (Math.min(d.largura, d.altura) < L.ladoMin) {
    checagens.push(checagem("dimensoes", "erro", "Foto pequena demais", `Precisa ter pelo menos ${L.ladoMin} pixels no menor lado.`));
    return { ok: false, tipo, largura: d.largura, altura: d.altura, checagens };
  }
  if (info.mimeInformado && !info.mimeInformado.includes(tipo === "jpeg" ? "jp" : tipo)) {
    checagens.push(checagem("disfarce", "atencao", "O nome do arquivo não batia com o conteúdo", "Tudo bem: usamos o tipo verdadeiro e recriamos a foto."));
  }
  if (d.gps) checagens.push(checagem("gps", "ok", "Localização da foto removida", "A foto tinha GPS; a versão recriada não tem."));
  else if (d.exif) checagens.push(checagem("exif", "ok", "Dados da câmera removidos", "Modelo, data e outras informações não seguem com a foto."));
  if (d.comentario) checagens.push(checagem("texto-embutido", "ok", "Textos escondidos no arquivo removidos"));
  if (d.fimEm > 0 && b.length - d.fimEm > 16) {
    checagens.push(checagem("anexo-escondido", "atencao", "Havia conteúdo escondido depois da imagem", "Ele foi descartado: a foto foi recriada do zero."));
  }
  if (procurarCodigo(b)) {
    checagens.push(checagem("codigo", "atencao", "Encontramos trechos de código no arquivo", "Nada disso é executado: a foto foi recriada só com os pixels."));
  }
  return { ok: true, tipo, largura: d.largura, altura: d.altura, checagens };
}

// ───────────────────────────── foto (navegador) ─────────────────────────────

/**
 * Prepara a foto da cliente: inspeciona os bytes, decodifica com limite, recria do zero.
 * @param {Blob & {name?:string}} arquivo
 * @returns {Promise<{ok:boolean, url?:string, blob?:Blob, largura?:number, altura?:number, tipoOriginal?:string, checagens:Checagem[]}>}
 */
export async function prepararFoto(arquivo) {
  if (!arquivo || typeof arquivo.arrayBuffer !== "function") {
    return { ok: false, checagens: [checagem("tipo", "erro", "Nenhuma foto recebida", "Escolha uma foto do seu rosto.")] };
  }
  if (arquivo.size > LIMITES_FOTO.bytesMax) {
    return { ok: false, checagens: [checagem("tamanho-arquivo", "erro", "Arquivo grande demais", `Use uma foto com até ${Math.round(LIMITES_FOTO.bytesMax / 1048576)} MB.`)] };
  }
  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  const insp = inspecionarBytes(bytes, { nome: arquivo.name, mimeInformado: arquivo.type });
  if (!insp.ok) return { ok: false, checagens: insp.checagens };

  // Decodifica a partir de um Blob NOVO com o tipo verdadeiro (nunca confia no tipo informado).
  const limpo = new Blob([bytes], { type: `image/${insp.tipo}` });
  let bitmap;
  try {
    bitmap = await createImageBitmap(limpo, { imageOrientation: "from-image" });
  } catch {
    return { ok: false, checagens: [...insp.checagens.filter((c) => c.estado !== "ok"), checagem("decodificar", "erro", "Não conseguimos abrir essa imagem", "Ela pode estar corrompida. Tente outra foto.")] };
  }
  const escala = Math.min(1, LIMITES_FOTO.ladoSaida / Math.max(bitmap.width, bitmap.height));
  const largura = Math.max(1, Math.round(bitmap.width * escala));
  const altura = Math.max(1, Math.round(bitmap.height * escala));
  const canvas = document.createElement("canvas");
  canvas.width = largura; canvas.height = altura;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; // PNG com transparência vira fundo branco
  ctx.fillRect(0, 0, largura, altura);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, largura, altura);
  bitmap.close?.();
  const blob = await new Promise((ok) => canvas.toBlob(ok, "image/jpeg", LIMITES_FOTO.qualidadeJpeg));
  canvas.width = canvas.height = 0;
  if (!blob) return { ok: false, checagens: [checagem("recriar", "erro", "Não conseguimos preparar a foto", "Tente outra foto.")] };
  const checagens = [...insp.checagens, checagem("recriada", "ok", "Foto recriada do zero no seu aparelho", `${largura}×${altura} px, só os pixels; nada do arquivo original segue adiante.`)];
  return { ok: true, url: URL.createObjectURL(blob), blob, largura, altura, tipoOriginal: insp.tipo, checagens };
}

// ───────────────────────────── texto ─────────────────────────────

/** Trechos que tentam dar ordens à IA ou ao sistema. Ficam de fora do pedido. */
const TENTATIVAS = [
  { id: "ignorar-instrucoes", re: /\b(ignor[ea]\w*|esque[cç]\w*|desconsider\w*|disregard|forget|ignore)\b[^.!?\n]{0,40}\b(instru[cç]\w*|regras?|ordens?|comandos?|prompt|instructions?|rules?|above|anteriores?|previous)\b/i },
  { id: "mudar-papel", re: /\b(voc[eê] (agora )?[eé] (um|uma|o|a)\b|a partir de agora|aja como|finja (ser|que)|act as|you are now|pretend|modo (desenvolvedor|dev|deus)|developer mode|jailbreak|\bDAN\b)/i },
  { id: "pedir-segredo", re: /\b(chave|key|token|senha|password|secret|segredo|credencia\w*|api[\s_-]?key|vari[aá]ve(l|is) de ambiente|env\b|\.env|service[_\s-]?role)\b/i },
  { id: "sistema", re: /\b(system prompt|sistema\s*:|system\s*:|prompt do sistema|instru[cç][aã]o do sistema|mensagem do sistema|\[\s*system\s*\]|<\s*\/?\s*(system|instrucao|instruction|pedido|prompt)\b)/i },
  { id: "dinheiro", re: /\b(desconto|gr[aá]tis|de gra[cç]a|free|pre[cç]o|valor|reembolso|estorno|aprova\w*|pagamento|pix|cupom)\b/i },
  { id: "rosto", re: /\b(mud\w*|troc\w*|alter\w*|afin\w*|emagre\w*|clare\w*|branque\w*|escure\w*|rejuvene\w*|envelhe\w*)\b[^.!?\n]{0,25}\b(rosto|nariz|pele|cor da pele|ra[cç]a|etnia|idade|corpo|queixo|olhos? (azuis|verdes)|cabelo|fundo)\b/i },
  { id: "codigo", re: /(```|<\s*script|javascript:|\beval\s*\(|base64|\bselect\b.+\bfrom\b|\bdrop\s+table\b|\{\{|\$\{)/i },
];

const INVISIVEIS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F­͏؜ᅟᅠ឴឵᠋-᠏​-‏‪-‮⁠-⁯ㅤ︀-️﻿ﾠ￰-￿]/g;
const URL_RE = /\b(?:https?:\/\/|www\.)\S+|\b[\w-]+\.(?:com|net|org|io|br|ai|app|dev|xyz|info)(?:\.br)?(?:\/\S*)?/gi;
const EMAIL_RE = /\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b/g;
const TELEFONE_RE = /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?9?\d{4}[-\s]?\d{4}\b/g;

/**
 * Limpa e analisa o pedido livre da cliente. O resultado é DADO para o motor e para a IA.
 * @param {string} texto
 * @param {{limite?:number}} [opcoes]
 * @returns {{texto:string, alertas:{id:string, trecho:string}[], suspeito:boolean, removidos:string[]}}
 */
export function analisarTexto(texto, opcoes = {}) {
  const limite = Math.max(1, Math.floor(opcoes.limite ?? 300));
  /** @type {{id:string, trecho:string}[]} */
  const alertas = [];
  /** @type {string[]} */
  const removidos = [];
  if (typeof texto !== "string" || !texto) return { texto: "", alertas, suspeito: false, removidos };

  let t = texto.slice(0, limite * 4).normalize("NFKC");
  if (INVISIVEIS.test(t)) { alertas.push({ id: "invisiveis", trecho: "caracteres invisíveis" }); t = t.replace(INVISIVEIS, ""); }
  INVISIVEIS.lastIndex = 0;
  const semTags = t.replace(/<[^>]{0,200}>/g, "\n");
  if (semTags !== t) { alertas.push({ id: "tags", trecho: "marcações" }); removidos.push("marcações"); t = semTags; }
  const trocar = (re, id, nome) => {
    const achou = t.match(re);
    if (achou) { alertas.push({ id, trecho: nome }); removidos.push(nome); t = t.replace(re, " "); }
  };
  trocar(EMAIL_RE, "email", "e-mail");
  trocar(URL_RE, "link", "link");
  trocar(TELEFONE_RE, "telefone", "telefone");

  // corta por frase/linha/ponto e vírgula e tira as frases que tentam mandar na IA
  const partes = t.split(/(?<=[.!?;\n])|\s+(?=e (?:ignore|esque[cç]a|mostre|me (?:d[eê]|passe)))/i);
  const mantidas = [];
  for (const parte of partes) {
    const p = parte.trim();
    if (!p) continue;
    const semAcento = p.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // \b do JS não entende "ç", "õ"
    const hit = TENTATIVAS.find((x) => x.re.test(semAcento));
    if (hit) { alertas.push({ id: hit.id, trecho: p.slice(0, 60) }); removidos.push(p.slice(0, 60)); continue; }
    mantidas.push(p);
  }
  t = mantidas.join(" ").replace(/\s+/g, " ").replace(/\s+([,.!?;])/g, "$1").trim();
  // repetição absurda de caracteres ("aaaaaaaa…") vira no máximo 3
  t = t.replace(/(.)\1{3,}/g, "$1$1$1");
  if (t.length > limite) t = t.slice(0, limite).replace(/\s+\S*$/, "").trim();
  const suspeito = alertas.some((a) => TENTATIVAS.some((x) => x.id === a.id) || a.id === "invisiveis" || a.id === "tags");
  return { texto: t, alertas, suspeito, removidos };
}
