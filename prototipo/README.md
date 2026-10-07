# Protótipo do motor de make — Thalita Mariano

Área de testes ("bagunça") antes do app real. Aqui a gente prova que a ideia funciona de verdade, com o rosto da cliente, cores medidas e ficha técnica, seguindo a identidade visual do app (`DESIGN.md`).

## O que dá para fazer nele

| Tela | O que prova |
|---|---|
| **Testar uma make** → momento → papel → estilo | O fluxo de escolha do app real, uma decisão por tela |
| **Sua foto** (enviar foto ou escanear com a câmera) | A foto passa pela blindagem (`seguranca.js`): tipo verdadeiro, limites, foto recriada do zero. Na câmera, a malha de pontos dourados e o aviso de enquadramento ("Perfeito, pode tirar a foto") |
| **Ficou boa?** | Pedido livre ("boca mais rosada") entendido pelo motor; tentativas de mandar na IA são cortadas; consentimento obrigatório |
| **Estudo do rosto** | Tom de pele (ITA, escala Monk), subtom, olhos, boca, formato do rosto, com correção de luz pelo branco do olho e checagem de qualidade (luz, foco, ângulo) |
| **Sua make** | Antes e depois com controle deslizante, "mais suave / mais intenso", paleta, o porquê de cada adaptação, a instrução que iria para a IA e a **conferência automática** (mesmo rosto? cor certa? pele não clareou?) |
| **Agendar → Pedido enviado** | Dia, horário, local, valor e sinal antes de se comprometer |
| **O que a Thalita recebe** | Beauty Brief: face chart desenhado dos pontos do rosto, ordem de execução com % de intensidade, maleta, o que confirmar pessoalmente, botão para copiar a ficha para o WhatsApp |
| **Espelho ao vivo** | A make pintada em tempo real na câmera, trocando cores por categoria |
| **Bastidores do motor** | Os números reais de cada etapa (para a gente conferir) |

## O que é real e o que ainda não é

- **Real:** leitura do rosto (MediaPipe, 478 pontos, no aparelho), medidas de cor, receita com as regras, pintura da prévia, Beauty Brief, blindagem da foto e do texto, conferência da imagem.
- **Ainda não:** a IA generativa (Gemini) **não é chamada** aqui, porque a chave da API só pode ficar num servidor. A tela mostra a instrução exata que seria enviada, e a conferência roda sobre a prévia pintada. Pagamento, login e envio de e-mail também ficam para o app real.
- **Limites conhecidos:**
  - A checagem de "mesmo rosto" só compara a geometria do rosto. Nas fotos de teste, a mesma pessoa ficou até 0,038 e pessoas diferentes a partir de 0,054. No app real, somar um modelo de reconhecimento facial com licença comercial.
  - Foto HEIC do iPhone ainda não é aceita pelo arquivo; pela câmera do app funciona.

## Como abrir

```bash
cd prototipo
npm ci
npm run servir        # abre em http://localhost:4173
```

A câmera só funciona em `localhost` ou num endereço `https` (como o GitHub Pages).

## Testes

```bash
npm run fixtures      # baixa as fotos públicas de teste do MediaPipe e extrai os pontos reais (uma vez)
npm test              # 156 testes de unidade
python3 scripts/video-falso.py testes/fixtures/fotos/rosto-frontal.png testes/fixtures/camera-falsa.y4m
npm run test:e2e      # 10 testes de ponta a ponta no Chromium (celular e computador, câmera falsa)
```

**Resultado em 07/10/2026:** 156 de 156 testes de unidade e 10 de 10 de ponta a ponta passando. As capturas de cada tela ficam em `testes/resultados/telas/` (fora do git).

Os testes cobrem, entre outras coisas:
- **Foto maliciosa:** SVG com script disfarçado de .jpg, executável, PDF, "bomba" de dimensões gigantes, anexo escondido depois da imagem, GPS no EXIF.
- **Texto malicioso:** "ignore as instruções", pedido da chave da API, tags para fechar o bloco de dados, caracteres invisíveis, letras de largura total, links, e-mails e telefones.
- **Cor:** ΔE2000 conferido com a tabela de Sharma, balanço de branco com luz fria e quente, foto escura e desfocada.
- **IA:** batom aplicado com a cor e a intensidade certas passa; sem batom, reprova; pele clareada reprova; outra pessoa reprova; foto girada da mesma pessoa passa; "colar de volta" mantém fundo e cabelo intactos.

## Peças do motor (`js/`)

O contrato entre as peças está em `js/tipos.js`. Cada peça pode ser trocada sem mexer nas outras.

```
foto ─► seguranca.js ─► rosto.js ─► medidas.js ─► receita.js (+ regras, catálogo) ─► pintura.js
                                                       ├─► brief.js (ficha da Thalita)
                                                       └─► ia.js (instrução, conferência, colar de volta)
```

Como levar isso para o app real: `../pesquisa/12-engenharia-e-migracao.md` e a seção 12 de `../pesquisa/00-PLANO-MESTRE.md`.

## Publicar

- **GitHub Pages** (workflow `.github/workflows/prototipo-pages.yml`, manual): o GitHub só deixa rodar workflows manuais que estejam na branch principal. Antes, ative em *Settings → Pages → Source: GitHub Actions*. Em repositório privado, o Pages exige plano pago e o site fica público.
- **Página do Claude (Artifact):** `npm run artefato` gera `dist/artefato/index.html`; o resto (js, vendor, modelos) vai junto com os mesmos caminhos. Nessa página a câmera é bloqueada pelo visualizador, então use "Enviar uma foto".

Licenças e créditos: `LICENCAS.md`.
