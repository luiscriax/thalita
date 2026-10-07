# Plano mestre — Thalita Mariano

> *Maquiagem com a sua cara.* Síntese das 12 pesquisas desta pasta e do que o protótipo provou. Data: 07/10/2026.
>
> **Como ler:** cada afirmação daqui tem a fonte no arquivo indicado entre parênteses (ex.: `05`). Parte dos números veio do resumo do buscador, porque o ambiente bloqueou a leitura direta de vários sites. Antes de usar um número em post, pitch ou contrato, abra o link no arquivo de origem. Onde está escrito **[advogado]** ou **[contador]**, a decisão é de um profissional.

---

## 1. A aposta em uma frase

**"A make da Thalita, no seu rosto, com o preço e a data dela, e ela já chega sabendo o que fazer."**

Make virtual já existe, mas serve para vender batom (YouCam, ModiFace/Sephora, Boticário). App de agenda também existe (Trinks, Booksy, Belasis), e nenhum mostra a make no rosto da cliente. **Não encontramos ninguém no Brasil juntando simulação no próprio rosto, agendamento com uma maquiadora específica e ficha técnica para a profissional** (`02`). Isso não prova que não exista, mas mostra que o espaço está aberto.

## 2. O mercado (`01`)

| Dado | Valor | Por que importa |
|---|---|---|
| Ranking do Brasil em beleza | 3º ou 4º maior mercado do mundo | Público enorme e acostumado a gastar com make |
| Casamentos civis por ano | cerca de 950 mil (IBGE, 2024); perto de 480 mil com festa | A noiva traz madrinhas, mãe e convidadas |
| Make social | R$ 150 a 350 (média de uns R$ 250) | Ticket de partida |
| Noiva | R$ 600 a 1.500; pacotes com teste e madrinhas de R$ 1.800 a 3.500 | Onde está o dinheiro |
| Temporada | setembro a dezembro (dezembro é o pico), maio, formaturas na virada do ano | Calendário de campanhas |
| Jornada da cliente | descobre no Instagram, escolhe pelas avaliações (96% leem as do Google), fecha no WhatsApp | O app precisa conversar com os três |

## 3. Como ganha dinheiro (`03`)

**Fase 1, só a Thalita.** O app não cobra a cliente. Ele faz a Thalita faturar mais:
- **mais pedidos fechados**, porque a cliente vê a make no rosto e decide sozinha, sem idas e vindas no WhatsApp;
- **ticket maior**, oferecendo na hora certa: teste de make, madrinhas e mãe ("convidar o grupo"), cílios, retoque na festa;
- **menos faltas**, porque o sinal é pago por Pix.

Conta de exemplo, que é estimativa: o faturamento sobe de uns R$ 4 mil para uns R$ 10 mil por mês no cenário realista. **Atenção:** isso já passa do teto do MEI (R$ 81 mil por ano). **[contador]**

**Custo da IA:** cerca de US$ 0,13 a 0,20 por simulação, considerando 2 opções geradas e conferidas. Isso dá uns 4% de uma make social por reserva fechada (`03`, `09`, `12`).

**Fase 2, produto para outras maquiadoras (SaaS):** planos de R$ 79, R$ 149 e R$ 299 por mês, na faixa de Trinks e Booksy. Só depois de uns 6 meses com números reais da Thalita, começando com um piloto de 5 a 10 maquiadoras.

**Política de sinal sugerida** (validar com **[advogado]**):
- **Valor:** 30% do total para noiva e 50% para make social.
- **Arrependimento:** quem contrata pelo app tem **7 dias para desistir** (CDC, art. 49).
- **Remarcação:** grátis, se avisada com antecedência.
- **Cancelamento depois do prazo:** o sinal vira **crédito** para outra data, não multa.

## 4. Marca e crescimento (`04`)

- **Ideia central de conteúdo:** "testei no app × ficou assim de verdade", com a simulação ao lado da foto real. É honesto, dá o "uau" e as pessoas compartilham, e compartilhamento é o que mais leva o perfil a quem ainda não segue.
- **Botão "compartilhar minha simulação"** com a marca d'água "Simulação · inspiração · Thalita Mariano": cada cliente vira divulgação.
- **Google:** meta de 50 avaliações reais em 90 dias. O app pede a avaliação automaticamente 24 horas depois do atendimento.
- **Parcerias com link próprio:** cerimonialistas, fotógrafos, salões, lojas de vestido e empresas de formatura. O link registra de onde veio cada cliente, para pagar a comissão certa.
- **Lição da WePink:** prometer mais do que entrega vira multa e reclamação. Por isso as fotos reais ficam numa galeria separada das imagens de IA, e o selo "inspiração" nunca sai.
- **Plano de 90 dias** (outubro de 2026 a janeiro de 2027), com anúncio de R$ 20 por dia: está no `04`.

## 5. Como funciona por dentro

### 5.1 O motor (provado no protótipo)

```
selfie ─► seguranca.js ─► rosto.js (MediaPipe, no aparelho) ─► medidas.js ─► receita.js ─► pintura.js (prévia)
           (foto recriada,     (478 pontos)                     (tom, subtom,   (regras da     └► ia.js ─► IA gera 2 opções
            texto blindado)                                      olhos, boca,    Thalita)                     │
                                                                 formato)          └► brief.js (ficha)        ▼
                                                                                                 conferência (mesmo rosto? cor certa?
                                                                                                 pele não clareou?) + colar de volta
```

- **No aparelho:** câmera, leitura do rosto, medidas de cor, receita e prévia pintada. É rápido e grátis, e a foto só sai do celular quando precisa.
- **No servidor:** chamada à IA (a chave fica lá), limites de uso, foto guardada com prazo de validade e a ficha da Thalita (`12`).

### 5.2 Sobre o "100% de precisão" (`09`, `10`)

Nenhuma IA garante 100% de "mesma pessoa" nem de "cor exata", e o celular também não mede cor com precisão de laboratório. A luz muda tudo, e mesmo celulares calibrados erram de 2 a 7 unidades de cor. Para chegar o mais perto possível:

1. **A IA não inventa a make.** Ela recebe uma receita fechada: cor em hexadecimal, zona, intensidade em % e acabamento. Já está no protótipo.
2. **São geradas 2 opções**, e o motor confere cada uma: se é o mesmo rosto, se a cor ficou certa (ΔE2000) e se a pele não clareou. O que reprovar nunca aparece para a cliente; o app gera de novo uma vez e, se falhar outra vez, mostra a prévia pintada. Já está no protótipo.
3. **Colar de volta:** fora do rosto, volta a foto original (cabelo, fundo e roupa ficam intactos). Isso é necessário porque as IAs grandes não respeitam mais máscara. Já está no protótipo.
4. **Tom e subtom aparecem sempre como "estimados"**, com grau de confiança e um "confirmar pessoalmente" na ficha.
5. **Calibração com a Thalita:** nos primeiros 30 a 50 atendimentos, ela anota o subtom que viu ao vivo, e os cortes do motor são ajustados.
6. **Banco de fotos de teste** com consentimento, cobrindo os 10 tons da escala Monk, para garantir que o motor erre igual em peles claras e escuras.

### 5.3 Modelo de IA: atenção

O **`gemini-2.5-flash-image`** ("Nano Banana") **foi desligado em 02/10/2026**. Se o app real ainda chama esse modelo, a simulação já parou de funcionar. O sucessor indicado é o **Gemini 3.1 Flash Image** ("Nano Banana 2"), a US$ 0,067 por foto 1K; as versões Lite e 2.1 saem por US$ 0,034. Confirme o ID exato na página oficial antes de usar. O nome do modelo deve ficar numa variável de ambiente, com um teste diário de "o modelo ainda responde?" (`07`, `09`).

## 6. Pagamento (`05`)

| Fase | Recomendação | Por quê |
|---|---|---|
| **Já** (custo zero) | Pix da chave da Thalita, com o app mostrando o "copia e cola" e ela marcando "sinal pago" | Funciona amanhã |
| **Fase 1** | **Mercado Pago** no CNPJ do MEI: Pix por API, taxa de 0% a 0,99%, cai na hora, confirmação automática por webhook | Simples de integrar |
| Alternativa | **Asaas**: R$ 1,99 fixo por Pix | Compensa em sinais acima de uns R$ 200 |
| **Fase 2** (várias maquiadoras) | **Asaas** com subcontas e divisão do pagamento, ou **Mercado Pago** marketplace | Cada maquiadora recebe direto na conta dela |
| Stripe | **Agora não** | O Pix lá é só por convite e o cartão custa 3,99% + R$ 0,39 |

Pix não tem chargeback como o cartão. Existe o MED, só para golpe. Na confirmação, o servidor sempre consulta o pagamento na API antes de marcar como pago; nunca confia só no que o navegador informa.

## 7. Jurídico (`06`) — resumo, não é aconselhamento

- **MEI:** maquiadora pode ser MEI (CNAE 9602-5/02). O teto é de R$ 81 mil por ano. A nota fiscal é a NFS-e nacional, obrigatória para empresas ou quando a cliente pede. **[contador]**
- **Selfie é dado sensível:**
  - consentimento separado e destacado, com data, hora e versão guardadas;
  - fotos apagadas cedo (7 dias sem agendamento);
  - botão "Apagar minhas fotos".
- **Use só a API paga do Gemini.** No plano grátis, o Google pode usar os dados.
- **Menores de idade (15 anos, formandas):**
  - o ECA Digital vale desde 17/03/2026, e os termos da API do Gemini proíbem app "com chance de ser usado por menores de 18";
  - proposta: **menor não manda foto para a IA**; usa só a prévia pintada no aparelho;
  - o responsável cria a conta e autoriza. **[advogado]**
- **Pacote para o advogado:** termos de uso, política de privacidade, política de cancelamento, autorização de imagem e termo do responsável.

## 8. Tecnologia e custos (`07`)

- **Só web (PWA):** instala na tela inicial, usa a câmera e recebe avisos. No iPhone, os avisos só funcionam depois de "Adicionar à Tela de Início". Não precisa de app nativo agora.
- **Login:**
  - clientes entram com código de 6 dígitos por e-mail ou com o Google; o "link mágico" falha no iPhone com o app instalado;
  - a Thalita entra com Google e segundo fator de login (MFA).
- **Planos pagos:** a Vercel grátis proíbe uso comercial, então **Vercel Pro (US$ 20)** e **Supabase Pro (US$ 25)**, na região de São Paulo.
- **Custo mensal estimado:** uns R$ 300 com 50 clientes, R$ 590 com 300 e R$ 2.600 a 2.700 com 2.000. A partir de 2.000 clientes, a IA vira a maior parte do custo.
- **WhatsApp:** na fase 1, só o botão `wa.me` com a mensagem já preenchida (ocasião, papel, estilo e data).

## 9. Segurança (`08`, implementado em parte no protótipo)

| Ameaça | Defesa | No protótipo |
|---|---|---|
| Foto com vírus, SVG com script, executável disfarçado de .jpg | Conferir o tipo real pelos bytes, limitar tamanho e pixels antes de abrir e **recriar a imagem do zero** (sem GPS, EXIF nem anexo escondido) | ✅ `seguranca.js` + testes |
| "Bomba" de imagem gigante | Ler as dimensões no cabeçalho e recusar antes de decodificar | ✅ |
| Texto tentando mandar na IA ("ignore as instruções", "mostre a chave") | Limpar o texto, cortar as tentativas e mandar o resto entre delimitadores como **dado** | ✅ `seguranca.js` + `ia.js` |
| Texto escrito dentro da foto | Instrução de sistema mandando ignorar; a IA só devolve imagem | ✅ instrução; app real: sem ferramentas na IA |
| Roubo da chave da API | Chave só no servidor, nada de `NEXT_PUBLIC_`, gitleaks no CI, troca periódica das chaves | app real |
| Cliente A vendo dados da cliente B | RLS em todas as tabelas, fotos em bucket privado e testes "A não vê B" | app real |
| Robô gastando a IA | Limite diário (1 / 5 / 15), limite por IP e alerta de gasto no Google Cloud | app real |
| Conta da Thalita invadida | Segundo fator de login (MFA) em Google, Vercel, Supabase, GitHub e pagamento | app real |
| Vazamento | Plano de incidente de 1 página; avisar ANPD e clientes em até 3 dias úteis | app real |

## 10. Biblioteca de estilos (`../referencias/`)

- **80 estilos em 7 ocasiões:** noiva 14, convidadas 11, 15 anos 11, formatura 9, festa 10, ensaio 11 e tendências 14.
- Cada estilo tem paleta em hex, variações por tom de pele, para quem favorece e erros a evitar. O catálogo pronto para o app está em `referencias/estilos.json`.
- **169 links de referência.** Eles apareceram na busca, mas a rede bloqueou a abertura das páginas, então uma pessoa precisa abri-los antes de irem para o app.
- **Escala de intensidade:** leve até 35%, média de 36 a 65% e alta de 66 a 100%.
- **15 anos e menores:** responsável presente; cílios postiços, cola e glitter só com o sim dele; atenção à isotretinoína.

## 11. Roteiro (`12`)

| Fase | Entra |
|---|---|
| **Agora (esta semana)** | Trocar o modelo de IA desligado. Levar ao advogado a regra "menor sem IA". Decidir o valor do sinal. Ligar o alerta de gasto. |
| **MVP** (clientes reais da Thalita) | Motor em `lib/motor/` do app real, migrado peça por peça com os testes. Selfie com checagem. Prévia pintada. IA com 2 opções, conferência e colar de volta. Selo "inspiração". Limites diários. Agendamento com Pix confirmado à mão. Beauty Brief. Exclusão automática das fotos. Termos publicados. |
| **v1** (menos trabalho manual) | Pix com confirmação automática (webhook). Fila para a IA. Teste diário do modelo. Calibração do subtom com os atendimentos. Anamnese no agendamento. Lembretes 48 h e 24 h antes. Pedido de avaliação no Google. Indicação. |
| **v2** (diferenciais) | Conferência também no servidor. Máscaras finas com licença comercial clara. A Thalita edita catálogo e regras no Studio. "Modo preciso" com folha branca. Produto para outras maquiadoras. |

**Porta de saída do MVP:** o checklist da seção 8 do `12`, que cobre precisão, privacidade, operação e licenças.

## 12. Como levar o protótipo para o app real sem bagunça (`12`, `11`)

1. **Copiar** `prototipo/js/` para `lib/motor/` do app, **uma peça por vez**, cada uma com os seus testes, na ordem: `cor` → `regioes` → `medidas` → `catalogo`/`regras`/`receita` → `brief` → `seguranca` → `ia` → `pintura`. Ligar a checagem de tipos (JSDoc) antes e só depois converter para TypeScript.
2. **O contrato não muda** (`tipos.js`). Cada peça pode ser trocada (outro detector, outra IA) sem mexer nas outras.
3. **Telas:** o protótipo é HTML simples para testar ideias. As telas do app real continuam as do Next.js, usando o motor por baixo.
4. **"Roubar como artista":** estudar tudo, copiar só o que a licença permite (MIT, Apache ou BSD, sempre com crédito em `LICENCAS.md`) e transformar em algo nosso. GPL, AGPL, "não comercial" e projetos sem licença ficam só para estudo. Atenção: código MIT não garante que os **pesos** do modelo sejam livres.

## 13. Decisões que dependem de você e da Thalita

1. Valor do sinal (sugestão: 30% para noiva e 50% para social) e prazo para pagar (sugestão: 24 horas depois de a Thalita aceitar).
2. Tabela de preços por papel, com o que está incluso em cada um.
3. Menores de idade sem IA: confirmar com o advogado.
4. Mercado Pago ou Asaas.
5. Quando falar com o contador sobre o teto do MEI.
6. Se e quando o app vira produto para outras maquiadoras (sugestão: só depois de 6 meses de números reais).
