**Verdict: FAIL**

## Validation: sourced-carousel v1 - FAIL

# sourced-carousel v1 Validation

**Data**: 2026-10-14
**Spec**: `.specs/features/v1/spec.md`
**Intervalo de commits**: `git log --oneline a116298..HEAD` lista 41 commits (51d09e2 ... e1b561c). HEAD = `e1b561cc328dd6b4ba3c326e0fadc02ee2376ad9` (e1b561c), branch main, arvore limpa antes e depois do trabalho.
**Verifier**: subagente independente (autor diferente do verificador). Nenhum arquivo do repositorio foi alterado, exceto este relatorio. Tudo que executa codigo do projeto rodou em container `oven/bun:1` com `--network none`, sem montar a home.

## Por que FAIL

1. O validador compara numeros por substring pura (`src/validate.ts:240`), o que deixa passar "42%" quando os fatos dizem "142%" (FURO F1, comprovado por execucao). O teste `tests/validate.test.ts:444` fixa esse comportamento de proposito.
2. Digitos Unicode de largura total (por exemplo U+FF14 U+FF12) nao sao reconhecidos como numero (FURO F2, `src/validate.ts:165`).
3. O sensor deixou 8 de 45 mutantes sobreviverem, 5 deles em comportamento exigido pela spec (secao Sensor).
4. DOC-05: o README afirma sobre terceiros coisas fora da lista verificada (secao Documentacao).
5. RND-04: nenhuma asserção prova o rodape no PDF.

A spec exige "sem afirmar o que nao foi verificado" e a promessa central do projeto e "nenhum numero sem fonte". Defeitos reais, entao FAIL, sem adaptar o veredito ao `validate_state.py`.

## Task Completion

| Tarefa | Status | Notas |
| ------ | ------ | ----- |
| T1 a T28, T30, T31 | Feitas | Commits listados em `.specs/features/v1/tasks.md` (tabela Progresso). |
| T29, T32 a T37 | Codigo presente, registro ausente | O cabecalho de `tasks.md` ainda diz "faltam T29, T32 a T37" e a tabela Progresso nao tem esses commits, embora `git log` mostre d43e519 (ci), 84de72c (docs deps), 0b91758, da13912, 0e442f7, 516633a, 58f0a7d. `spec.md` (Requirement Traceability) segue com "Implementing" e "In Tasks" em todos os 37 requisitos. Documentacao do projeto desatualizada, nao e defeito de produto. |

## Gate

- Comando: `bunx tsc --noEmit && bun test` no container sem rede.
- `bunx tsc --noEmit`: saida 0, sem erros.
- `bun test`: **309 passed, 0 failed**, 4058 expect(), 18 arquivos, 12,11 s. Sem testes pulados.
- Contagem de antes da feature: nao ha baseline anterior (o repositorio nasce com a feature). tasks.md registra 309, igual ao observado.
- `scripts/carousel.sh selftest`: 5 de 5 checks "ok", saida 0.
- actionlint (imagem local `rhysd/actionlint:latest`, `--network none`) sobre `.github/workflows/ci.yml`: saida 0, sem achados.

## Spec-Anchored Acceptance Criteria

Convencao de linhas: sempre do arquivo real (`grep -n`). Legenda: PASS = asserção bate com o resultado definido pela spec. PASS+LP = passa, com lacuna de precisao da spec. GAP = sem evidencia ou evidencia parcial.

### P1: Validar o carrossel antes de gerar

| ID | Resultado definido pela spec | `file:line` + asserção | Resultado |
| -- | ---------------------------- | ---------------------- | --------- |
| VAL-01 | Linha `<severity> slide <N> <rule-id>: <message>`; saida 0 so com zero erros | `tests/cli.test.ts:61` `expect(r.code).toBe(1)`; `:63` `toMatch(/^error slide 2 forbidden-char: .+/)`; `:68-71` avisos sozinhos `code 0` e `/^warning slide 1 structure: .+/`; `:56` limpo `{ code: 0, lines: [] }` | PASS |
| VAL-02 | `schema-invalid` com caminho do campo e saida 1 | `tests/schema.test.ts:25` `toMatchObject({ severity: "error", slide: 0, rule: "schema-invalid" })`, `:26` `toContain("$")`, `:44` `toContain("slides")`; `tests/cli.test.ts:101` `code toBe(1)` e `:102` `/^error slide 0 schema-invalid: /` | PASS+LP (a spec nao define o formato do caminho; os testes so afirmam `toContain`) |
| VAL-03 | Saida 2 e imprime o caminho | `tests/cli.test.ts:110-111` `code toBe(2)` e `lines.join("\n")).toContain(p)`; `:117-118` idem para o arquivo de fatos; `:122` diretorio `toBe(2)` | PASS |
| VAL-04 | `field-missing` com o nome do campo | `tests/validate.test.ts:48-53` (11 casos) `toHaveLength(1)`, `toMatchObject({ severity: "error", slide: 2 })`, `message toContain(\`"${field}"\`)` | PASS |
| VAL-05 | `too-many-words` acima de 40 palavras em slide text | `tests/validate.test.ts:232` 40 passam `toHaveLength(0)`; `:236-238` 41 falham `toHaveLength(1)`, `{severity:"error", slide:2}` | PASS |
| VAL-06 | `hook-too-long` acima de 3 linhas | `tests/validate.test.ts:258` 3 linhas `toHaveLength(0)`; `:262-264` 4 linhas `toHaveLength(1)`, `{severity:"error", slide:1}` | PASS+LP (a spec nao diz se "linha" e quebra `\n` ou linha renderizada; o codigo conta so `\n`, `src/validate.ts:108`, e o hook do exemplo com 2 linhas sai com 4 linhas no PNG) |
| VAL-07 | `highlight-invalid` com mais de 2 palavras ou ausente do texto | `tests/validate.test.ts:283-284` 1 e 2 palavras `toHaveLength(0)`; `:288-291` 3 palavras `toHaveLength(1)`; `:294` ausente `toHaveLength(1)` | PASS+LP ("texto do slide" nao define quais campos; maiusculas e minusculas nao definido; ver defeito D1) |
| VAL-08 | `forbidden-char` com o caractere para U+2014, U+2013, U+2192, U+21D2 e a sequencia hifen-maior | `tests/validate.test.ts:354-358` para os 5 casos `toHaveLength(1)`, `{severity:"error", slide:2}`, `message toContain(ch)`; `:360-378` em todo campo textual, incluindo `source`, `handle` e `author` | PASS |
| VAL-09 | `slide-count` fora de 3 a 10 | `tests/validate.test.ts:139-141` 2 falha com `slide: 0`; `:145` 3 passa; `:149` 10 passa; `:153` 11 falha; `:157-158` 0 e 1 falham | PASS |
| VAL-10 | Aviso `structure` sem mudar a saida | `tests/validate.test.ts:166` `{severity:"warning", slide:1}`; `:172` `{severity:"warning", slide:3}`; `:182-183` sem erro e deck devolvido; `tests/cli.test.ts:68` `code toBe(0)` | PASS |
| VAL-11 | `source-too-long` acima de 80 caracteres | `tests/validate.test.ts:320` 80 passam; `:324-326` 81 falham `{severity:"error", slide:2}`; `:330-336` 80 e 81 emojis (pontos de codigo) | PASS |
| VAL-12 | Com `--facts`, numero fora de `source` ausente dos fatos gera `number-not-in-facts` com o numero | `tests/validate.test.ts:416-419` `toHaveLength(1)`, `{severity:"error", slide:2}`, `message toContain("47")`; `:437-442` separadores como escritos; `:448-449` `source` fora da conferencia; `tests/cli.test.ts:93-94` `/^error slide 2 number-not-in-facts: .*47/` | PASS+LP (a spec nao diz se "aparece" e substring ou token; `:444-446` fixa substring, ver FURO F1) |
| VAL-13 | Sem `--facts`, aviso `facts-skipped` uma vez, sem falhar | `tests/validate.test.ts:477-480` `toHaveLength(1)` com dois slides numerados, `{severity:"warning", slide:2}`; `:483-485` sem erro; `tests/cli.test.ts:76-78` `code toBe(0)`, `toHaveLength(1)`, `/^warning slide 2 facts-skipped: /` | PASS |
| VAL-14 | Ler a entrada sem executar codigo dela | `tests/schema.test.ts:65-88` `__proto__` e `constructor.prototype` sem poluicao; `tests/security-static.test.ts:75` `expect(await scan(src)).toEqual([])`; `src/schema.ts:38` so `JSON.parse` | PASS |

### P1: Gerar PNG e PDF sem navegador

| ID | Resultado definido pela spec | `file:line` + asserção | Resultado |
| -- | ---------------------------- | ---------------------- | --------- |
| RND-01 | Validacao primeiro; aborta com o codigo do validador | `tests/cli-render.test.ts:38` `code toBe(1)`, `:40` `readdir(out)).rejects.toThrow()`; `:49-51` numero fora dos fatos `toBe(1)`; `:152` arquivo ilegivel `toBe(2)` | PASS |
| RND-02 | PNG `NN-<type>.png` a partir de 01, com largura e altura exatas | `tests/cli-render.test.ts:63-71` `toEqual(["01-hook.png", ..., "06-cta.png", "carousel.pdf"])`; `tests/e2e.test.ts:46` `toEqual({ width: 1080, height: 1080 })`; `:56` `toEqual({ width: 1080, height: 1350 })`; `tests/render.test.ts:65` | PASS |
| RND-03 | `out/carousel.pdf` com uma pagina por slide | `tests/e2e.test.ts:49` `(pdf.match(/\/Type \/Page(?![s])/g)).length toBe(6)`; `tests/cli-render.test.ts:74-75` 6 paginas e `/MediaBox [0 0 1080 1080]` | PASS |
| RND-04 | Texto do rodape no PNG e no PDF | `tests/layout-footer.test.ts:18` `collectStrings(node!)).toEqual(["Fonte: Relatório 2025, p. 4"])`; `tests/layout-helpers.test.ts:112` `toContain("Fonte: Relatório 2025, p. 4")`; `tests/render.test.ts:158` PNG com source difere do PNG sem source | GAP (PNG provado. Nenhuma asserção abre uma pagina do PDF. O PDF recebe os mesmos pixels por `src/cli.ts:151`, mas nada no teste prova o rodape la) |
| RND-05 | Trecho destacado na cor de destaque do tema | `tests/layout-helpers.test.ts:126` `expect(found[0]!.props.style?.color).toBe(ctx.tokens.accent)`; `tests/layout-hook.test.ts:35` idem; inspecao visual: destaque amarelo no PNG | PASS+LP (prova na arvore de layout, nao em pixel; ver defeito D1 sobre highlight no `author`) |
| RND-06 | Texto da entrada so como caracteres, nunca elemento | `tests/render.test.ts:145-149` `expect(svg).not.toContain("<script")`, `"<img"`, `"<foreignObject"`, `"onerror"`, `"onmouseover"` para os 6 tipos; `tests/layout-helpers.test.ts:151` `assertNoInjectedElements` | PASS |
| RND-07 | Conclui em container `--network none` com fontes do repositorio | `scripts/carousel.sh:35` `--network none`; `scripts/selftest.ts:20-25` fetch bloqueado, executado: 5 de 5 ok; `src/render.ts:44` `readFile(join(ROOT, f.file))`; render do exemplo executado por mim no container sem rede, saida 0 | PASS (evidencia por execucao de comando, nao por teste automatizado em `bun test`) |
| RND-08 | Falha em qualquer etapa: saida diferente de zero, nomeia a etapa, sem `carousel.pdf` | `tests/cli-render.test.ts:99-100` PDF velho some e `ls(out)).toEqual([])`; `:111` `code toBe(3)`, `:113` `startsWith("error: render failed:")`, `:114` `toContain("slide 2")`, `:115` `ls(out)).toEqual([])`; `:123-124` `toBe(3)` e `startsWith("error: write failed:")` | PASS (a etapa `pdf`, `src/cli.ts:153`, nao tem teste; M13 sobreviveu) |
| RND-09 | Mesmo slides.json duas vezes: PNGs identicos byte a byte e PDFs com mesmo numero e tamanho de paginas | `tests/e2e.test.ts:69` `expect((await readFile(join(a, f))).equals(await readFile(join(b, f)))).toBe(true)` para todos os arquivos, incluindo o PDF; `tests/render.test.ts:88` | PASS (mais forte que a spec: PDF byte a byte; so duas execucoes na mesma maquina e imagem) |
| RND-10 | Imprime `slide <i>/<n>` por slide | `tests/cli-render.test.ts:86` `toEqual(["slide 1/6", ..., "slide 6/6"])`; `tests/e2e.test.ts:99` `toContain("slide 6/6")` | PASS |
| RND-11 | `light`: fundo claro e texto escuro; `dark`: o inverso | `tests/theme.test.ts:29-30` `luminance(tokens.background) toBeLessThan(0.1)` e `luminance(tokens.text) toBeGreaterThan(0.8)`; `:35-36` o inverso para light; `tests/render.test.ts:99` `bandIsBackground(...)).toBe(true)` por tema; inspecao visual dos dois temas | PASS |

### P2: Repositorio seguro

| ID | Resultado definido pela spec | Evidencia | Resultado |
| -- | ---------------------------- | --------- | --------- |
| SEC-01 | Ordem: instalacao congelada sem scripts, typecheck, testes, exemplo sem rede, trivy | `.github/workflows/ci.yml:30` `bun install --frozen-lockfile --ignore-scripts`, `:33` `bunx tsc --noEmit`, `:36` `bun test`, `:39` `scripts/carousel.sh render examples/slides.json --facts examples/facts.md --out out`, `:55` trivy-action; actionlint saida 0 | PASS por leitura. O CI nunca rodou no GitHub |
| SEC-02 | Trivy HIGH ou CRITICAL falha o CI | `.github/workflows/ci.yml:60` `severity: HIGH,CRITICAL`, `:61` `exit-code: "1"` | PASS por leitura. Nunca rodou no GitHub. Varredura local registrada em `docs/dependencies.md` (0 achados em 2026-10-14) |
| SEC-03 | Actions por SHA completo com tag em comentario e `permissions: contents: read` | `.github/workflows/ci.yml:8-9` `permissions: contents: read`; `:20`, `:25`, `:55` tres SHAs de 40 caracteres (conferido por regex) cada um com `# v7.0.1`, `# v2.2.0`, `# v0.36.0` | PASS por leitura. NAO verificado que cada SHA e o commit da tag indicada (sem acesso ao GitHub) |
| SEC-04 | Dependabot `bun` e `github-actions`, semanal, minor e patch agrupados | `.github/dependabot.yml:3` `package-ecosystem: "bun"`, `:20` `"github-actions"`, `:6` e `:23` `interval: "weekly"`, `:16-18` e `:33-35` `update-types: minor, patch` | PASS por leitura. NAO verificado contra o schema do GitHub (actionlint nao cobre dependabot.yml) |
| SEC-05 | SECURITY.md com como reportar, LICENSE MIT, THIRD_PARTY_FONTS.md com texto da licenca | `SECURITY.md:7` "Reporting a vulnerability"; `LICENSE:1` "MIT License"; `THIRD_PARTY_FONTS.md:3-9` Inter, OFL-1.1, texto integral abaixo | PASS (fidelidade do texto OFL ao original nao conferida) |
| SEC-06 | No maximo 4 dependencias diretas; listar diretas e transitivas com versao, licenca e scripts; registrar auditoria das diretas | `package.json:16-19` 2 diretas; `docs/dependencies.md:15-18` tabela com coluna Audit; `:39-63` 25 transitivas. Conferi que as 29 entradas do `bun.lock` estao em `docs/dependencies.md`, cada versao presente. Amostra de 6 pacotes com `npm view <pkg>@<ver> license scripts --json`: satori 0.57.2 MPL-2.0 com `prepare: husky install`; @resvg/resvg-wasm 2.6.2 MPL-2.0 sem scripts; harfbuzzjs 0.10.0 MIT com `prepare: make`; fflate 0.7.3 MIT; css-color-keywords 1.0.0 ISC; typescript 5.9.3 Apache-2.0. Todos batem com a tabela | PASS |
| SEC-07 | Sem telemetria e sem rede em tempo de execucao | `tests/security-static.test.ts:72-75` varredura de `src/` retorna `[]`; `scripts/carousel.sh:35-38` `--network none --read-only --cap-drop ALL --security-opt no-new-privileges`; selftest executado, 5 de 5 ok | PASS (limites do teste estatico na secao Seguranca) |

### P2: Skill e documentacao

| ID | Resultado definido pela spec | Evidencia | Resultado |
| -- | ---------------------------- | --------- | --------- |
| DOC-01 | Fluxo: fatos com trechos literais, plano com aprovacao, slides.json, validar ate passar, gerar e entregar PDF com lista de fatos | `SKILL.md:23` etapa 1 (trecho literal), `:33` etapa 2 ("PARE e espere o usuario aprovar"), `:37` etapa 3, `:41` etapa 4 ("ate sair com codigo 0"), `:49` etapa 5, `:57` etapa 6 ("o PDF, os PNGs e a lista de fatos") | PASS |
| DOC-02 | Nunca publicar, nunca inventar numero | `SKILL.md:14` "Nunca publicar, enviar ou agendar nada em rede social"; `:15` "Nunca inventar um numero" | PASS |
| DOC-03 | Validar e gerar somente pelo script de container | `SKILL.md:16` "Validar e gerar somente com `scripts/carousel.sh`. Nunca rodar `bun src/cli.ts` direto no host"; comandos em `:44` e `:52` | PASS |
| DOC-04 | README.md e README.en.md com instalacao, exemplo completo, regras do validador e seguranca | `README.md:13,24,68,97` e `README.en.md:13,24,68,97` (mesmas 4 secoes nos dois, 142 e 141 linhas) | PASS |
| DOC-05 | Compara ao ContentHub e ao gerador auditado, dizendo o que cada um faz, sem afirmar o que nao foi verificado | `README.md:130-136` e `README.en.md:130-136`. Afirmacoes fora da lista verificada: ver secao Documentacao | GAP |

**Status**: 35 de 37 ACs com asserção que bate com a spec (5 deles com lacuna de precisao: VAL-02, VAL-06, VAL-07, VAL-12, mais o numero de fonte). 2 GAPs: RND-04 (PDF sem asserção) e DOC-05 (afirmacoes nao verificadas).

## Edge Cases

- [x] Arquivo de fatos vazio: `number-not-in-facts` para cada numero. `tests/validate.test.ts:453-458` `toEqual([[1,true],[2,true],[2,true]])`; `tests/cli.test.ts:93-94`.
- [x] Mesmo numero em dois slides: um achado por slide. `tests/validate.test.ts:462-463` `expect(f.map((x) => x.slide)).toEqual([1, 2])`.
- [x] Separadores comparados como escritos: `tests/validate.test.ts:438-441` ("2.500" nao e "2,5", nos dois sentidos).
- [x] Texto longo demais: reduz a fonte ate o minimo e falha com `text-overflow` indicando o slide. `tests/fit.test.ts:17-19` (cai um degrau), `:34-35` `rule toBe("text-overflow")`; `tests/cli-render.test.ts:111-114` `code 3` e `toContain("slide 2")`; `tests/render.test.ts:192-193`. Lacuna de precisao: a spec nao define "minimo do tema"; o codigo usa 50 por cento da fonte base (`src/render.ts:21`, escada `[1, 0.9, 0.8, 0.7, 0.6, 0.5]`). O caminho do hook nao tem teste de overflow (M42 sobreviveu).
- [x] `out/` ja existe: sobrescreve nomes iguais e nao apaga outros. `tests/cli-render.test.ts:138-139` `notes.txt` mantido, `01-hook.png` sobrescrito.

## Discrimination Sensor

Profundidade: execucao completa de fault injection manual (45 mutantes, mais que o minimo de 10 e o piso de 5 de caminho critico). Cada mutante numa cópia isolada (`scratchpad/.../w_Mxx`, sem `.git`), rodando `bun test` completo no container sem rede, 4 em paralelo, um mutante por vez em cada cópia. Linhas sao do arquivo original.

| # | file:line | Descricao | Resultado |
| - | --------- | --------- | --------- |
| M01 | `src/validate.ts:103` | limite de 40 palavras: `>` vira `>=` | MORTO (`too-many-words (VAL-05) > 40 words pass`) |
| M02 | `src/validate.ts:109` | limite de 3 linhas: `>` vira `>=` | MORTO (`hook-too-long (VAL-06) > 3 lines pass`) |
| M03 | `src/validate.ts:125` | limite de 80 caracteres de source: `>` vira `>=` | MORTO (`source-too-long (VAL-11) > 80 characters pass`) |
| M04 | `src/validate.ts:133` | FORBIDDEN sem U+2013 | MORTO (`en dash U+2013 is rejected ...`) |
| M05 | `src/validate.ts:133` | FORBIDDEN sem U+21D2 | MORTO (`double arrow U+21D2 is rejected ...`) |
| M06 | `src/validate.ts:133` | FORBIDDEN sem a sequencia hifen-maior | MORTO (`ascii arrow is rejected ...`, `Independent Test from the spec`) |
| M07 | `src/validate.ts:170` | numero ignora o campo `handle` | **SOBREVIVEU** |
| M08 | `src/validate.ts:170` | numero ignora o campo `author` | **SOBREVIVEU** |
| M09 | `src/validate.ts:234` | `facts-skipped` sai a cada slide (remove `skippedReported = true`) | MORTO (`facts-skipped (VAL-13) > ... one warning on the first slide`) |
| M10 | `src/validate.ts:254` | `parseAndValidate` devolve deck mesmo com erro | MORTO (`RND-01 ... a number outside the facts file stops the render` e outros 3) |
| M11 | `src/cli.ts:120` | remove a limpeza do PDF antigo | MORTO (`RND-08 ... a stale PDF from an earlier run is removed`) |
| M12 | `src/cli.ts:145` | codigo 3 vira 1 na falha de render | MORTO (`RND-08 ... text that cannot fit fails at the render step`) |
| M13 | `src/cli.ts:164` | PDF gravado direto, sem arquivo temporario | **SOBREVIVEU** |
| M14 | `src/layout/common.ts:80` | remove `boxSizing: "border-box"` do frame | MORTO (`nothing leaks into the margins ...`, 5 falhas) |
| M15 | `src/layout/common.ts:50` | remove `whiteSpace: "pre-wrap"` do textBlock | **SOBREVIVEU** |
| M16 | `src/fit.ts:73` | fit aceita tamanho que estoura (`boxHeight * 2`) | MORTO (`fitFontSize > newlines are respected`, `one extra character overflows`) |
| M17 | `src/pdf.ts:23` | remove a composicao do alfa sobre branco | MORTO (`buildPdf > alpha is composited over white`) |
| M18 | `src/pdf.ts:54` | offset da tabela xref deslocado em 1 | MORTO (`every xref entry points to the start of 'N 0 obj'`) |
| M19 | `src/validate.ts:116` | highlight aceita 3 palavras | MORTO (`highlight-invalid (VAL-07) > 3 words fail even when present`) |
| M20 | `src/theme.ts:61` | tema light usa o fundo do dark | MORTO (`light has a light background and dark text`, `contrast of light theme`) |
| M21 | `src/validate.ts:187` | 10 slides reprovam (`>` vira `>=`) | MORTO (`slide-count (VAL-09) > 10 slides pass`) |
| M22 | `src/validate.ts:118` | highlight ausente do texto nao reprova | MORTO (`a highlight that is not in the slide fails`) |
| M23 | `src/cli.ts:68` | arquivo ilegivel sai 1 em vez de 2 | MORTO (`unreadable files (VAL-03)`, `real execution`) |
| M24 | `src/render.ts:186` | remove o progresso `slide i/n` | MORTO (`RND-10 progress`, 3 falhas) |
| M25 | `src/schema.ts:22` | `ownProp` le propriedade herdada (`obj[key]`) | **SOBREVIVEU** (provavel equivalente: nenhum nome de campo do schema coincide com nome de `Object.prototype`; nao ha teste com campo herdado) |
| M26 | `src/cli.ts:161` | nome do PNG com 3 digitos | MORTO (`RND-02 and RND-03 outputs`, 4 falhas) |
| M27 | `src/layout/footer.ts:9` | rodape nunca desenhado | MORTO (37 falhas, incluindo `RND-04 source footer`) |
| M28 | `src/layout/common.ts:23` | highlight sem a cor de destaque | MORTO (`highlight becomes an accent span ...`, 6 falhas) |
| M29 | `src/validate.ts:216` | `structure` vira erro | MORTO (`warnings alone exit 0 ...`) |
| M30 | `src/validate.ts:165` | regex de numero sem o sufixo `%` | **SOBREVIVEU** |
| M31 | `src/validate.ts:83` | contagem de palavras so por espaco | MORTO (`extra spaces and edges do not add words`) |
| M32 | `src/validate.ts:240` | comparacao normaliza separadores | MORTO (`separators are compared exactly as written`) |
| M33 | `src/theme.ts:73` | `meta.theme` light ignorado | MORTO (`dark and light decks produce different images`) |
| M34 | `src/validate.ts:39` | accent invalido aceito | MORTO (`bad theme, accent and format are schema-invalid`) |
| M35 | `src/validate.ts:138` | `source` nao varrido por forbidden | MORTO (`ascii arrow is rejected in every text bearing field`, 5 falhas) |
| M36 | `src/validate.ts:246` | achados nao ordenados por slide | **SOBREVIVEU** (a spec nao exige ordem; ordem so esta no comentario do codigo) |
| M37 | `src/validate.ts:205` | slide de tipo desconhecido nao varrido por forbidden | MORTO (`a slide with an unknown type is still scanned`) |
| M38 | `src/validate.ts:21` | campo so com espacos aceito | MORTO (`a whitespace only string counts as missing`) |
| M39 | `src/validate.ts:124` | source conta unidades UTF-16 | MORTO (`80 emoji pass`) |
| M40 | `src/pdf.ts:75` | MediaBox com largura e altura trocadas | MORTO (`the portrait format ... matching page size`, `MediaBox matches width and height`) |
| M41 | `src/fit.ts:50` | quebra de linha do fit: `<=` vira `<` | MORTO (`text exactly at the line limit fits`) |
| M42 | `src/render.ts:71` | hook nunca passa pelo ajuste de texto | **SOBREVIVEU** |
| M43 | `src/validate.ts:200` | qualquer `type` string aceito | MORTO (`type-unknown`, 3 falhas) |
| M44 | `src/render.ts:171` | PNG com metade da largura | MORTO (`RND-02 PNG per slide with the exact format size`, 9 falhas) |
| M45 | `src/cli.ts:159` | render apaga outros arquivos de `out/` | MORTO (`edge cases > existing files with other names in out/ are kept`) |

**Resultado**: 45 injetados, 37 mortos, **8 sobreviveram** (M07, M08, M13, M15, M25, M30, M36, M42). Veredito do sensor: FAIL.

Leitura dos sobreviventes (viram tarefas de correcao):

- M07, M08: nenhum teste coloca numero em `handle` (cta) nem em `author` (quote). `tests/validate.test.ts:428-435` cobre hook, title, value, list e texto de quote, mas nao label, author, handle nem texto de cta. VAL-12 exige conferir "um numero dos slides".
- M30: `tests/validate.test.ts:423` ("30%" com fatos "30% overall") passa mesmo sem o `%` na regex, porque "30" e substring. O nome do teste ("matched with the unit") promete mais do que prova; so o `x` e discriminado (`:424`).
- M42: nenhum teste faz um hook estourar o ajuste. `text-overflow` do edge case so e provado para slide text (`tests/render.test.ts:181-193`).
- M15: nenhum teste prova que quebras de linha (`\n`) do hook sobrevivem ao render (commit 5230dcf diz "keep line breaks"). Nem a asserção de estilo nem pixel.
- M13: nenhum teste prova a gravacao do PDF via arquivo temporario; falha no meio da escrita do PDF nao e simulada.
- M25: provavel mutante equivalente. Anotado por transparencia.
- M36: ordem dos achados nao e requisito da spec.

## Adversarial sobre o validador

Executado na copia isolada, `bun src/cli.ts validate <arquivo> --facts <fatos minimos>` e `render`, container sem rede. Cerca de 70 entradas. Classificacao: FURO = viola a intencao do projeto (nenhum numero sem fonte, nenhum travessao ou seta) por um caminho barato; LACUNA DE PRECISAO = fora do que a spec define com exatidao.

### FUROS

| ID | Entrada | O que o validador fez | Por que e furo |
| -- | ------- | --------------------- | -------------- |
| F1 | Slide com "subiu 42% no ano" e fatos "subiu 142% no ano" | Saida 0, sem achados | `src/validate.ts:240` usa `facts.includes(num)`. "5" passa se qualquer "5" existir nos fatos ("2500", uma URL, uma data). O teste `tests/validate.test.ts:444-446` fixa isso de proposito ("a plain substring"). Esvazia a promessa "numero rastreavel". |
| F2 | "custou ４２ reais" (U+FF14 U+FF12) e digitos arabe-indicos | Saida 0, nenhum numero detectado | `NUMBER_RE` em `src/validate.ts:165` so tem `\d` ASCII. O leitor ve um numero; o validador nao. Bypass barato. |
| F3 | "caiu -3% no ano" com fatos "3%"; "faturou 5K" com fatos "5 mil" | Saida 0 | O sinal e os sufixos fora da regex (`K`, `B`, `mil`) sao descartados, e so os digitos sao comparados (junto com F1). "3.5B" vira "3.5" e "R$1.200" vira "1.200". |

### LACUNAS DE PRECISAO (spec nao define, nao e defeito de codigo)

| ID | Entrada | Resultado |
| -- | ------- | --------- |
| L1 | U+2012, U+2015, U+2212, U+FE58, U+FF0D, U+FE63, U+2E3A, U+2E3B (tracos) | Passam. A spec lista so U+2014 e U+2013. |
| L2 | U+27F6, U+2794, U+2B62, U+2190, U+2194, U+21D4, U+27A1 e `=>`, `<-` (setas) | Passam. A spec lista so U+2192, U+21D2 e a sequencia hifen seguido de sinal de maior. Dois hifens seguidos de sinal de maior sao barrados porque contem essa sequencia. |
| L3 | "custa 1 000" e "1" U+00A0 "000" e U+2009 | O numero e quebrado em "1" e "000" e cada parte e conferida por substring. Passa quando os fatos tem os dois pedaços. A spec nao fala de separador por espaco. |
| L4 | "trinta mil", "capitulo XLII", "cinquenta por cento" | Passam. Numero por extenso e romano estao fora da spec. |
| L5 | Numero so em `source` ("Fonte 2025 pagina 14, 87%") | Passa por desenho: VAL-12 exclui `source`. `SKILL.md:19` reconhece o buraco. |
| L6 | `handle` com numero e `author` com numero | Sao conferidos pelo codigo (`src/validate.ts:170`); a spec nao diz quais campos. Sem teste (M07 e M08). |
| L7 | Campos extras (`notes`, `extra`), chaves `__proto__` e `constructor` | Ignorados, nao desenhados, sem poluicao (rodei: saida 0, sem erro). Nenhum furo. O texto de campo extra com travessao e numero nao chega ao PNG. |
| L8 | 11 slides | `error slide 0 slide-count` correto. |
| L9 | Lista com item `"​"` (ZWSP) | `trim()` nao remove U+200B, item "vazio" passa. Spec diz "item em branco" sem definir. |
| L10 | 60 palavras unidas por U+200B | Conta 1 palavra, passa `too-many-words`; o render falha com `text-overflow` (codigo 3), entao nao gera PDF errado. |
| L11 | Caracteres de controle (U+0000, U+0007, U+001B) e U+202E em texto | Validador passa; render conclui saida 0 (4 arquivos). A spec nao define. |
| L12 | JSON com BOM | `schema-invalid: not valid JSON`. Usabilidade, spec nao define. |
| L13 | JSON de 6 MB (3 milhoes de palavras) e aninhamento de 100000 niveis | 329 ms com `too-many-words` correto; o aninhamento profundo devolveu achados sem travar. Sem negacao de servico observada. |
| L14 | Chave duplicada (`"text"` duas vezes) | Vale a ultima, semantica normal de `JSON.parse`; o numero do valor final e conferido. |
| L15 | Hook de 2 linhas em `\n` | Sai com 4 linhas no PNG (inspecao visual). `hook-too-long` conta so `\n`. |

## Seguranca e isolamento

- `scripts/carousel.sh selftest` executado: 5 de 5 "ok" (rede e DNS bloqueados, codigo somente leitura, caminhos da imagem nao graváveis, `/out` gravavel), saida 0.
- `scripts/carousel.sh:35-45` (SECURE): `--network none`, `--read-only`, `--cap-drop ALL`, `--security-opt no-new-privileges`, `--pids-limit 256`, `--memory 1g`, `--tmpfs /tmp:rw,noexec,nosuid`, `--user` do chamador. `:88` codigo montado `readonly`; `:94` fatos `readonly`; `:103` so `/out` gravavel. Cumpre SEC-07 e RND-07. Imagem fixada por digest (`:17`).
- `render` do exemplo e render com numero fora dos fatos executados pelo script: ver Success Criteria.
- Observacoes (nao bloqueiam): (a) o teste estatico `tests/security-static.test.ts` e uma lista de regex. Detecta 14 padroes (`tests/security-static.test.ts:22-37`; `:79-89` provam a deteccao de cada regra num arquivo temporario; `:97-102` provam que as amostras nao aparecem inteiras no proprio teste). Nao detecta `Bun.spawn`, `Bun.connect`, `Bun.serve`, `node:tls`, `node:http2`, `node:worker_threads`, `EventSource`, `navigator.sendBeacon` nem `globalThis["fe"+"tch"]`. Varre so `src/`, nao `scripts/`. A defesa real e o `--network none`. (b) `CAROUSEL_IMAGE` permite trocar a imagem por variavel de ambiente (`scripts/carousel.sh:17`). (c) O check "image paths outside /tmp and /out are not writable" passa para qualquer usuario nao-root (o proprio `scripts/selftest.ts:31-32` avisa).
- SEC-01 a SEC-03: verificados so por leitura e actionlint. O CI nunca rodou no GitHub. O SHA de cada action nao foi conferido contra a tag (sem acesso ao GitHub). A versao padrao do trivy dentro de trivy-action nao foi verificada.
- SEC-04: o campo `bun` de `package-ecosystem` e os agrupamentos nao foram validados contra a documentacao do GitHub nem por ferramenta.

## Documentacao

- DOC-01 a DOC-04: PASS (tabela acima). `SKILL.md:15` diz que todo numero deve estar nos fatos "escrito do mesmo jeito"; o validador faz substring (F1), entao a promessa do SKILL e mais forte que o comportamento.
- `grep -rnP "\x{2014}|\x{2013}|\x{2192}"` fora de `.specs`, `node_modules`, `.git` e `THIRD_PARTY_FONTS.md`: **zero ocorrencias** (inclui `tests/`, que usa escapes). `.specs/features/v1/tasks.md` contem 46 ocorrencias (pasta excluida pela regra do pedido; registro).
- DOC-05, seção Comparacao (`README.md:130-136`, identica em `README.en.md:130-136`). Frases que afirmam sobre terceiros alem da lista verificada (ContentHub: gate factual, carrossel de Instagram, sem pasta .github; threads-carousel-claude-skill: MIT, previa e exportacao no navegador; Slashgear/linkedin-carousel-gen: MIT, Satori e Bun):
  1. `README.md:134`: "(sem CI)" entre parenteses. A ausencia de pasta `.github` nao prova ausencia de CI (CI pode estar em outro servico). Inferencia.
  2. `README.md:135`: "previa em navegador (Next.js)". "Next.js" nao esta na lista verificada.
  3. `README.md:135`: "em formatos de varias redes". Nao esta na lista verificada.
  4. `README.md:135`: "Este projeto nasceu de uma auditoria de seguranca dele: as regras do validador e a ideia de rodar tudo em container vem desse trabalho." Afirma origem e conteudo de terceiros.
  5. `README.md:135`: "O codigo foi reescrito para este repositorio (so a expressao regular de numero e o formato da linha de achado coincidem)." Afirmacao sobre o codigo de terceiros, nao verificada neste relatorio (nao ha como conferir sem rede).
  6. `README.md:136`: "para gerar PDFs de carrossel do LinkedIn". A finalidade do projeto nao esta na lista verificada (o nome sugere, mas nao foi dado como verificado).
  7. `README.md:132`: "Fatos verificados em 2026-10-14" e uma declaracao de verificacao que este Verifier nao pode confirmar (sem rede).
  Nada disso e verificavel por mim. A spec exige "sem afirmar o que nao foi verificado", entao DOC-05 e GAP.

## Defeitos

| ID | Defeito | Evidencia | Gravidade |
| -- | ------- | --------- | --------- |
| D1 | `highlight` que aparece so no `author` de um quote e aceito pelo validador (`src/validate.ts:89` inclui `author` no haystack) mas nunca desenhado (`src/layout/quote.ts:13` destaca so `slide.text`). Executei: saida 0; o SVG tem 1 ocorrencia da cor de destaque (a barra), contra 2 quando o destaque esta no texto. | execucao no container | Menor (silencioso, viola VAL-07 e RND-05 juntos) |

## Success Criteria

- [x] Exemplo `examples/slides.json` com `examples/facts.md` pelo script de container: `scripts/carousel.sh validate` saida 0 sem linhas; `scripts/carousel.sh render` imprimiu `slide 1/6` a `slide 6/6`, saida 0, escreveu `01-hook.png` a `06-cta.png` (todos `PNG image data, 1080 x 1080, 8-bit/color RGBA`) e `carousel.pdf` com 6 paginas (6 objetos `/Type /Page`, 152744 bytes). Rodape de fonte presente nos slides de numero e de texto (inspecao visual).
- [x] `slides.json` com numero fora dos fatos nunca gera PDF: troquei "42%" por "43%", `render` imprimiu `error slide 2 number-not-in-facts: ... "43%" ...`, saida 1, diretorio de saida vazio.
- [ ] NAO VERIFICADO: "o primeiro push publico ja tem CI verde e Dependabot ativo". O CI nunca rodou no GitHub e nao ha repositorio remoto.
- [x] Nenhuma dependencia direta alem das auditadas: 2 diretas em `package.json:16-19`; 29 entradas no `bun.lock`, todas em `docs/dependencies.md`.
- [ ] NAO VERIFICADO: "num Claude Code limpo, pedir o carrossel e receber o PDF" (teste independente da story de skill). Exige sessao limpa do Claude Code.
- Divergencia spec x design: o primeiro Success Criterion cita "o carrossel do post da Anthropic". O `design.md` decidiu usar um exemplo ficticio. O criterio da spec, como escrito, nao foi executado.

## Inspecao visual

Abri 4 PNGs do exemplo (dark, quadrado: `01-hook`, `02-number`, `03-text`, `04-list`) e 3 de um deck temporario fora do repositorio (light, retrato 1080x1350: `02-number`, `03-text` com texto de 40 palavras no limite, `05-quote`).

- Sem texto cortado, sem sobreposicao, margens respeitadas, contador "i/6" no canto inferior direito, rodape "Fonte: ..." no canto inferior esquerdo nos slides com source e ausente nos demais.
- Contraste bom nos dois temas. Destaque: amarelo no dark, laranja escuro no light, legivel.
- Hook `E se a reuniao\nsemanal...` (2 linhas informadas) sai em 4 linhas no PNG ("E se a reuniao / semanal / fosse so um / texto?"). Esta dentro da area, mas excede as "3 linhas" do ponto de vista do leitor (lacuna L15, ja conhecida em README e SKILL).
- Cosmeticos: o contador "i/6" e o rodape (24 px) sao pequenos e de baixo contraste em 1080 px; o slide de citacao no retrato deixa muito espaco vazio. Nenhum defeito bloqueante.

## Code Quality (verificacao pontual)

| Principio | Status |
| --------- | ------ |
| Minimo de codigo, sem escopo extra | OK nos arquivos lidos (src/validate.ts, schema.ts, cli.ts, render.ts, pdf.ts, fit.ts, theme.ts, layout/*). |
| Spec-anchored (valor afirmado bate com a spec) | Com os GAPs e FUROS acima. |
| Todo teste mapeia a requisito ou edge case | OK; ha testes de robustez extras (ownProp, fonts) justificaveis. |
| Diretrizes documentadas do projeto | nenhuma encontrada ("strong defaults applied", como em `tasks.md`). |

## Requirement Traceability Update (sugerido; este Verifier nao altera spec.md)

| Requisito | Status atual | Novo status sugerido |
| --------- | ------------ | -------------------- |
| VAL-01 a VAL-11, VAL-13, VAL-14 | Implementing | Verificado |
| VAL-12 | Implementing | Precisa de correcao (F1, F2, F3; M07, M08, M30) |
| RND-01 a RND-03, RND-05 a RND-11 | Implementing | Verificado (RND-08 e RND-05 com ressalva) |
| RND-04 | Implementing | Precisa de correcao (PDF sem asserção) |
| SEC-01 a SEC-03 | In Tasks | Verificado so por leitura e actionlint; nao verificado no GitHub |
| SEC-04 a SEC-07 | Implementing / In Tasks | Verificado |
| DOC-01 a DOC-04 | In Tasks | Verificado |
| DOC-05 | In Tasks | Precisa de correcao |

## Plano de correcao (nao executado)

1. F1: comparar numeros por token (limites de digito e separador), nao por substring; trocar o teste `tests/validate.test.ts:444-446`. Prioridade: Bloqueador.
2. F2 e F3: normalizar digitos de largura total e passar a conferir sinal e sufixos (`K`, `B`, `mil`) no mesmo criterio da spec; esclarecer a spec. Prioridade: Maior.
3. DOC-05: reduzir a comparacao do README a lista verificada (ou verificar e citar a fonte de cada frase). Prioridade: Maior.
4. Testes novos para matar M07, M08 (numero em handle, author, label, texto de cta), M30 (so `%` sem sufixo nos fatos), M42 (hook estourando), M15 (quebra de linha no render), RND-04 no PDF; M13 e M36 opcionais; M25 provavel equivalente. Prioridade: Maior.
5. D1: ou desenhar o destaque no `author`, ou tirar `author` do haystack de `highlight`. Prioridade: Menor.
6. Spec: definir se "aparece" e substring ou token; formato do caminho em `schema-invalid`; definicao de "linha" do hook; "minimo do tema". Prioridade: Menor.
7. Atualizar `tasks.md` (T29, T32 a T37) e a tabela de rastreabilidade do `spec.md`. Prioridade: Cosmetico.

## O que NAO foi verificado

- Execucao do CI no GitHub (SEC-01 a SEC-03), correspondencia dos SHAs com as tags, validade do `dependabot.yml` no GitHub.
- O criterio "num Claude Code limpo, pedir o carrossel e receber o PDF" e o criterio "primeiro push publico com CI verde".
- Todas as afirmacoes do README sobre ContentHub, threads-carousel-claude-skill e Slashgear (sem rede e fora do escopo de verificacao).
- Fidelidade do texto OFL em `THIRD_PARTY_FONTS.md` ao original.
- Reproducibilidade entre maquinas ou arquiteturas diferentes (RND-09 provado so em duas execucoes na mesma maquina e imagem).
- Selecao e copia de texto do PDF (a spec nao exige; e limitacao documentada).
- Comportamento em Windows, macOS e Docker rootless.

## Summary

**Overall**: Not Ready (FAIL)

**Spec-anchored check**: 35/37 ACs com asserção que bate com a spec; 2 GAPs (RND-04, DOC-05); 5 lacunas de precisao da spec (VAL-02, VAL-06, VAL-07, VAL-12, edge case do minimo do tema).
**Sensor**: 37/45 mutantes mortos, 8 sobreviveram.
**Gate**: 309 passed, 0 failed; `tsc --noEmit` limpo.
**Adversarial**: 3 furos (F1 a F3), 15 lacunas de precisao.

**O que funciona**: validador com os limites exatos da spec e bem coberto nos pontos de borda (40, 41, 3, 4, 80, 81, 2, 3, 10, 11); isolamento do container comprovado por selftest; render deterministico e sem PDF em falha; inspecao visual sem defeito bloqueante; dependencias todas listadas e batendo com o npm na amostra.

**Issues**: ver "Por que FAIL" e "Plano de correcao".
