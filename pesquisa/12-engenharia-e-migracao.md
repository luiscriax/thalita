# 12 · Engenharia e migração (do protótipo para o app real)

> Pesquisa feita em **2026-10-07**. Base: o protótipo em `prototipo/` (≈ 8 mil linhas de JavaScript puro, com contrato em `prototipo/js/tipos.js`) e o app real (Next.js 16 + React 19 + Supabase, na pasta local do dono). Complementa os arquivos 09 (IA), 10 (cor) e 11 (open source).

## Em uma olhada
1. **Rosto e cor no aparelho; IA e dados no servidor.** Câmera, MediaPipe, medidas, receita e prévia pintada rodam no celular (rápido, grátis, a foto só sai se precisar). A chamada à IA, os limites, a foto guardada e a ficha da Thalita ficam no servidor (rotas do Next.js + Supabase).
2. **Migrar sem bagunça:** copiar o motor para `lib/motor/` **peça por peça**, com os testes junto, ligando primeiro a checagem de tipos no próprio JavaScript (JSDoc) e só depois convertendo para TypeScript. Cada peça mantém o contrato do `tipos.js`.
3. **Testes em 3 camadas:** unidade (funções puras), "teste diferencial" de cor contra uma biblioteca de referência, e ponta a ponta com **câmera falsa** no Playwright (o protótipo já faz isso). Mais um conjunto de **fotos de referência com consentimento cobrindo os 10 tons Monk**.
4. **Custo da IA é pequeno e previsível** (~US$ 0,13 por simulação com Nano Banana 2) desde que haja limite diário, teto de gasto e alerta. Ver tabela na seção 6.
5. **"Roubar como artista"** = estudar muito, copiar só o que a licença permite, dar crédito sempre e transformar em algo nosso. O protótipo já segue isso em `prototipo/LICENCAS.md`.

---

## 1. O que existe hoje no protótipo

| Peça | Arquivo | Roda onde | Depende de |
|---|---|---|---|
| Contrato de tipos | `tipos.js` | — | — |
| Ler o rosto (MediaPipe, 478 pontos) | `rosto.js`, `regioes.js` | Navegador | MediaPipe Tasks Vision (Apache 2.0) |
| Ciência da cor (Lab, ΔE2000, ITA, Monk, subtom) | `cor.js` | Qualquer lugar (puro) | — |
| Medidas do rosto e da pele | `medidas.js` | Qualquer lugar, se receber os pixels | `cor.js`, `regioes.js` |
| Regras + catálogo + receita | `regras.js`, `catalogo.js`, `receita.js` | Qualquer lugar (puro, determinístico) | `cor.js` |
| Pintura da make (prévia/ao vivo) | `pintura.js` | Navegador (Canvas 2D) | pontos do rosto |
| Beauty Brief + face chart (SVG) | `brief.js` | Qualquer lugar (puro) | medidas + receita |
| Instrução para a IA + conferência | `ia.js` | Instrução: **servidor**. Conferência: onde houver os pontos do rosto | `cor.js`, `regioes.js` |
| Blindagem de foto e texto | `seguranca.js` | Foto: navegador **e** servidor. Texto: servidor | — |
| Telas do protótipo | `app.js`, `index.html`, `vitrine.js` | Navegador | — (não migram: o app real tem as suas telas) |

Testes já existentes: unidade (`testes/unit/*.test.mjs`, executor `node --test`) e ponta a ponta (`testes/e2e/`, Playwright 1.56 com câmera falsa `.y4m` gerada por `scripts/video-falso.py`).

> ⚠️ `ia.js` usa `MODELO_PADRAO = "gemini-2.5-flash-image"`, desligado em 02/10/2026 — ver arquivo 09.

---

## 2. Arquitetura recomendada

```
CELULAR DA CLIENTE (navegador / PWA)                 SERVIDOR (Next.js na Vercel)               SUPABASE
─────────────────────────────────────                ─────────────────────────────              ─────────────────
Câmera → MediaPipe (rosto.ts)                                                                    Auth (login)
  → checagem da selfie (luz, foco, enquadramento)                                                Postgres + RLS
  → medidas.ts → receita.ts                                                                      Storage privado
  → pintura.ts (prévia grátis, instantânea)                                                      (selfies, simulações)
  → [cliente pede a simulação com IA]  ── foto + escolhas ──►  POST /api/simulacoes                Queues (pgmq) — v1
                                                               1. login, limite diário, idade      pg_cron (limpeza)
                                                               2. seguranca: confere bytes,
                                                                  regrava a foto, tira EXIF ─────► Storage (bucket privado)
                                                               3. recalcula a RECEITA (não
                                                                  confia na do aparelho)
                                                               4. ia/instrucao → Gemini (2 fotos)
  ◄── links assinados (curtos) das 2 candidatas ────────────── 5. salva candidatas, status
  → conferência (ia/conferencia.ts): mesmo rosto? cor certa?
    pele não clareou? → "colar de volta" fora da make
  → escolhe a melhor ── resultado da conferência ───────────► 6. registra; se falhou, 1 nova
                                                                  tentativa (limite no servidor)
                                                               7. Brief da Thalita (brief.ts) ──► tabela de reservas
```

### 2.1 O que roda no aparelho (e por quê)
- **Rosto, medidas, receita e prévia:** respostas instantâneas, sem custo, funciona com sinal fraco. A foto **não precisa sair do celular** para a prévia pintada.
- **Conferência da IA no MVP:** o MediaPipe já está carregado no celular; conferir lá evita montar um servidor de visão computacional agora. Se alguém "burlar" a conferência no próprio aparelho, o único efeito é ver uma foto pior — por isso o **limite de tentativas fica no servidor**.

### 2.2 O que roda no servidor (rotas do Next.js)
- Tudo que custa dinheiro, guarda dado ou precisa de segredo: **chave do Gemini**, limites por dia (1/5/15 do brief), regra de menor de idade (sem IA — ver arquivo 09), gravação da foto, ficha técnica da Thalita, Pix.
- **Recalcular a receita no servidor** a partir das escolhas + medidas recebidas (o `receita.ts` é o mesmo código dos dois lados). Validar a entrada com esquema (ex.: Zod) e **nunca** montar a instrução da IA com texto vindo do navegador.
- Tempo: chamada ao Gemini leva segundos; as funções da Vercel com "fluid compute" aceitam até **300 s no plano Hobby e 800 s no Pro** ([Vercel – limites](https://vercel.com/docs/functions/limitations)). Cabe chamar direto no MVP.
- **Plano da hospedagem:** conferir nos termos da Vercel se o plano gratuito (Hobby) permite uso comercial — em geral é para uso pessoal; o app da Thalita é comercial.

### 2.3 Fila para a IA (quando e qual)
| Fase | Como | Por quê |
|---|---|---|
| MVP | Sem fila: a rota chama o Gemini e grava o status numa tabela `simulacoes` (pendente → pronta/falhou), com **chave de idempotência** (se a cliente tocar 2 vezes, não paga 2 vezes) | Simples; volume baixo |
| v1 | **Supabase Queues** (Postgres + extensão pgmq; entrega garantida, "exatamente uma vez" dentro da janela de visibilidade) ([Supabase Queues](https://supabase.com/docs/guides/queues)) | Mesmo banco, sem novo fornecedor; permite reprocessar quando o Gemini estiver fora do ar |
| Alternativa | **Vercel Queues** (beta público desde 27/02/2026; US$ 0,60 por milhão de operações) ([Vercel Queues](https://vercel.com/docs/queues); [changelog](https://vercel.com/changelog/vercel-queues-now-in-public-beta)) | Se preferir ficar tudo na Vercel |

### 2.4 Guardar fotos com prazo de validade
- **Bucket privado** no Supabase Storage, uma pasta por cliente, regras de acesso (RLS) para só a dona e a Thalita lerem. Mostrar por **link assinado de curta duração** (minutos).
- **Expiração:** não encontrei na documentação um "apagar sozinho depois de X dias" nativo do Storage. Fazer com **agendamento** (pg_cron ou cron da Vercel) que chama a **API do Storage** para apagar arquivos vencidos (apagar pela API, não direto na tabela, para o arquivo sumir de verdade).
- Prazos sugeridos (validar com o arquivo `06-juridico-mei-lgpd.md`): selfie sem reserva → apagar em poucos dias; com reserva → até o atendimento + período curto; simulação aprovada → mantida enquanto a cliente quiser (ela pode apagar na Área da cliente). **Guardar números (medidas, receita), não fotos**, sempre que possível.
- Nunca guardar "assinatura do rosto" (embedding biométrico).

---

## 3. Migrar o motor para `lib/motor/` (passo a passo)

### 3.1 Estrutura proposta no app real
```
lib/motor/
  tipos.ts                ← vem de tipos.js (mesmos nomes, em português)
  versao.ts               ← MOTOR_VERSAO = "1.0.0" (gravado em cada simulação e ficha)
  cor.ts  regioes.ts  medidas.ts
  regras.ts  catalogo.ts  receita.ts
  brief.ts
  ia/instrucao.ts         ← "server-only": monta a instrução
  ia/conferencia.ts       ← roda no aparelho (MVP) e, no futuro, no servidor
  ia/provedor.ts          ← interface gerarImagem(receita, foto) → fotos[]  (Gemini, plano B…)
  seguranca/foto.ts       ← parte que roda nos dois lados
  seguranca/texto.ts      ← "server-only"
  navegador/rosto.ts      ← MediaPipe ("use client")
  navegador/pintura.ts    ← Canvas ("use client")
  __testes__/             ← testes portados + novos
```

### 3.2 Ordem de migração (uma peça por vez, sempre com teste verde)
1. **Copiar como está** (`.js`) para `lib/motor/` e ligar a checagem de tipos do TypeScript nos arquivos JavaScript (`allowJs` + `checkJs`, ou `// @ts-check` no topo). Os tipos JSDoc do `tipos.js` já passam a ser conferidos pelo `npx tsc --noEmit` do app. Nenhuma mudança de comportamento.
2. **Portar os testes** de `testes/unit/` para o executor do app real; rodar e comparar com o protótipo (mesmos resultados).
3. **Converter para `.ts` na ordem das dependências:** `tipos` → `cor` → `regioes` → `catalogo`/`regras` → `receita` → `medidas` → `brief` → `ia` → `seguranca` → `navegador/*`. Um commit por arquivo.
4. **Separar o que é só do servidor** com `import "server-only"` (instrução da IA, texto da cliente, chave) e o que é só do navegador com `"use client"` (MediaPipe, Canvas). O resto é "isomórfico" (roda nos dois).
5. **Trocar o modelo de IA por configuração** (variável de ambiente) e criar `ia/provedor.ts` com a interface única.
6. **Versão do motor:** gravar `MOTOR_VERSAO` em cada simulação e Brief. Quando uma regra mudar, dá para saber qual regra gerou cada ficha antiga.
7. Antes de usar qualquer API do Next.js 16 (rotas, `server-only`, cache), **ler `node_modules/next/dist/docs/`** — o próprio AGENTS.md do app avisa que esta versão mudou.

### 3.3 Fronteiras que evitam bagunça
- O motor **não conhece** React, Supabase nem Gemini: recebe dados, devolve dados (o contrato do `tipos.js`). Telas, banco e provedor ficam **fora** de `lib/motor/`.
- Catálogo e regras ficam em código no MVP; na v2 podem ir para o banco para a Thalita editar no Studio (com versão).
- Toda entrada vinda da internet passa por **validação de esquema** antes de chegar ao motor.

---

## 4. Testes

### 4.1 Unidade (funções puras)
- Portar os testes atuais (`brief`, `catalogo`, `medidas`, `receita`, `regras`).
- **ΔE2000:** manter os pares de teste publicados por Sharma, Wu e Dalal (2005), já usados para conferir o `cor.js` (ver `prototipo/LICENCAS.md`).
- **Teste diferencial de cor:** gerar milhares de cores aleatórias e comparar `cor.ts` com a biblioteca **culori (MIT)** — conversão Lab e ΔE2000 devem bater até a 3ª casa. Valores de referência extras podem ser gerados com **colour-science (BSD-3)** em Python. (Ver arquivo 11.)
- **Receita determinística:** mesma entrada → mesma receita (teste "foto" do resultado em JSON).
- **Segurança:** textos maliciosos ("ignore as instruções…", códigos, links) nunca chegam à instrução da IA; arquivos que não são imagem são recusados.

### 4.2 Ponta a ponta (Playwright + câmera falsa)
- O protótipo já roda com as opções do Chromium `--use-fake-device-for-media-stream` e `--use-file-for-fake-video-capture=<vídeo .y4m>` (ver `prototipo/testes/e2e/playwright.config.mjs`), em perfil "celular" (Pixel 7) e "computador". Levar isso para o app real.
- Cenários mínimos: selfie boa → prévia → simulação (com IA **simulada** por respostas gravadas) → revelação → agendar → pedido enviado; selfie ruim (escura, rosto de lado, 2 rostos) → mensagens certas; limite diário atingido; menor de idade → sem IA.
- **Não chamar a IA paga no CI.** Usar respostas gravadas (fotos de candidatas salvas). Um teste "canário" diário, separado, chama o modelo real com 1 foto para avisar se ele saiu do ar ou mudou.
- A câmera falsa por arquivo é recurso do Chromium; iPhone (Safari/WebKit) precisa de **teste manual em aparelho real** antes de cada lançamento.

### 4.3 Testes de cor com fotos de referência (o mais importante para "precisão")
1. **Banco de fotos com consentimento escrito**, cobrindo os **10 tons Monk**, homens e mulheres, com e sem óculos, luz de dia e de lâmpada. Não usar fotos de menores. Guardar fora do git (como já é feito com as referências da Thalita).
2. Para cada foto, anotar o "gabarito" dado pela Thalita ao vivo: tom (Monk), subtom, cor dos olhos, formato do rosto.
3. **Testes automáticos:**
   - Monk estimado a no máximo 1 tom do gabarito; subtom igual ou vizinho.
   - **Robustez à luz:** aplicar na foto um "tom" artificial (amarelado, azulado) → depois do balanço de branco, a cor da pele deve voltar perto da original (ΔE00 pequeno).
   - **Justiça entre tons:** o erro médio não pode ser muito maior nos tons 7–10 do que nos 1–3. Se for, é bug a corrigir antes de lançar.
4. Rodar esse conjunto a cada mudança em `cor.ts`/`medidas.ts`/`regras.ts` e guardar o relatório.

### 4.4 Testes da IA (qualidade, não só "funciona")
- Teste de bancada descrito no arquivo 09 (seção 6): % que passa na conferência, ΔE por região, variação de claridade da pele, tempo e custo — por modelo e por tom de pele. Repetir a cada troca de modelo.

---

## 5. Observabilidade (saber o que está acontecendo)

| O que medir | Para quê | Onde |
|---|---|---|
| Simulações por dia, por cliente, por limite | Custo e abuso | Tabela `simulacoes` + painel no Studio |
| Taxa de aprovação na conferência (rosto, cor, pele) e nº de novas tentativas | Qualidade da IA | Idem |
| Tempo de espera (mediana e pior 5%) | Experiência | Logs da Vercel |
| Erros por provedor/modelo | Detectar modelo fora do ar | Logs + alerta |
| Gasto diário com IA | Não estourar | Painel/alerta de orçamento do Google Cloud + nossa contagem |
| Qualidade da selfie recusada (por motivo) | Melhorar as dicas da câmera | Contagem anônima |

Regras: **logs sem dados pessoais** (sem foto, sem nome, sem e-mail; usar IDs); erros de tela com uma ferramenta de monitoramento de erros (ex.: Sentry — conferir plano e onde guarda os dados); alerta por e-mail/celular para "modelo fora do ar" e "gasto acima do teto".

---

## 6. Custos (ordem de grandeza)

Premissas: Nano Banana 2 a **US$ 0,067** por foto 1K (Lite/2.1 a US$ 0,034), **2 candidatas** por simulação, 10% precisam de uma 3ª (preços do arquivo 09, lidos em 2026-10-07).

| Volume mensal | Simulações (média 3 por cliente) | Fotos geradas | Nano Banana 2 | NB 2 Lite / 2.1 |
|---|---|---|---|---|
| 50 clientes | 150 | ~315 | ~US$ 21 | ~US$ 11 |
| 200 clientes | 600 | ~1.260 | ~US$ 84 | ~US$ 43 |
| 1.000 clientes | 3.000 | ~6.300 | ~US$ 422 | ~US$ 214 |

- Somar: hospedagem (Vercel — plano comercial), Supabase (plano pago quando passar dos limites grátis), e-mail (Resend), e a taxa do PSP de Pix. Conferir preços atuais nas páginas oficiais; não estimei aqui.
- O maior risco de custo não é o uso normal, é **abuso** (robôs, loop de tentativas). Por isso: limite por dia, por IP, teto diário no Google Cloud e alerta.

---

## 7. Roadmap em fases

| Fase | Objetivo | Entra | Fica de fora |
|---|---|---|---|
| **MVP** (lançar para clientes reais da Thalita) | Cliente vê a make e agenda; Thalita recebe a ficha | Motor em `lib/motor/`; selfie + checagem; prévia pintada; simulação IA (Nano Banana 2) com 2 candidatas + conferência no aparelho + "colar de volta"; aviso "inspiração"; limites diários; menor = sem IA; agendamento + Pix com confirmação manual pela Thalita; Brief; exclusão de fotos agendada | Fila, conferência no servidor, embeddings de rosto, Studio editável |
| **v1** (estabilidade) | Menos trabalho manual, mais confiança | Pix com confirmação automática (PSP + webhook); Supabase Queues; teste canário diário; painel de qualidade da IA; calibração do subtom com os atendimentos reais; anamnese no agendamento; plano B de modelo pronto | — |
| **v2** (diferenciais) | Precisão e escala | Conferência também no servidor (worker com MediaPipe); máscaras finas (face parsing com licença comercial clara); Thalita edita catálogo/regras no Studio (com versão); "modo preciso" com folha branca; talvez produto para outras maquiadoras | — |

---

## 8. Checklist de qualidade antes de lançar

**Precisão e honestidade**
- [ ] Toda imagem de IA tem o selo "inspiração" e a frase de expectativa.
- [ ] Nenhuma foto que falhou na conferência é mostrada; plano B (prévia pintada) funciona.
- [ ] Checagem "a pele não clareou" ativa.
- [ ] Teste de cor com os 10 tons Monk passou, sem diferença grande de erro entre tons claros e escuros.
- [ ] A ficha mostra tom/subtom como **estimados**, com confiança e "confirmar pessoalmente".

**Privacidade e segurança**
- [ ] Chave da IA só no servidor; texto livre da cliente nunca vai direto para a IA.
- [ ] Fotos em bucket privado, links curtos, exclusão automática testada.
- [ ] Menor de idade: sem envio à IA; autorização do responsável registrada.
- [ ] Termos e política de privacidade publicados (arquivo 06), citando o Google como processador da imagem.
- [ ] Logs sem dados pessoais; nenhum dado biométrico guardado.

**Operação**
- [ ] Modelo de IA configurável; teste canário diário; alerta de erro e de gasto.
- [ ] Limites diários (1/5/15) e por IP funcionando; idempotência no "gerar".
- [ ] Teste manual em iPhone (Safari) e Android de entrada, com 4G fraco.
- [ ] Ponta a ponta verde no CI (celular + computador).

**Licenças**
- [ ] `LICENCAS.md` do app real atualizado (MediaPipe Apache 2.0, Monk CC BY 4.0, fontes OFL, qualquer trecho MIT copiado).
- [ ] Página de créditos no app.
- [ ] Nenhum modelo "não comercial" ou GPL no código de produção.

---

## 9. "Roubar como artista" — do jeito certo

A expressão vem do livro *Steal Like an Artist* (Austin Kleon, 2012): **todo trabalho criativo nasce de influências**; a diferença entre o artista e o plagiador é **o que se faz com elas**. Para software, isso vira regras bem práticas:

| Bom roubo (pode) | Mau roubo (não pode) |
|---|---|
| Estudar **muitos** projetos e entender **por que** funcionam | Copiar um projeto só, inteiro |
| Pegar **ideias** (dividir a make em camadas, usar o branco do olho para a luz) e escrever **o nosso** código | Copiar código GPL/AGPL/"não comercial"/sem licença, mesmo mudando nomes |
| Copiar trecho **MIT/Apache/BSD** mantendo o aviso de licença e registrando em `LICENCAS.md` | Apagar o aviso de licença ou o nome do autor |
| Usar fórmulas científicas (CIELAB, ΔE2000, ITA) — matemática não tem dono — e **citar o artigo** | Usar pesos de modelo ou fotos sem conferir de onde vieram |
| **Dar crédito** em público (página de créditos) | Fingir que inventou |
| **Transformar**: juntar peças de lugares diferentes num produto novo (regras da Thalita + ciência da cor + IA) | Entregar uma "cópia com outra cor" |

O protótipo já segue esse caminho: `prototipo/LICENCAS.md` separa **o que é de terceiros** (MediaPipe, Monk, fontes), **o que foi só inspiração** (OpenMakeupSDK, sem nenhuma linha copiada) e **o que é nosso** (medidas, regras, pintura, brief). **Manter esse arquivo vivo no app real** é a melhor proteção do dono — jurídica e de reputação.

---

## Fontes
- Protótipo: `prototipo/js/tipos.js` (contrato), `prototipo/js/ia.js`, `prototipo/js/seguranca.js`, `prototipo/LICENCAS.md`, `prototipo/package.json`, `prototipo/testes/e2e/playwright.config.mjs`, `prototipo/scripts/video-falso.py`
- Vercel — limites das funções (duração 300 s Hobby / 800 s Pro com fluid compute): https://vercel.com/docs/functions/limitations
- Vercel Queues (beta público 27/02/2026, US$ 0,60 por milhão de operações): https://vercel.com/docs/queues · https://vercel.com/changelog/vercel-queues-now-in-public-beta
- Supabase Queues (pgmq): https://supabase.com/docs/guides/queues · https://supabase.com/blog/supabase-queues
- Preços e modelos de IA: ver `pesquisa/09-ia-geracao-de-imagem.md`
- Bibliotecas de teste de cor (licenças verificadas no GitHub em 2026-10-07): https://github.com/Evercoder/culori (MIT) · https://github.com/colour-science/colour (BSD-3)
- Serwist (PWA, MIT): https://github.com/serwist/serwist
- Austin Kleon, *Steal Like an Artist* (Workman Publishing, 2012) — livro

> Não verificado nesta rodada: preços atuais dos planos Vercel/Supabase/Resend e termos de uso comercial do plano Hobby da Vercel (conferir nas páginas oficiais); existência de expiração automática nativa no Supabase Storage (não encontrada na busca).

## O que fazer com isso
1. **Antes de migrar:** trocar o modelo desligado (`gemini-2.5-flash-image`) e colocar o nome do modelo em variável de ambiente.
2. Criar `lib/motor/` no app real e migrar **na ordem da seção 3.2**, começando por copiar os `.js` com checagem de tipos ligada e os testes portados.
3. Montar a rota `POST /api/simulacoes` (limites, idade, foto privada, receita recalculada, 2 candidatas) e a conferência no aparelho com "colar de volta".
4. Configurar bucket privado + rotina diária de exclusão de fotos vencidas.
5. Começar o **banco de fotos de referência** (10 tons Monk, com consentimento) e o teste diferencial de cor com culori.
6. Ligar alertas de gasto e de "modelo fora do ar" antes do primeiro cliente real.
7. Usar o **checklist da seção 8** como "porta de saída" do MVP.
