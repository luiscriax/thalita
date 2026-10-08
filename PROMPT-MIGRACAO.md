# Prompt de migração e fusão — Thalita Mariano

> **Como usar:** copie este repositório (`luiscriax/thalita`, branch `claude/sharp-hawking-4qgv4q`) para dentro do projeto real, por exemplo numa pasta `_laboratorio/`. Depois cole o texto abaixo, a partir de "Você vai trabalhar…", no assistente de IA que trabalha no projeto real (Claude Code ou outro). O texto pede que ele leia os arquivos certos antes de mexer em qualquer coisa.
>
> Escrito em 08/10/2026. Os números de qualidade estão em `pesquisa/13-bancada-copiar-make.md`.

---

Você vai trabalhar no app **Thalita Mariano** ("Maquiagem com a sua cara."), o app da maquiadora Thalita: a cliente escolhe a ocasião, o papel e o estilo, vê a make no próprio rosto, agenda e paga o sinal; a Thalita recebe uma ficha técnica (o Beauty Brief) de cada atendimento.

Existem **dois mundos** e a sua tarefa é fazer uma **fusão inteligente**, sem bagunça:

1. **O app real** (este projeto): Next.js 16 + React 19 + TypeScript + Tailwind 4 + Supabase + Gemini + Stripe, com telas prontas, login, reservas, Studio e simulação com IA.
2. **O laboratório** (a pasta `_laboratorio/`, que é o repositório `luiscriax/thalita`): um protótipo em JavaScript puro com um **motor de make próprio**, testado com fotos reais. O motor faz o que o app real ainda não faz: lê o rosto em 478 pontos, mede cores, monta a receita, pinta a prévia ao vivo, confere a foto da IA e copia a make de uma foto de referência. O laboratório também traz 13 pesquisas (mercado, jurídico, segurança, IA…) e uma biblioteca de 80 estilos.

O app novo terá **três modos** para a cliente ver a make:

| Modo | O que é | Quem faz | Custo |
|---|---|---|---|
| **Gerado com IA** | Foto realista da make no rosto dela | Gemini (imagem), guiado pela receita do motor e conferido pelo motor antes de mostrar | ~US$ 0,07 por imagem 1K |
| **Nosso motor** | Prévia pintada na foto dela, na hora, com antes/depois | Motor (`pintura.js`), no aparelho | grátis |
| **Ao vivo** | Espelho com a câmera: a cliente maquia do zero, escolhe makes prontas, épocas ou qualquer cor | Motor, no aparelho, 30–40 quadros por segundo | grátis |

Os três falam a mesma língua: a **receita** (`Receita` e `EstadoMake`, em `_laboratorio/prototipo/js/tipos.js`). A receita escolhida em qualquer modo vira a ficha da Thalita.

---

## 0. Antes de mudar qualquer arquivo

Leia, nesta ordem:
1. `CLAUDE.md`, `AGENTS.md` e `docs/` **deste** projeto (STATUS, PRD, ARQUITETURA, DESIGN-SYSTEM, CONTEXT/glossário, ADRs). As regras daqui valem mais que as do laboratório.
2. `_laboratorio/BRIEF.md`: a ideia do produto.
3. `_laboratorio/pesquisa/00-PLANO-MESTRE.md`: a síntese das pesquisas.
4. `_laboratorio/prototipo/README.md` e `_laboratorio/prototipo/js/tipos.js`: o motor e o contrato entre as peças.
5. `_laboratorio/pesquisa/12-engenharia-e-migracao.md` e `13-bancada-copiar-make.md`.

Depois **compare** cada peça da seção 5 com o que existe aqui e **apresente um plano** (o que entra, o que se junta, o que fica como está). Só comece depois que o dono aprovar. Trabalhe em passos pequenos, cada um com teste verde e um commit.

---

## 1. Regras que não se quebram

- Na interface é sempre **"make"**, nunca "look". O termo `look` só aparece no código antigo, e não vale criar código novo com ele.
- Nomes de domínio em português, como no glossário (`look`, `simulacao`, `reserva`, `sinal`, `receita`, `medidas`…).
- Cores só pelos tokens do design system (`bg-po`, `text-cacau`, `text-terra`, `bg-champanhe`…). Telas de palco (câmera, espera, revelação) usam `data-palco`.
- Uma decisão por tela e um botão principal na área do polegar.
- **Toda imagem de IA aparece como inspiração, nunca como promessa.**
- **Privacidade:**
  - a foto do rosto é dado sensível: consentimento destacado, apagar cedo (7 dias sem agendamento), bucket privado;
  - a IA não infere idade, etnia nem saúde, e o motor também não;
  - menor de idade **não** manda foto para a IA: usa só "Nosso motor" e "Ao vivo", que rodam no aparelho. Os termos do Gemini proíbem uso por menores (pesquisa 09); isso ainda precisa ser confirmado com advogado.
- **Segurança:**
  - chave de IA, chave secreta do Supabase e chaves de pagamento só no servidor, nunca com `NEXT_PUBLIC_`;
  - RLS em todas as tabelas;
  - a foto é sempre recriada do zero (seção 4.7);
  - o texto da cliente é dado, nunca instrução.
- **Licenças:** só copie código MIT, Apache ou BSD, sempre com crédito em `LICENCAS.md`. GPL, AGPL, "não comercial" e projetos sem licença ficam só para estudo. As fotos de teste do laboratório **não** podem ir para o app nem para o git.
- Esta versão do Next tem mudanças: consulte `node_modules/next/dist/docs/` antes de usar uma API.

---

## 2. O que tem em cada pasta do laboratório

```
_laboratorio/
├── BRIEF.md                    ideia do produto (jornada da cliente, Studio, marca, princípios)
├── REFERENCIAS.md              repositórios open source por área, com licença e facilidade de uso
├── PROMPT-MIGRACAO.md          este arquivo
├── index.html, .nojekyll       abre o protótipo no GitHub Pages (https://luiscriax.github.io/thalita/)
├── pesquisa/                   13 pesquisas + plano mestre (seção 6)
├── referencias/                biblioteca de estilos: 7 ocasiões, 80 estilos, estilos.json (seção 7)
├── .github/workflows/          testes do protótipo a cada envio; publicação no Pages
└── prototipo/
    ├── index.html              telas (HTML + CSS com os tokens da marca)
    ├── DESIGN.md, LICENCAS.md  identidade usada e créditos
    ├── js/                     O MOTOR (seção 4) + app.js (telas)
    ├── vendor/mediapipe/       MediaPipe Tasks Vision 1.0.1 (Apache 2.0), sem CDN
    ├── modelos/                face_landmarker.task (modelo do rosto, Apache 2.0)
    ├── scripts/                servidor local, fixtures, bancadas, calibração, publicação
    └── testes/
        ├── unit/               161 testes de unidade (node --test)
        ├── e2e/                12 testes de ponta a ponta (Playwright, celular e computador, câmera falsa)
        ├── bancada-gabarito.json, diversidade-gabarito.json   gabaritos anotados à mão
        └── fixtures/, resultados/   gerados na hora, fora do git
```

**Como rodar o laboratório:**

```
cd _laboratorio/prototipo && npm ci
npm run fixtures
npm test
python3 scripts/video-falso.py testes/fixtures/fotos/rosto-frontal.png testes/fixtures/camera-falsa.y4m
npm run test:e2e
npm run servir            # abre em http://localhost:4173
```

**Bancadas** (regressão de qualidade; comparar com a rodada v6 de `pesquisa/13`): `node scripts/bancada.mjs <rotulo>`, `node scripts/bancada-diversidade.mjs <rotulo>` e `node scripts/calibrar.mjs`. Elas precisam das fotos de teste em `testes/fixtures/bancada/`, que vêm dos repositórios de pesquisa listados em `pesquisa/13` (seção 2).

---

## 3. Tecnologias e motores

| Peça | Tecnologia | Onde roda | Licença |
|---|---|---|---|
| Pontos do rosto | **MediaPipe Face Landmarker** (Google): 478 pontos 3D, 52 expressões (blendshapes), matriz de rotação da cabeça; até 2 rostos | Aparelho (WebAssembly + WebGL; tenta GPU, cai para CPU) | Apache 2.0 |
| Ciência de cor | Código próprio: sRGB↔CIELAB (D65), **CIEDE2000** (conferido com a tabela de Sharma 2005), **ITA** (Chardon 1991), **escala Monk** de 10 tons (Google, CC BY 4.0), subtom pelo ângulo de matiz | Aparelho | nosso |
| Balanço de branco | Pelo **branco do olho** (esclera), com "mundo cinza" como plano B | Aparelho | nosso |
| Pintura | Canvas 2D: máscaras suaves desenhadas pelos pontos, cor aplicada por "ganho" (multiply + lighter) para manter a textura da pele; inspirada no OpenMakeupSDK (MIT), **sem código copiado** | Aparelho (inclusive ao vivo) | nosso |
| IA de imagem | **Gemini 3.1 Flash Image** ("Nano Banana 2"). O 2.5 Flash Image foi desligado em 02/10/2026 | Servidor | API paga do Google |
| IA de texto (Brief) | Gemini, saída JSON com esquema (já existe aqui: `lib/ia/brief.ts`) | Servidor | API paga |
| Testes | `node --test`, **Playwright** (Chromium com câmera falsa `.y4m`), Vitest no app real | CI (GitHub Actions) | — |

**Os 478 pontos** (índices do MediaPipe, em `prototipo/js/regioes.js`). "Direito" é o lado da pessoa.

| Região | Índices principais |
|---|---|
| Contorno do rosto (oval) | 10, 338, 297, 332, 284, 251, 389, 356, **454**, 323, 361, 288, 397, 365, 379, 378, 400, 377, **152**, 148, 176, 149, 150, 136, 172, 58, 132, 93, **234**, 127, 162, 21, 54, 103, 67, 109 |
| Lábios externo / interno | 61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146 / 78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95 |
| Olho direito | contorno 33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246; cantos 33 (externo) e 133 (interno); íris 468–472 |
| Olho esquerdo | contorno 263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466; cantos 263 e 362; íris 473–477 |
| Sobrancelhas | direita 70, 63, 105, 66, 107 (cima) / 46, 53, 52, 65, 55; esquerda 300, 293, 334, 296, 336 / 276, 283, 282, 295, 285 |
| Vinco e osso da pálpebra | anéis 247, 30, 29, 27, 28, 56, 190 e 113, 225, 224, 223, 222, 221, 189 (espelhados no lado esquerdo) |
| Pontos-chave | testa 10/151, entre sobrancelhas 9, dorso do nariz 6/197/195/5, ponta 1, queixo 152, arco do cupido 0, maçãs 50/280, zigomático 116/345, têmporas 127/356, mandíbula 172/397 |

O app real hoje usa **25** desses pontos (`lib/rosto/malha.ts`), para desenhar a malha e checar o enquadramento. O motor usa todos.

---

## 4. O motor, peça por peça (`_laboratorio/prototipo/js/`)

O contrato está em `tipos.js`: `Deteccao`, `Medidas`, `Receita`, `ItemReceita`, `EstadoMake`, `Brief`. Cada peça só recebe e devolve esses formatos, e por isso pode ser trocada (outro detector, outra IA) sem mexer nas outras.

```
foto/vídeo ─► seguranca.js ─► rosto.js ─► medidas.js ─► receita.js (+ regras.js, catalogo.js) ─► paraEstado() ─► pintura.js
                                                             ├─► brief.js  (ficha da Thalita + face chart)
                                                             └─► ia.js     (instrução da IA, conferência, colar de volta)
foto de referência ─► rosto.js ─► referencia.js ─► EstadoMake (copiar a make)
epocas.js / catalogo.js ─► EstadoMake (makes prontas)
```

### 4.1 `rosto.js` (detector)
- **O que faz:** carrega o MediaPipe uma vez (GPU, com CPU de reserva). `detectarFoto(img)` e `detectarQuadro(video, t)` devolvem uma `Deteccao`: pontos 0–1, quantos rostos, expressões, matriz da cabeça, largura e altura.
- **Números:** achou o rosto em 122 de 126 fotos variadas (pele negra, idosos, crianças, barba, óculos, máscara, fotos borradas). Falha em multidão, foto de cabeça para baixo e foto borrada demais. Leva ~290 ms por foto num servidor sem placa de vídeo; ao vivo no celular, 41 quadros por segundo.
- **Atenção:** ele acha rosto em **desenho** (anime). É a checagem de qualidade que impede seguir com um.

### 4.2 `medidas.js` (estudo do rosto)
- **Entrada:** `medir(deteccao, amostrador)`.
- **Saída, `Medidas`:**
  - qualidade com checagens: rosto, frontal, luz, foco, olhos abertos, tamanho, um rosto só, expressão;
  - balanço de branco;
  - **pele:** hex, Lab, ITA, faixa ITA, **Monk 1–10**, profundidade, **subtom** (frio, neutro, quente, oliva) com explicação e **confiança**;
  - olhos: cor e família; lábios: cor e pigmentação; sobrancelhas;
  - olheira, vermelhidão;
  - **formato do rosto** (oval, redondo, quadrado, coração, diamante, alongado), formato dos olhos (inclinação, distância, possível pálpebra encapuzada), formato da boca;
  - contraste pessoal.
- `criarAmostrador()` lê pixels de qualquer fonte, sem nunca lançar erro. `checarQualidade()` serve para a câmera.
- **Fundamentos:** pesquisa 10. Tom e subtom são **estimativas** e o Fitzpatrick não é usado.

### 4.3 `catalogo.js`, `regras.js`, `receita.js` (o "cérebro")
- **Catálogo:** momentos, papéis, 5 makes-base (natural, soft-glam, glam, olho-marcante, boca-marcante), paletas por categoria com nome e hex, acabamentos (matte, acetinado, cintilante, gloss, glitter) e makes prontas.
- **Regras:** regras com id (ex.: `OLHO-CASTANHO-COBRE`) que adaptam a make às medidas: tom, subtom e confiança, cor dos olhos, formato, horário, ocasião e papel.
- **Receita:** `montarReceita(escolhas, medidas)` devolve a `Receita` **na ordem de execução**. Cada item tem:
  - produto, cor (hex), nome da cor e família;
  - acabamento, zona e forma;
  - **intensidade 0–100%** e ferramenta;
  - na sombra, 3 tons.

  A receita também traz as adaptações com o motivo, o que confirmar pessoalmente, duração e fixação, e a confiança.
- `paraEstado(receita)` gera o `EstadoMake` que a pintura entende. `aplicarAjustes()` aplica pedidos como "mais suave" ou "boca mais rosada".
- `interpretarPedido(texto)` entende o português do dia a dia ("olho mais leve", "batom vermelho", "sem glitter") e devolve os ajustes, o que entendeu e o que ignorou. Trata o texto como dado.

### 4.4 `pintura.js` (prévia e espelho ao vivo)
- `criarPintor(canvas).desenhar(fonte, pontos, estado, {espelhar})` pinta, na ordem: base, corretivo, contorno, blush, iluminador, sombra (estilos pálpebra, esfumado e asa), delineado (fino, gatinho e marcado), máscara (fios), sobrancelha e batom (com volume e brilho).
- ~6 ms por quadro. Reaproveita canvases e funciona em foto e em vídeo.
- As geometrias são funções puras exportadas: `geometriaOlho`, `geometriaSombra`, `geometriaBlush`…

### 4.5 `brief.js` (o que a Thalita recebe)
- `montarBrief(medidas, receita, {pontos, maleta})` monta o `Brief`:
  - título e resumo;
  - seções (leitura da foto, pele, olhos, boca), com confiança;
  - **paleta** (nome, hex, uso);
  - **ordem de execução numerada** com a intensidade em %;
  - produto da maleta mais próximo (`combinarComMaleta`, por ΔE);
  - o que confirmar pessoalmente;
  - as adaptações.
- `desenharFaceChart(pontos, receita)` desenha o **face chart em SVG** a partir dos pontos do rosto da cliente, com as cores da receita e a **numeração da ordem de execução** em cada zona: base, corretivo, contorno, blush, iluminador, sombra, delineado, máscara, sobrancelha e batom.
- `briefParaTexto()` gera a versão para colar no WhatsApp.

### 4.6 `ia.js` (ponte com a IA)
- `instrucaoParaIA(receita, medidas, {pedidoLimpo})` devolve `{sistema, usuario, ficha, parametros}`. A IA recebe a receita fechada: cor em hex, zona, intensidade %, acabamento e o tom de pele medido. As regras dizem para não clarear a pele, não afinar o rosto e não mexer nos traços. O pedido da cliente vai blindado entre delimitadores.
- `conferirResultado({original, gerada, receita})` confere a foto gerada antes de mostrar:
  - **mesmo rosto:** distância dos pontos estruturais alinhados pelos olhos; limite 0,045. Na mesma pessoa deu até 0,038; em pessoas diferentes, a partir de 0,054;
  - **cor certa:** ΔE da boca, blush, sombra e base, com o mesmo balanço de branco;
  - **pele não clareou.**

  Se reprovar, gera de novo.
- `colarDeVolta({original, gerada, pontos})` mantém a foto original fora do contorno do rosto, com borda suave. As IAs não respeitam mais máscara (pesquisa 09).

### 4.7 `seguranca.js` (blindagem)
- **Foto:**
  - `inspecionarBytes()` lê o **tipo verdadeiro pelos bytes** e recusa SVG, HTML, PDF e executável disfarçado;
  - lê as dimensões no cabeçalho **antes de abrir**, contra bomba de descompressão;
  - avisa GPS/EXIF, anexo escondido depois da imagem e trechos de código;
  - `prepararFoto()` **recria a foto do zero** (canvas → JPEG novo, no máximo 1600 px).
- **Texto:** `analisarTexto()` tira caracteres invisíveis, tags, links, e-mails e telefones, e corta tentativas de mandar na IA ("ignore as instruções", "mostre a chave", "aprove desconto"), pedidos para mudar o rosto ("afinar o nariz", "clarear a pele") e código.
- **No app real:** repetir a recriação também no **servidor** (sharp) antes de guardar ou enviar à IA (pesquisa 08).

### 4.8 `referencia.js` (copiar make de uma foto)
- `lerMakeDaFoto(deteccao, amostrador)` lê da foto de referência:
  - batom (cor, gloss ou matte);
  - sombra em 3 tons;
  - gatinho;
  - máscara;
  - blush;
  - iluminador;
  - cor da sobrancelha.

  Cada leitura vem com confiança e com o nome da cor mais parecida da paleta. **Não copia a base** (segue o tom da cliente) e **não inventa contorno**.
- **Números nas 50 fotos reais (rodada v6):**
  - boca: ΔE **3,8** na cliente;
  - sombra marcada: **29/30**, sem inventar;
  - blush: **20/23**, inventa 1 em 6; efeito na cliente ΔE **3,9**.
- **Limite medido:** sombra marrom/nude, iluminador sutil e contorno se confundem com a luz da foto. Isso precisa da IA de visão (seção 5, item 8).

### 4.9 `epocas.js` (makes por época)
- Anos 70 (disco), 80 (pop), 90 (supermodelo), 2000 (gloss), 2010 (Instagram), 2020 (clean girl) e 2026 (latte e cereja).
- Cada uma tem `EstadoMake`, técnicas, termos (blush-cartão, frost, baking, strobing, overline, lip oil…) e fontes.
- No laboratório elas já são makes prontas no espelho.

### 4.10 `app.js` + `index.html` (telas do laboratório)
São só para provar a ideia; **não migre o HTML**. A interface continua a do app real.
- **Testar uma make:** momento → papel → estilo (ou "Tenho uma foto de referência") → sua foto (enviar ou escanear com malha e enquadramento) → "Ficou boa?" (pedido livre e consentimento) → estudo (etapas com tempos) → **Sua make** (antes/depois com controle deslizante; mais suave, como está ou mais intenso; seu estudo; paleta; por que fica bem; instrução da IA; conferência) → agendar → enviado → **O que a Thalita recebe**.
- **O que a Thalita recebe:** face chart numerado, ordem de execução e "Copiar ficha para o WhatsApp".
- **Espelho ao vivo:**
  - começa sem make, com o botão "Sem make" para zerar;
  - makes prontas e épocas;
  - abas por categoria, cores da paleta e **"Outra cor"** (seletor do aparelho), acabamentos, estilos de sombra e delineado, intensidade;
  - segurar o olho mostra o antes;
  - foto com moldura;
  - "Copiar de uma foto";
  - "Quero essa make" leva ao estudo.
- **Copiar make de uma foto:** leitura com amostras, % e confiança. Leva para "Ver em mim" ou "Testar no espelho".
- **Bastidores:** os números de cada etapa, para conferência.

---

## 5. Mapa da fusão (laboratório × app real)

O que está na coluna "App real" vem de uma cópia parcial do projeto. **Confira no código atual** antes de decidir.

| # | Assunto | App real hoje | Laboratório | Fusão recomendada |
|---|---|---|---|---|
| 1 | Detector de rosto | `lib/rosto/detector.ts` (MediaPipe, modelo do Google Storage, `scripts/copiar-mediapipe.mjs`) e `malha.ts` (25 pontos, enquadramento e luz) | `rosto.js` (o mesmo MediaPipe, 478 pontos, expressões e matriz) | **Manter o detector do app**, pedindo também `outputFaceBlendshapes` e `outputFacialTransformationMatrixes`, e expor a `Deteccao` do contrato. A malha visual continua; as checagens passam a usar `medidas.checarQualidade` (frontal, luz, foco, olhos, tamanho, expressão). |
| 2 | Estudo do rosto | não tem (a IA estima tom e subtom no Brief) | `medidas.js` | **Entra** como `lib/motor/medidas.ts`. O tom, o subtom, os olhos e os formatos medidos vão para a receita, para o Brief e para a instrução da IA. |
| 3 | Escolha → instrução da IA | `lib/ia/prompts.ts`: nível em texto (leve, média, alta), foco, ocasião e papel; regras PRM/REF em `docs/conhecimento` | `receita.js` + `ia.js`: receita com hex, zona e % | **Juntar:** manter as regras PRM/REF e a estrutura do `prompts.ts`, mas **acrescentar a ficha da receita** (cores em hex, zonas, %) e o tom de pele medido. A receita substitui o "nível em texto" como fonte da verdade. |
| 4 | Simulação com IA | `lib/ia/provedores.ts` (`gemini-3.1-flash-image`, servidor) | `ia.js`: 2 candidatas + conferência + colar de volta | **Acrescentar** ao fluxo de simulação: gerar 2 candidatas, `conferirResultado` (no aparelho, na v1), `colarDeVolta` e regerar 1 vez se reprovar. Se reprovar de novo, mostrar a prévia do motor. Guardar no `uso_ia` o custo de cada candidata. |
| 5 | Prévia sem IA ("Nosso motor") | não tem | `pintura.js` | **Novo modo:** aparece na hora, enquanto a IA gera, e serve de plano B. É o único modo para menores. |
| 6 | Espelho ao vivo | não tem | `pintura.js` + tela do espelho + `epocas.js` | **Nova rota**, por exemplo `/espelho`, com `data-palco`: cliente usa sem conta e sem custo. "Quero essa make" leva ao fluxo com a receita preenchida. |
| 7 | Beauty Brief | `lib/ia/brief.ts` + `brief-esquema.json` (Gemini devolve JSON) e `components/studio/beauty-brief.tsx` (editável) | `brief.js`: ficha calculada + **face chart SVG numerado** + maleta | **Juntar:** o motor preenche o que é medível (tom, subtom e confiança, paleta em hex, ordem de execução com %, face chart); a IA escreve o texto (adaptação, observações) **a partir** desses dados e no mesmo esquema. O face chart entra no topo da ficha editável e na versão para WhatsApp. Se os dois discordarem (ex.: subtom), vale o motor com a confiança dele, e a divergência aparece em "confirmar pessoalmente". |
| 8 | Foto de referência | `app/estilo/referencia` (a referência vai para a IA com `comReferencia`) | `referencia.js` | **Juntar:** o motor lê as cores da referência e mostra as leituras à cliente; uma chamada barata da IA de visão (JSON fixo: produtos presentes e estilo) cobre o que o motor não separa (sombra marrom, iluminador sutil, contorno). A receita final usa as cores do motor e os produtos da IA, e onde discordarem mostra "confira no espelho". Na IA de imagem, **não mandar a foto da modelo** como imagem principal (troca o rosto): mandar a receita. |
| 9 | Segurança da foto | `TIPOS_FOTO`, `LIMITE_FOTO_BYTES` (10 MB) | `seguranca.js` | **Entra no aparelho** (`prepararFoto` antes do envio) e **no servidor** (sharp: tipo real, limite de pixels, recriar sem metadados). HEIC continua aceito se o servidor converter. `analisarTexto` roda no aparelho e de novo no servidor, antes do `prompts.ts`. |
| 10 | Limites e custo | `lib/ia/limite.ts` (1/5/15) e `uso.ts` (`uso_ia`, HMAC do IP) | — | Manter. Os modos "Nosso motor" e "Ao vivo" **não contam** limite. |
| 11 | Catálogo | `lib/data/mock` (looks, ocasiões, papéis) | `catalogo.js` + `referencias/estilos.json` (80 estilos) + `epocas.js` | **Juntar** num catálogo só, guardado no banco depois. Cada estilo do `estilos.json` vira uma make com receita-base; as fotos de inspiração continuam as do acervo da Thalita. |
| 12 | Pagamento | `stripe` no `package.json`, webhook em `api/stripe/webhook` | pesquisa 05 | Pesquisa 05: o **Pix na Stripe é só por convite**. Recomendação: Mercado Pago (Pix, ~0,99%) ou Asaas na fase 1. Levar a decisão ao dono antes de mexer. |
| 13 | Testes | Vitest (`lib/**/*.test.ts`), `test:db` | `node --test` + Playwright com câmera falsa + bancadas | Portar os testes **junto com cada peça** para Vitest. Trazer o Playwright com câmera falsa para o fluxo da câmera e do espelho. As bancadas ficam como regressão fora do CI (as fotos não vão para o git). |

---

## 6. As pesquisas (`_laboratorio/pesquisa/`)

| Arquivo | Do que trata | Principais conclusões |
|---|---|---|
| 00-PLANO-MESTRE | síntese de tudo | aposta: "a make da Thalita, no seu rosto, com preço e data dela"; roteiro MVP → v1 → v2 |
| 01-mercado-e-publico | mercado, preços, sazonalidade | make social de R$ 150 a 350, noiva de R$ 600 a 1.500; pico de setembro a dezembro; a cliente acha a maquiadora no Instagram, decide pelas avaliações e fecha no WhatsApp |
| 02-concorrentes | YouCam, ModiFace, Banuba, Trinks, Booksy… | ninguém junta simulação no rosto + agenda com uma maquiadora específica + ficha técnica |
| 03-monetizacao | ticket, upsell, SaaS | cenário realista de ~R$ 10 mil por mês (passa do teto do MEI); IA ~4% de uma make social; sinal de 30% (noiva) e 50% (social) |
| 04-marca-e-crescimento | WePink, Boca Rosa, Bruna Tavares, plano de 90 dias | conteúdo "testei no app × ficou assim de verdade"; avaliações no Google; parcerias com link |
| 05-pagamentos-e-checkout | Stripe, Mercado Pago, Asaas, Pix | Mercado Pago na fase 1; Asaas com divisão de pagamento na fase 2 |
| 06-juridico-mei-lgpd | MEI, NFS-e, CDC, LGPD, ECA Digital | 7 dias de arrependimento; selfie como dado sensível; menores com responsável |
| 07-stack-e-custos | PWA, Supabase, Vercel, Resend, WhatsApp | ficar só na web; login por código e Google; Vercel Pro e Supabase Pro em São Paulo; ~R$ 300 a 2.700 por mês |
| 08-seguranca | checklist OWASP Top 10 e LLM Top 10 | upload recriado, chaves no servidor, RLS, limites, MFA, plano de incidente |
| 09-ia-geracao-de-imagem | Gemini, GPT Image, FLUX, Qwen, Seedream | receita estruturada, 2–3 candidatas, conferência, colar de volta; nenhuma IA garante 100% |
| 10-ciencia-da-cor-e-make | ITA, Monk, ΔE, subtom, face chart | estimar, nunca prometer; calibrar o subtom com a Thalita |
| 11-repositorios-open-source | o que usar e o que só estudar | MIT/Apache/BSD sim; Cal.com fechou o código (Cal.diy é MIT); cuidado com os pesos de modelos |
| 12-engenharia-e-migracao | arquitetura, migração, testes, roteiro | rosto e cor no aparelho, IA e dados no servidor; migrar peça por peça com teste |
| 13-bancada-copiar-make | testes com 50 referências reais e rostos diversos | números da seção 4.8; os 478 pontos funcionam em todos os grupos; limite das makes sutis |

---

## 7. Biblioteca de estilos (`_laboratorio/referencias/`)

São 80 estilos em 7 ocasiões: noiva 14, convidadas 11, 15 anos 11, formatura 9, festa 10, ensaio 11, tendências 2025–2026 com 14.

Cada estilo traz:
- paleta em hex;
- pele, olhos, sobrancelha, blush, boca e iluminador;
- variações por tom de pele (inclusive peles negras e retintas);
- para quem favorece e erros a evitar;
- intensidade em %;
- links de referência.

O arquivo `estilos.json` está pronto para importar. **Cuidados:**
- **15 anos:** produtos adequados à idade e responsável presente.
- **Gestante:** sem ácido retinoico, retinol, adapaleno nem hidroquinona.
- **Links:** foram achados em buscas, mas a abertura das páginas foi bloqueada no ambiente de pesquisa. Uma pessoa precisa abri-los antes de usar.

---

## 8. Repositórios e projetos estudados

O que **usamos de verdade**:
- MediaPipe Tasks Vision e o modelo Face Landmarker (Apache 2.0).
- Escala Monk (CC BY 4.0).
- Fontes Google (OFL).

Projetos que foram **inspiração, sem código copiado**:
- OpenMakeupSDK (MIT): categorias, acabamentos e moldes de região.
- As fórmulas científicas (Sharma 2005, Chardon 1991).

**Fotos de teste** (só teste interno, fora do git): BeautyGAN, PSGAN (MIT), EleGANt (CC BY-NC), Stable-Makeup (Apache 2.0), SSAT e CSD-MT (CC BY-NC), CPM (VinAI, BSD-like), deepface (MIT), insightface (código MIT, modelos só pesquisa), CodeFormer (S-Lab, não comercial) e face-parsing (MIT).

**Estudados, com o que dá para usar:** está em `REFERENCIAS.md` e `pesquisa/11`. Inclui:
- Human, face-parsing com Transformers.js (Xenova; pesos treinados em CelebAMask-HQ, **não comercial**), BiSeNet, Jeeliz, MindAR, drei Facemesh;
- Qwen-Image-Edit (Apache 2.0), FLUX Kontext (o dev não é comercial), Stable-Makeup, EleGANt, PSGAN, BeautyGAN, awesome-makeup-transfer;
- culori (MIT) e colour-science (BSD) para testar a cor;
- Cal.diy (MIT), Easy!Appointments, pix-utils e pix-qrcode-utils (MIT), Serwist (MIT).

---

## 9. Plano de migração (proponha ao dono e siga com aprovação)

**Fase A: base do motor**, sem mudar telas.
1. Crie `lib/motor/` com `tipos.ts` (o contrato), `cor.ts` e `regioes.ts`. Porte os testes. Acrescente um teste diferencial de cor contra o `culori`.
2. Porte `medidas`, `catalogo`, `regras`, `receita` e `brief` (com o face chart), **uma por vez**, cada uma com os seus testes em Vitest e `npx tsc --noEmit` limpo.
3. Separe o que é só do navegador (`pintura`, detector, `prepararFoto`) do que roda nos dois (funções puras) e do que é só do servidor (chamada à IA, sharp, limites).

**Fase B: ligar nas telas existentes**
4. Sua foto: checagens de qualidade do motor + `prepararFoto` + recriação no servidor.
5. Simulação: receita na instrução (`prompts.ts` + `instrucaoParaIA`), 2 candidatas, conferência, colar de volta e prévia do motor enquanto espera.
6. Studio: Brief com o face chart numerado e os campos medidos pelo motor; a IA completa o texto.

**Fase C: modos novos**
7. Espelho ao vivo (`/espelho`) com makes prontas, épocas e "Outra cor".
8. Copiar make de uma foto, combinado com a leitura por IA de visão, em `estilo/referencia`.
9. Catálogo único com `estilos.json` e épocas.

**Fase D: qualidade contínua**
10. Banco de fotos com consentimento (10 tons Monk). Rodar as bancadas a cada mudança do motor e comparar com a v6. Calibrar o subtom com a Thalita nos primeiros 30 a 50 atendimentos.

**Para cada passo, critério de pronto:**
- typecheck, lint, testes de unidade e build verdes;
- teste de ponta a ponta do fluxo tocado;
- nada de `look` na interface;
- nenhuma chave no navegador;
- texto da cliente nunca vai direto para a IA;
- imagem de IA sempre com o selo "inspiração".

---

## 10. Perguntas para fazer ao dono antes de começar

1. Os três modos aparecem como escolha da cliente ("Ver com IA", "Ver na hora", "Espelho ao vivo") ou o "Nosso motor" fica só como prévia e plano B da IA?
2. Menores de idade ficam sem IA? (Recomendado; confirmar com o advogado.)
3. Fica a Stripe ou passa para Mercado Pago ou Asaas para o Pix do sinal?
4. A Thalita vai editar o catálogo, as regras e as épocas no Studio já no MVP ou depois?
5. Pode começar o banco de fotos com consentimento das clientes para calibrar o motor?
