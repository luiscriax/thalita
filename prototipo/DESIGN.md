# Identidade visual usada no protótipo

Tirada das telas do app real (capturas enviadas pelo dono do projeto em 2026-10-07) e dos nomes de tokens do código antigo (`bg-po`, `text-cacau`, `text-terra`, `bg-champanhe`, `bg-nude`, `bg-nude-2`). Os valores exatos ficam no `globals.css` do projeto real; aqui são aproximações tiradas das capturas.

| Token | Uso | Valor aproximado |
|---|---|---|
| `--po` | fundo das telas claras | `#F7EDE8` |
| `--nude` | campos, superfícies | `#EFDDD5` |
| `--nude-2` | bordas, trilho da barra de progresso | `#E6D2C8` |
| `--cacau` | texto principal e botão principal | `#2B1A15` |
| `--cacau-fg` | texto sobre cacau | `#F7EDE8` |
| `--terra` | texto de apoio, rótulos | `#7A5446` |
| `--champanhe` | progresso, botão da câmera, selo "escolhido", aviso "Perfeito, pode tirar a foto" | `#D6B588` |
| `--palco` | fundo das telas de câmera, espera da IA e revelação (sempre escuro) | `#1B1311` |
| `--desabilitado` | botão principal desabilitado | `#A39490` |

**Tipografia:** títulos grandes em sans geométrica pesada (parecida com Plus Jakarta Sans, semibold, entrelinha justa, tracking negativo); texto de interface em Hanken Grotesk (17 px); logo "Thalita Mariano" em serifa de alto contraste (estilo Didone) ao lado do monograma TM dourado.

**Padrões de tela:**
- Celular: uma coluna, uma decisão por tela, botão principal largo no rodapé (área do polegar), seta de voltar + barra de progresso fina dourada no topo.
- Computador: tela dividida. Foto grande à esquerda com o logo no canto superior e uma frase no canto inferior; fluxo à direita.
- Cards de momento: foto com cantos bem arredondados, rótulo branco no canto inferior esquerdo sobre degradê, círculo de seleção no canto superior direito (preenchido em champanhe com ✓ quando escolhido, com borda champanhe no card).
- Câmera (palco): moldura com cantos dourados, malha de pontos dourados sobre o rosto, faixa de "escaneamento", pílula champanhe com o estado ("Perfeito, pode tirar a foto"), botão redondo champanhe.
- Confirmação "Ficou boa?": foto, campo "Quer mudar algo? (opcional)" com microfone e contador "0/300", consentimento obrigatório ("Autorizo o uso desta foto só para criar a simulação. Sem agendamento, ela é apagada em 7 dias."), botão "Usar esta foto" e link "Tirar outra".
- Imagens de IA sempre identificadas ("Fotos de inspiração criadas com IA.").
- Na interface é sempre "make", nunca "look".
