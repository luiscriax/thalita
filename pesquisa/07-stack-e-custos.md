# 07 — Tecnologia e custos: web ou app, serviços e quanto custa por mês

> Pesquisa feita em **2026-10-07**. Preços em dólar (US$) são cobrados no cartão internacional; a conversão usa **R$ 5,50 por US$ — estimativa, não cotação do dia**. Confira o câmbio e os preços antes de decidir.
> **Limite desta pesquisa:** o acesso direto às páginas foi bloqueado no ambiente de pesquisa; os números vêm dos trechos das páginas oficiais mostrados pelo buscador.

## Em uma olhada
1. **Dá para ficar só na web (PWA).** Instala na tela inicial, tira foto, recebe notificação (no iPhone, só depois de "Adicionar à Tela de Início"). App nativo não é necessário agora.
2. **Login:** código de 6 dígitos por e-mail (melhor que "link mágico" no iPhone) + "Entrar com Google". Login por WhatsApp no Supabase exige Twilio (pago).
3. **Vercel grátis (Hobby) é proibido para uso comercial** → plano Pro, **US$ 20/mês**. **Supabase Pro US$ 25/mês** (o grátis pausa o projeto e não tem backup).
4. **A IA é o custo que cresce:** atenção — o modelo "Nano Banana" original (**gemini-2.5-flash-image**) foi **desligado em 02/10/2026**. O substituto, **Nano Banana 2 (gemini-3.1-flash-image)**, custa **US$ 0,067 por imagem 1K** (US$ 0,045 em 512 px).
5. **Custo mensal estimado:** ~**R$ 300** (50 clientes), ~**R$ 590** (300) e ~**R$ 2.600–2.700** (2.000), sem contar taxas de pagamento.

---

## 1. Web (PWA) ou app nativo?

| Recurso | Android (Chrome) | iPhone (Safari) | Comentário |
|---|---|---|---|
| **Instalar** na tela inicial | Sim, com aviso automático de instalação | Sim, mas **manual** (Compartilhar → Adicionar à Tela de Início). No **iOS 26**, todo site adicionado à tela inicial **abre como app** (sem exigências) | Fazer uma tela "Como instalar no iPhone" com 2 passos ilustrados. |
| **Notificações push** | Sim | Sim **desde o iOS 16.4**, **só** para app adicionado à tela inicial (não funciona dentro do Safari) | Para o iPhone, e-mail/WhatsApp continuam sendo o aviso principal. |
| **Câmera / selfie** | Sim | Sim | Usar o seletor de arquivo com câmera frontal (`<input type="file" accept="image/*" capture="user">`), que funciona em todos. Câmera ao vivo (`getUserMedia`) dentro do app instalado no iPhone já teve problemas (relatos antigos no fórum da Apple) — **testar no aparelho**. |
| **Detecção de rosto no aparelho** (MediaPipe) | Sim | Sim | Roda no navegador; grátis. |
| **Funcionar sem internet** | Parcial (telas e catálogo em cache com Serwist) | Parcial | A simulação sempre precisa de internet. |
| **Estar na App Store / Play Store** | Não (dá para publicar na Play Store como "TWA" no futuro) | Não | Ser encontrado pela loja não é o canal principal da Thalita (Instagram/WhatsApp é). |

**Conclusão:** **ficar só na web** na fase 1. Rever se, na fase 2, as maquiadoras pedirem app de loja (aí dá para "embrulhar" o mesmo app web, sem reescrever).

---

## 2. Supabase (banco, login e fotos)

| Item | Grátis (Free) | Pro |
|---|---|---|
| Preço | US$ 0 | **US$ 25/mês** por organização |
| Usuários ativos/mês (MAU) | 50.000 | 100.000 |
| Banco de dados | 500 MB | 8 GB de disco por projeto (depois US$ 0,125/GB) |
| Armazenamento de arquivos (fotos) | 1 GB | maior (ver página de preços) |
| Tráfego (egress) | 5 GB (+ 5 GB em cache) | 250 GB |
| Backup | — | **diário, guardado 7 dias** |
| Pausa por inatividade | **Pausa após 1 semana sem uso** | Não pausa |
| Projetos ativos | 2 | — |

**Recomendação:** **Pro desde o lançamento.** Um app de agendamento que "dorme" depois de uma semana parada, e sem backup, não serve para uso real com dados de clientes.

### Login (Supabase Auth)
| Método | Funciona? | Custo | Observação |
|---|---|---|---|
| **Código por e-mail** (OTP de 6 dígitos) | Sim | grátis (usa o e-mail do app, ex.: Resend) | **Recomendado.** No iPhone, o app instalado tem armazenamento separado do Safari: um "link mágico" aberto pelo e-mail pode logar no Safari e **não** no app instalado. Com código, a cliente digita no próprio app. (Comportamento conhecido; **testar**.) |
| Link mágico por e-mail | Sim | grátis | Bom no computador/Android. |
| **Google** | Sim (inclui One Tap) | grátis | Rápido para quem tem Gmail. |
| **WhatsApp** (código) | Sim, **só via Twilio / Twilio Verify** | pago por mensagem (Twilio + Meta) | Deixar para depois. |
| SMS | Sim (Twilio, MessageBird, Vonage…) | pago | Idem. |

- Para produção, configurar **SMTP próprio** (Resend) no Supabase Auth, em vez do envio padrão.
- **Studio da Thalita:** login com **Google + segundo fator (MFA)** (ver arquivo 08).

### Storage, RLS e região
- **Fotos em bucket privado**, acessadas por link temporário (URL assinada). Nada de bucket público para selfie.
- **RLS (Row Level Security):** regra no banco que garante que cada cliente só vê as próprias reservas e fotos. Obrigatório em toda tabela (detalhes no arquivo 08).
- **Região:** criar o projeto na região **São Paulo** (escolhida na criação do projeto; não dá para trocar depois sem migrar). Menos atraso para as clientes e ajuda na conversa sobre LGPD.
- **Chaves novas:** o Supabase está trocando as chaves `anon`/`service_role` por **publishable** (`sb_publishable_…`) e **secret** (`sb_secret_…`), e as antigas serão descontinuadas **até o fim de 2026**. Começar já com as novas.

---

## 3. Vercel (hospedagem)
| Plano | Preço | Uso comercial? |
|---|---|---|
| **Hobby** | grátis | **Não.** A Vercel define o Hobby como "uso pessoal, não comercial". Um app que vende serviço da Thalita é comercial. |
| **Pro** | **US$ 20/mês** por assento de desenvolvedor (inclui **US$ 20 de crédito** de uso) | Sim |

- Firewall: proteção contra DDoS, bloqueio de IP e regras próprias são grátis em todos os planos; **rate limiting** da WAF tem 1 milhão de requisições incluídas e custa US$ 0,50 por milhão a mais.
- Alternativa se quiser economizar: Cloudflare/Netlify (não pesquisado a fundo aqui).

---

## 4. E-mail (Resend)
| Plano | Preço | Limite |
|---|---|---|
| Free | US$ 0 | **3.000 e-mails/mês e 100 por dia** |
| Pro | **US$ 20/mês** | 50.000/mês, sem limite diário; US$ 0,90 por 1.000 extras |

- Fase 1 cabe no grátis (código de login, "pedido recebido", "sinal confirmado", lembrete, resumo diário da Thalita).
- Alternativas conhecidas: Amazon SES, Postmark, Brevo (preços **não pesquisados** aqui).
- Configurar **SPF, DKIM e DMARC** no domínio para os e-mails não caírem no spam.

---

## 5. WhatsApp
| Opção | Custo | Risco | Para quê |
|---|---|---|---|
| **Link `wa.me`** ("Falar com a Thalita") | grátis | nenhum | Fase 1: botão que abre a conversa com texto pronto. |
| **API oficial (Meta)** direto ou via provedor (Twilio, 360dialog…) | por mensagem entregue. Desde jul/2025 a Meta cobra **por mensagem**; desde jul/2026 há cobrança **em reais** no Brasil. Estimativa de terceiros para o Brasil em 2026: **utilidade (lembretes) ≈ R$ 0,04–0,05**, marketing ≈ R$ 0,31–0,38; respostas dentro de 24 h após a cliente escrever eram grátis, mas **desde 1º/10/2026 a Meta passou a cobrar também mensagens de serviço** (conferir a tabela). Provedores cobram margem extra (terceiros citam 10–30%). | baixo (oficial) | Lembrete automático "sua make é amanhã às 8h". |
| **API não oficial** (Z-API, Whapi…) | assinatura fixa (terceiros citam ~R$ 197/mês) | **alto: banimento do número** sem aviso, instabilidade, risco de vazamento | **Não usar** com o número da Thalita. |

**Recomendação:** fase 1 com `wa.me` + e-mail + push. API oficial só quando o volume justificar (fase 2).

---

## 6. Google Agenda (Calendar API)
- **Sem custo** no uso padrão: até **1.000.000 de requisições por dia por projeto**; limites de 10.000/min por projeto e 600/min por usuário. O Google avisa que **acima da cota** poderá passar a cobrar ainda em 2026. Para a Thalita, irrelevante.

---

## 7. IA (Gemini) — preço por imagem

| Modelo | Situação | Preço por imagem (padrão) | Lote (batch) |
|---|---|---|---|
| gemini-2.5-flash-image ("Nano Banana") | **Desligado em 02/10/2026** | era US$ 0,039 | — |
| **gemini-3.1-flash-image ("Nano Banana 2")** | atual | **512 px: US$ 0,045 · 1K: US$ 0,067** · 2K: US$ 0,101 · 4K: US$ 0,151 | 1K: US$ 0,034 |
| gemini-3-pro-image ("Nano Banana Pro") | atual, mais caro | 1K/2K: US$ 0,134 · 4K: US$ 0,24 | 1K/2K: US$ 0,067 |

- Entrada (selfie + texto) no Nano Banana 2: US$ 0,50 por milhão de tokens — **centavos de centavo** por simulação.
- O Google lançou também um **"Nano Banana 2 Lite"** (blog oficial); **não achei o preço** — vale testar se a qualidade serve, pode baratear.
- **Lote (batch)** é metade do preço, mas a resposta demora (não serve para a cliente esperando na tela; pode servir para gerar o acervo).
- **Beauty Brief** (texto): um modelo de texto lendo 2 imagens e escrevendo a ficha. **Não verifiquei o preço do modelo de texto**; estimativa: **menos de US$ 0,01 por ficha**.
- **Usar a conta paga** (os dados não são usados para treinar; ver arquivo 06).

---

## 8. Custo mensal estimado em 3 cenários

**Premissas (todas estimativas):** "clientes/mês" = pessoas que fazem simulação no mês; média de **3 simulações** por cliente (o limite é 1/5/15); imagem **1K** no Nano Banana 2 (US$ 0,067); **20%** das clientes reservam (1 Beauty Brief cada, ≤ US$ 0,01); 4 e-mails por cliente; 2 lembretes de WhatsApp por reserva (só se usar API oficial); câmbio R$ 5,50.

| Item | 50 clientes | 300 clientes | 2.000 clientes |
|---|---|---|---|
| Simulações (imagens) | 150 → **US$ 10** | 900 → **US$ 60** | 6.000 → **US$ 402** |
| Beauty Brief (estimativa) | 10 → < US$ 1 | 60 → < US$ 1 | 400 → ~US$ 4 |
| Vercel Pro | US$ 20 | US$ 20 | US$ 20 (pode passar de US$ 20 em uso; estimativa até US$ 40) |
| Supabase Pro | US$ 25 | US$ 25 | US$ 25 (deve caber na cota) |
| Resend | US$ 0 (≈200 e-mails) | US$ 0 (≈1.200 e-mails) | **US$ 20** (≈8.000 e-mails) |
| Google Agenda | US$ 0 | US$ 0 | US$ 0 |
| MediaPipe (no aparelho) | US$ 0 | US$ 0 | US$ 0 |
| **Subtotal em dólar** | **≈ US$ 56** | **≈ US$ 106** | **≈ US$ 471–491** |
| **Subtotal em reais (R$ 5,50)** | **≈ R$ 310** | **≈ R$ 585** | **≈ R$ 2.590–2.700** |
| WhatsApp API oficial (opcional) | 20 msg ≈ R$ 1 | 120 msg ≈ R$ 6 | 800 msg ≈ R$ 40 (+ margem do provedor) |
| Domínio .com.br | estimativa ~R$ 40/ano | idem | idem |
| **Taxas de pagamento** (arquivo 05) | % do sinal | % do sinal | % do sinal |

**Leitura:**
- Com **até ~300 clientes/mês**, os custos fixos (Vercel + Supabase ≈ US$ 45) pesam mais que a IA.
- Com **2.000 clientes/mês** (cenário de produto para várias maquiadoras), **a IA vira ~85% do custo**. Alavancas: imagem 512 px (US$ 0,045 → economia de ~33%), testar o modelo Lite, cache (mesma selfie + mesmo estilo = não gerar de novo), e o limite diário de simulações.
- **Custo de IA por reserva** (estimativa): 3 simulações × 5 clientes para cada reserva = 15 imagens ≈ **US$ 1,00 ≈ R$ 5,50 por reserva**. Pequeno perto de um sinal, mas vale acompanhar.

---

## Fontes (consultadas em 2026-10-07)
- WebKit — Web Push para web apps no iOS/iPadOS: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- WebKit — Recursos do Safari 26.0 (sites na tela inicial abrem como app): https://webkit.org/blog/17333/webkit-features-in-safari-26-0/
- MDN — Tornar PWAs instaláveis: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- Apple Developer Forums — getUserMedia em modo standalone: https://developer.apple.com/forums/thread/89981
- Next.js — Guia de PWAs: https://nextjs.org/docs/app/guides/progressive-web-apps
- Supabase — Preços: https://supabase.com/pricing
- Supabase — Cobrança: https://supabase.com/docs/guides/platform/billing-on-supabase
- Supabase — Login por telefone (WhatsApp só via Twilio): https://supabase.com/docs/guides/auth/phone-login
- Supabase — Login sem senha por e-mail: https://supabase.com/docs/guides/auth/auth-email-passwordless
- Supabase — Chaves de API (publishable/secret): https://supabase.com/docs/guides/getting-started/api-keys
- Supabase — Mudanças nas chaves de API: https://supabase.com/changelog/29260-upcoming-changes-to-supabase-api-keys
- Vercel — Preços: https://vercel.com/pricing
- Vercel — Plano Hobby (uso pessoal, não comercial): https://vercel.com/docs/plans/hobby
- Vercel — Rate limiting da WAF: https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting
- Vercel — Uso e preço da WAF: https://vercel.com/docs/vercel-firewall/vercel-waf/usage-and-pricing
- Resend — Preços: https://resend.com/pricing · Cotas e limites: https://resend.com/docs/knowledge-base/account-quotas-and-limits
- Meta — Preços da WhatsApp Business Platform: https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing
- Meta — Mudanças de preço para mensagens de serviço e utilidade: https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/non-template-messages
- Terceiro — Preços da API do WhatsApp no Brasil 2026 (estimativas em R$): https://chatmaxima.com/whatsapp-api-pricing/brazil/ · https://eazybe.com/br/blog/preco-api-whatsapp-business
- Terceiro — Riscos de API não oficial: https://clint.digital/blog/riscos-whatsapp-nao-oficial-2026 · Z-API vs oficial: https://developer.z-api.io/en/tips/Z-APIvsAPI-OFICIAL.md
- Google — Limites da Calendar API: https://developers.google.com/workspace/calendar/api/guides/quota
- Google — Preços da API Gemini: https://ai.google.dev/gemini-api/docs/pricing
- Google — Modelo Gemini 3.1 Flash Image: https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image
- Google — Build with Nano Banana 2: https://blog.google/innovation-and-ai/technology/developers-tools/build-with-nano-banana-2/
- Google — Nano Banana 2 Lite: https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-omni-flash-nano-banana-2-lite/
- Google Cloud — Gemini 3.1 Flash Image: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-1-flash-image

## O que fazer com isso
1. **Confirmar: ficamos só na web (PWA).** Criar a tela "Instalar no iPhone" e testar câmera e push em um iPhone real com o app instalado.
2. **Trocar o modelo de imagem já:** se o código usa `gemini-2.5-flash-image`, ele **parou de funcionar em 02/10/2026**. Migrar para `gemini-3.1-flash-image` e comparar 512 px × 1K em qualidade.
3. Criar o projeto **Supabase Pro na região São Paulo**, com as chaves novas (publishable/secret) e SMTP do Resend.
4. Assinar **Vercel Pro** antes de abrir para clientes.
5. Login: **código por e-mail + Google** para clientes; **Google + MFA** para a Thalita.
6. WhatsApp: só o botão `wa.me` na fase 1.
7. Configurar **alerta de orçamento** no Google Cloud (ex.: avisar ao passar de US$ 30/mês) e um painel simples com "simulações por dia" e "custo de IA por reserva".
