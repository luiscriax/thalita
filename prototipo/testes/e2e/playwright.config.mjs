import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

const raiz = resolve(new URL("../..", import.meta.url).pathname);
const camera = resolve(raiz, "testes/fixtures/camera-falsa.y4m");
const args = [
  "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
  "--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-video-capture=${camera}`,
];

export default defineConfig({
  testDir: ".",
  outputDir: resolve(raiz, "testes/resultados/e2e"),
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: { baseURL: "http://localhost:4400", launchOptions: { args }, permissions: ["camera"], trace: "retain-on-failure" },
  projects: [
    { name: "celular", use: { ...devices["Pixel 7"], launchOptions: { args } } },
    { name: "computador", use: { viewport: { width: 1440, height: 900 }, launchOptions: { args } } },
  ],
  webServer: { command: "node scripts/servir.mjs", env: { PORTA: "4400" }, url: "http://localhost:4400/", cwd: raiz, reuseExistingServer: true },
});
