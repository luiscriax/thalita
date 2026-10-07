# De onde vem cada parte (licenças e créditos)

A regra do protótipo é "roubar como artista": estudar o que existe, usar o que tem licença que permite e escrever o nosso próprio código. Abaixo está tudo o que é de terceiros, o que foi feito por nós e o que foi só inspiração.

## Código e arquivos de terceiros que vão junto

| O quê | Onde fica | Licença | O que precisamos fazer |
|---|---|---|---|
| MediaPipe Tasks Vision 1.0.1 (Google) — leitor de rosto | `vendor/mediapipe/` | Apache 2.0 | Manter `vendor/mediapipe/LICENSE` junto e citar o uso. Pode usar comercialmente. |
| Modelo Face Landmarker (`face_landmarker.task`, Google) | `modelos/` | Apache 2.0 (model card do MediaPipe) | Igual ao acima. |
| Escala de tons de pele Monk (Dr. Ellis Monk / Google) — 10 cores de referência | `js/cor.js` | CC BY 4.0 | Dar crédito ("Monk Skin Tone Scale, Ellis Monk, CC BY 4.0") nos termos do app ou na página de créditos. |
| Fontes Plus Jakarta Sans, Hanken Grotesk, Bodoni Moda (Google Fonts) | carregadas do Google Fonts | SIL Open Font License | Uso livre, inclusive comercial. |

## Inspiração (nenhuma linha de código copiada)

| Projeto | Licença | O que aproveitamos como ideia |
|---|---|---|
| [OpenMakeupSDK](https://github.com/ehsanwwe/openmakeupsdk) | MIT | A divisão por categorias (batom, sombra, blush, base, delineado, máscara), os acabamentos (matte, cintilante, gloss, glitter) e a ideia de "moldes" de região sobre o rosto. Nosso motor de pintura (`js/pintura.js`) é próprio: Canvas 2D, sem Three.js, feito em cima dos pontos do MediaPipe. Se um dia copiarmos algum trecho (ex.: um shader), basta manter o aviso MIT dele no arquivo copiado. |
| Fórmulas científicas: CIELAB/D65, CIEDE2000 (Sharma 2005), ITA (Chardon 1991) | domínio público (matemática) | Implementadas do zero em `js/cor.js` e conferidas com os valores de teste publicados por Sharma. |

## Feito por nós (é o nosso produto)

- `js/medidas.js` (estudo do rosto, balanço de branco pelo branco do olho, tom, subtom, olhos, boca, formatos)
- `js/regras.js` + `js/receita.js` + `js/catalogo.js` (o "cérebro" com as regras da Thalita)
- `js/pintura.js` (motor de pintura da make, ao vivo e na foto)
- `js/brief.js` (Beauty Brief, face chart gerado dos pontos do rosto, maleta)
- `js/ia.js` (instrução para a IA a partir da receita e conferência automática do resultado)
- `js/seguranca.js` (blindagem da foto e do texto)
- `js/app.js`, `index.html` (telas, seguindo a identidade visual do app real)

## Fotos de teste

As fotos usadas nos testes automáticos são as imagens públicas de exemplo do próprio MediaPipe (`storage.googleapis.com/mediapipe-assets`). Elas são baixadas na hora pelo script `scripts/baixar-fixtures.sh`, ficam só na máquina de teste e **não vão para o git nem para o app** (pasta `testes/fixtures/` no `.gitignore`).
