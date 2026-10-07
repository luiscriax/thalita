# 05 — Pagamentos e checkout: como receber o sinal e o restante

> Pesquisa feita em **2026-10-07**. Taxas mudam com frequência e muitas são promocionais ou negociáveis: confira na página oficial antes de contratar.
> **Limite desta pesquisa:** o acesso direto às páginas de preço foi bloqueado no ambiente de pesquisa; os números abaixo vêm dos trechos das páginas oficiais mostrados pelo buscador (ou de sites de terceiros, quando indicado). Por isso cada número tem a fonte ao lado.

## Em uma olhada
1. **Para o sinal, Pix resolve quase tudo**: é barato (0% a ~1,2%), cai na hora e não tem "chargeback" como o cartão.
2. **Fase 1 (só a Thalita):** **Mercado Pago** (Pix via API, ~0,99%, webhooks e SDK JS) é a escolha mais simples; **Asaas** é a alternativa boa para MEI (taxa fixa por Pix, R$ 1,99).
3. **Stripe funciona no Brasil (CPF ou CNPJ)**, mas o **Pix na Stripe é só por convite** para empresas brasileiras e o cartão custa 3,99% + R$ 0,39. Não é a melhor opção hoje para a Thalita.
4. **Fase 2 (várias maquiadoras):** precisa de **split** (dividir o pagamento). Asaas (subcontas + split) e Mercado Pago (marketplace com OAuth) fazem isso; Pagar.me também.
5. Dá para começar **ainda mais simples**: Pix da chave da Thalita, com o app mostrando o "copia e cola" e ela marcando "sinal pago" à mão — custo zero, mas sem confirmação automática.

---

## 1. O que o app precisa

| Necessidade | Por quê |
|---|---|
| Cobrar o **sinal** por Pix, dentro do app | É o que confirma o horário (jornada, passo 7). |
| **Confirmação automática** (webhook) | Para o status mudar sozinho de "Aguardando o sinal" para "Confirmada". |
| Prazo para pagar (Pix com vencimento/expiração) | Para liberar o horário se o sinal não for pago ("Sinal não pago"). |
| Receber o **restante** | No dia, presencial (Pix ou maquininha) ou pelo app. |
| **Devolver** o sinal quando a regra mandar | Cancelamento dentro do prazo, direito de arrependimento (ver arquivo 06). |
| No futuro: **split** | Se virar produto para outras maquiadoras, cada uma recebe na própria conta e o app fica com uma comissão. |

**Recomendação de produto:** o sinal por **Pix**; o restante no dia, como a Thalita já faz. Cartão parcelado só faz sentido para pacotes caros (noiva + madrinhas), e pode entrar depois.

---

## 2. Comparativo de taxas

Valores de **venda online** (link/checkout/API), para pessoa física ou MEI, sem negociação.

| Provedor | Pix | Cartão de crédito à vista | Parcelado | Prazo para receber cartão | Fonte |
|---|---|---|---|---|---|
| **Mercado Pago** | **0,99%** (na hora). O próprio blog diz que "para a maioria dos vendedores" o Pix na hora é **0%** e que novos vendedores CNPJ acima de R$ 15 mil/mês pagam 0,49% — as regras variam; conferir na conta | **4,99%** (na hora) · **4,49%** (14 dias) · **3,99%** (30 dias) | conforme simulador | na hora, 14 ou 30 dias (você escolhe) | Blog oficial MP |
| **Asaas** | **R$ 1,99** por Pix recebido (R$ 0,99 nos 3 primeiros meses) | **2,99% + R$ 0,49** (1,99% + R$ 0,49 nos 3 primeiros meses) | taxa fixa "independente da quantidade de parcelas" (ver simulador) | **32 dias** após a confirmação de cada parcela | Páginas oficiais Asaas |
| **Efí (ex-Gerencianet)** | **1,19%** (chave, QR estático, QR dinâmico via API, copia e cola) | **3,49%** | 3,49% + 1,29% por parcela antecipada | ver tabela | sejaefi.com.br/tarifas |
| **Stripe** | **1,19%**, mas **só por convite** para empresas no Brasil; repasse em 2 dias úteis | **3,99% + R$ 0,39** (cartão nacional); +2% cartão internacional | não verificado | não verificado | stripe.com/en-br/pricing |
| **InfinitePay** | grátis (segundo site de terceiro) | a partir de **1,62%** (taxa mínima; varia por faturamento) | 12x a partir de 2,25% (mínima) | na hora ou 1 dia útil | Site de terceiro (calculadoradetaxas) — **conferir** |
| **PagBank (PagSeguro)** | site de terceiro diz que cobra taxa no Pix | a partir de **2,92%** (mínima) | 12x até 12,36% | mesmo dia (planos de maquininha) | Site de terceiro — **conferir** |
| **Pagar.me (Stone)** | não encontrei tabela pública | não encontrei | — | — | Taxas negociadas comercialmente |

**Exemplo prático (sinal de R$ 100 por Pix):** Mercado Pago R$ 0,99 (ou R$ 0) · Asaas R$ 1,99 (R$ 0,99 no início) · Efí R$ 1,19 · Stripe R$ 1,19 (se aprovado).
Com sinal de R$ 300: Mercado Pago R$ 2,97 · Asaas R$ 1,99 · Efí R$ 3,57. **Quanto maior o sinal, mais a taxa fixa do Asaas compensa.**

### Observações importantes
- **InfinitePay**: um trecho do próprio site diz que o link de pagamento aceita cartão, Google Pay e Apple Pay, "mas não aceita Pix"; outro diz que aceita Pix. Informação conflitante — e a InfinitePay é pensada para maquininha/link, não para integração por API com confirmação automática. **Não recomendo para o app**, mas é ótima para cobrar o restante no dia (maquininha no celular).
- **Stripe**: abrir conta como **pessoa física (CPF)** é permitido; se for **pessoa jurídica (incluindo MEI)**, a conta bancária precisa estar no mesmo CNPJ. Para Pix, a ajuda da Stripe diz que ele aparece em *Configurações → Métodos de pagamento* **se a conta for elegível**. Em 2026 a Stripe também atualizou as exigências de verificação no Brasil (selfie com documento etc.).

---

## 3. Precisa de CNPJ?

| Provedor | Aceita CPF? | Aceita MEI (CNPJ)? | Observação |
|---|---|---|---|
| Mercado Pago | Sim | Sim | Condições de Pix podem ser diferentes para CNPJ. |
| Asaas | Sim (há benefício de Pix para pessoa física) | Sim | Muito usado por MEI e prestador de serviço. |
| Stripe | Sim (Pessoa Física) | Sim (Pessoa Jurídica, conta bancária no mesmo CNPJ) | Pix por convite. |
| Efí | Sim | Sim | Tabela de tarifas para PJ citada acima. |

**Recomendação:** abrir a conta **no CNPJ do MEI** da Thalita. Separa o dinheiro do negócio do pessoal, facilita a nota fiscal (arquivo 06) e evita problema se o volume crescer.

---

## 4. Facilidade de integrar (para o desenvolvedor)

| Provedor | API Pix com QR dinâmico | Webhook | SDK/JS | Checkout pronto | Split |
|---|---|---|---|---|---|
| **Mercado Pago** | Sim | Sim (com assinatura `x-signature` para validar) | SDK Node e "Bricks" (componentes prontos de pagamento) | **Checkout Pro** (redireciona), **Checkout Transparente** e **Bricks** (dentro do app) | Sim: marketplace via **OAuth** (cada maquiadora autoriza o app; token válido por 6 meses) e comissão por `marketplace_fee` (Checkout Pro) ou `application_fee` (Transparente/Bricks) |
| **Asaas** | Sim | Sim (`PAYMENT_CONFIRMED`, `PAYMENT_RECEIVED`, `PAYMENT_SPLIT_DONE`…) | API REST simples | Link de pagamento / fatura própria | Sim: **subcontas** (cada uma com `walletId` e chave própria) + split calculado sobre o valor líquido |
| **Efí** | Sim (API Pix do padrão Bacen, exige certificado) | Sim | SDKs oficiais (Node, PHP…) | Link de pagamento | Sim (split Pix) |
| **Stripe** | Sim (se Pix liberado) | Sim (excelente) | Excelente (Stripe.js, Elements) | Checkout/Elements | **Connect** (contas conectadas) |
| **Pagar.me** | Sim | Sim | API v5 | Checkout | Sim (split com "recebedores"; um deles responde por chargeback e taxas) |

**Qual checkout usar no app:** para Pix, **não precisa de "checkout"**. O servidor do app cria a cobrança Pix pela API, recebe o **QR Code + "Pix copia e cola"** e mostra na tela do próprio app (uma decisão por tela, um botão "Copiar código Pix"). Quando o pagamento cai, o provedor avisa o servidor por **webhook** e o status muda para *Confirmada*. Se um dia entrar cartão, usar o componente pronto do provedor (Bricks no Mercado Pago), para que **os dados do cartão nunca passem pelo servidor do app** (isso evita a certificação PCI pesada).

---

## 5. Estornos, chargeback e golpes

| Situação | Pix | Cartão |
|---|---|---|
| Cliente desiste e tem direito à devolução | O app (ou a Thalita) faz a **devolução do Pix** pela API/painel do provedor. | Estorno pelo provedor. |
| Contestação ("chargeback") | **Não existe chargeback no Pix.** Existe o **MED** (Mecanismo Especial de Devolução), só para **golpe/fraude**. Desde fev/2026 o **MED 2.0** rastreia o dinheiro entre contas; o pagador vítima de golpe tem **80 dias** para contestar; o banco pode **bloquear valores suspeitos por até 11 dias** na análise. Desde 1º/out/2026 a contestação é 100% digital no app do banco. | **Existe chargeback.** A cliente pode contestar no banco. Na Stripe custa **R$ 55** por disputa recebida (e mais R$ 55 para contestar, devolvidos se ganhar). |
| Risco para a Thalita | Baixo para o sinal legítimo. Atenção: uma cliente que diga ter sido vítima de golpe pode acionar o MED; guarde comprovantes e a conversa. | Médio: "não reconheço a compra" depois do serviço feito. |

**Pix Automático** (lançado pelo Banco Central em junho/2025) serve para **cobranças recorrentes** (mensalidades). Não serve para o sinal, mas é interessante na **fase 2**, para cobrar a **mensalidade das maquiadoras** que usarem o app. Exemplo de preço: Efí cobra **R$ 3,50 por Pix Automático liquidado**.

---

## 6. Recomendação

### Fase 0 (opcional, para lançar rápido)
- O app mostra a **chave Pix da Thalita** (ou um "copia e cola" com o valor) e a Thalita marca "sinal recebido" no Studio.
- Custo: **R$ 0**. Problema: confirmação manual, risco de erro e de comprovante falso. Serve para as primeiras semanas, não para escalar.

### Fase 1 (só a Thalita) — **Mercado Pago**
- **Por quê:** Pix com taxa baixa (0,99% ou 0%), dinheiro na hora, API madura, webhook com assinatura, SDK em JavaScript, aceita CPF e MEI, e já oferece split quando chegar a fase 2. Também permite cartão no mesmo provedor se um dia precisar.
- **Alternativa:** **Asaas**, se a Thalita preferir **taxa fixa** (R$ 1,99 por Pix — melhor com sinais acima de ~R$ 200) e um painel pensado para prestador de serviço. Prazo de cartão de 32 dias.
- **Evitar por enquanto:** Stripe (Pix por convite e cartão mais caro) e PagBank/InfinitePay para a integração (foco em maquininha).

### Fase 2 (várias maquiadoras) — **Asaas (subcontas + split)** ou **Mercado Pago (marketplace/OAuth)**
- **Asaas subcontas:** o app cria uma conta para cada maquiadora e divide cada cobrança automaticamente. Bom para um produto "tudo em um" (white label).
- **Mercado Pago marketplace:** cada maquiadora usa a **própria** conta Mercado Pago e autoriza o app (OAuth); o app recebe a comissão automaticamente. Menos burocracia para o app, mas o token precisa ser renovado (6 meses).
- **Mensalidade do app** para as maquiadoras: Pix Automático ou assinatura no cartão.
- Na fase 2, o app passa a intermediar pagamento de terceiros: **conversar com contador e advogado** (responsabilidade por chargeback, nota fiscal da comissão, contrato com as maquiadoras).

---

## Fontes (consultadas em 2026-10-07)
- Stripe — Preços Brasil: https://stripe.com/en-br/pricing
- Stripe — Pix (documentação): https://docs.stripe.com/payments/pix
- Stripe — Como ativar Pix no Brasil: https://support.stripe.com/questions/how-to-enable-pix-as-a-payment-method-in-brazil
- Stripe — Informações para abrir conta no Brasil (CPF/CNPJ): https://support.stripe.com/questions/brazil-specific-information-to-open-a-stripe-account
- Stripe — Mudanças de verificação no Brasil em 2026: https://support.stripe.com/questions/2026-updates-to-brazil-verification-requirements
- Stripe — Taxa de disputa contestada: https://support.stripe.com/questions/calculate-dispute-countered-fees
- Mercado Pago — Quanto custa vender online: https://www.mercadopago.com.br/blog/quanto-custa-vender-on-line-com-mercado-pago
- Mercado Pago — Quanto custa receber via Pix e QR: https://www.mercadopago.com.br/blog/quanto-custa-receber-pagamentos-via-pix-e-codigo-qr
- Mercado Pago — Split (marketplace) Checkout Pro: https://www.mercadopago.com.br/developers/pt/docs/split-payments/split-1-1/integration-configuration/integrate-marketplace
- Mercado Pago — Split para serviços e beleza: https://www.mercadopago.com.br/blog/split-pagamento-marketplace-servicos-beleza
- Asaas — Preços e taxas: https://www.asaas.com/precos-e-taxas
- Asaas — Blog "Taxas Asaas": https://blog.asaas.com/taxas-asaas/
- Asaas — Cobrança por cartão: https://www.asaas.com/cobranca-cartao
- Asaas — Split de pagamento (docs): https://docs.asaas.com/docs/split-de-pagamentos
- Asaas — Criação de subcontas (docs): https://docs.asaas.com/docs/criacao-de-subcontas
- Efí — Tarifas: https://sejaefi.com.br/tarifas · Tarifas e prazos: https://sejaefi.com.br/central-de-ajuda/tarifas-e-prazos · Pix Automático: https://sejaefi.com.br/efi-pay/pix-automatico
- Pagar.me — Split (docs): https://docs.pagar.me/reference/split-1
- InfinitePay — Link de pagamento parcelado: https://www.infinitepay.io/blog/link-de-pagamento-parcelado
- Terceiro (taxas InfinitePay/PagBank, conferir): https://www.calculadoradetaxas.com.br/infinitepay · https://www.calculadoradetaxas.com.br/pagseguro/taxas
- Agência Brasil — Nova regra do Pix amplia prazo de contestação (set/2026): https://agenciabrasil.ebc.com.br/economia/noticia/2026-09/nova-regra-do-pix-amplia-prazo-para-contestar-golpe
- Agência Brasil — Novas regras de segurança do Pix (fev/2026): https://agenciabrasil.ebc.com.br/economia/noticia/2026-02/novas-regras-de-seguranca-do-pix-entram-em-vigor-veja-mudancas
- Banco Central — Guia do MED: https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Guia_MED.pdf
- Agência Brasil — Banco Central anuncia o Pix Automático (jun/2025): https://agenciabrasil.ebc.com.br/economia/noticia/2025-06/banco-central-anuncia-o-pix-automatico

## O que fazer com isso
1. **Thalita:** abrir (ou usar) conta **Mercado Pago no CNPJ do MEI** e pedir a simulação de taxas para Pix no painel (confirmar se a taxa dela é 0% ou 0,99%).
2. **Decidir o valor do sinal** e o prazo para pagar (sugestão: Pix com validade de 24 h após a Thalita aceitar o pedido).
3. **Desenvolvedor:** integrar Pix por API (criar cobrança → mostrar QR + copia e cola → webhook com validação de assinatura → status *Confirmada*). Nunca confiar só no retorno do navegador: sempre consultar o pagamento na API antes de confirmar.
4. **Implementar a devolução** do Pix pelo Studio (botão "Devolver sinal"), registrando o motivo.
5. Cobrar o **restante no dia** com a maquininha que a Thalita já usa (ou InfinitePay no celular).
6. **Antes da fase 2:** comparar Asaas subcontas × Mercado Pago marketplace com volume real e falar com contador/advogado sobre intermediação de pagamentos.
