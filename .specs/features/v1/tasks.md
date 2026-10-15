# sourced-carousel v1 Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user - do not proceed without it.**

---

**Design**: `.specs/features/v1/design.md`
**Status**: In Progress (T1 a T37 feitas e integradas; verificação independente reprovou na rodada 1, correções T38 a T41 feitas; falta a rodada 2)

**Regras do projeto (valem para toda tarefa):** código de terceiros só roda em container; commits em Conventional Commits em inglês com a identidade noreply do Lucas; nenhum push, nenhum repositório remoto e nenhuma configuração do GitHub sem OK explícito do Lucas; nenhum travessão nem seta em texto escrito; nenhuma afirmação sobre terceiros que não tenha sido verificada.

---

## Progresso

| Tarefa | Commit na main |
| ------ | -------------- |
| T1 | 51d09e2 |
| T2 | 35f5898 |
| T3 | 6466e00 |
| T4 | c99d9b5 |
| T5 | 761fa65 |
| T6 | 50a6eb2 |
| T7 | 44dc867 |
| T8 | e4541d2 |
| T9 | eb4dbb5 |
| T10 | 3677812 |
| T11 | 1d36808 |
| T12 | b6fcd8d |
| T13 | 99e6390 |
| T14 | 068708d |
| T15 | fbb9846 |
| T16 | 4acacfb |
| T17 | 3838d81 |
| T18 | 15b9ba1 |
| T19 | 7b27235 |
| T20 | 935bf8c |
| T21 | 41b6be5 |
| T22 | 1d8fe8e |
| T23 | c22cc11 |
| T24 | 61e8358 |
| T25 | 2ca2d65 |
| T26 | ced13eb |
| T27 | 1dc36ad |
| T28 | 08c05d5 |
| T30 | 06b5685 |
| T31 | 06f570f |

Gate da main (container, sem rede): typecheck ok e 309 testes passando. T24 achou na inspeção visual o bug de box-sizing dos layouts e T26 achou o de limpeza no tratamento de erro; os dois foram corrigidos com teste.

---

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec - confirm before Execute. Guidelines found: none - strong defaults applied. O repositório ainda não existe em código; a suíte nasce com as tarefas.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| ---------- | ------------------ | -------------------- | ---------------- | ----------- |
| Validador (schema, validate, cli validate) | unit | Todas as ramificações; 1:1 com os ACs VAL; todos os Edge Cases | `tests/*.test.ts` | `bun test` |
| Layout, tema e ajuste de texto | unit | Estrutura do objeto devolvido, texto só como string, limites dos tamanhos | `tests/*.test.ts` | `bun test` |
| Renderização, PDF e cli render | integration | PNG com dimensões exatas, PDF com offsets corretos, reproduzibilidade byte a byte, falha sem arquivo parcial | `tests/*.test.ts` | `bun test` |
| Configuração, fontes, scripts, workflows e documentação | none | Gate de build; scripts e workflows verificados por comando próprio (provas de isolamento, actionlint) | - | build gate only |

## Gate Check Commands

> Generated from codebase - confirm before Execute.

Todo comando roda no container: `docker run --rm --user $(id -u):$(id -g) -e HOME=/tmp -v /path/to/sourced-carousel:/app -w /app oven/bun:1 <comando>`. A instalação (`bun install --frozen-lockfile --ignore-scripts`) é o único passo com rede.

| Gate Level | When to Use | Command |
| ---------- | ----------- | ------- |
| Quick | Tarefas com testes unitários | `bun test` |
| Full | Tarefas de renderização, PDF e CLI | `bunx tsc --noEmit && bun test` |
| Build | Fim de fase e tarefas só de configuração | `bunx tsc --noEmit && bun test` e, depois da T28, `scripts/carousel.sh render` no exemplo |

---

## Execution Plan

As fases são sequenciais. As trilhas do Validador (fase 2) e da Renderização (fase 3) usam arquivos disjuntos e só dependem da Fundação, então podem rodar em paralelo se o Lucas pedir, em worktrees separadas.

### Phase 1: Fundação

```
T1 → T2
T2 → T3
T3 → T4
T4 → T5
```

### Phase 2: Validador

```
T5 → T6
T6 → T7
T7 → T8
T8 → T9
T9 → T10
T10 → T11
T11 → T12
```

### Phase 3: Renderização

```
T4 → T13
T13 → T14
T14 → T15
T5 → T15
T15 → T16
T16 → T17
T17 → T18
T18 → T19
T19 → T20
T20 → T21
T21 → T22
T22 → T23
T23 → T24
T13 → T24
T15 → T24
T24 → T25
T25 → T26
T11 → T26
T26 → T27
```

### Phase 4: Repositório seguro

```
T27 → T28
T28 → T29
T29 → T30
T30 → T31
T31 → T32
```

### Phase 5: Skill e documentação

```
T26 → T33
T33 → T34
T34 → T35
T35 → T36
T36 → T37
```

### Phase 6: Correções da verificação (rodada 1)

```
T10 → T38
T9 → T38
T26 → T39
T38 → T40
T39 → T40
T40 → T41
```

---

## Task Breakdown

### T1: Manifesto do projeto

**What**: Criar o package.json com satori e @resvg/resvg-wasm em versão exata, typescript e @types/bun como devDependencies, e o bun.lock gerado.
**Where**: `package.json`
**Depends on**: None
**Reuses**: package.json do fork auditado como referência de scripts
**Requirement**: SEC-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Só 2 dependências diretas de runtime, ambas com versão exata (sem ^)
- [x] `bun install --frozen-lockfile --ignore-scripts` passa no container
- [x] Scripts `test` e `typecheck` definidos

**Tests**: none
**Gate**: build

**Commit**: `chore: add project manifest with pinned dependencies`

---

### T2: Configuração do TypeScript

**What**: Criar o tsconfig.json em modo estrito para o Bun.
**Where**: `tsconfig.json`
**Depends on**: T1
**Reuses**: tsconfig do template auditado
**Requirement**: SEC-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `bunx tsc --noEmit` roda sem erro num src vazio
- [x] Modo estrito ligado

**Tests**: none
**Gate**: build

**Commit**: `chore: add strict typescript configuration`

---

### T3: Arquivos ignorados

**What**: Criar o .gitignore com node_modules, out e arquivos locais.
**Where**: `.gitignore`
**Depends on**: T2
**Reuses**: -
**Requirement**: SEC-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] node_modules, out, .env e arquivos de editor ignorados

**Tests**: none
**Gate**: build

**Commit**: `chore: add gitignore`

---

### T4: Licença MIT

**What**: Adicionar o texto da licença MIT em nome de Lucas Pinheiro Alves.
**Where**: `LICENSE`
**Depends on**: T3
**Reuses**: -
**Requirement**: SEC-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Texto MIT completo com o ano de 2026

**Tests**: none
**Gate**: build

**Commit**: `docs: add MIT license`

---

### T5: Tipos dos slides

**What**: Definir os tipos Slide (hook, text, number, list, quote, cta), Meta (theme, accent, format) e Deck.
**Where**: `src/types.ts`
**Depends on**: T4
**Reuses**: tipos do fork em template/src/lib/types.ts como referência
**Requirement**: VAL-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Seis tipos de slide e os campos de cada um, com `source` e `highlight` opcionais
- [x] `bunx tsc --noEmit` passa

**Tests**: none
**Gate**: build

**Commit**: `feat(types): define slide, meta and deck types`

---

### T6: Leitura e forma do JSON

**What**: Ler o texto JSON e verificar a forma por funções de tipo à mão, devolvendo `schema-invalid` com o caminho do campo.
**Where**: `src/schema.ts`
**Depends on**: T5
**Reuses**: tipos de src/types.ts
**Requirement**: VAL-02, VAL-14

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] JSON inválido, raiz que não é objeto e `slides` que não é lista geram `schema-invalid` com o caminho
- [x] Chaves `__proto__` e `constructor` na entrada não alteram nenhum objeto global
- [x] Gate check passes: `bun test`
- [x] Test count: testes de VAL-02 passam

**Tests**: unit
**Gate**: quick

**Commit**: `feat(validator): parse slides json and check its shape`

---

### T7: Regras estruturais

**What**: Regras `field-missing`, `slide-count` e o aviso `structure`.
**Where**: `src/validate.ts`
**Depends on**: T6
**Reuses**: tabela de campos obrigatórios por tipo da spec
**Requirement**: VAL-04, VAL-09, VAL-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Cada um dos 6 tipos tem um teste de campo obrigatório ausente
- [x] 2 e 11 slides reprovam, 3 e 10 passam
- [x] `structure` é aviso e não altera o código de saída
- [x] Gate check passes: `bun test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(validator): validate required fields and deck structure`

---

### T8: Regras de conteúdo

**What**: Regras `too-many-words`, `hook-too-long`, `highlight-invalid` e `source-too-long`.
**Where**: `src/validate.ts`
**Depends on**: T7
**Reuses**: limites 40 palavras, 3 linhas, 2 palavras e 80 caracteres
**Requirement**: VAL-05, VAL-06, VAL-07, VAL-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] 40 e 41 palavras, 3 e 4 linhas, 2 e 3 palavras de highlight, 80 e 81 caracteres de source cobertos
- [x] Highlight fora do texto reprova
- [x] `source` conta caracteres e não unidades UTF-16 (emoji)
- [x] Gate check passes: `bun test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(validator): enforce word, line, highlight and source limits`

---

### T9: Caracteres proibidos

**What**: Regra `forbidden-char` para U+2014, U+2013, U+2192, U+21D2 e `->` em todo texto, inclusive listas aninhadas e `source`.
**Where**: `src/validate.ts`
**Depends on**: T8
**Reuses**: extrator de texto do validador do fork
**Requirement**: VAL-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Cada caractere detectado em text, itens de lista, citação e source, com o caractere no relatório
- [x] Hífen simples não reprova
- [x] Gate check passes: `bun test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(validator): reject forbidden characters`

---

### T10: Números contra o arquivo de fatos

**What**: Opção `facts`, regra `number-not-in-facts` e aviso `facts-skipped`.
**Where**: `src/validate.ts`
**Depends on**: T9
**Reuses**: regex de número do validador do fork
**Requirement**: VAL-12, VAL-13

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Número presente passa, ausente reprova com o número
- [x] Fatos vazios reprovam todo número, o mesmo número em dois slides gera dois achados
- [x] `2.500` e `2,5` comparados como escritos, `source` fora da checagem
- [x] Sem facts, aviso uma única vez e sem falha
- [x] Gate check passes: `bun test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(validator): check numbers against a facts file`

---

### T11: Comando validate

**What**: Comando `carousel validate`: lê o arquivo, formata `<severity> slide <N> <rule-id>: <message>` e define os códigos 0, 1 e 2.
**Where**: `src/cli.ts`
**Depends on**: T10
**Reuses**: formato de relatório do validador do fork
**Requirement**: VAL-01, VAL-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Sem erro sai com 0, com erro sai com 1, arquivo ilegível sai com 2 com o caminho
- [x] Formato da linha igual ao da spec
- [x] Gate check passes: `bun test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(cli): add the validate command`

---

### T12: Guarda estática de segurança

**What**: Teste que varre src/ e falha se achar eval, new Function, import dinâmico, child_process, fetch, http, net, dns, WebSocket ou leitura de variável de ambiente.
**Where**: `tests/security-static.test.ts`
**Depends on**: T11
**Reuses**: -
**Requirement**: VAL-14, SEC-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] O teste passa no src atual e falha numa cópia temporária com cada padrão proibido (prova de que detecta)
- [x] Gate check passes: `bun test`

**Tests**: unit
**Gate**: quick

**Commit**: `test(security): guard against dynamic code and network APIs`

---

### T13: Fontes estáticas

**What**: Obter Inter 500, 700 e 800 (latin, WOFF2) de @fontsource/inter 5.3.0 num diretório descartável e conferir a licença OFL.
**Where**: `src/fonts/`
**Depends on**: T4
**Reuses**: processo da trilha B do fork (container, --ignore-scripts)
**Requirement**: RND-07, SEC-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] LICENSE do pacote confirmada como OFL-1.1; se não for, a tarefa PARA
- [x] Só os 3 arquivos WOFF2 necessários entram no repositório
- [x] Gate check passes: `bunx tsc --noEmit && bun test`

**Tests**: none
**Gate**: build

**Commit**: `feat(fonts): add self-hosted Inter font files`

---

### T14: Avisos de licença das fontes

**What**: Registrar nome, versão, origem e texto da licença da Inter.
**Where**: `THIRD_PARTY_FONTS.md`
**Depends on**: T13
**Reuses**: arquivo equivalente do fork
**Requirement**: SEC-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Texto completo da licença OFL da Inter

**Tests**: none
**Gate**: build

**Commit**: `docs(fonts): add third-party font license notice`

---

### T15: Temas e formatos

**What**: Definir os temas dark e light, a cor de destaque e as dimensões dos dois formatos.
**Where**: `src/theme.ts`
**Depends on**: T14, T5
**Reuses**: cores de superfície do fork
**Requirement**: RND-02, RND-05, RND-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] dark e light com fundo e texto contrastantes, destaque configurável
- [x] linkedin-square 1080x1080 e linkedin-portrait 1080x1350
- [x] Gate check passes: `bun test`
- [x] Test count: testes de tema passam

**Tests**: unit
**Gate**: quick

**Commit**: `feat(theme): add dark and light themes and the two formats`

---

### T16: Rodapé de fonte

**What**: Elemento de rodapé com `source`, que não renderiza nada quando ausente.
**Where**: `src/layout/footer.ts`
**Depends on**: T15
**Reuses**: -
**Requirement**: RND-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Com source, o texto aparece como string exata no objeto
- [x] Sem source ou vazio, nada é gerado
- [x] Gate check passes: `bun test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(layout): add the source footer`

---

### T17: Layout hook

**What**: Objeto do slide hook, com destaque.
**Where**: `src/layout/hook.ts`
**Depends on**: T16
**Reuses**: -
**Requirement**: RND-05, RND-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] O texto da entrada aparece só como valor string de nó de texto, nunca como elemento
- [x] Highlight na cor do tema
- [x] Gate check passes: `bun test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(layout): add the hook slide`

---

### T18: Layout text

**What**: Objeto do slide text, com título, corpo e destaque.
**Where**: `src/layout/text.ts`
**Depends on**: T17
**Reuses**: -
**Requirement**: RND-05, RND-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Texto só como string, highlight na cor do tema, footer incluído
- [x] Gate check passes: `bun test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(layout): add the text slide`

---

### T19: Layout number

**What**: Objeto do slide number, com número grande e rótulo.
**Where**: `src/layout/number.ts`
**Depends on**: T18
**Reuses**: -
**Requirement**: RND-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Número e rótulo só como string, footer incluído
- [x] Gate check passes: `bun test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(layout): add the number slide`

---

### T20: Layout list

**What**: Objeto do slide list, com título e itens numerados.
**Where**: `src/layout/list.ts`
**Depends on**: T19
**Reuses**: -
**Requirement**: RND-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Itens só como string, footer incluído, lista de 1 a 6 itens
- [x] Gate check passes: `bun test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(layout): add the list slide`

---

### T21: Layout quote

**What**: Objeto do slide quote, com citação e autor.
**Where**: `src/layout/quote.ts`
**Depends on**: T20
**Reuses**: -
**Requirement**: RND-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Citação e autor só como string, footer incluído
- [x] Gate check passes: `bun test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(layout): add the quote slide`

---

### T22: Layout cta

**What**: Objeto do slide cta, com chamada e handle.
**Where**: `src/layout/cta.ts`
**Depends on**: T21
**Reuses**: -
**Requirement**: RND-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Texto e handle só como string, footer incluído
- [x] Gate check passes: `bun test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(layout): add the cta slide`

---

### T23: Ajuste de texto

**What**: Escada de tamanhos de fonte com estimativa conservadora de largura, e o erro `text-overflow` quando nem o mínimo cabe.
**Where**: `src/fit.ts`
**Depends on**: T22
**Reuses**: -
**Requirement**: RND-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Texto curto usa o maior tamanho, texto no limite de 40 palavras cabe no tamanho mínimo
- [x] Texto acima do limite do mínimo falha com `text-overflow` indicando o slide
- [x] Gate check passes: `bun test`

**Tests**: unit
**Gate**: quick

**Commit**: `feat(fit): fit text to the slide or fail with text-overflow`

---

### T24: Renderização em PNG

**What**: Satori com as fontes locais e resvg-wasm gerando um PNG por slide, sem acessar a rede.
**Where**: `src/render.ts`
**Depends on**: T23, T13, T15
**Reuses**: -
**Requirement**: RND-02, RND-06, RND-07, RND-09

**Tools**:

- MCP: `context7`
- Skill: NONE

**Done when**:

- [x] Cada PNG tem a largura e a altura exatas do formato
- [x] Dois renders do mesmo slide dão PNGs idênticos byte a byte
- [x] Um slide com `<script>`, `<img onerror>` e `javascript:` no texto gera SVG sem elemento script nem img
- [x] Primeira verificação: a Inter estática 700 e 800 saem com pesos distintos
- [x] Gate check passes: `bunx tsc --noEmit && bun test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(render): render slides to PNG with satori and resvg`

---

### T25: Escritor de PDF

**What**: Gerar um PDF com uma imagem RGB por página, sem data nem identificador, a partir dos pixels do resvg.
**Where**: `src/pdf.ts`
**Depends on**: T24
**Reuses**: -
**Requirement**: RND-03, RND-09

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] PDF com N páginas e tamanho de página igual ao do formato
- [x] Tabela de referências cruzadas com os deslocamentos corretos (teste que confere cada offset)
- [x] Dois PDFs do mesmo conteúdo são idênticos byte a byte
- [x] Gate check passes: `bunx tsc --noEmit && bun test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(pdf): write a deterministic one-image-per-page pdf`

---

### T26: Comando render

**What**: Comando `carousel render`: valida primeiro, gera PNGs e PDF em out/, imprime o progresso e não deixa PDF parcial em caso de falha.
**Where**: `src/cli.ts`
**Depends on**: T25, T11
**Reuses**: -
**Requirement**: RND-01, RND-08, RND-10

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Erro de validação aborta com o código do validador e não escreve nada
- [x] Falha em qualquer etapa nomeia a etapa e não deixa carousel.pdf
- [x] Imprime `slide <i>/<n>` por slide
- [x] Sobrescreve arquivos de mesmo nome sem apagar outros
- [x] Gate check passes: `bunx tsc --noEmit && bun test`

**Tests**: integration
**Gate**: full

**Commit**: `feat(cli): add the render command`

---

### T27: Teste de ponta a ponta

**What**: Teste que renderiza um carrossel de 6 slides e confere PNGs, PDF, tema light e dark e determinismo.
**Where**: `tests/e2e.test.ts`
**Depends on**: T26
**Reuses**: -
**Requirement**: RND-02, RND-03, RND-09, RND-11

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] 6 PNGs de 1080x1080 e um PDF de 6 páginas
- [x] Tema light com fundo claro e dark com fundo escuro
- [x] Dois renders produzem PNGs idênticos
- [x] Gate check passes: `bunx tsc --noEmit && bun test`

**Tests**: integration
**Gate**: full

**Commit**: `test(e2e): cover rendering end to end`

---

### T28: Script de container

**What**: Rodar validate e render com --network none, --read-only, --cap-drop ALL, no-new-privileges, código :ro e só out/ gravável.
**Where**: `scripts/carousel.sh`
**Depends on**: T27
**Reuses**: scripts/validate.sh do fork
**Requirement**: RND-07, SEC-07

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Roda o exemplo sem rede e sai com 0
- [x] Prova de isolamento: dentro do mesmo container um fetch falha e a escrita no código falha
- [x] Gate check passes: `bunx tsc --noEmit && bun test`

**Tests**: none
**Gate**: build

**Commit**: `feat(scripts): run the cli in an isolated offline container`

---

### T29: Workflow de CI

**What**: Instalação congelada sem scripts, typecheck, testes, render do exemplo pelo script de container e trivy, com permissions contents: read e actions por SHA.
**Where**: `.github/workflows/ci.yml`
**Depends on**: T28
**Reuses**: ci.yml do fork
**Requirement**: SEC-01, SEC-02, SEC-03

**Tools**:

- MCP: `context7`
- Skill: NONE

**Done when**:

- [ ] Ordem: install, tsc, test, render sem rede, trivy HIGH e CRITICAL com falha
- [ ] Toda action de terceiros por SHA completo reverificado via gh api, com a tag em comentário
- [ ] `permissions: contents: read`
- [ ] actionlint sem erros
- [ ] O workflow não foi executado no GitHub e isso consta no relatório

**Tests**: none
**Gate**: build

**Commit**: `ci: add build, test and vulnerability scan workflow`

---

### T30: Dependabot

**What**: Ecossistemas bun e github-actions, semanal, com minor e patch agrupados.
**Where**: `.github/dependabot.yml`
**Depends on**: T29
**Reuses**: dependabot.yml do fork
**Requirement**: SEC-04

**Tools**:

- MCP: `context7`
- Skill: NONE

**Done when**:

- [x] Blocos bun e github-actions, weekly, grupo minor-and-patch, prefixo chore(deps) e chore(ci)
- [x] YAML válido

**Tests**: none
**Gate**: build

**Commit**: `chore(deps): add dependabot configuration`

---

### T31: Política de segurança

**What**: Descrever como reportar vulnerabilidade, o escopo e o prazo de resposta.
**Where**: `SECURITY.md`
**Depends on**: T30
**Reuses**: -
**Requirement**: SEC-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Canal de reporte que não expõe o e-mail corporativo do autor
- [x] Escopo e o que não é suportado

**Tests**: none
**Gate**: build

**Commit**: `docs(security): add the security policy`

---

### T32: Registro de dependências

**What**: Registrar cada dependência direta e transitiva com versão, licença e scripts de instalação, e a auditoria das diretas.
**Where**: `docs/dependencies.md`
**Depends on**: T31
**Reuses**: metadados do npm e saída do trivy
**Requirement**: SEC-06

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Diretas: satori e @resvg/resvg-wasm, ambas MPL-2.0 sem modificação
- [ ] Todas as transitivas do lockfile listadas, com a licença
- [ ] Resultado do trivy e dos scripts de instalação por dependência

**Tests**: none
**Gate**: build

**Commit**: `docs(deps): record every dependency with its license and install scripts`

---

### T33: Exemplo de carrossel

**What**: Carrossel fictício rotulado como exemplo, em JSON.
**Where**: `examples/slides.json`
**Depends on**: T26
**Reuses**: -
**Requirement**: DOC-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] 6 slides, números fictícios, rodapé de fonte nos slides com número
- [ ] `carousel validate` com o arquivo de fatos do exemplo sai com 0

**Tests**: none
**Gate**: build

**Commit**: `docs(examples): add a fictional example carousel`

---

### T34: Fatos do exemplo

**What**: Arquivo de fatos do exemplo, com número, contexto, trecho e link fictícios.
**Where**: `examples/facts.md`
**Depends on**: T33
**Reuses**: -
**Requirement**: DOC-04

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Todo número do exemplo aparece neste arquivo
- [ ] Marcado como fictício no topo

**Tests**: none
**Gate**: build

**Commit**: `docs(examples): add the example facts file`

---

### T35: SKILL.md

**What**: Descrever o fluxo da skill: fatos com trecho literal, plano aprovado, JSON, validar até passar, gerar, entregar com a lista de fatos, nunca publicar, nunca inventar número.
**Where**: `SKILL.md`
**Depends on**: T34
**Reuses**: -
**Requirement**: DOC-01, DOC-02, DOC-03

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Fluxo completo com as 6 etapas da spec
- [ ] Só o script de container para validar e gerar
- [ ] Sem travessão e sem seta, validado pelo próprio validador do projeto

**Tests**: none
**Gate**: build

**Commit**: `feat(skill): add the Claude Code skill instructions`

---

### T36: README em português

**What**: Instalação, exemplo, regras do validador, segurança e comparação verificável com o ContentHub e o gerador de carrossel do itchernetski.
**Where**: `README.md`
**Depends on**: T35
**Reuses**: -
**Requirement**: DOC-04, DOC-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Comparação só com o que foi verificado: ContentHub é carrossel de Instagram com gate factual e sem pasta .github; o outro gerador usa navegador
- [ ] Seção de segurança com os limites do que o projeto não garante
- [ ] Sem travessão e sem seta

**Tests**: none
**Gate**: build

**Commit**: `docs: add the Portuguese README`

---

### T37: README em inglês

**What**: Versão em inglês do README.
**Where**: `README.en.md`
**Depends on**: T36
**Reuses**: -
**Requirement**: DOC-04, DOC-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [ ] Mesmo conteúdo do README.md, sem afirmar nada não verificado

**Tests**: none
**Gate**: build

**Commit**: `docs: add the English README`

---

### T38: Conferência de números inteira e traços e setas ampliados

**What**: Comparar números como token inteiro com sinal e unidade após NFKC, rejeitar dígitos fora de 0 a 9, procurar o destaque só nos campos desenhados, tratar caracteres de largura zero como vazio, ampliar traços e setas proibidos e tolerar BOM.
**Where**: `src/validate.ts`
**Depends on**: T10, T9
**Reuses**: validador da trilha 1
**Requirement**: VAL-07, VAL-08, VAL-12, VAL-15

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] `42%` não passa contra `142%`, `42` ou `42,5%`; `-3%` não passa contra `3%`; `5K` não passa contra `5 mil`
- [x] Os 24 testes que reproduziam os achados do Verifier passam, e o destaque só no autor da citação reprova
- [x] Gate check passes: `bunx tsc --noEmit && bun test`
- [x] Observação: o commit reúne as mudanças de validate.ts e schema.ts (BOM) porque compartilham as mesmas funções e o mesmo arquivo de teste

**Tests**: unit
**Gate**: full

**Commit**: `fix(validator): match numbers whole and reject more dashes and arrows`

---

### T39: Passos de render e pdf substituíveis nos testes

**What**: Aceitar um terceiro argumento opcional com renderDeck e buildPdf em runRender.
**Where**: `src/cli.ts`
**Depends on**: T26
**Reuses**: runRender
**Requirement**: RND-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Os caminhos de falha do pdf e do render ficam testáveis sem mockar módulos
- [x] Gate check passes: `bunx tsc --noEmit && bun test`

**Tests**: integration
**Gate**: full

**Commit**: `refactor(cli): let tests replace the render and pdf steps`

---

### T40: Fechar os testes que não discriminavam

**What**: Cobrir os mutantes sobreviventes: número em handle e author, unidade %, quebra de linha do gancho, estouro do gancho, campo do destaque, passo pdf, rodapé no PDF e guarda estática ampliada.
**Where**: `tests/validate-hardening.test.ts`
**Depends on**: T38, T39
**Reuses**: testes existentes
**Requirement**: VAL-12, RND-04, RND-08

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Oito mutantes que sobreviveram agora morrem (conferido numa cópia isolada)
- [x] 366 testes passando
- [x] Gate check passes: `bunx tsc --noEmit && bun test`

**Tests**: unit
**Gate**: full

**Commit**: `test: close the gaps found by the independent verification`

---

### T41: Documentação e especificação alinhadas

**What**: Corrigir a frase sobre CI de terceiros, documentar as regras novas e as limitações, e dar precisão aos ACs VAL-07, VAL-08 e VAL-12.
**Where**: `README.md`
**Depends on**: T40
**Reuses**: README e SKILL.md
**Requirement**: DOC-04, DOC-05

**Tools**:

- MCP: NONE
- Skill: NONE

**Done when**:

- [x] Nenhuma afirmação sobre terceiros além dos fatos verificados
- [x] Limitações novas documentadas nos dois READMEs e no SKILL.md
- [x] Gate check passes: `bunx tsc --noEmit && bun test`

**Tests**: none
**Gate**: build

**Commit**: `docs: document the stricter validator rules and their limits`

---

## Phase Execution Map

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5

Phase 1:  T1 → T2 → T3 → T4 → T5
Phase 2:  T6 → T7 → T8 → T9 → T10 → T11 → T12
Phase 3:  T13 → T14 → T15 → ... → T27
Phase 4:  T28 → T29 → T30 → T31 → T32
Phase 5:  T33 → T34 → T35 → T36 → T37
Phase 6:  T38, T39 → T40 → T41
```

Depois da T37 roda o Verifier, com um agente novo que não escreveu o código.
