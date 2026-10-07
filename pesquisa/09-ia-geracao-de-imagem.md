# 09 · IA que gera a foto com a make (editar a selfie mantendo a pessoa)

> Pesquisa feita em **2026-10-07**. Preços em dólar (US$), sem impostos. Preço de IA muda rápido: conferir de novo antes de fechar o orçamento.

## Em uma olhada
1. **Urgente:** o modelo que o protótipo usa (`gemini-2.5-flash-image`, em `prototipo/js/ia.js`) foi **desligado em 2/10/2026**. O substituto indicado pelo Google é o **Gemini 3.1 Flash Image ("Nano Banana 2")**.
2. Melhor custo-benefício hoje para a simulação: **Nano Banana 2** (US$ 0,067 por foto 1K) ou as versões mais baratas **Nano Banana 2 Lite / 2.1** (US$ 0,034 por foto 1K). Alternativas sérias: OpenAI GPT Image 2, FLUX.1 Kontext Pro, Qwen-Image-Edit-2511 (código aberto Apache 2.0) e Seedream (ByteDance).
3. **Nenhuma IA garante 100%** de "mesma pessoa" nem de "cor exata". O caminho para chegar perto é: **receita estruturada → gerar 2–3 opções → conferência automática (rosto + cor) → colar de volta a foto original fora das áreas da make → regerar se falhar → mostrar como "inspiração"**.
4. Máscara "de verdade" (pintar só dentro de uma área) praticamente sumiu das IAs grandes: no Google, o modelo com máscara saiu de linha em 30/06/2026; na OpenAI, a máscara é só "sugestão". Por isso a proteção tem de ser **nossa**: recortar e colar de volta com os pontos do MediaPipe.
5. **Atenção jurídica:** os termos da API do Gemini proíbem usar o serviço em app "direcionado a ou com chance de ser usado por menores de 18". O app prevê make para filha/menor: **para menores, não mandar a foto para a IA** (usar só a prévia pintada no aparelho) até um advogado confirmar.

---

## 1. O que muda já (e por que é urgente)

| Fato | Fonte | O que fazer |
|---|---|---|
| `gemini-2.5-flash-image` tem data de desligamento **2/10/2026**; depois disso a API devolve erro 404. Substituto indicado: `gemini-3.1-flash-image(-preview)` ou `gemini-3.1-flash-lite-image`. | Página de descontinuações do Gemini (aparece na busca) e rastreadores de lançamentos ([kingy.ai](https://kingy.ai/ai-launch-tracker/gemini-2-5-flash-image-retirement-october-2-2026/), [Digital Applied](https://www.digitalapplied.com/blog/gemini-2-5-flash-image-retirement-october-2-api-vertex)) | Trocar `MODELO_PADRAO` em `ia.js` e no app real. **Conferir o ID exato na página oficial** ([ai.google.dev/gemini-api/docs/deprecations](https://ai.google.dev/gemini-api/docs/deprecations)) — o acesso direto a ela foi bloqueado no ambiente desta pesquisa. |
| Imagen 3 com máscara (`imagen-3.0-capability-001`) aposentado em **30/06/2026**, sem substituto com máscara no Google. | [Fórum do Google](https://discuss.google.dev/t/imagen-3-0-capability-001-retiring-june-30-no-mask-based-editing-replacement-exists/343602), [guia de migração (ChatForest)](https://chatforest.com/builders-log/google-imagen-deprecated-june-2026-gemini-image-migration-builder-guide/) | Não planejar "inpainting com máscara" no Google. Fazer a proteção por máscara do nosso lado (seção 5). |
| A antiga "Vertex AI" agora aparece como **Gemini Enterprise Agent Platform**. | [Blog Google Cloud, 28/05/2026](https://cloud.google.com/blog/products/ai-machine-learning/nano-banana-2-and-nano-banana-pro-are-generally-available?hl=en) | Só muda o nome nos painéis; a API do Gemini continua. |

**Regra para o futuro:** guardar o nome do modelo numa configuração (variável de ambiente), nunca fixo no código, e ter um teste diário que chama o modelo com uma foto de teste. Assim, quando um modelo sair de linha, o alarme toca antes da cliente perceber.

---

## 2. Opções de hoje, lado a lado

### 2.1 Google Gemini (família "Nano Banana")
Preços da tabela oficial do Google Cloud (Agent Platform), baixada em 2026-10-07, plano Standard, região Global ([página de preços](https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing)):

| Modelo | Apelido | Foto 512 px | Foto 1K (~1 MP) | Foto 2K | Foto 4K | Observação |
|---|---|---|---|---|---|---|
| Gemini 3.1 Flash Image | **Nano Banana 2** | US$ 0,045 | **US$ 0,067** | US$ 0,101 | US$ 0,15 | Geral; disponível (GA) desde 28/05/2026. Em lote (Batch/Flex) o preço da imagem cai pela metade, mas a resposta demora — não serve para a cliente esperando. |
| Gemini 3.1 Flash-Lite Image | **Nano Banana 2 Lite** | — | **US$ 0,034** | — | — | O mais rápido: "imagens em até 4 segundos"; edição pode demorar um pouco mais ([blog Google Cloud, 30/06/2026](https://cloud.google.com/blog/products/ai-machine-learning/nano-banana-2-lite-and-gemini-omni-flash-available/)). |
| Gemini Nano Banana 2.1 | — | — | US$ 0,034 | US$ 0,05 | US$ 0,113 | Aparece na tabela de preços; **não achei anúncio nem avaliação de qualidade**. Testar antes de adotar. |
| Gemini 3 Pro Image | **Nano Banana Pro** | — | US$ 0,134 | US$ 0,134 | US$ 0,24 | Mais caro; só vale se o teste mostrar ganho claro de rosto. |
| Gemini 2.5 Flash Image | Nano Banana (1) | — | US$ 0,039 | — | — | **Desligado em 2/10/2026.** |

- **Foto de entrada:** cada imagem enviada custa ~1.120 "tokens" (≈ US$ 0,0006 no Nano Banana 2) — desprezível.
- **API do Gemini (AI Studio) × Google Cloud:** a página de preços da API do Gemini não abriu neste ambiente; uma fonte secundária cita US$ 0,045 a 0,151 por imagem conforme a resolução ([LLM Gateway](https://llmgateway.io/models/gemini-3.1-flash-image)), o que bate com a tabela acima. Conferir.
- **Marca d'água:** o Google informa que os modelos Nano Banana novos saem com **SynthID** (marca invisível de "feito por IA") e **credenciais C2PA** ligadas por padrão ([blog Google Cloud, 30/06/2026](https://cloud.google.com/blog/products/ai-machine-learning/nano-banana-2-lite-and-gemini-omni-flash-available/)). Isso é bom para nós: reforça o aviso "inspiração" e não atrapalha a cliente (é invisível).
- **Termos de uso (pontos que nos afetam)** — [Gemini API Additional Terms](https://ai.google.dev/gemini-api/terms):
  - É preciso ter 18+ para usar a API e **não se pode usá-la em app "direcionado a ou com chance de ser acessado por menores de 18"**. O brief prevê make para filha/menor com autorização do responsável → risco direto. Proposta: para pessoa menor, **a foto não vai para a IA**; ela vê só a prévia pintada no aparelho e a Thalita conversa. Validar com advogado (ver `06-juridico-mei-lgpd.md`).
  - Para atender usuários do Espaço Econômico Europeu, Suíça ou Reino Unido, só serviços pagos. Não é o nosso caso, mas mostra o padrão: **usar sempre a conta paga**, cujos termos de uso de dados são mais restritos que os da camada gratuita (ler a cláusula sobre uso de dados antes de lançar).
- **Qualidade:** no placar público de edição de imagem (votação às cegas de pessoas), o Nano Banana 2 aparece em 3º lugar (1247 pontos), logo atrás do GPT Image 2 (1258) e do GPT Image 1.5 (1254); o Nano Banana Pro aparece em 5º (1240) ([placar via BenchmarkList](https://benchmarklist.com/arenas/arena_ai_image_edit/)). **Cuidado:** esse placar mede edição em geral, não "maquiagem preservando o rosto". Os números são próximos: só um teste nosso, com fotos de vários tons de pele, decide.

### 2.2 OpenAI (GPT Image)
| Modelo | Preço por foto 1024×1024 | Fonte |
|---|---|---|
| GPT Image 2 | baixa US$ 0,006 · média US$ 0,053 · alta US$ 0,211 | fontes secundárias ([Unifically](https://unifically.com/blogs/gpt-image-2), [PricePerToken](https://pricepertoken.com/gpt-image-pricing)) — a página oficial não abriu aqui |
| GPT Image 1.5 | baixa US$ 0,009 · média US$ 0,034 · alta US$ 0,133 | [página do modelo](https://developers.openai.com/api/docs/models/gpt-image-1.5) (via busca) |

- Pontos fortes: topo do placar de edição; aceita várias imagens de referência (fontes citam até 16 no GPT Image 2).
- **Máscara é só sugestão:** a própria OpenAI diz que, no GPT Image, "a máscara é inteiramente baseada no prompt": o modelo usa a máscara como guia, mas pode não seguir o formato exato e redesenha a imagem inteira. Há vários relatos de máscara ignorada no fórum oficial ([fórum OpenAI](https://community.openai.com/t/mask-is-completely-ignored-in-the-image-edit-api/1350867), [outro relato](https://community.openai.com/t/gpt-image-2-masking-issue/1379510)). Um usuário relatou que, com fidelidade alta + máscara, o rosto **mudou mais** dentro da máscara ([fórum OpenAI](https://community.openai.com/t/image-generation-high-fidelity-editing/1317649/1)).
- Qualidade "alta" custa ~3× o Nano Banana 2. Vale como **segunda opção** (plano B se o Google falhar).

### 2.3 FLUX (Black Forest Labs)
| Modelo | Preço | Licença |
|---|---|---|
| FLUX.1 Kontext [pro] | US$ 0,04 por foto (BFL e fal.ai) | Só por API (comercial ok pela API) |
| FLUX.1 Kontext [max] | US$ 0,08 por foto | Só por API |
| FLUX.2 [pro] (edição) | a partir de ~US$ 0,045 por megapixel (entrada US$ 0,015/MP + saída US$ 0,03 no 1º MP) | Só por API |
| FLUX.1 Kontext [dev] (pesos abertos) | grátis para baixar | **FLUX.1 Non-Commercial License → não pode no app** ([anúncio BFL](https://bfl.ai/blog/flux-1-kontext-dev)) |
| FLUX.2 [klein] 4B (pesos abertos) | grátis para baixar | **Apache 2.0 → pode uso comercial**; roda em placa de vídeo de consumo |
| FLUX.2 [klein] 9B | — | Não comercial |

Fontes de preço/licença: [preços BFL](https://bfl.ai/pricing) e [documentação](https://docs.bfl.ai/quick_start/pricing) (via busca), [Puter – preços FLUX (jun/2026)](https://developer.puter.com/tutorials/flux-api-pricing/), [InVideo – variantes e licenças (ago/2026)](https://invideo.io/blog/flux-ai-image-generator/), [ComputePrices – fal.ai](https://computeprices.com/providers/fal-ai/models/flux-1-kontext-pro).

- A BFL diz que o Kontext [pro] teve a melhor nota de "preservar personagem" no teste interno deles (KontextBench) — é avaliação **da própria empresa**.
- O REFERENCIAS.md já avisa que o Kontext [dev] é não comercial. **Novidade:** o FLUX.2 [klein] 4B é Apache 2.0 — é a opção aberta mais "liberada" da família, mas é um modelo pequeno; testar qualidade de rosto antes.

### 2.4 Qwen-Image-Edit (Alibaba) — código aberto
- Versão mais nova encontrada: **Qwen-Image-Edit-2511** (anunciada em 17/12/2025), 20 bilhões de parâmetros, **Apache 2.0** (o repositório [QwenLM/Qwen-Image](https://github.com/QwenLM/Qwen-Image) mostra Apache-2.0, verificado no GitHub em 2026-10-07). Destaca melhora em "consistência de personagem" a partir de retratos ([Hugging Face](https://huggingface.co/qwen/qwen-image-edit-2511)).
- Preço hospedado: ~**US$ 0,031 por foto 1024²** no fal.ai ([PricePerToken](https://pricepertoken.com/image/model/qwen-qwen-image-edit-2511)); também na Replicate e RunPod.
- Vantagem: se um dia o Google mudar regras ou preço, dá para **rodar por conta própria** (placa de vídeo grande ou serviço de GPU). Desvantagem: mais trabalho de operação.

### 2.5 Seedream (ByteDance)
| Modelo | Preço por foto | Onde |
|---|---|---|
| Seedream 4.5 | US$ 0,04 (fal.ai) · US$ 0,06 (Replicate) | [PricePerToken](https://pricepertoken.com/image/model/bytedance-seedream-4-5) |
| Seedream 5.0 Lite | US$ 0,035 (BytePlus) | [EvoLink](https://evolink.ai/blog/seedream-pricing-guide-2026) |
| Seedream 5.0 Pro Edit | US$ 0,0675 até 1536² (fal.ai) | [MuAPI](https://muapi.ai/comparison/bytedance-seedream-5.0-pro-edit) |

- O Seedream 5.0 Pro aparece em 6º no placar de edição (1239). Licença: só por API (termos da BytePlus/fal). Ponto de atenção: servidores e termos fora do Brasil/EUA; ler a política de dados antes de mandar rosto.

### 2.6 Intermediários (fal.ai, Replicate, OpenRouter)
- Vendem acesso a vários modelos com uma conta só. Bom para **testar e comparar** rápido (o mesmo código chama FLUX, Qwen, Seedream).
- Para produção com rosto de cliente: preferir **contrato direto** com quem processa (Google), para ter termos de dados claros e um processador a menos na política de privacidade.

### 2.7 Tabela-resumo (para decidir)

| Critério | Nano Banana 2 | NB 2 Lite / 2.1 | GPT Image 2 | FLUX Kontext Pro | Qwen-Edit-2511 | Seedream 4.5/5 |
|---|---|---|---|---|---|---|
| Preservar o rosto | Bom (topo do placar geral) | **Não avaliado** | Melhor no placar geral | Bom (dado da própria BFL) | Bom (dado do próprio Qwen) | Bom (placar) |
| Controle de cor | Por texto (hex/nomes) | Por texto | Por texto | Por texto | Por texto | Por texto |
| Máscara real | Não | Não | Só "guia" | Não (Kontext) | Não | Não |
| Custo por foto 1K | US$ 0,067 | US$ 0,034 | US$ 0,053 (média) a 0,211 (alta) | US$ 0,04 | ~US$ 0,031 | US$ 0,035–0,068 |
| Velocidade | Rápido ("Flash") | ~4 s (Lite, dado Google) | Sem número oficial encontrado | Sem número oficial | Depende do servidor | Sem número oficial |
| Licença comercial | Sim (termos Google, **18+**) | Sim (idem) | Sim (termos OpenAI) | Sim pela API | **Apache 2.0** | Sim pela API |
| Marca d'água | SynthID + C2PA | SynthID + C2PA | C2PA (conferir) | Não informado | Não | Não informado |

> **Latência:** não encontrei números oficiais comparáveis (exceto os ~4 s do Lite). Medir no nosso teste de bancada (seção 6) — tempo total da cliente esperando é o que importa.

**Recomendação:** principal **Nano Banana 2** (qualidade) com teste A/B contra **Nano Banana 2 Lite/2.1** (metade do preço). Plano B pronto no código: **GPT Image 2 (média)** ou **FLUX Kontext Pro**. Plano C, independente de fornecedor: **Qwen-Image-Edit-2511** hospedado.

---

## 3. O que é possível prometer (honestidade)

- **Não existe** IA de imagem que garanta 100% a mesma pessoa e 100% a cor exata. Todas "redesenham" a foto inteira; às vezes afinam o rosto, clareiam a pele, mudam a cor do olho ou o formato da boca.
- O celular também não mede cor como um aparelho de laboratório (ver `10-ciencia-da-cor-e-make.md`): mesmo uma foto perfeita mostra a cor **como a câmera viu**.
- **O que dá para garantir:** que o app **nunca mostra** uma foto que falhou na conferência; que as áreas fora da make são **pixel a pixel a foto original**; que a ficha técnica da Thalita vem **da receita** (números), não da imagem; e que a cliente sabe que é **inspiração**.
- Frase sugerida na tela: *"Simulação feita com IA para inspirar. No dia, a Thalita ajusta cores e intensidade à sua pele e à luz do evento."*

---

## 4. Técnicas para "acertar" a make

### 4.1 Instrução estruturada a partir da receita
O protótipo já faz isso em `prototipo/js/ia.js` (`instrucaoParaIA`): a IA recebe **o que pintar, onde e quanto**, com cor em hex, nome amigável, acabamento e % de intensidade. Boas práticas a manter/acrescentar:

| Item | Como | Por quê |
|---|---|---|
| Regras de identidade primeiro | "Mesmo rosto, mesma idade, mesmo tom de pele por baixo da base, mesmas pintas e textura…" (já existe) | Os modelos priorizam o que vem antes |
| Cor em **hex + nome + família** | `#B5654A "Terracota" (marrom-alaranjado quente)` | Hex sozinho às vezes é ignorado; o nome ajuda o modelo a "entender" |
| Intensidade em palavras **e** número | 30% = "leve, translúcido, pele aparece"; 70% = "bem pigmentado" | Modelos respondem melhor a descrições do que a percentuais |
| Zona com referência anatômica | "pálpebra móvel até o côncavo, esfumado para a cauda da sobrancelha" | Reduz make no lugar errado |
| Proibições explícitas | "não clarear a pele, não afinar o rosto, não aumentar a boca, não mudar cor dos olhos" (já existe) | Combate os desvios mais comuns |
| Frases descritivas, não lista de palavras-chave | Seguir o [guia oficial de prompts do Nano Banana](https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-nano-banana) | Recomendação do próprio Google |
| Mesmo tamanho e proporção da foto de entrada | Pedir explicitamente; depois conferir | Facilita a conferência e o "colar de volta" |

### 4.2 Imagem de referência
- Se a cliente mandou uma foto de referência ("gostei dessa make"), **não mande a foto de outra pessoa junto com a selfie** sem cuidado: o aprendizado do próprio projeto (CLAUDE.md, 2026-10-06) mostra que mandar foto de outra modelo como referência faz a IA **trocar o rosto**. Melhor: o motor **lê** a referência (cores, zonas) e transforma em receita; só a **selfie** vai para a IA.
- Se um dia mandar referência visual, mandar só um **recorte da região** (ex.: só o olho), nunca o rosto inteiro de outra pessoa.

### 4.3 Gerar 2–3 e escolher pela conferência automática
O protótipo já tem `conferirResultado` (identidade por pontos do rosto alinhados pelos olhos + ΔE2000 por região). Recomendações:

1. **Gerar 2 candidatas em paralelo** (3 só se a 1ª rodada falhar). Custo com Nano Banana 2: ~US$ 0,13–0,20 por simulação.
2. **Identidade (rosto):**
   - Hoje: geometria de pontos (MediaPipe) — já calibrado no protótipo (mesma pessoa ≤ 0,038; pessoas diferentes ≥ 0,054 em distâncias entre os olhos). É um filtro "grosso", mas **não cria dado biométrico guardado** (é só comparação na hora).
   - Reforço possível: "embedding" de reconhecimento facial (vetor que resume o rosto). **Cuidado com licença:** os modelos prontos do InsightFace/ArcFace são **só para pesquisa não comercial** ([PyPI insightface](https://pypi.org/project/insightface/)). E, pela LGPD, comparar rostos para verificar identidade é tratar **dado biométrico (sensível)** — exige base legal e transparência. Se adotar: calcular no servidor, comparar, **descartar na hora**, não guardar.
3. **Cor (ΔE2000 por região):** comparar a cor medida na foto gerada (lábio, maçã do rosto, pálpebra) com a cor-alvo da receita. Antes de medir, aplicar **o mesmo balanço de branco** (pelo branco do olho) na foto gerada, senão a luz diferente vira "erro de cor".
4. **Checagem nova — "a pele não mudou":** medir a pele **fora** das áreas de make (testa lateral, pescoço) antes e depois. Se a luminosidade (L*) subir muito, a IA **clareou a pessoa** → rejeitar. Esse é o desvio mais grave para a marca (respeito à pele da cliente) e é fácil de medir com o `cor.js` que já existe.
5. **Outras checagens rápidas:** exatamente 1 rosto; mesma proporção; olhos abertos se estavam abertos; cor da íris parecida (ΔE na íris); nada de texto/moldura.
6. **Escolher a melhor** pela soma ponderada (identidade pesa mais que cor). Se nenhuma passar, regerar **uma vez** com instrução reforçada no ponto que falhou ("o batom ficou claro demais: use #9E3B3B a 70%"). Se falhar de novo, mostrar a **prévia pintada no aparelho** (`pintura.js`) com um aviso amigável — nunca uma foto ruim.

### 4.4 "Colar de volta" (a máscara feita por nós)
Como as IAs redesenham a foto inteira, a melhor proteção de identidade é **não usar os pixels da IA onde não há make**:

1. Rodar o MediaPipe na foto gerada; alinhar a foto gerada à original pelos pontos estáveis (cantos dos olhos, ponte do nariz). Se o alinhamento exigir distorção grande → rejeitar.
2. Montar máscaras suaves (bordas esfumadas) das zonas da receita: lábios, pálpebras, maçãs do rosto, contorno, e a pele inteira só se houver base.
3. Resultado final = **IA dentro da máscara + original fora**. Cabelo, fundo, roupa, íris, dentes, formato dos olhos e da boca ficam exatamente como na selfie.
4. Limitação: quando há base cobrindo o rosto todo, a área "da IA" fica grande; aí a conferência de identidade e de "pele não clareou" é ainda mais importante.

Isso é o que dá para fazer hoje sem depender de "inpainting" do fornecedor — e funciona com qualquer modelo (Google, OpenAI, FLUX, Qwen).

### 4.5 Proteção contra "prompt injection" (texto que tenta mandar na IA)
A OWASP põe "prompt injection" como risco nº 1 de apps com IA (LLM01:2025), incluindo **instruções escondidas em imagens** ([OWASP LLM01](https://genai.owasp.org/llmrisk/llm01-prompt-injection/); [nota da Cloud Security Alliance sobre injeção por imagem](https://labs.cloudsecurityalliance.org/research/csa-research-note-image-prompt-injection-multimodal-llm-2026/)).

O protótipo já tem boa base (`seguranca.js` + `blindar()` e o bloco `<pedido_da_cliente>` marcado como DADO em `ia.js`; `receita.js` filtra palavras como "prompt", "jailbreak"). Reforços:

- **O texto livre da cliente não vai para a IA de imagem.** Ele passa pelo nosso intérprete (`interpretarPedido`) e vira **ajustes fechados** (mais suave/intenso, trocar família de cor, evitar X). Só a receita estruturada sai do servidor. Isso elimina a maior parte do risco.
- Se usar uma IA de texto para entender pedidos mais livres: ela só pode devolver JSON validado por esquema (lista fechada de campos e valores), nunca texto que vá direto para a imagem.
- **Fotos:** reprocessar (redimensionar e regravar em JPEG/WebP), apagar metadados (EXIF/GPS), recusar arquivos que não sejam imagem de verdade (o `seguranca.js` já confere os bytes). Instruir o modelo a ignorar texto escrito na imagem (já existe).
- **Saída:** conferir sempre (seção 4.3) — uma injeção que "funcione" vira uma foto que falha na conferência e não é mostrada.
- **Custo descontrolado** (OWASP LLM10): limite por dia do brief (1/5/15), limite por IP, fila com no máximo N gerações simultâneas, teto de gasto diário no painel do Google com alerta.
- Chave da API **só no servidor** (rotas do Next.js), nunca no navegador — o `ia.js` já registra essa regra.

---

## 5. Custo por cliente (conta de padaria)

| Cenário | Gerações | Nano Banana 2 (US$ 0,067) | NB 2 Lite/2.1 (US$ 0,034) |
|---|---|---|---|
| Simulação comum (2 candidatas, passa de primeira) | 2 | US$ 0,13 | US$ 0,07 |
| Simulação difícil (2 + 1 nova tentativa) | 3 | US$ 0,20 | US$ 0,10 |
| Cliente com reserva no limite (15 simulações/dia × 2) | 30 | US$ 2,01 | US$ 1,02 |

Multiplicar pela cotação do dólar do dia. O limite de 15/dia é generoso: o custo real médio deve ficar perto de 2–5 simulações por cliente. Ver também `12-engenharia-e-migracao.md` (custos totais).

---

## 6. Como escolher o modelo de verdade (teste de bancada)

1. Montar um conjunto de **30–50 selfies autorizadas** (consentimento por escrito), cobrindo os 10 tons da escala Monk, com e sem óculos, cabelos diferentes, luz boa e luz ruim. Não usar fotos de menores.
2. Para cada foto, 3 receitas (natural, soft glam, boca marcante).
3. Rodar em 3–4 modelos (NB 2, NB 2 Lite ou 2.1, GPT Image 2 média, FLUX Kontext Pro ou Qwen-Edit-2511).
4. Medir automaticamente: % que passa na conferência de identidade; ΔE médio por região; variação do L* da pele (clareamento); tempo; custo.
5. Thalita avalia às cegas (sem saber o modelo) 1–5: "é a cliente?" e "é a make que eu faria?".
6. Escolher pelo melhor equilíbrio. Repetir a cada 3 meses (modelos novos saem o tempo todo).

---

## Fontes
- Google Cloud — preços (Agent Platform), baixado em 2026-10-07: https://cloud.google.com/gemini-enterprise-agent-platform/generative-ai/pricing
- Google Cloud Blog — Nano Banana 2 e Pro GA (28/05/2026): https://cloud.google.com/blog/products/ai-machine-learning/nano-banana-2-and-nano-banana-pro-are-generally-available?hl=en
- Google Cloud Blog — Nano Banana 2 Lite e Gemini Omni Flash (30/06/2026): https://cloud.google.com/blog/products/ai-machine-learning/nano-banana-2-lite-and-gemini-omni-flash-available/
- Google Cloud Blog — guia de prompts do Nano Banana: https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-nano-banana
- Google — anúncio Nano Banana 2 (Gemini 3.1 Flash Image): https://blog.google/innovation-and-ai/technology/ai/nano-banana-2/
- Gemini API — descontinuações: https://ai.google.dev/gemini-api/docs/deprecations · rastreadores: https://kingy.ai/ai-launch-tracker/gemini-2-5-flash-image-retirement-october-2-2026/ · https://www.digitalapplied.com/blog/gemini-2-5-flash-image-retirement-october-2-api-vertex
- Gemini API — termos adicionais: https://ai.google.dev/gemini-api/terms
- Imagen com máscara aposentado: https://discuss.google.dev/t/imagen-3-0-capability-001-retiring-june-30-no-mask-based-editing-replacement-exists/343602 · https://chatforest.com/builders-log/google-imagen-deprecated-june-2026-gemini-image-migration-builder-guide/
- Placar de edição de imagem (Arena): https://benchmarklist.com/arenas/arena_ai_image_edit/
- OpenAI GPT Image 1.5: https://developers.openai.com/api/docs/models/gpt-image-1.5 · preços GPT Image 2 (secundárias): https://unifically.com/blogs/gpt-image-2 · https://pricepertoken.com/gpt-image-pricing
- OpenAI — máscara como guia: https://community.openai.com/t/mask-is-completely-ignored-in-the-image-edit-api/1350867 · https://community.openai.com/t/gpt-image-2-masking-issue/1379510 · https://community.openai.com/t/image-generation-high-fidelity-editing/1317649/1
- BFL — preços: https://bfl.ai/pricing · https://docs.bfl.ai/quick_start/pricing · Kontext [dev]: https://bfl.ai/blog/flux-1-kontext-dev
- FLUX (secundárias): https://developer.puter.com/tutorials/flux-api-pricing/ · https://invideo.io/blog/flux-ai-image-generator/ · https://computeprices.com/providers/fal-ai/models/flux-1-kontext-pro · FLUX.2 klein 4B (Vercel AI Gateway): https://vercel.com/ai-gateway/models/flux-2-klein-4b/about
- Qwen-Image (licença verificada no GitHub, 2026-10-07): https://github.com/QwenLM/Qwen-Image · Qwen-Image-Edit-2511: https://huggingface.co/qwen/qwen-image-edit-2511 · preço: https://pricepertoken.com/image/model/qwen-qwen-image-edit-2511
- Seedream: https://pricepertoken.com/image/model/bytedance-seedream-4-5 · https://evolink.ai/blog/seedream-pricing-guide-2026 · https://muapi.ai/comparison/bytedance-seedream-5.0-pro-edit
- InsightFace (modelos só não comerciais): https://pypi.org/project/insightface/
- OWASP LLM01:2025: https://genai.owasp.org/llmrisk/llm01-prompt-injection/ · CSA, injeção por imagem: https://labs.cloudsecurityalliance.org/research/csa-research-note-image-prompt-injection-multimodal-llm-2026/
- Código do protótipo: `prototipo/js/ia.js`, `prototipo/js/seguranca.js`, `prototipo/js/receita.js`

> Observação sobre o método: várias páginas oficiais (ai.google.dev, platform/developers.openai.com, docs.bfl.ai, fal.ai) estavam bloqueadas no ambiente desta pesquisa; nesses casos usei o resumo da busca ou fontes secundárias e marquei "conferir". A tabela de preços do Google Cloud foi lida diretamente.

## O que fazer com isso
1. **Hoje:** trocar `gemini-2.5-flash-image` por `gemini-3.1-flash-image` (conferir o ID oficial) no protótipo e no app real; colocar o nome do modelo em variável de ambiente; criar teste diário de "o modelo ainda responde?".
2. **Esta semana:** decidir a regra para menores (sem IA para menores de 18) com o advogado; ajustar o fluxo "Quem" do agendamento.
3. Implementar o **"colar de volta"** (seção 4.4) e a checagem **"a pele não clareou"** (4.3, item 4) no `conferirResultado`.
4. Rodar o **teste de bancada** (seção 6) entre Nano Banana 2, Lite/2.1 e um plano B (GPT Image 2 ou FLUX Kontext Pro).
5. Deixar o código do provedor atrás de uma interface (`gerarImagem(receita, foto) → fotos[]`) para trocar de modelo sem mexer no resto.
6. Manter sempre o selo **"inspiração"** e a frase de expectativa na tela de revelação.
