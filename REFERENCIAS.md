# Referências open source

Projetos para estudar ou aproveitar no app. Separados por área e pela **facilidade de colocar no projeto**:

- 🟢 **Fácil:** roda no navegador, em JavaScript/TypeScript. Dá para instalar com `npm` e usar.
- 🟡 **Médio:** precisa de servidor (Python ou GPU) ou de adaptação.
- 🔴 **Estudo:** pesquisa acadêmica ou modelo pesado. Serve mais para aprender e comparar.

> ⚠️ **Licença:** antes de usar comercialmente, conferir a licença de cada projeto. MIT e Apache 2.0 permitem uso comercial. Muitos modelos acadêmicos são "só para pesquisa".

---

## 1. Ler o rosto (pontos, formato, expressão)

| | Projeto | O que faz | Uso no app |
|---|---|---|---|
| 🟢 | [MediaPipe Face Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/face_landmarker/web_js) · [exemplos](https://github.com/google-ai-edge/mediapipe-samples) | 478 pontos 3D do rosto, expressões e rotação da cabeça, no próprio celular | Base de tudo: checar a selfie, achar olhos, boca, maçãs do rosto e formato do rosto. **Já está no projeto.** |
| 🟢 | [Human (vladmandic)](https://github.com/vladmandic/human) | Rosto, íris, rotação, olhar, expressão e segmentação, tudo junto em JS | Alternativa "tudo em um" ao MediaPipe, com demo pronta |
| 🟢 | [face-api (vladmandic)](https://github.com/vladmandic/face-api) | Detecção e pontos do rosto | Mais antigo, foi substituído pelo Human |
| 🟡 | [Classificação de formato de rosto (Roboflow)](https://universe.roboflow.com/ashish-workspace/face-shape-classification-yoqx4-lfvhe) · [explicação do método](https://peerlist.io/adilbalti/articles/how-to-detect-face-shape) | Oval, redondo, quadrado, coração, diamante, alongado | Dica de contorno e blush no Beauty Brief. Dá para calcular com os pontos do MediaPipe (proporções de largura e altura), sem modelo extra. |

## 2. Separar as partes do rosto (pele, lábios, olhos, cabelo)
Essencial para pintar a make no lugar certo e medir a cor da pele só onde é pele.

| | Projeto | O que faz | Uso no app |
|---|---|---|---|
| 🟢 | [MediaPipe Image Segmenter – Selfie Multiclass](https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter) | Separa cabelo, pele do rosto, pele do corpo, roupa e acessórios | Medir o tom de pele sem pegar cabelo ou fundo |
| 🟢 | [face-parsing no navegador (Transformers.js)](https://huggingface.co/Xenova/face-parsing) · [modelo](https://huggingface.co/jonathandinu/face-parsing) · [exemplo p5.js](https://editor.p5js.org/jonathan.ai/sketches/wZn15Dvgh) | 19 partes: pele, sobrancelhas, olhos, nariz, lábios, cabelo, pescoço… | Máscaras precisas de boca, olhos e sobrancelhas |
| 🟡 | [yakhyo/face-parsing](https://github.com/yakhyo/face-parsing) | BiSeNet com ONNX, rápido | Mesma ideia, no servidor |
| 🟡 | [BiSeNet LiteRT](https://huggingface.co/litert-community/BiSeNet-Face-Parsing-LiteRT) | Versão para celular, cerca de 22 ms por quadro | Se um dia virar app nativo |

## 3. Make virtual em tempo real (câmera / filtro)

| | Projeto | O que faz | Uso no app |
|---|---|---|---|
| 🟢 | [OpenMakeupSDK](https://github.com/ehsanwwe/openmakeupsdk) | Base, batom, blush, delineado, máscara e sombra ao vivo (MediaPipe + WebGL). Licença MIT | **A mais próxima do projeto.** "Provador ao vivo" grátis, antes da simulação com IA |
| 🟢 | [Jeeliz FaceFilter](https://github.com/jeeliz/jeelizFaceFilter) | Rastreamento de rosto leve em WebGL, funciona com Three.js | Filtros e efeitos na câmera |
| 🟢 | [MindAR – exemplo face mesh](https://hiukim.github.io/mind-ar-js-doc/more-examples/threejs-face-facemesh) · [código](https://github.com/hiukim/mind-ar-js) | Malha 3D do rosto com textura (Three.js) | Pintar a make como uma "máscara" 3D que acompanha o rosto |
| 🟢 | [Facemesh do drei (React Three Fiber)](https://drei.docs.pmnd.rs/shapes/facemesh) | Malha do rosto pronta como componente React | Integra fácil com Next.js e React |
| 🟡 | [Jayanths9/Virtual_Makeup](https://github.com/Jayanths9/Virtual_Makeup) | Batom, sombra, sobrancelha e delineado com MediaPipe (Python) | Código simples para entender como pintar cada região |
| 🟡 | [xyfer17/Virtual-Makeup](https://github.com/xyfer17/Virtual-Makeup) | Mesma ideia, com dlib e OpenCV | Referência |
| 🟡 | [Tópico "makeup" no GitHub](https://github.com/topics/makeup) · [tópico "mediapipe-facemesh"](https://github.com/topics/mediapipe-facemesh) | Lista viva de projetos | Para fuçar mais |

## 4. Gerar a make com IA (foto realista)
Hoje o projeto usa o Gemini. Estes servem como alternativa ou comparação.

| | Projeto | O que faz | Observação |
|---|---|---|---|
| 🟡 | [Qwen-Image-Edit](https://github.com/QwenLM/Qwen-Image) | Edita fotos por texto, mantendo a identidade | **Apache 2.0, permite uso comercial.** Precisa de GPU ou de um serviço que hospede |
| 🟡 | [FLUX.1 Kontext \[dev\]](https://bfl.ai/blog/flux-1-kontext-dev) | Edição de imagem que preserva o rosto | A versão aberta é **não comercial**. A versão paga, por API, é comercial |
| 🔴 | [awesome-makeup-transfer](https://github.com/thaoshibe/awesome-makeup-transfer) | Lista com cerca de 90 artigos e códigos de "transferir make" | **Comece por aqui** na parte de pesquisa |
| 🔴 | [Stable-Makeup](https://github.com/Xiaojiu-z/Stable-Makeup) | Transfere make real de uma foto para outra (difusão) | Ideal para "mandar foto de referência" |
| 🔴 | [EleGANt](https://github.com/Chenyu-Yang-2000/EleGANt) | Transfere e edita só uma região (olhos ou boca) | Combina com "olho marcante" e "boca marcante" |
| 🔴 | [PSGAN](https://github.com/wtjiang98/PSGAN) | Funciona com o rosto de lado e permite dosar a intensidade | |
| 🔴 | [BeautyGAN](https://github.com/Honlan/BeautyGAN) | O clássico da área | |
| 🔴 | [FLUX-Makeup (artigo)](https://arxiv.org/abs/2508.05069) | Estado da arte em fidelidade e identidade | Para acompanhar |

## 5. Tom e subtom de pele, cores
Ajuda a dar ao Beauty Brief uma medida objetiva, sem depender só da IA.

| | Projeto | O que faz | Uso no app |
|---|---|---|---|
| 🟡 | [SkinToneClassifier](https://github.com/ChenglongMa/SkinToneClassifier) | Detecta a pele e classifica o tom (Python) | Medida de tom para a ficha |
| 🟢 | [TensorShade](https://github.com/KaylaKremer/TensorShade) | Sugere tons de base a partir da cor da pele (TensorFlow.js) | Ideia de "qual família de base" |
| — | [Huematch (método)](https://devmesh.intel.com/projects/huematch) | Mede a cor na região das maçãs do rosto | **Método simples:** pontos do MediaPipe + média de cor na bochecha |
| — | [Perfect Corp ShadeFinder](https://www.perfectcorp.com/business/showcase/shadefinder) | Comercial, líder de mercado | Benchmark de qualidade |

## 6. Checar a selfie (luz, foco, enquadramento)
Evita gastar IA com foto ruim.

| | Projeto | O que faz |
|---|---|---|
| 🟢 | [simple-selfie](https://www.npmjs.com/package/simple-selfie) | Captura de selfie com detecção de rosto e de desfoque |
| 🟢 | [image-checker](https://npmjs.org/package/image-checker) | Desfoque, foto escura ou estourada, pouco contraste |
| 🟢 | [Detecção de desfoque em JS (Revolut)](https://medium.com/revolut/canvas-based-javascript-blur-detection-b92ab1075acf) | Artigo explicando o método, fácil de copiar |
| 🔴 | [OFIQ (BSI)](https://www.bsi.bund.de/dok/OFIQ-e) | Padrão ISO de qualidade de foto de rosto (C++). Referência de quais critérios checar |

## 7. 3D do rosto (a partir de uma foto)
Mais avançado; útil no futuro para girar o rosto ou ver a make de lado.

| | Projeto | O que faz |
|---|---|---|
| 🔴 | [DECA](https://github.com/yfeng95/DECA) | Cabeça 3D detalhada a partir de uma foto, com luz e expressão |
| 🔴 | [EMOCA](https://github.com/radekd91/emoca) | Reconstrução 3D com foco em expressão |
| 🔴 | [FLAME](https://github.com/soubhiksanyal/FLAME_PyTorch) | Modelo 3D de cabeça usado pelos dois acima |

## 8. Interface
| | Projeto | Uso no app |
|---|---|---|
| 🟢 | [react-compare-slider](https://github.com/nerdyman/react-compare-slider) | Antes e depois com acessibilidade (teclado) |
| 🟢 | [img-comparison-slider](https://github.com/sneas/img-comparison-slider) | Alternativa leve, licença MIT |

## 9. Agendamento e pagamento
| | Projeto | Uso no app |
|---|---|---|
| 🟡 | [Cal.com](https://github.com/calcom/cal.com) · [Cal.diy (MIT)](https://github.com/calcom/cal.diy) | Referência de agenda, disponibilidade e Google Agenda |
| 🟡 | [Easy!Appointments](https://github.com/alextselegidis/easyappointments) | Regras de reserva e avisos |
| 🟡 | [OpenSalon](https://github.com/clawnify/open-salon) | Painel de salão (equivale ao Studio) |
| 🟢 | [pix-utils](https://github.com/thalesog/pix-utils) · [pixbrasil](https://github.com/ogilvieira/pixbrasil) | Gerar o Pix copia e cola e o QR Code do sinal |

---

## Sugestão de combinação ("pilha" de rosto)
1. **MediaPipe Face Landmarker**: checa a selfie (rosto de frente, inteiro, bem iluminado) e acha as regiões do rosto.
2. **Selfie Multiclass ou face-parsing**: recorta só a pele, os lábios e os olhos.
3. **Média de cor na bochecha**: estimativa objetiva de tom e subtom, que vai para o Beauty Brief junto com a leitura da IA.
4. **OpenMakeupSDK**: provador ao vivo e gratuito, para a cliente brincar.
5. **Gemini** (ou Qwen-Image-Edit): a simulação realista final, que vira a referência do atendimento.
