// Testes de ponta a ponta: o protótipo inteiro rodando no Chromium, com MediaPipe de verdade,
// foto real de teste e câmera falsa (vídeo .y4m). Screenshots vão para testes/resultados/telas/.
import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const raiz = resolve(new URL("../..", import.meta.url).pathname);
const foto = (n) => resolve(raiz, "testes/fixtures/fotos", n);
const telas = resolve(raiz, "testes/resultados/telas");

async function abrir(page) {
  const erros = [];
  page.on("pageerror", (e) => erros.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error" && !/favicon|fonts\.g/.test(m.text())) erros.push(m.text()); });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("A make certa");
  return erros;
}
const print = async (page, nome, info) => {
  await mkdir(telas, { recursive: true });
  await page.screenshot({ path: `${telas}/${info.project.name}-${nome}.png`, fullPage: false });
};

async function escolherAteFoto(page, info) {
  await page.getByRole("button", { name: /Testar uma make/ }).click();
  await page.locator(".card-momento", { hasText: "Casamento" }).click();
  await print(page, "01-momento", info);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.getByRole("radio", { name: /Madrinha/ }).click();
  await print(page, "02-papel", info);
  await page.getByRole("button", { name: "Continuar" }).click();
  await page.locator(".card-estilo", { hasText: "Soft Glam champanhe" }).click();
  await print(page, "03-estilo", info);
  await page.getByRole("button", { name: "Ver em mim" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Vamos ver essa make");
  await print(page, "04-foto", info);
}

test("fluxo completo com foto enviada: estudo, receita, prévia, agendamento e Beauty Brief", async ({ page }, info) => {
  const erros = await abrir(page);
  await print(page, "00-inicio", info);
  await escolherAteFoto(page, info);
  await page.locator("#arquivo").setInputFiles(foto("rosto-frontal.png"));
  await expect(page.getByRole("heading", { name: "Ficou boa?" })).toBeVisible();
  await page.locator("#pedido").fill("boca mais rosada e olho mais leve");
  await expect(page.locator("#entendido")).toContainText("Entendi");
  await expect(page.getByRole("button", { name: "Usar esta foto" })).toBeDisabled();
  await page.getByText("Autorizo o uso desta foto").click();
  await print(page, "05-confirmar", info);
  await page.getByRole("button", { name: "Usar esta foto" }).click();
  await expect(page.getByRole("heading", { name: "Sua make" })).toBeVisible({ timeout: 90_000 });
  await print(page, "06-resultado", info);
  const E = await page.evaluate(() => {
    const { E } = window.__thalita;
    return { pontos: E.deteccao.pontos.length, monk: E.medidas.pele.monk.n, aprovada: E.medidas.qualidade.aprovada, itens: E.receita.itens.length, tempos: E.tempos };
  });
  expect(E.pontos).toBe(478);
  expect(E.aprovada).toBe(true);
  expect(E.itens).toBeGreaterThan(5);
  // a prévia tem de ser diferente da foto original
  const diferenca = await page.evaluate(() => {
    const [a, d] = document.querySelectorAll("#comparar canvas");
    const pa = a.getContext("2d").getImageData(0, 0, a.width, a.height).data;
    const pd = d.getContext("2d").getImageData(0, 0, d.width, d.height).data;
    let s = 0; for (let i = 0; i < pa.length; i += 4) s += Math.abs(pa[i] - pd[i]) + Math.abs(pa[i + 1] - pd[i + 1]) + Math.abs(pa[i + 2] - pd[i + 2]);
    return s / (pa.length / 4);
  });
  expect(diferenca).toBeGreaterThan(0.5);
  await page.getByRole("button", { name: "Mais intenso" }).click();
  await page.locator("#det-conf summary").click();
  await expect(page.locator("#conferencia")).toContainText(/Aprovada|gerar de novo/, { timeout: 60_000 });
  await print(page, "07-conferencia", info);
  await page.getByRole("button", { name: "Agendar com a Thalita" }).click();
  await page.locator("#dias .chip").first().click();
  await page.locator("#horas .chip").nth(2).click();
  await print(page, "08-agendar", info);
  await page.getByRole("button", { name: "Enviar pedido" }).click();
  await expect(page.getByRole("heading", { name: /Agora é com a Thalita/ })).toBeVisible();
  await page.getByRole("button", { name: "Ver o que a Thalita recebe" }).click();
  await expect(page.locator(".brief-chart svg")).toBeVisible();
  await expect(page.locator(".ordem li").first()).toBeVisible();
  await print(page, "09-brief", info);
  const texto = await page.locator("#fluxo").innerText();
  expect(texto.toLowerCase()).not.toContain(" look");
  expect(erros, erros.join("\n")).toEqual([]);
  console.log(`[${info.project.name}] tempos do motor (ms):`, JSON.stringify(E.tempos), "Monk", E.monk);
});

test("foto com problema pede outra e arquivo perigoso é recusado", async ({ page }, info) => {
  await abrir(page);
  await escolherAteFoto(page, info);
  // SVG disfarçado de JPG
  await page.locator("#arquivo").setInputFiles({ name: "foto.jpg", mimeType: "image/jpeg", buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>') });
  await expect(page.locator(".toast")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Vamos ver essa make");
  // foto muito escura: o estudo pede outra
  await page.locator("#arquivo").setInputFiles(foto("rosto-escuro.png"));
  await page.getByText("Autorizo o uso desta foto").click();
  await page.getByRole("button", { name: "Usar esta foto" }).click();
  await expect(page.locator("#etapas")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sua make" }).or(page.getByText("Vamos tirar outra?"))).toBeVisible({ timeout: 90_000 });
  await print(page, "10-foto-escura", info);
});

test("espelho ao vivo com câmera: pinta, troca cor e tira foto", async ({ page }, info) => {
  const erros = await abrir(page);
  await page.getByRole("button", { name: /Espelho ao vivo/ }).click();
  await expect(page.locator("#estado-espelho")).toContainText("Ao vivo", { timeout: 60_000 });
  await page.waitForTimeout(1500);
  await print(page, "11-ao-vivo", info);
  await page.getByRole("tab", { name: "Batom" }).click();
  await page.locator(".cor").nth(5).click();
  await page.getByRole("tab", { name: "Sombra" }).click();
  await page.locator(".cor").nth(3).click();
  await page.waitForTimeout(800);
  await print(page, "12-ao-vivo-cores", info);
  await page.getByRole("button", { name: "Tirar foto com a make" }).click();
  await expect(page.locator(".sobreposicao img")).toBeVisible({ timeout: 15_000 });
  await print(page, "13-foto-moldura", info);
  expect(erros, erros.join("\n")).toEqual([]);
});

test("câmera do estudo mostra a malha e o estado do enquadramento", async ({ page }, info) => {
  await abrir(page);
  await escolherAteFoto(page, info);
  await page.getByRole("button", { name: /Escanear meu rosto/ }).click();
  await expect(page.locator("#pilula")).not.toHaveText("Abrindo a câmera…", { timeout: 60_000 });
  await page.waitForTimeout(1200);
  await print(page, "14-camera", info);
  await page.getByRole("button", { name: "Tirar foto" }).click();
  await expect(page.getByRole("heading", { name: "Ficou boa?" })).toBeVisible({ timeout: 20_000 });
});

test("bastidores e studio de exemplo abrem sem análise", async ({ page }, info) => {
  const erros = await abrir(page);
  await page.getByRole("button", { name: /O que a Thalita recebe/ }).click();
  await expect(page.locator(".brief-chart svg")).toBeVisible();
  await print(page, "15-brief-exemplo", info);
  await page.getByRole("button", { name: "Voltar" }).click();
  await page.getByRole("button", { name: /Bastidores do motor/ }).click();
  await expect(page.getByRole("heading", { name: "Bastidores do motor" })).toBeVisible();
  await expect(page.locator("#info-detector")).toContainText(/Carregado/, { timeout: 60_000 });
  await print(page, "16-bastidores", info);
  expect(erros, erros.join("\n")).toEqual([]);
});
