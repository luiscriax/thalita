# 10 · Ciência da cor e da make (o que dá para medir, o que é arte)

> Pesquisa feita em **2026-10-07**. Explica, em linguagem simples, a base científica e profissional por trás das medidas do motor (`prototipo/js/cor.js` e `medidas.js`) e da ficha técnica da Thalita (`brief.js`).

## Em uma olhada
1. Dá para **estimar** tom e subtom de pele por selfie, mas não **medir com precisão de laboratório**: em estudos, celulares calibrados com cartela ainda erraram de ~2 a ~7 unidades de cor, e a luz muda tudo. Na ficha, sempre "estimado" + grau de confiança + "confirmar pessoalmente".
2. As escalas certas para **cor** são **ITA** (ângulo de claridade × amarelo), **Monk** (10 tons, Google) e o **ângulo de matiz** (vermelho × amarelo, para o subtom). **Fitzpatrick não é escala de cor** (mede reação ao sol) e não deve aparecer na ficha.
3. **ΔE2000** é a régua de "quão diferente o olho humano vê duas cores". Valores de 1 a 3 já são percebidos por pessoas treinadas; o limite exato depende do material e do observador.
4. Teoria das cores (cor complementar para olhos, estações) é **guia profissional**, não lei: o único estudo controlado encontrado confirma parte (pele quente combina com tons "outono"), mas modelos genéricos de harmonia acertaram só 53% das escolhas das pessoas.
5. A ficha técnica profissional = **anamnese** (alergias, lentes, pele) + **face chart** (desenho com cores e zonas) + **lista de produtos na ordem**, com intensidade e ferramenta. O `Brief` do protótipo já segue esse formato.

---

## 1. Medir a pele por uma foto: o que é possível

### 1.1 O limite físico do celular
- O celular não grava "a cor real": grava uma cor **processada** (balanço de branco automático, embelezamento, HDR) num espaço de cor que o fabricante não informa. Um estudo com dois celulares de preço médio (sistema de dermatoscopia, medindo pele de cães — não achei estudo equivalente com selfies humanas), calibrados com cartela ColorChecker, chegou a diferenças de cor de **1,8 a 6,6** (ΔE CIE76) no laboratório, e a variação entre aparelhos foi de 2,0 a 3,9 ([Sensors/PMC 2020, teledermatoscopia com smartphone](https://pmc.ncbi.nlm.nih.gov/articles/PMC7662536)). O próprio artigo diz que o celular registra a imagem "num espaço RGB desconhecido, o que impede análise colorimétrica padronizada".
- Na odontologia, fotos de celular comparadas a espectrofotômetro também tiveram diferença acima de 3,7 (ΔE*ab), embora **repetíveis** (o mesmo celular dá o mesmo resultado) ([estudo em periódico tailandês de ciências odontológicas](https://he02.tci-thaijo.org/index.php/JDMS/article/download/250569/173378/927973)).
- **Tradução para o app:** a medida serve para **orientar a família de base e o subtom provável**, não para escolher o número exato da base. Por isso o brief deve sempre ter "testar a base no maxilar sob luz natural".

### 1.2 Corrigir a luz (balanço de branco)
- O motor usa o **branco do olho (esclera)** como referência de "branco" para corrigir a cor da foto. Há base científica: Choi, Choi e Suk (KAIST, 2017) propuseram usar **esclera e pupila** como alvos de calibração para estimar a cor da pele, com erro menor que os métodos da época ([IS&T Electronic Imaging 2017 / KAIST](https://koasas.kaist.ac.kr/handle/10203/239798)). Outros trabalhos usam a esclera porque ela tem cor esbranquiçada parecida entre pessoas de todas as etnias ([arXiv 2501.07158](https://arxiv.org/html/2501.07158v1); [Colour balancing using sclera colour, CROSBI](https://www.bib.irb.hr/923599)).
- **Limite:** a esclera não é branca perfeita (pode estar avermelhada por cansaço, irritação ou ser naturalmente amarelada) e é pequena na foto. Por isso o protótipo já cai para "mundo cinza" (média da cena) quando a esclera não é confiável, e reduz a confiança.
- **Melhoria barata ("modo preciso"):** pedir, opcionalmente, que a cliente segure uma **folha branca A4** ao lado do rosto. Folha sulfite não é padrão de laboratório, mas é bem mais neutra e maior que a esclera.

### 1.3 Escalas de tom de pele

| Escala | O que mede | Usar no app? | Por quê |
|---|---|---|---|
| **ITA** (Individual Typology Angle) | Ângulo entre claridade (L\*) e amarelo (b\*) no CIELAB: `ITA = arctan((L* − 50) / b*) × 180/π` | **Sim**, como número técnico na ficha | Medida objetiva, usada em dermatologia e cosmetologia. Criada por Chardon et al. (1991) para estudar bronzeamento de pele clara; os próprios autores reconheceram que **ignorar o a\* (vermelho)** limita o uso em outras populações ([resumo em arXiv 2309.05148](https://arxiv.org/pdf/2309.05148)). Faixas clássicas: >55° muito clara; 41–55 clara; 28–41 intermediária; 10–28 bronzeada/média; −30–10 morena; < −30 escura (já em `cor.js`). |
| **Monk Skin Tone (MST)** | 10 tons de referência, criados pelo sociólogo Ellis Monk (Harvard) com o Google | **Sim**, para comunicar (e para testar se o app trata bem todos os tons) | Feita para representar melhor peles médias e escuras. Em pesquisa com ~3.000 pessoas nos EUA, muitos disseram que 10 tons representavam sua pele tão bem quanto uma paleta de 40 ([Google](https://blog.google/technology/ai/monk-skin-tone-scale/); [reportagem FT/Reuters](https://www.ft.lk/it-telecom-tech/Google-unveils-new-10-shade-skin-tone-scale-to-test-AI-for-bias/50-734704)). Licença CC BY 4.0 (crédito obrigatório — já anotado em `prototipo/LICENCAS.md`). |
| **Ângulo de matiz (h\*)** | Direção da cor entre vermelho e amarelo: `h = atan2(b*, a*)` | **Sim**, base do subtom | Thong, Joniak e Xiang (Sony AI, ICCV 2023) mostraram que só "claro × escuro" é insuficiente e propuseram somar a **matiz vermelho↔amarelo** como segunda dimensão da cor da pele ([artigo ICCV 2023](https://openaccess.thecvf.com/content/ICCV2023/html/Thong_Beyond_Skin_Tone_A_Multidimensional_Measure_of_Apparent_Skin_Color_ICCV_2023_paper.html)). É exatamente o que o motor faz no subtom. |
| **Fitzpatrick (I–VI)** | Como a pele **reage ao sol** (queima × bronzeia) | **Não** | Foi criada para resposta à radiação UV e é usada de forma imprecisa como "cor da pele" ou "raça"; não captura subtom nem variação dentro dos tipos IV–VI ([Okoji et al., British Journal of Dermatology 2021, "Equity in skin typing: why it is time to replace the Fitzpatrick scale"](https://researchdiscovery.drexel.edu/esploro/outputs/journalArticle/Equity-in-skin-typing-why-it/991022199999804721); [MDedge](https://mdedge.com/content/limitations-fitzpatrick-skin-type-proxy-skin-color-and-race)). Além disso, aproxima de "etnia", que o brief proíbe inferir. |

**Subjetividade também existe entre humanos:** o Google estudou anotação de tom com a escala Monk e viu que anotadores treinados concordam bem com especialistas mesmo em luz difícil, **mas pessoas de regiões diferentes usam "modelos mentais" diferentes** e anotam de forma sistematicamente diferente ([Google Research, NeurIPS 2023](https://research.google/blog/consensus-and-subjectivity-of-skin-tone-annotation-for-ml-fairness/)). Uma dissertação da USP também estudou classificação de rostos pela escala MST ([BDTD/USP](https://bdtd.ibict.br/vufind/Record/USP_05581f0fc1f4018ec2d112a916392331)). Conclusão: nem a máquina nem o olho são "verdade absoluta"; por isso a ficha mostra **faixa + confiança**.

### 1.4 Subtom (frio, neutro, quente, oliva)
- **O que é:** a "cor por baixo" da pele — puxa para o rosado (frio), para o dourado (quente), equilíbrio (neutro) ou amarelo-esverdeado com pouco vermelho (oliva).
- **Como o motor estima:** pela matiz h\* da pele corrigida (ex.: h < 48° → frio; h > 60° → quente; a\* baixo + b\* alto → oliva). **Esses cortes são uma regra nossa**, não um padrão científico publicado: não encontrei faixa oficial de h\* para subtom. Devem ser **calibrados** com as clientes reais (a Thalita diz o subtom que viu ao vivo; comparamos).
- **Por que errar é fácil em foto:** luz quente de lâmpada "cria" subtom quente; vermelhidão, rosácea, sol recente ou maquiagem mudam o a\*; filtros de beleza do celular alteram tudo. O protótipo já mede **vermelhidão** separadamente, o que ajuda.
- **Testes populares** (cor das veias, prata × ouro) não têm validação científica encontrada nesta pesquisa; servem como conversa, não como medida.
- **Na ficha:** "Subtom estimado: quente (confiança média). Confirmar com teste de base no maxilar."

---

## 2. Colorimetria em uma página

| Conceito | Explicação simples | Onde aparece no app |
|---|---|---|
| **sRGB** | Como a tela e a foto guardam a cor (vermelho, verde, azul de 0 a 255) | Pixels da selfie |
| **CIELAB (L\*, a\*, b\*)** | Espaço de cor feito para imitar a percepção humana: **L\*** claridade (0 preto–100 branco), **a\*** verde↔vermelho, **b\*** azul↔amarelo. Iluminante padrão D65 (luz do dia) | `cor.js` converte tudo para Lab antes de medir |
| **LCh** | O mesmo Lab em "claridade, intensidade (croma C\*) e matiz (h\*)" — mais fácil de explicar | Família de cor ("marrom quente"), subtom |
| **ΔE2000 (CIEDE2000)** | Número que diz quão diferentes duas cores parecem ao olho humano, corrigindo distorções das fórmulas antigas. Implementação de referência e valores de teste: Sharma, Wu e Dalal (2005, *Color Research & Application*), usados para conferir o `cor.js` | Conferência da IA, escolha da cor mais próxima, maleta |

### Quanto de ΔE a pessoa percebe?
Não existe um número único: depende do material, da luz, do tamanho da área e de quem olha. O que a literatura mostra:
- Em amostras de cerâmica dental, o limite em que **50% das pessoas percebem** a diferença foi ΔE00 ≈ **2,3**, e o limite de **aceitável** ≈ **2,4–2,8** (dentistas × pacientes) ([PMC11733899](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11733899/)).
- Para **réplicas de pele** (próteses faciais de silicone), há estudos específicos de limites de percepção e aceitação para peles claras e escuras: Paravina et al., *Journal of Prosthodontics* 2009, 18(7):618-625 ([registro UGR](https://produccioncientifica.ugr.es/documentos/61c784606e227a5e5cbfac86?lang=en)) e um estudo com réplicas claras e escuras ([Gazi University](https://avesis.gazi.edu.tr/yayin/05395af5-db83-43b1-b21c-0b066068f0d3/perceptibility-and-acceptability-thresholds-for-color-differences-of-light-and-dark-maxillofacial-skin-replications)). Num estudo com pele facial **simulada**, a diferença de **claridade (ΔL)** foi a mais fácil de perceber ([UoA Pergamos](https://pergamos.lib.uoa.gr/uoa/dl/object/2990267)) — por isso clarear a pele na simulação é um erro que a cliente nota.
- **Regra de trabalho do projeto (a calibrar, não é norma):** ΔE00 < 2 "praticamente igual"; 2–5 "diferença visível de perto"; 5–10 "mesma família, tom diferente"; > 10 "outra cor". Em foto **gerada por IA**, o `ia.js` aceita até ~12 para batom/blush porque a luz da foto muda; para a **pele fora da make**, o limite deve ser bem mais apertado (ver arquivo 09, checagem "a pele não clareou").

---

## 3. Teoria das cores aplicada à make

### 3.1 Cor dos olhos (o que as escolas ensinam)
A regra mais difundida é a da **cor complementar** (oposta no círculo cromático) para "acender" a íris ([Ulta, guia de cores por olho](https://www.ulta.com/discover/makeup/eyeshadow-color-wheel)):

| Olhos | Realçam | Por quê (círculo cromático) |
|---|---|---|
| Castanhos (maioria das brasileiras) | Cobre, bronze, dourado, ameixa/roxos profundos, verdes intensos | Castanho é laranja escuro; quase tudo combina; cobre ecoa, roxo/verde contrastam |
| Verdes / mel | Rosados, vinho, ameixa, malva, bronze | Vermelho-violeta é o oposto do verde |
| Azuis / cinza | Laranja, coral, pêssego, cobre, terracota | Laranja é o oposto do azul |

O motor já tem regras desse tipo (ex.: `OLHO-CASTANHO-COBRE` em `regras.js`). É prática consagrada de escola, **sem estudo controlado** encontrado que meça o efeito — tratar como "boa prática", não como ciência.

### 3.2 Colorimetria pessoal / estações
- Sistema de 4 (ou 12) "estações" que combina subtom, claridade e contraste da pessoa.
- **Único estudo controlado encontrado:** dissertação de mestrado na Universidade Chulalongkorn (Sirisayan, 2022). 15 tons de pele (Pantone SkinTone) com subtom quente, frio e neutro foram combinados com 128 cores; observadores julgaram a harmonia. Resultado: **pele quente harmonizou mais com cores "outono"** em todas as claridades; **fria e clara com "inverno"**; **fria média-escura com "verão"**; **neutra com todas**. Mas os modelos genéricos de harmonia de cor previram só **53%** das escolhas ([repositório Chula](https://cuir.car.chula.ac.th/xmlui/handle/123456789/81665)).
- Educadores de estilo criticam o sistema por simplificar demais subtom, profundidade e contraste ([Sterling Style Academy](https://online.sterlingstyleacademy.com/blog/is-color-analysis-scientific-what-the-research-actually-says)).
- **Para o app:** usar **subtom + claridade + contraste pessoal** (o motor já mede `contrastePessoal`) em vez de rotular "você é Outono Suave". Menos rótulo, mais explicação.

### 3.3 Contraste pessoal
Diferença de claridade entre pele, sobrancelha/cabelo e olhos. Alto contraste aguenta make marcada; baixo contraste pede tons próximos. Já está em `Medidas.contrastePessoal`; é conceito de escola (não achei estudo controlado).

---

## 4. Formatos de rosto e de olhos

### 4.1 Rosto
- Formatos usados por maquiadores: oval, redondo, quadrado, coração, diamante, alongado.
- **Classificar por foto é aproximado:** num estudo com ~5 mil fotos e medidas de proporções do rosto (distâncias e ângulos entre pontos), o melhor classificador acertou **82%** em 5 formatos ([ICEEM 2021, estudo comparativo](https://iceem2021.conferences.ekb.eg/article_1138.html)); outro trabalho, com deep learning, relata 88% (5 classes) e 94% (3 classes) — a busca associou esse número ao IdentiFace ([arXiv 2401.01227](https://arxiv.org/pdf/2401.01227)), conferir no texto. Ou seja: 1 em cada 5–8 rostos sai "errado" — e muita gente é mistura de dois formatos.
- **Contorno por formato** (o que as escolas ensinam): o contorno **segue o osso** e suaviza o que se quer suavizar — rosto quadrado: suavizar ângulos do maxilar; redondo: sombra abaixo da maçã para alongar; alongado: contorno na testa e queixo para "encurtar"; coração: suavizar laterais da testa ([Charlotte Tilbury](https://www.charlottetilbury.com/eu/secrets/how-to-contour-every-face-shape); [MasterClass](https://www.masterclass.com/articles/learn-how-to-master-makeup-contouring)).
- **Para o app:** mostrar o formato como **tendência** ("rosto com traços de oval e coração") e usar as proporções (já em `Medidas.rosto.proporcoes`) para posicionar o contorno no face chart, em vez de um rótulo único.

### 4.2 Olhos
- O motor já mede **inclinação** (para cima/reta/para baixo), **distância** (juntos/equilibrados/separados) e **possível pálpebra encapuzada**.
- Técnicas clássicas: olhos caídos → elevar o esfumado e o delineado para a cauda da sobrancelha; juntos → clarear o canto interno e escurecer o externo; separados → o contrário; encapuzados → marcar o côncavo **acima** da dobra, com os olhos abertos.
- **Limite:** pálpebra encapuzada é difícil de ver numa selfie de frente (depende do ângulo e da expressão). Manter como "possível" e "confirmar pessoalmente" — como o protótipo já faz.

---

## 5. Face chart e ficha técnica profissional

### 5.1 O que é um face chart
Desenho padronizado de um rosto (olhos, boca, maçãs, sobrancelhas marcados) onde o maquiador **pinta ou anota** cores, zonas e técnicas antes de executar. Surgiu nos anos 1980 como desenho de linhas; a MAC Cosmetics popularizou modelos para download. Serve para planejar, **repetir a make depois** (ex.: teste de noiva → dia do casamento) e montar portfólio ([guia "Face chart 101"](https://www.mysubscriptionaddiction.com/face-chart-101-your-guide-to-face-charts-for-your-makeup)).

### 5.2 Como maquiadoras registram o atendimento
Juntando a prática de estética (anamnese) e de make, uma ficha completa tem:

| Bloco | Conteúdo | Já no `Brief`? |
|---|---|---|
| **Anamnese** (saúde e hábitos) | Alergias, sensibilidade, medicamentos, lentes de contato, procedimentos recentes (ácidos, botox, extensão de cílios), tipo de pele (oleosa/seca/mista) — a anamnese facial é central na prática estética ([revisão Unievangélica](https://anais.unievangelica.edu.br/index.php/CIPEEX/article/view/11953)) | Parcial ("confirmar pessoalmente: alergias, óculos") → **acrescentar perguntas de anamnese no agendamento** |
| **Leitura da pele** | Tom, subtom, oleosidade, textura, manchas, olheiras, vermelhidão | Sim (tom, subtom, olheira, vermelhidão) |
| **Leitura do rosto** | Formato, olhos, boca, sobrancelhas, contraste | Sim |
| **Contexto** | Ocasião, horário, luz do local (dia/noite/flash), duração, traje, fotos/vídeo | Parcial (ocasião, papel, horário) → acrescentar **luz do local e foto com flash** |
| **Plano (face chart)** | Desenho com zonas e cores | Sim (`faceChartSvg`) |
| **Produtos na ordem** | Categoria, cor, acabamento, ferramenta, técnica, intensidade | Sim (`ordem`, `ItemReceita`) |
| **Fixação e durabilidade** | Primer, pó, spray, retoque | Sim (`duracaoEFixacao`) |
| **Fotos antes/depois** | Para portfólio e para repetir | Fica no app (com consentimento) |

O Senac e cursos técnicos brasileiros tratam visagismo, preparação de pele e escolha de tom como etapas da formação ([edital Senac RN](https://www2.rn.senac.br/uploads/edital/arquivo_929.pdf); [projeto integrador de visagismo e maquiagem, FacUnicamps](https://pesquisa.facunicamps.edu.br/wp-content/uploads/2025/06/Projeto-Integrador-I-Visagismo-e-Maquiagem.docx-1.pdf)). Não encontrei um modelo de ficha "oficial" único no Brasil — cada escola/profissional usa o seu. **Sugestão:** validar o layout final do Brief com a própria Thalita e 2–3 colegas maquiadoras.

### 5.3 Intensidade em %: como explicar
"% de intensidade" não é unidade da maquiagem profissional; maquiadoras falam em "camadas", "leve/média/alta cobertura", "construir". O motor usa 0–100% para ser preciso entre IA, prévia e ficha. **Na ficha da Thalita, mostrar os dois:** "Blush 40% (leve, 1 camada esfumada)".

---

## 6. Diversidade de pele no Brasil (por que testar com todos os tons)
- O app vai atender peles do tom 1 ao 10 da escala Monk. Sistemas de visão e de IA historicamente erram mais em peles escuras (motivação da própria escala Monk). Testar o motor e a IA com **todos os tons** não é detalhe: é qualidade e respeito.
- Fotos de teste: o conjunto **MST-E** (Google; 1.515 fotos e 31 vídeos de 19 pessoas cobrindo os 10 tons, com consentimento) foi feito para **avaliação**; os termos indicam uso em pesquisa/avaliação, com restrições — conferir antes de usar ([Google Research](https://research.google/blog/consensus-and-subjectivity-of-skin-tone-annotation-for-ml-fairness/)). Melhor ainda: **fotos próprias com consentimento**, de clientes e modelos da Thalita.

---

## Fontes
- Smartphone × cor da pele (Sensors/PMC 2020): https://pmc.ncbi.nlm.nih.gov/articles/PMC7662536
- Smartphone × espectrofotômetro (odontologia): https://he02.tci-thaijo.org/index.php/JDMS/article/download/250569/173378/927973
- Esclera e pupila como alvos de calibração (Choi, Choi, Suk, 2017): https://koasas.kaist.ac.kr/handle/10203/239798
- Esclera em avaliação de qualidade de rosto: https://arxiv.org/html/2501.07158v1 · Colour balancing using sclera colour: https://www.bib.irb.hr/923599
- Thong, Joniak, Xiang — Beyond Skin Tone (ICCV 2023): https://openaccess.thecvf.com/content/ICCV2023/html/Thong_Beyond_Skin_Tone_A_Multidimensional_Measure_of_Apparent_Skin_Color_ICCV_2023_paper.html · https://arxiv.org/pdf/2309.05148
- Escala Monk (Google): https://blog.google/technology/ai/monk-skin-tone-scale/ · reportagem: https://www.ft.lk/it-telecom-tech/Google-unveils-new-10-shade-skin-tone-scale-to-test-AI-for-bias/50-734704
- Anotação de tom e MST-E (Google Research / NeurIPS 2023): https://research.google/blog/consensus-and-subjectivity-of-skin-tone-annotation-for-ml-fairness/ · https://arxiv.org/pdf/2305.09073
- Classificação MST de rostos (USP): https://bdtd.ibict.br/vufind/Record/USP_05581f0fc1f4018ec2d112a916392331
- Okoji et al. 2021, BJD — substituir Fitzpatrick: https://researchdiscovery.drexel.edu/esploro/outputs/journalArticle/Equity-in-skin-typing-why-it/991022199999804721 · MDedge: https://mdedge.com/content/limitations-fitzpatrick-skin-type-proxy-skin-color-and-race
- Limiares ΔE00 em cerâmica dental: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11733899/
- Paravina et al. 2009, réplicas de pele: https://produccioncientifica.ugr.es/documentos/61c784606e227a5e5cbfac86?lang=en · réplicas claras e escuras: https://avesis.gazi.edu.tr/yayin/05395af5-db83-43b1-b21c-0b066068f0d3/perceptibility-and-acceptability-thresholds-for-color-differences-of-light-and-dark-maxillofacial-skin-replications · pele facial simulada: https://pergamos.lib.uoa.gr/uoa/dl/object/2990267
- Sharma, Wu, Dalal (2005) — implementação do CIEDE2000 (referência usada em `cor.js`, ver `prototipo/LICENCAS.md`)
- Colorimetria pessoal (Sirisayan, Chulalongkorn 2022): https://cuir.car.chula.ac.th/xmlui/handle/123456789/81665 · crítica: https://online.sterlingstyleacademy.com/blog/is-color-analysis-scientific-what-the-research-actually-says
- Círculo cromático e cor dos olhos (Ulta): https://www.ulta.com/discover/makeup/eyeshadow-color-wheel
- Formato do rosto (ICEEM 2021): https://iceem2021.conferences.ekb.eg/article_1138.html
- Contorno por formato: https://www.charlottetilbury.com/eu/secrets/how-to-contour-every-face-shape · https://www.masterclass.com/articles/learn-how-to-master-makeup-contouring
- Face chart: https://www.mysubscriptionaddiction.com/face-chart-101-your-guide-to-face-charts-for-your-makeup
- Anamnese facial (revisão): https://anais.unievangelica.edu.br/index.php/CIPEEX/article/view/11953
- Senac RN (formação em maquiagem): https://www2.rn.senac.br/uploads/edital/arquivo_929.pdf · FacUnicamps: https://pesquisa.facunicamps.edu.br/wp-content/uploads/2025/06/Projeto-Integrador-I-Visagismo-e-Maquiagem.docx-1.pdf

> Lacunas honestas: não encontrei (a) faixas científicas oficiais de ângulo de matiz para "frio/neutro/quente/oliva"; (b) estudo controlado sobre cor complementar e cor dos olhos; (c) modelo oficial brasileiro de ficha técnica de maquiagem. Onde o texto usa regra do projeto, está marcado.

## O que fazer com isso
1. Na ficha e na tela, **trocar qualquer menção a Fitzpatrick** (se houver) por ITA + Monk + subtom estimado, sempre com **confiança** e "confirmar pessoalmente".
2. **Calibrar os cortes de subtom** (`subtom()` em `cor.js`): nos primeiros 30–50 atendimentos, a Thalita registra o subtom que viu ao vivo; comparar com o estimado e ajustar os ângulos.
3. Oferecer o **"modo preciso"** com folha branca A4 ao lado do rosto (melhora o balanço de branco).
4. Na conferência da IA, apertar o limite de ΔE **da pele fora da make**, com atenção especial ao **ΔL (claridade)** — é a diferença que as pessoas mais percebem.
5. Acrescentar ao agendamento **perguntas de anamnese** (alergias, lentes, procedimentos recentes, tipo de pele) e **luz do evento / foto com flash**; levar isso para o Brief.
6. Mostrar formato do rosto como **tendência** e a intensidade como "% + camadas".
7. Montar o banco de **fotos de teste com consentimento** cobrindo os 10 tons Monk (base dos testes de cor do arquivo 12).
