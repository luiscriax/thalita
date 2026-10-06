// Provedores de IA (ADR 0001). Só no servidor: nunca importar em componente do navegador.
import { execFile } from "node:child_process";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

export const MODELO_SIMULACAO = "gemini-3.1-flash-image";

export type Imagem = { dados: Buffer; tipo: string };
export type ResultadoImagem = Imagem & { provedor: string; tokens?: number };

export interface ProvedorIA {
  nome: string;
  gerarImagem(prompt: string, imagens: Imagem[]): Promise<ResultadoImagem>;
  /** Texto estruturado (JSON no esquema pedido), ex.: Beauty Brief. */
  gerarJSON(modelo: string, prompt: string, imagens: Imagem[], esquema: object): Promise<unknown>;
}

const URL_GEMINI = (modelo: string) => `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;

function partes(prompt: string, imagens: Imagem[]) {
  return [{ parts: [{ text: prompt }, ...imagens.map((i) => ({ inlineData: { mimeType: i.tipo, data: i.dados.toString("base64") } }))] }];
}

// Sem formato fixo: o modelo devolve no tamanho da foto enviada, sem recortar o enquadramento original.
function corpo(prompt: string, imagens: Imagem[]) {
  return { contents: partes(prompt, imagens), generationConfig: { responseModalities: ["IMAGE"] } };
}

function corpoJSON(prompt: string, imagens: Imagem[], esquema: object) {
  return { contents: partes(prompt, imagens), generationConfig: { responseMimeType: "application/json", responseSchema: esquema } };
}

function lerJSON(d: { candidates?: { content?: { parts?: { text?: string }[] } }[]; error?: { message?: string } }): unknown {
  const texto = d.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!texto) throw new Error(d.error?.message ?? "A IA não devolveu texto.");
  return JSON.parse(texto);
}

type RespostaGemini = {
  candidates?: { content?: { parts?: { inlineData?: { mimeType: string; data: string } }[] } }[];
  usageMetadata?: { candidatesTokenCount?: number };
  error?: { message?: string };
};

function lerResposta(d: RespostaGemini, provedor: string): ResultadoImagem {
  const parte = d.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
  if (!parte?.inlineData) throw new Error(d.error?.message ?? "A IA não devolveu imagem.");
  return { dados: Buffer.from(parte.inlineData.data, "base64"), tipo: parte.inlineData.mimeType, provedor, tokens: d.usageMetadata?.candidatesTokenCount };
}

/** Produção: chave própria do Gemini (variável de ambiente do servidor). */
export function provedorGeminiApi(chave: string): ProvedorIA {
  return {
    nome: "gemini-api",
    async gerarImagem(prompt, imagens) {
      const r = await fetch(URL_GEMINI(MODELO_SIMULACAO), {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": chave },
        body: JSON.stringify(corpo(prompt, imagens)),
      });
      return lerResposta((await r.json()) as RespostaGemini, "gemini-api");
    },
    async gerarJSON(modelo, prompt, imagens, esquema) {
      const r = await fetch(URL_GEMINI(modelo), {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": chave },
        body: JSON.stringify(corpoJSON(prompt, imagens, esquema)),
      });
      return lerJSON(await r.json());
    },
  };
}

/** Só desenvolvimento local: usa a conexão Gemini do Composio pela linha de comando (não roda na Vercel). */
export function provedorComposio(): ProvedorIA {
  const exec = promisify(execFile);
  async function chamar(modelo: string, body: object): Promise<unknown> {
    const arquivo = path.join(tmpdir(), `ia-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    await writeFile(arquivo, JSON.stringify(body));
    try {
      const { stdout } = await exec(
        "composio",
        ["proxy", URL_GEMINI(modelo), "--toolkit", "gemini", "-X", "POST", "-H", "content-type: application/json", "-d", `@${arquivo}`],
        { maxBuffer: 64 * 1024 * 1024, timeout: 120_000 },
      );
      return JSON.parse(stdout);
    } finally {
      await unlink(arquivo).catch(() => {});
    }
  }
  return {
    nome: "composio",
    async gerarImagem(prompt, imagens) {
      return lerResposta((await chamar(MODELO_SIMULACAO, corpo(prompt, imagens))) as RespostaGemini, "composio");
    },
    async gerarJSON(modelo, prompt, imagens, esquema) {
      return lerJSON((await chamar(modelo, corpoJSON(prompt, imagens, esquema))) as Parameters<typeof lerJSON>[0]);
    },
  };
}

/** Testes e demonstração sem custo: devolve a simulação de exemplo. */
export function provedorSimulado(): ProvedorIA {
  return {
    nome: "simulado",
    async gerarImagem() {
      return { dados: await readFile(path.join(process.cwd(), "public/demo/depois.jpg")), tipo: "image/jpeg", provedor: "simulado" };
    },
    async gerarJSON() {
      return (await import("@/lib/data/mock/brief")).BRIEF_EXEMPLO;
    },
  };
}

/** Escolhe o provedor: chave própria > Composio (só em dev) > simulado. */
export function escolherProvedor(env: Record<string, string | undefined> = process.env): ProvedorIA {
  if (env.GEMINI_API_KEY) return provedorGeminiApi(env.GEMINI_API_KEY);
  if (env.NODE_ENV === "development" && env.IA_COMPOSIO !== "0") return provedorComposio();
  return provedorSimulado();
}
