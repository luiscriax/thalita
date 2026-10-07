# 11 · Repositórios open source (complemento ao REFERENCIAS.md)

> Pesquisa feita em **2026-10-07**. Licença, estrelas e data do último envio de código ("push") foram **lidas na API do GitHub** nesse dia (busca de repositórios). Estrelas mudam; trate como "ordem de grandeza". Este arquivo **não repete** o REFERENCIAS.md: traz só **atualizações de status** e **projetos novos**.

## Em uma olhada
1. **Mudanças importantes:** o Cal.com **fechou o código** em abril/2026; o que ficou público é o **Cal.diy (MIT)**. O link do **OpenSalon** não existe mais (ou ficou privado). O **SkinToneClassifier** é **GPL-3.0** → só estudo, não "usar".
2. **Risco escondido:** modelos de "face parsing" (separar lábios, olhos, pele) costumam ser treinados no conjunto **CelebAMask-HQ**, que é declarado **só para pesquisa não comercial**; e os modelos prontos do **InsightFace** (reconhecimento de rosto) também são **não comerciais**. Código MIT não garante que os **pesos** do modelo sejam livres.
3. **Bons achados para usar (MIT/Apache/BSD):** `transformers.js` (rodar modelos no navegador, Apache 2.0), `culori` (cores em JS, MIT) e `colour-science` (cores em Python, BSD-3) para **testar** o nosso `cor.js`, `Serwist` (PWA, MIT), `pix-qrcode-utils` (Pix, MIT, ativo).
4. Projetos novos de make virtual em 2026 (ex.: `otdnnc/virtual-makeup`, `Magic-Makeup` do ECCV 2026) **não têm licença** → todos os direitos reservados → só para olhar e aprender.
5. Regra que vale para tudo: **MIT/Apache/BSD = pode usar com crédito; GPL/AGPL/"non-commercial"/sem licença = só estudo.**

---

## 1. Como ler as tabelas
- **Licença:** como o GitHub identifica o arquivo LICENSE do repositório (campo `license.spdx_id`). "Sem licença" = o GitHub não achou licença → por lei, o autor mantém todos os direitos.
- **★:** estrelas (popularidade). **Último push:** última vez que alguém enviou código (atividade).
- **Uso:** 🟢 pode usar no app com crédito · 🟡 usar com cuidado (ler a licença dos pesos/dados ou do arquivo "Other") · 🔴 só estudo.

---

## 2. Atualizações de status do REFERENCIAS.md

| Projeto (já citado) | Licença verificada | ★ / último push | O que mudou | Uso |
|---|---|---|---|---|
| [OpenMakeupSDK](https://github.com/ehsanwwe/OpenMakeupSDK) | MIT | 16★ · 2026-06-16 | Criado em 06/2026 por uma pessoa; sem atividade desde junho. | 🟢 como inspiração (já é assim em `prototipo/LICENCAS.md`). Risco de abandono → não depender. |
| [Cal.com](https://github.com/calcom/cal.com) → [Cal.diy](https://github.com/calcom/cal.diy) | **MIT** (Cal.diy) | 48,9 mil★ · 2026-09-26 | Em **15/04/2026** o Cal.com levou o código de produção para um repositório **privado** e relicenciou o público, de AGPL-3.0 para **MIT**, com o nome **Cal.diy**, sem Teams, Workflows, Insights, SSO e API v1 ([anúncio Cal.com](https://cal.com/blog/cal-diy-open-source-to-closed-source)). | 🟢 para estudar e até copiar trechos (regras de disponibilidade, fuso horário, Google Agenda) com crédito. É grande demais para "embutir". |
| [Easy!Appointments](https://github.com/alextselegidis/easyappointments) | **GPL-3.0** | 4,4 mil★ · 2026-10-07 | Muito ativo. | 🔴 só estudo (copiar código obrigaria abrir o nosso app sob GPL). |
| OpenSalon (`clawnify/open-salon`) | — | — | **Não encontrado** na API do GitHub em 2026-10-07 (apagado, renomeado ou privado). | Remover do REFERENCIAS.md. |
| [pix-utils](https://github.com/thalesog/pix-utils) | MIT | 95★ · **2025-08-15** | Funciona, mas sem push há ~14 meses. | 🟢, com alternativa pronta (ver seção 3.6). |
| [SkinToneClassifier](https://github.com/ChenglongMa/SkinToneClassifier) | **GPL-3.0** | 187★ · 2025-12-22 | O REFERENCIAS.md o lista como "medida de tom para a ficha" (🟡). | 🔴 só estudo. O nosso `medidas.js` já faz isso com código próprio. |
| [yakhyo/face-parsing](https://github.com/yakhyo/face-parsing) | MIT (código) | 326★ · 2026-04-14 | Ativo, exporta para ONNX. | 🟡 código livre, **mas** os pesos são treinados em face parsing estilo CelebAMask-HQ → ver seção 4. |
| [Human (vladmandic)](https://github.com/vladmandic/human) | MIT | 3,3 mil★ · 2025-12-13 | Ritmo menor; ainda o "tudo em um" em JS. | 🟢 código; modelos vêm de várias origens → conferir a licença de cada modelo que for usar (principalmente o de "descrição/reconhecimento de rosto"). |
| [Stable-Makeup](https://github.com/Xiaojiu-z/Stable-Makeup) | Apache-2.0 (código) | 233★ · 2024-07-14 | Parado desde 2024; artigo saiu no SIGGRAPH 2025. | 🟡/🔴 estudo: depende de pesos de difusão de terceiros; conferir licença dos pesos. |
| [Qwen-Image](https://github.com/QwenLM/Qwen-Image) | Apache-2.0 | 8,4 mil★ · 2026-02-10 | Versão de edição mais nova: **Qwen-Image-Edit-2511** (ver arquivo 09). | 🟢 (comercial permitido), precisa de GPU. |

---

## 3. Projetos novos, por área

### 3.1 Make virtual no navegador
| Projeto | Licença | ★ / último push | O que aproveitar | Risco | Uso |
|---|---|---|---|---|---|
| [otdnnc/virtual-makeup](https://github.com/otdnnc/virtual-makeup) | **Sem licença** | 4★ · 2026-05-26 | Batom, sombra, sobrancelha e **cor de cabelo** ao vivo, 100% no aparelho (MediaPipe Face Landmarker + segmentação de cabelo + OpenCV.js). Ideia de pintar o cabelo pela máscara de segmentação. | Sem licença = não pode copiar. Projeto de 1 commit. | 🔴 estudo |
| [vivoCameraResearch/Magic-Makeup](https://github.com/vivoCameraResearch/Magic-Makeup) | **Sem licença** | 40★ · 2026-07-30 | Artigo **ECCV 2026**: transferência de make com **controle por região** (olho, boca, pele) num "diffusion transformer" — exatamente o problema de "make no lugar certo" ([página](https://vivocameraresearch.github.io/magicmakeup/)). | Pesquisa; sem licença. | 🔴 estudo (acompanhar) |

> Busquei por "virtual makeup try-on + MediaPipe + web" com atividade desde 06/2025: só apareceram projetos pequenos (0–4★). O REFERENCIAS.md já tem os principais (OpenMakeupSDK, Jeeliz, MindAR). Não há, hoje, um SDK aberto e maduro de make ao vivo no navegador — o nosso `pintura.js` próprio é um diferencial.

### 3.2 Modelos no navegador (WebGPU/ONNX) e partes do rosto
| Projeto | Licença | ★ / último push | O que aproveitar | Risco | Uso |
|---|---|---|---|---|---|
| [huggingface/transformers.js](https://github.com/huggingface/transformers.js) | Apache-2.0 | 16,3 mil★ · 2026-10-07 | Roda modelos (inclusive face parsing, como o `Xenova/face-parsing` já citado) **no navegador**, com WebGPU quando disponível. Base para máscaras precisas de lábios/olhos sem servidor. | A biblioteca é livre; **cada modelo tem a sua licença** (ver seção 4). Download do modelo pesa no 4G. | 🟢 |
| [yakhyo/uniface](https://github.com/yakhyo/uniface) | MIT (código) | 2,0 mil★ · 2026-09-26 | Biblioteca Python "tudo em um" (detecção, pontos, face parsing, reconhecimento, qualidade da foto, anti-fraude) em ONNX — boa para o **servidor** (ex.: conferência da IA). | Pesos de reconhecimento costumam vir do InsightFace (não comercial). Conferir modelo a modelo. | 🟡 |
| InsightFace (pacote `insightface`) | Código MIT; **modelos prontos só não comerciais** | — | Referência de reconhecimento facial (ArcFace). | Modelos `buffalo_l` etc. "apenas para pesquisa não comercial"; uso comercial exige licença paga ([PyPI](https://pypi.org/project/insightface/)). | 🔴 para produção |

### 3.3 Cor e tom de pele (para testar o nosso motor)
| Projeto | Licença | ★ / último push | O que aproveitar | Uso |
|---|---|---|---|---|
| [culori](https://github.com/Evercoder/culori) | MIT | 1,2 mil★ · 2026-07-02 | Biblioteca de cores em JavaScript com CIELAB, LCh e **ΔE2000**. Usar **nos testes**: comparar o resultado do nosso `cor.js` com o do culori em milhares de cores aleatórias ("teste diferencial"). Se divergir, achamos bug. | 🟢 (como dependência só de teste, ou até no app) |
| [colour-science/colour](https://github.com/colour-science/colour) | BSD-3-Clause | 2,7 mil★ · 2026-10-06 | Referência acadêmica em Python: conversões, ΔE, **dados de cartelas ColorChecker**, adaptação cromática. Gerar "valores de referência" para os testes de cor. | 🟢 |

> Para medir tom de pele, **não achei** projeto aberto novo, ativo e com licença permissiva melhor que o que o protótipo já faz (média robusta na bochecha + ITA + Monk + matiz). A busca por "skin tone + Monk/ITA/undertone" trouxe projetos pequenos, sem licença clara ou GPL.

### 3.4 Agendamento
| Projeto | Licença | ★ / último push | O que aproveitar | Risco | Uso |
|---|---|---|---|---|---|
| [Cal.diy](https://github.com/calcom/cal.diy) | MIT | 48,9 mil★ · 2026-09-26 | Modelo de dados de disponibilidade, exceções, fuso, buffers entre atendimentos, integração Google Agenda. | Base de código enorme (monorepo); mantido agora por ex-estagiários ([Cal.com](https://cal.com/blog/cal-diy-open-source-to-closed-source)). | 🟢 estudar/copiar trechos com crédito |
| [ARKA – clínica veterinária com agendamento](https://github.com/pjborowiecki/ARKA-Veterinary-Clinic-Page-and-Appointment-Booking-System) | MIT | 165★ · 2024-09-03 | Exemplo **pequeno e legível** em Next.js (App Router, server actions, Zod, Resend, painel admin) — mais perto do tamanho do nosso app. | Parado desde 2024; Next 14 (o nosso é 16) — usar como ideia, não como base. | 🟢 estudo/trechos |
| Easy!Appointments | GPL-3.0 | ver seção 2 | Regras de reserva e avisos | GPL | 🔴 |

### 3.5 Base Next.js + Supabase + pagamentos
| Projeto | Licença | ★ / último push | O que aproveitar | Risco | Uso |
|---|---|---|---|---|---|
| [launch-mvp-stripe-nextjs-supabase](https://github.com/ShenSeanChen/launch-mvp-stripe-nextjs-supabase) | MIT | 1,1 mil★ · 2026-07-20 | Padrões de login Supabase, **webhook de pagamento** e "assinatura confirmada só depois do webhook". A lógica de webhook é a mesma que usaremos para o **Pix do sinal**. | Feito para Stripe/assinatura (EUA); o nosso é Pix avulso. | 🟢 estudo/trechos |
| [Hikari](https://github.com/coremvp/Hikari) | **"Other"** (o GitHub não reconheceu a licença) | 391★ · 2026-10-07 | Template SaaS Next.js + Stripe + Supabase. | Licença não padrão → ler o arquivo antes de copiar qualquer coisa. | 🟡 |

> O app real já existe (Next.js 16 + Supabase em pasta local). **Não recomendo trocar a base por um boilerplate**; use-os só como referência de padrões (webhook, RLS, middleware de login).

### 3.6 Pix
| Projeto | Licença | ★ / último push | O que aproveitar | Uso |
|---|---|---|---|---|
| [NascentSecureTech/pix-qrcode-utils](https://github.com/NascentSecureTech/pix-qrcode-utils) | MIT | 82★ · **2026-10-05** | Gera e lê QR Code Pix (padrão EMV) — alternativa ativa ao `pix-utils`. | 🟢 |
| [guilhermeasn/react-qrcode-pix](https://github.com/guilhermeasn/react-qrcode-pix) | não verificada | 21★ · 2025-12-16 | Componente React de QR Pix estático. | conferir licença |
| [codespar/mcp-dev-latam](https://github.com/codespar/mcp-dev-latam) | a descrição diz "MIT" (campo de licença não conferido) | 272★ · 2026-10-04 | Conectores de comércio LatAm (Pix, NF-e…) para agentes de IA. Interessante para o futuro (Claude/Gemini consultando pedidos). | 🟡 conferir |

> **Importante:** QR Pix **estático** (copia e cola) não avisa o app quando a cliente paga. Para o horário ficar "Confirmado" sozinho, é preciso um **PSP** (banco/intermediador com API Pix e webhook). Ver `05-pagamentos-e-checkout.md`.

### 3.7 PWA (app instalável)
| Projeto | Licença | ★ / último push | O que aproveitar | Uso |
|---|---|---|---|---|
| [Serwist](https://github.com/serwist/serwist) | MIT | 1,5 mil★ · 2026-10-04 | Service worker para Next.js (cache offline, atualização do app). Já é o previsto no CLAUDE.md do app real; confirmado ativo e MIT. | 🟢 |

---

## 4. Licença do código ≠ licença do modelo ≠ licença dos dados
É o erro mais comum em apps de rosto:

| Camada | Exemplo | Pergunta a fazer |
|---|---|---|
| **Código** | `yakhyo/face-parsing` é MIT | Posso copiar/alterar o código? (sim, com crédito) |
| **Pesos do modelo** | BiSeNet treinado para 19 partes do rosto | Quem treinou liberou os pesos para uso comercial? |
| **Dados de treino** | CelebAMask-HQ | O conjunto de dados permite uso comercial dos modelos treinados? O repositório oficial ([switchablenorms/CelebAMask-HQ](https://github.com/switchablenorms/CelebAMask-HQ)) declara o conjunto **para pesquisa e educação não comercial** — conferir o texto exato antes de decidir. |

**Saída prática:** para recortar lábios/olhos/pele no app, preferir os **pontos do MediaPipe (Apache 2.0)** + o **Selfie Multiclass do MediaPipe** (Google — já no REFERENCIAS.md; conferir a licença no "model card" antes de usar), que é a linha que o protótipo segue hoje. Modelos de face parsing de 19 partes ficam para teste interno até a licença dos pesos estar clara.

---

## 5. Regras de uso (resumo para o dono)

| Licença | Pode usar no app? | O que precisa fazer |
|---|---|---|
| MIT, BSD, Apache 2.0, ISC | **Sim** | Manter o aviso de copyright/licença junto do trecho copiado e citar em `LICENCAS.md` / página de créditos. Apache 2.0: manter também o arquivo NOTICE, se houver. |
| CC BY 4.0 (ex.: escala Monk) | Sim | Dar crédito visível. |
| GPL, AGPL | **Não** (só estudar a ideia e reescrever do zero, sem copiar) | — |
| "Non-commercial", "research only", FLUX Non-Commercial | **Não** | — |
| **Sem licença** | **Não** | Todos os direitos reservados; pedir permissão ao autor se quiser usar. |
| "Other" / não reconhecida | Talvez | Ler o arquivo de licença inteiro antes. |

---

## Fontes
Todas as licenças, estrelas e datas foram lidas na API de busca do GitHub em 2026-10-07:
- https://github.com/ehsanwwe/OpenMakeupSDK · https://github.com/calcom/cal.diy · https://github.com/alextselegidis/easyappointments · https://github.com/thalesog/pix-utils · https://github.com/ChenglongMa/SkinToneClassifier · https://github.com/yakhyo/face-parsing · https://github.com/vladmandic/human · https://github.com/Xiaojiu-z/Stable-Makeup · https://github.com/QwenLM/Qwen-Image
- https://github.com/otdnnc/virtual-makeup · https://github.com/vivoCameraResearch/Magic-Makeup · https://github.com/huggingface/transformers.js · https://github.com/yakhyo/uniface · https://github.com/Evercoder/culori · https://github.com/colour-science/colour · https://github.com/pjborowiecki/ARKA-Veterinary-Clinic-Page-and-Appointment-Booking-System · https://github.com/ShenSeanChen/launch-mvp-stripe-nextjs-supabase · https://github.com/coremvp/Hikari · https://github.com/NascentSecureTech/pix-qrcode-utils · https://github.com/guilhermeasn/react-qrcode-pix · https://github.com/codespar/mcp-dev-latam · https://github.com/serwist/serwist
- Cal.com fecha o código / Cal.diy MIT: https://cal.com/blog/cal-diy-open-source-to-closed-source
- InsightFace — modelos não comerciais: https://pypi.org/project/insightface/
- CelebAMask-HQ: https://github.com/switchablenorms/CelebAMask-HQ
- Magic-Makeup (ECCV 2026): https://vivocameraresearch.github.io/magicmakeup/

> Não verificado nesta rodada: licença do `react-qrcode-pix` e o campo de licença do `mcp-dev-latam`; o texto exato da licença do CelebAMask-HQ (página não aberta aqui — conferir).

## O que fazer com isso
1. **Atualizar o REFERENCIAS.md:** Cal.com → Cal.diy (MIT, código do Cal.com agora fechado); remover OpenSalon; marcar SkinToneClassifier como 🔴 (GPL); acrescentar `pix-qrcode-utils` como alternativa ativa ao `pix-utils`.
2. **Adicionar `culori` (MIT) como dependência de teste** e criar o teste diferencial do `cor.js` (detalhes no arquivo 12).
3. **Não usar** pesos do InsightFace nem modelos de face parsing treinados em CelebAMask-HQ em produção até haver licença comercial clara; manter MediaPipe (Apache 2.0).
4. Antes de qualquer cópia de código, registrar em `LICENCAS.md` (projeto, arquivo, licença, o que foi copiado) — o protótipo já tem esse hábito.
5. Acompanhar o **Magic-Makeup** (ECCV 2026): se liberar licença permissiva, é forte candidato para make "por região".
