# 13 · Bancada do "copiar make de uma foto" e da diversidade de rostos

> Feito em 07 e 08/10/2026 no protótipo (`prototipo/`). Scripts: `scripts/bancada.mjs`, `scripts/bancada-diversidade.mjs`, `scripts/calibrar.mjs`, `scripts/ida-e-volta.mjs`. Gabaritos: `testes/bancada-gabarito.json` e `testes/diversidade-gabarito.json`.

## Em uma olhada

1. **A boca é copiada quase perfeita.** A cor do batom levada da foto de referência para o rosto da cliente ficou com diferença mediana de **3,8** (ΔE2000; abaixo de ~5 quase ninguém nota) e **246 de 246** comparações abaixo de 10.
2. **A sombra marcada é reconhecida**: 29 de 30 fotos reais, sem inventar sombra onde não tinha (0 de 2). O **blush**: 20 de 23, inventando 1 vez em 6. O blush levado para a cliente fica com diferença de efeito mediana de **3,9**.
3. **Os pontos do rosto (MediaPipe, 478 pontos) caem no lugar** em 122 de 126 fotos variadas: pele negra, idosos, crianças, barba, óculos, máscara e fotos borradas. Falham só numa multidão, numa foto de cabeça para baixo e numa foto borrada demais. A quarta é a paisagem sem rosto, onde não achar nada é o certo.
4. **O limite do motor sem IA**: sombras marrons/nude, blush muito leve, iluminador sutil e contorno se confundem com a luz natural da foto. Isso foi medido, não suposto. Com no máximo 10% de alarme falso, o leitor acha só cerca de metade desses produtos sutis.
5. **A conclusão para o app real**: o motor mede a **cor** com precisão nas regiões certas, e a IA (Gemini, visão) diz **quais produtos e que estilo** a referência tem. As duas juntas cobrem o que cada uma sozinha não cobre (seção 7).

---

## 1. O que foi testado

**"Copiar make de uma foto"** (`js/referencia.js`): a cliente manda a foto de uma make que gostou. O motor:
1. acha os 478 pontos do rosto da foto;
2. mede a cor de cada região (boca, pálpebra, côncavo, maçãs, topo das maçãs, linha além do canto do olho e sobrancelha);
3. compara cada região com a pele limpa da própria foto (testa, queixo e dorso do nariz);
4. devolve a receita (cor, intensidade, acabamento) e a confiança de cada produto.

A cor do produto é estimada pela extrapolação `produto ≈ pele + (região − pele) / intensidade`, em CIELAB.

**Regras do produto:**
- **Base:** não é copiada; segue o tom da cliente.
- **Contorno:** não é lido. Nas medições, rostos com e sem contorno deram o mesmo número, então o leitor diz que não dá para medir em vez de inventar.

## 2. De onde vieram as fotos (só para teste, fora do git)

A rede deste ambiente bloqueia bancos de imagem (Unsplash, Pexels, Wikimedia, Openverse, Hugging Face) e o banco de tons de pele do Google (MST-E). As fotos vieram das pastas de exemplo de repositórios públicos do GitHub, baixadas para `testes/fixtures/bancada/`. Essa pasta fica fora do git e **as fotos não podem ir para o app**: várias licenças são de pesquisa ou não comerciais, e há fotos de celebridades.

| Repositório | O que é | Licença | O que usamos |
|---|---|---|---|
| [Honlan/BeautyGAN](https://github.com/Honlan/BeautyGAN) | Transferência de make com GAN (2018), o clássico da área | sem licença no repositório | 9 fotos com make, 11 sem make (conjunto MT) |
| [wtjiang98/PSGAN](https://github.com/wtjiang98/PSGAN) | Transferência que aguenta rosto de lado e dosa a intensidade | MIT (código) | 1 com make, 1 sem |
| [Chenyu-Yang-2000/EleGANt](https://github.com/Chenyu-Yang-2000/EleGANt) | Transferência e edição por região | CC BY-NC (não comercial) | 3 com make, 3 sem |
| [Xiaojiu-z/Stable-Makeup](https://github.com/Xiaojiu-z/Stable-Makeup) | Transferência por difusão, inclusive make artística | Apache 2.0 (código) | 4 com make, 4 sem |
| [Snowfallingplum/SSAT](https://github.com/Snowfallingplum/SSAT) e [CSD-MT](https://github.com/Snowfallingplum/CSD-MT) | Transferência com atenção semântica / sem pares | CC BY-NC | 30 com make, 17 sem |
| [VinAIResearch/CPM](https://github.com/VinAIResearch/CPM) | Transferência de cor + padrões (tatuagem, glitter) | BSD-like (VinAI) | 14 com make (incl. artísticas) |
| [serengil/deepface](https://github.com/serengil/deepface) | Reconhecimento facial (testes com celebridades) | MIT (código) | 64 rostos variados |
| [deepinsight/insightface](https://github.com/deepinsight/insightface) | Reconhecimento facial | MIT no código; modelos e dados só pesquisa | 35 rostos (idosos, pose, pele negra) |
| [sczhou/CodeFormer](https://github.com/sczhou/CodeFormer) | Restauração de rostos | S-Lab (não comercial) | 20 rostos borrados/antigos |
| [yakhyo/face-parsing](https://github.com/yakhyo/face-parsing) | Separação das partes do rosto | MIT | 9 rostos |

Das 61 fotos com make, ficaram **50 referências**: 41 makes sociais (noiva, festa, editorial) e 9 artísticas (fantasia, palhaço, glitter). Saíram 3 desenhos de face chart e 8 montagens de artigo.

## 3. Como foi medido

- **Gabarito:** feito à mão, olhando cada foto ampliada. Sombra e blush foram anotados em três níveis: nenhuma, leve ou marcada. A primeira versão era só "sim/não" e estava errada: quase toda foto profissional tem algum olho e algum blush.
- **Detecção:** o leitor tem de achar as **marcadas** e não pode inventar onde não há **nenhuma**. As leves contam como acerto nos dois sentidos.
- **Boca:** diferença de cor (ΔE2000) entre a boca da referência e a boca da cliente pintada com o que foi lido.
- **Efeito acrescentado (blush, sombra):** compara o que a make **acrescentou** na cliente (depois − antes) com o que a referência tem a mais que uma região natural média. Assim, sarda, sorriso ou pálpebra funda da cliente não contam como erro do motor.
- **Força:** quanto do efeito da referência chegou na cliente (1 = igual).
- **Clientes:** 6 rostos sem make diferentes, entre eles uma mulher sul-asiática de pele morena. Não havia rosto de pele negra sem make no material disponível; isso foi compensado na bancada de diversidade (seção 5).

## 4. Rodadas (50 referências × 6 clientes)

| Rodada | O que mudou | Sombra marcada achada / inventada | Blush marcado achado / inventado | Boca ΔE | Blush (efeito) | Força blush / sombra |
|---|---|---|---|---|---|---|
| v1 | Primeira versão, limites das fotos pintadas | 16/16 · 17/25 (gabarito sim/não) | 17/18 · 18/23 | 3,7 | 7,9 | 0,55 / 0,73 |
| v2 | Força do blush e da sombra compensando a borda esfumada do pintor; pele limpa ignora testa com franja; gabarito em 3 níveis | 28/30 · 0/2 | 21/23 · 3/6 | 3,8 | 6,4 | 1,08 / 0,81 |
| v3 | Bronzer/contorno deixam de contar como blush; esfumado preto/cinza entra como sombra; nova medida "efeito acrescentado" | 29/30 · 0/2 | 20/23 · 1/6 | 3,8 | **3,8** | 1,09 / 0,86 |
| v4 | Mais saturação na sombra | 29/30 · 0/2 | 20/23 · 1/6 | 3,8 | 3,8 | 1,09 / 1,18 (forte demais) |
| v5 | Limites "treinados" (seção 6) para blush e iluminador | 29/30 · 0/2 | **13/23** · 0/6 | 3,8 | 5,1 | 1,24 / 1,02 |
| **v6 (final)** | Blush volta à regra validada em fotos reais; iluminador fica com a regra treinada | **29/30 · 0/2** | **20/23 · 1/6** | **3,8** | **3,9** | **1,09 / 1,02** |

Na v1, os "alarmes falsos" eram quase todos erro do gabarito: o leitor estava vendo uma sombra rosada que de fato existia. A grande virada foi a v2: blush e sombra saíam com **55% e 73%** da força da referência porque o pintor esfuma as bordas, e passaram a sair com 90 a 100%.

## 5. Diversidade: pontos do rosto e makes de época em vários tons de pele

**Pontos do rosto (126 fotos variadas):**

| Grupo | Rosto achado |
|---|---|
| Pele negra | 3/3 |
| Pele morena e média | 4/4 |
| Idosos | 6/6 |
| Crianças | 5/5 |
| Óculos | 9/9 |
| Máscara | 1/1 |
| Barba | 8/8 |
| Borradas ou baixa resolução | 8/9 |
| Giradas ou de lado | 5/6 (falha: de cabeça para baixo) |
| Grupo | 3/4 (falha: multidão com rostos minúsculos) |
| Desenho (anime) | 5/5 (acha rosto em desenho: o app precisa da checagem de foto real) |
| Paisagem sem rosto | 0/1 (correto) |

**Tempo:**
- Achar o rosto: ~290 ms por foto num servidor sem placa de vídeo. No celular de teste do dono, o espelho ao vivo rodou a 41 quadros por segundo.
- Ler a make de uma referência: ~158 ms.
- Pintar: ~6 ms.

**Makes de época** (`js/epocas.js`): anos 70 (disco), 80 (pop), 90 (supermodelo), 2000 (gloss), 2010 (Instagram), 2020 (clean girl) e 2026 (latte e cereja), cada uma com técnica, termos e fontes.
- **Rostos:** 10 rostos (pele escura, médio-escura, média e clara; homens e mulheres; idosas).
- **Como foi testado:** cada época foi pintada (gabarito conhecido) e lida de volta.
- **Boca:** achada 70/70.
- **Gatinho:** 16/20.
- **Sombra, blush e iluminador:** achados em cerca de metade dos casos. São as versões sutis, de propósito difíceis.
- **Ida e volta** (pinta o que leu e compara com a referência), mediana por época: de 2,4 (anos 90) a 4,2 (anos 80). Por tom: 2,9 na pele clara e médio-escura, 5,0 na média e 6,4 na escura.
- **Pele escura:** o erro mais alto veio quase todo de uma única foto, pequena, inclinada e escura. No outro rosto de pele negra, o erro ficou no nível da pele clara. Com 3 rostos negros não dá para concluir: **é preciso um banco de fotos com consentimento cobrindo os 10 tons Monk** (ver `12-engenharia-e-migracao.md`).

## 6. "Treino" dos limites e a lição

O `scripts/calibrar.mjs` coletou as medidas de cada região em 190 rostos:
- 140 com as makes de época pintadas a 100% e a 60%;
- 50 sem make.

Para cada produto, o script procurou a regra que mais acerta com no máximo 10% de alarme falso.

- **Iluminador:** a regra treinada ("ponto de luz mais claro que a própria bochecha, sem ser reflexo de pele oleosa") baixou os alarmes falsos de 20% para 5%, e de 100% para 0% na pele escura, que tem brilho natural forte. **Adotada.**
- **Blush:** a regra treinada era ótima nas makes pintadas, mas nas fotos reais caiu de 20/23 para 13/23. Ela recusava blush pêssego e coral, que as nossas makes pintadas quase não tinham. **Recusada.**
- **Lição:** calibrar só com make sintética engana. Toda regra nova tem de passar também na bancada de fotos reais antes de entrar.

## 7. O que isso significa para o app real

| Parte | Quem faz melhor | Por quê |
|---|---|---|
| Achar o rosto e os 478 pontos | **Motor** (MediaPipe, no aparelho) | Funcionou em todos os tons, idades e acessórios; grátis e rápido |
| Medir a cor da boca, sombra colorida e blush marcado | **Motor** | ΔE 3,8 na boca; exato e explicável na ficha |
| Dizer **quais** produtos existem em makes sutis (sombra marrom, iluminador leve, contorno) e o estilo ("esfumado latte", "gatinho gráfico", "anos 80") | **IA de visão** (Gemini lendo a foto e devolvendo uma lista fixa) | O motor não separa esses produtos da luz natural da foto |
| Foto final realista | **IA de imagem**, com a receita do motor e a conferência (`ia.js`) | A prévia pintada tem cara de filtro |
| Experimentar ao vivo | **Motor** (espelho) | 30 a 40 quadros por segundo, sem custo |

**Próximos passos de qualidade:**
1. **Banco de fotos com consentimento:** clientes da Thalita, nos 10 tons Monk, com a make anotada por ela (a "verdade" de quem fez).
2. **Bancada como teste de regressão:** cada mudança no motor roda `bancada.mjs` e não pode piorar os números da v6.
3. **Leitura híbrida:** a IA de visão lista os produtos e o estilo; o motor mede as cores nas regiões; onde discordarem, mostrar como "confira no espelho".
4. **Classificador pequeno:** quando houver umas 300 fotos anotadas, treinar com as medidas por região (as mesmas do modo diagnóstico) em vez de limites fixos.

## Fontes

- Repositórios da tabela da seção 2 (licenças lidas nos próprios repositórios em 08/10/2026).
- Épocas: [Charlotte Tilbury, anos 70](https://www.charlottetilbury.com/us-es/secrets/historia-del-maquillaje/decada-70) · [Charlotte Tilbury, anos 2000](https://www.charlottetilbury.com/us-es/secrets/historia-del-maquillaje/00s) · [ELLE Brasil, anos 80](https://elle.com.br/?p=70117) · [Guia da Semana, anos 80](https://www.guiadasemana.com.br/compras/noticia/make-anos-80) · [Beleza na Web, anos 80](https://www.belezanaweb.com.br/loucas-por-beleza/maquiagem-anos-80-inspiracoes-e-como-adaptar-as-cores-para-o-visual/) · [Estado de Minas, supermodelos anos 90](https://www.em.com.br/feminino-e-masculino/2026/07/7467338-90s-supermodel-makeup-como-recriar-o-visual-das-supermodelos-em-casa.html) · [O Povo, batom marrom](https://www.opovo.com.br/agencia/edicase/2026/07/28/dia-do-batom-marrom-ganha-novas-versoes-e-reforca-sua-forca-na-maquiagem.html) · [L'Oréal, make do ano em que você nasceu](https://es.lorealparisusa.com/revista-de-belleza/maquillaje/tendencias-maquillaje/makeup-the-year-you-were-born) · [Beauty Bay, por década](https://www.beautybay.com/edited/history-of-makeup-by-decade/) · [Broadsheet, por década](https://www.broadsheet.com.au/national/fashion/article/beauty-trends-of-the-50s-to-today) · [Woman & Home](https://www.womanandhome.com/us/beauty/makeup/iconic-makeup-looks/)
- Banco MST-E (não acessível daqui): [Google Research, "Consensus and subjectivity of skin tone annotation"](https://research.google/blog/consensus-and-subjectivity-of-skin-tone-annotation-for-ml-fairness/) · [artigo NeurIPS 2023](https://papers.neurips.cc/paper_files/paper/2023/file/60d25b3210c92f5ba2002a8e1f1adf1c-Paper-Datasets_and_Benchmarks.pdf)

## O que fazer com isso

1. Manter o "copiar make de uma foto" no app como **função do motor** (grátis, no aparelho), mostrando a confiança de cada produto e mandando a pessoa ao espelho para ajustar o que não deu para ler.
2. No modo "Gerado com IA", acrescentar a **leitura por IA de visão** da referência (lista fixa de produtos e estilo) e juntar com as cores do motor.
3. Começar já o **banco de fotos com consentimento** (10 tons Monk) e anotar com a Thalita.
4. Rodar `npm run fixtures`, `node scripts/bancada.mjs <rotulo>` e `node scripts/bancada-diversidade.mjs <rotulo>` a cada mudança no motor, comparando com a v6.
