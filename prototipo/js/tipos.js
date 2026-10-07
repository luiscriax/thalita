// CONTRATO entre as peças do motor. Cada módulo recebe e devolve só estes formatos,
// para que cada peça possa ser trocada (ex.: outro detector de rosto, outro provedor de IA)
// sem mexer nas outras.
//
//   foto/vídeo ──► rosto.js (MediaPipe) ──► Deteccao
//   Deteccao + pixels ──► medidas.js ──► Medidas
//   Medidas + escolhas da cliente ──► receita.js ──► Receita
//   Receita ──► paraEstado() ──► EstadoMake ──► pintura.js (prévia na foto ou na câmera)
//   Medidas + Receita (+ maleta) ──► brief.js ──► Brief (ficha da Thalita)
//   Receita ──► (produção) instrução para a IA generativa; depois, conferência por ΔE e pontos do rosto

/**
 * @typedef {{x:number,y:number,z?:number}} Ponto   normalizado 0–1 (MediaPipe)
 *
 * @typedef {Object} Deteccao
 * @property {Ponto[]} pontos            478 pontos do rosto principal ([] se não achou)
 * @property {number} rostos             quantos rostos apareceram
 * @property {Record<string,number>} expressoes  blendshapes (ex.: eyeBlinkLeft 0–1)
 * @property {number[]|null} matriz      matriz 4x4 de transformação (rotação da cabeça)
 * @property {number} largura            pixels da imagem analisada
 * @property {number} altura
 */

/**
 * @typedef {Object} Checagem
 * @property {string} id                 ex.: "rosto", "frontal", "luz", "foco", "olhos", "tamanho", "um-rosto"
 * @property {"ok"|"atencao"|"erro"} estado
 * @property {string} titulo             frase curta para a cliente ("Rosto de frente")
 * @property {string} [dica]             como corrigir ("Segure o celular na altura dos olhos")
 * @property {number} [valor]            número medido (para os bastidores)
 *
 * @typedef {Object} Qualidade
 * @property {boolean} aprovada          pode seguir para a análise
 * @property {Checagem[]} checagens
 *
 * @typedef {Object} CorMedida
 * @property {string} hex
 * @property {{L:number,a:number,b:number}} lab
 * @property {number} confianca          0–1
 *
 * @typedef {Object} Medidas
 * @property {Qualidade} qualidade
 * @property {{ganho:{r:number,g:number,b:number}, fonte:"branco-do-olho"|"mundo-cinza"|"nenhuma", confianca:number}} balancoDeBranco
 * @property {CorMedida & {ita:number, faixaIta:string, monk:{n:number,hex:string,distancia:number}, profundidade:string,
 *            subtom:{subtom:"frio"|"neutro"|"quente"|"oliva", h:number, explicacao:string}}} pele
 * @property {CorMedida & {familia:"castanho escuro"|"castanho"|"mel"|"verde"|"azul"|"cinza"|"preto"}} olhos
 * @property {CorMedida & {pigmentacao:"clara"|"media"|"marcada"}} labios
 * @property {CorMedida} sobrancelhas
 * @property {{presente:boolean, tipo:"arroxeada"|"azulada"|"marrom"|"nenhuma", intensidade:number}} olheira
 * @property {{presente:boolean, intensidade:number}} vermelhidao
 * @property {{formato:"oval"|"redondo"|"quadrado"|"coracao"|"diamante"|"alongado", proporcoes:Record<string,number>, confianca:number}} rosto
 * @property {{inclinacao:"para cima"|"reta"|"para baixo", distancia:"juntos"|"equilibrados"|"separados", possivelEncapuzado:boolean, proporcoes:Record<string,number>}} formatoOlhos
 * @property {{volume:"fina"|"media"|"carnuda", equilibrio:"superior menor"|"equilibrada"|"superior maior", proporcoes:Record<string,number>}} formatoBoca
 * @property {{contraste:"baixo"|"medio"|"alto", valor:number}} contrastePessoal   pele × sobrancelha × olhos
 */

/**
 * @typedef {"base"|"corretivo"|"contorno"|"blush"|"iluminador"|"sombra"|"delineado"|"mascara"|"sobrancelha"|"batom"} Categoria
 * @typedef {"matte"|"acetinado"|"cintilante"|"gloss"|"glitter"} Acabamento
 *
 * @typedef {Object} ItemReceita
 * @property {Categoria} categoria
 * @property {string} produto            família e textura ("Base líquida acetinada")
 * @property {string} cor                hex
 * @property {string} nomeCor            nome amigável ("Bege médio dourado", "Rosa Chá")
 * @property {string} familiaCor         família com temperatura ("marrom quente")
 * @property {Acabamento} acabamento
 * @property {string} zona               onde aplicar
 * @property {string} forma              como (ex.: "esfumado em asa, subindo para a cauda da sobrancelha")
 * @property {number} intensidade        0–100 (%)
 * @property {string} ferramenta
 * @property {string[]} [cores]          para sombra: [clara, média, escura]
 *
 * @typedef {Object} Adaptacao
 * @property {string} regra              id da regra disparada (ex.: "OLHO-CASTANHO-COBRE")
 * @property {string} motivo             frase para a Thalita ("Olhos castanhos ganham destaque com cobre e bronze")
 *
 * @typedef {Object} Receita
 * @property {string} makeId
 * @property {string} nomeMake
 * @property {string} ocasiao
 * @property {string} papel
 * @property {"leve"|"media"|"alta"} nivel
 * @property {ItemReceita[]} itens       já na ORDEM DE EXECUÇÃO
 * @property {Adaptacao[]} adaptacoes
 * @property {string[]} confirmarPessoalmente
 * @property {string[]} duracaoEFixacao
 * @property {number} confianca          0–1 (herdada das medidas)
 */

/**
 * Estado que a pintura entende (o mesmo do Modo Ao Vivo). Cada camada é opcional.
 * @typedef {{cor:string, intensidade:number, acabamento?:Acabamento, cores?:string[], estilo?:string}} Camada  intensidade 0–1
 * @typedef {Partial<Record<Categoria, Camada|null>>} EstadoMake
 */

/**
 * @typedef {Object} ProdutoMaleta
 * @property {string} id
 * @property {string} marca
 * @property {string} nome
 * @property {Categoria} categoria
 * @property {string} cor                hex medido do produto
 *
 * @typedef {Object} Brief
 * @property {string} titulo
 * @property {{texto:string}} resumo
 * @property {{titulo:string, linhas:{rotulo:string, valor:string, confianca?:number}[]}[]} secoes
 * @property {{nome:string, hex:string, uso:string}[]} paleta
 * @property {{passo:number, categoria:Categoria, texto:string, intensidade:number, daMaleta?:string}[]} ordem
 * @property {string} faceChartSvg       SVG do face chart, pronto para inserir
 * @property {string[]} confirmarPessoalmente
 * @property {Adaptacao[]} adaptacoes
 */

export {};
