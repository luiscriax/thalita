@AGENTS.md

# Glam by Thalita (thalita-beauty)

App (PWA) da marca da maquiadora Thalita: a cliente escolhe a ocasião e o estilo, vê a make na própria foto com IA e agenda; a Thalita recebe um Beauty Brief de cada atendimento.

Segue o Framework Universal (`~/.claude/framework`). Este arquivo guarda só o que é específico deste projeto.

## Documentos
- Estado atual: `docs/STATUS.md` (ler primeiro ao retomar)
- Requisitos: `docs/PRD.md` · Arquitetura: `docs/ARQUITETURA.md` · Design: `docs/DESIGN-SYSTEM.md` · Glossário: `docs/CONTEXT.md` · Decisões: `docs/adr/`
- Pesquisa: `docs/pesquisa/` (concorrentes, preços, IA, referências de marca e de interface)

## Stack
Next.js 16.3 (App Router, Turbopack) + React 19.2 + TypeScript + Tailwind 4. Supabase, Serwist, Gemini (`@google/genai`), Resend e Vercel entram nas próximas etapas (ver ARQUITETURA).
Esta versão do Next tem mudanças: consultar `node_modules/next/dist/docs/` antes de usar uma API.

## Comandos
| Ação | Comando |
|---|---|
| Rodar local | `npm run dev` (porta 3000) |
| Typecheck | `npx tsc --noEmit` |
| Lint | `npm run lint` |
| Build | `npm run build` |
| Gerar imagens do acervo | `python3 tools/acervo/gerar.py tools/acervo/<arquivo>.json [--refazer id]` (usa `composio proxy` + Gemini) |

## Convenções deste projeto
- Nomes de domínio em português, como no glossário (`look`, `simulacao`, `reserva`, `sinal`…).
- Cores só pelos tokens (`bg-po`, `text-cacau`, `text-terra`, `bg-champanhe`…); nada de hex solto, exceto texto fixo claro sobre foto.
- Uma decisão por tela; um botão principal por tela, na área do polegar.
- Telas de palco (espera da IA, revelação, abertura) usam `data-palco` (modo escuro fixo).
- Imagens de IA sempre identificadas como inspiração.
- Fotos da primeira dobra com `priority`/`prioridade` (evita atraso no maior elemento da tela).
- Fotos pessoais de referência da Thalita ficam em `tools/acervo/referencias-thalita/` e **não vão para o git**. Organizadas por tipo (`ensaio-profissional/`, `rosto-maquiada/`, `corpo-inteiro/`, `dia-a-dia/`); o `LEIA-ME.md` de lá tem o índice e as folhas de contato.
- Rotas internas: `/design` é a vitrine do design system (não faz parte do fluxo).

## Skills específicas instaladas
`mobile-native`, `animate` (emilkowalski/skills) e `supabase` (oficial) em `.claude/skills/`.

## Aprendizados e armadilhas
- **2026-10-05** — Marca é **Thalita Mariano** (não "Glam by Thalita"); na interface é sempre **"make"**, nunca "look" (o termo `look` fica só no código). Slogan: "Maquiagem com a sua cara.".
- **2026-10-05** — O logo é o PNG `public/marca/monograma.png` extraído do conceito 02 (`tools/marca/extrair-monograma.mjs`); ícones, logo e imagem de compartilhamento saem de `node tools/marca/gerar-marca.mjs`. Não redesenhar o monograma: o cliente pediu para manter o gerado.
- **2026-10-05** — Áreas da cliente, do Studio e do agendamento renderizam só no aparelho (`SoNoCliente`), porque dependem de datas relativas a "agora".
- **2026-10-05** — Grades sempre com `grid-cols-1` no celular (texto truncado estoura a largura).
- **2026-10-05** — Trocar uma imagem mantendo o mesmo nome não atualiza a tela: o otimizador do Next guarda a versão antiga em cache. Sempre salvar imagem nova com nome versionado (`-v2`, `-v3`).
- **2026-10-05** — Com o painel do navegador do app desktop oculto (`document.visibilityState === "hidden"`), o navegador não baixa imagens; não confundir com bug do app. Confirmar com `curl` no servidor.
- **2026-10-05** — Animação de revelação precisa esperar as imagens carregarem (`onLoad`), senão acontece antes de a foto aparecer em conexão lenta.
- **2026-10-05** — A ferramenta de prévia do app desktop procura `.claude/launch.json` na pasta inicial da sessão; se não subir, rodar `npm run dev` e navegar para `http://localhost:3000`.
- **2026-10-05** — Capturas de tela logo após redimensionar/navegar podem vir sem a imagem; esperar ou capturar de novo antes de concluir que é bug.
- **2026-10-05** — Efeito de diálogo/folha que depende de `aoFechar` roda de novo a cada render quando o pai passa função inline (`() => set…(false)`): o foco voltava ao botão Fechar a cada letra digitada. Guardar callbacks em ref e depender só de `aberta`.
- **2026-10-05** — A jornada (`useJornada`) é restaurada do sessionStorage **depois** de a tela montar: não ler `jornada` em inicializador de `useState` nem em efeito de montagem; derivar do valor atual.
- **2026-10-06** — Retrato da Thalita com IA: mandar a foto **dela como imagem principal** e pedir para "re-fotografar" (fundo/enquadramento só descritos em texto), com 2–3 outras fotos dela para reforçar o rosto (`tools/acervo/gerar-retrato-thalita.py`). Mandar uma foto de outra modelo como referência de composição faz a IA trocar o rosto por uma modelo genérica. Recortar a foto original (máscara) foi descartado pelo cliente.
- **2026-10-06** — `composio proxy` recusa corpo grande ("Request Entity Too Large"): manter o JSON abaixo de ~1,5 MB (referências com ~800 px, JPEG 80).
- **2026-10-06** — Classes de mesma propriedade no Tailwind 4 (ex.: `text-xl` + `text-2xl`) não seguem a ordem do `className`: vale a que vem depois no CSS gerado, e variantes como `lg:` ganham sempre. A `Marca` recebe o tamanho só pelo `className` (padrão `text-xl` = 26 px no computador, `text-[1.375rem]` no celular); em painéis laterais, posição `left-10 top-10 xl:left-12 xl:top-12`.
