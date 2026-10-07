# Biblioteca de estilos de make por ocasião

Estudo de referência para o app **Thalita Mariano**: para cada ocasião, os estilos de make que o app pode oferecer, com ficha técnica para a Thalita, paleta em hex, ajustes por tom de pele, erros a evitar, links de estudo e uma instrução para gerar a imagem de inspiração com IA. Na interface é sempre **"make"**, nunca "look".

Revisão final em **07/10/2026**.

## O que tem aqui

| Ocasião (pasta) | Estilos | Links únicos | Links conferidos na busca de 07/10/2026 |
|---|---:|---:|---:|
| [01-noiva](01-noiva/README.md) | 14 | 44 | 20 |
| [02-casamento-convidadas](02-casamento-convidadas/README.md) | 11 | 37 | 24 |
| [03-15-anos](03-15-anos/README.md) | 11 | 33 | 25 |
| [04-formatura](04-formatura/README.md) | 9 | 37 | 20 |
| [05-festa-aniversario](05-festa-aniversario/README.md) | 10 | 48 | 41 |
| [06-ensaio-evento](06-ensaio-evento/README.md) | 11 | 39 | 19 |
| [07-tendencias-2025-2026](07-tendencias-2025-2026/README.md) | 14 | 75 | 53 |
| **Total** | **80** | | |

- **Links conferidos na busca:** apareceram em resultados de busca de 07/10/2026 com o endereço exato (123 links diferentes acrescentados nesta revisão, mais 9 antigos que voltaram a aparecer; no total a biblioteca tem 169 links diferentes). A rede do ambiente de pesquisa bloqueou a abertura das páginas, então **o conteúdo de cada link ainda precisa ser aberto por uma pessoa** antes de ir para o app.
- **Os outros links** vieram da primeira rodada, também de resultados de busca, mas não foram reconferidos.
- Nenhum link foi inventado. Todos são **só para estudo** (direitos reservados): nenhuma foto de terceiros foi baixada.

## Escala de intensidade

O número de 0 a 100 casa com os botões **mais suave** e **mais intenso** da simulação:

| Faixa | Rótulo |
|---|---|
| 0 a 35 | leve |
| 36 a 65 | média |
| 66 a 100 | alta |

## O catálogo `estilos.json`

Um array com os 80 estilos, um objeto por estilo, extraído dos READMEs e conferido à mão. Campos:

| Campo | O que é |
|---|---|
| `id` | id do estilo, igual ao do README (ex.: `noiva-boho-terracota`) |
| `ocasiao` | pasta da ocasião (ex.: `01-noiva`) |
| `nome` | nome do estilo para a cliente |
| `categoria` | `natural`, `soft glam`, `glam`, `olho marcante` ou `boca marcante` |
| `intensidade` | número de 0 a 100 (ver escala acima) |
| `papeis` | papéis em que o estilo aparece (ex.: Noiva, Madrinha, Debutante) |
| `paleta` | lista de `{nome, hex, uso}`; todos os hex no formato `#RRGGBB` |
| `pele`, `olhos`, `sobrancelha`, `blush`, `boca`, `iluminador` | ficha técnica; `olhos` inclui delineado e cílios; `iluminador` inclui o contorno |
| `variacoesPorTomDePele` | `{clara, media, escura}` com os ajustes de cada tom |
| `paraQuemFavorece` | formatos de olho, tons de pele e perfis a que o estilo costuma favorecer |
| `errosAEvitar` | lista de erros comuns |
| `tendencia` | se é tendência ou clássico, e de quando |
| `referencias` | links conferidos na busca de 07/10/2026 |
| `referenciasAConferir` | links da primeira rodada, ainda não reconferidos (não usar no app antes de abrir) |

### Como usar no app

- **Catálogo:** importar o JSON como dado estático e filtrar por `ocasiao` e por `papeis` na tela de estilo (os outros estilos da ocasião ficam em "ver todos"). Mostrar `nome`, `categoria` e a `paleta` como bolinhas de cor (use os tokens do design system na interface; os hex do JSON são só da make).
- **Simulação com IA:** usar `intensidade` como ponto de partida e os botões "mais suave" e "mais intenso" para andar na escala. A imagem é sempre identificada como **"Inspiração com IA"**.
- **Beauty Brief:** a ficha (`pele` a `iluminador`), `variacoesPorTomDePele` e `errosAEvitar` servem de base para a ficha da Thalita. O tom e o subtom são **estimados** a partir da foto, com grau de confiança, e confirmados pessoalmente. A IA não infere etnia; a variação de tom de pele é escolha da Thalita.
- **Imagens do catálogo:** gerar a partir da instrução para IA de cada README (só texto, sem subir foto de terceiros), sempre com modelo fictícia adulta.
- **Menores de idade (15 anos, ensino médio, daminha):** seguir as regras dos READMEs 02, 03 e 04: autorização e presença do responsável, make adequada à idade, sem simulação com IA no rosto de criança.
- **Links:** `referencias` e `referenciasAConferir` são para a equipe estudar, não para mostrar na tela da cliente.

O extrator usado para montar o JSON ficou fora do repositório. Ao mudar um README, atualize o estilo correspondente no `estilos.json` também.

## O que ainda precisa de olhar humano

1. Abrir os links (a rede bloqueou a leitura das páginas) e tirar os que não falarem do estilo.
2. A Thalita revisar as fichas técnicas e os ajustes por tom de pele, principalmente para peles negras e retintas.
3. Preços: nenhum tem fonte; validar com maquiadoras da região.
4. Fotos de banco livre (Unsplash, Pexels): nenhuma foi encontrada com licença e autorização de modelo conferidas.
5. Pontos legais (LGPD, ECA Digital, direito de imagem) são orientação prática, não parecer jurídico.
