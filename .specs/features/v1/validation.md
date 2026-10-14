## Validation: sourced-carousel v1 - FAIL

**Verdict: FAIL**

# sourced-carousel v1 Validation (rodada 2)

**Data**: 2026-10-14
**Spec**: `.specs/features/v1/spec.md` (38 requisitos)
**Intervalo de commits**: `git log --oneline a116298..HEAD` lista 46 commits (51d09e2 ... 9c13b67). HEAD = `9c13b6737b269a575447d258372c438b3cc81d95` (9c13b67), branch main, arvore limpa antes e depois (`git status --short` vazio).
**Verifier**: subagente independente, rodada 2 (nao escreveu o codigo nem participou da rodada 1). Nenhum arquivo do repositorio foi alterado, exceto este relatorio. Tudo que executa codigo do projeto rodou em container `oven/bun:1` com `--network none`, sem montar a home, sobre copias em `/tmp/.../scratchpad`. A unica excecao foi `scripts/carousel.sh` (selftest, validate, render), que monta o repositorio somente leitura e grava so em pastas do scratchpad. As chamadas `gh api` e `npm view` foram somente leitura.

## Por que FAIL

1. FURO comprovado por execucao: o validador aceita um numero com unidade que e prefixo de outra unidade nos fatos. `10 mi` (milhoes) passa contra fatos com `10 mil`; `4 mil` passa contra `4 milhões`; `5 k` passa contra `5 kg`. Erro de 1000 vezes sem reprovar. Causa: `src/validate.ts:259` (`factsContain`) nao exige fim de palavra depois de uma unidade que faz parte do token.
2. FURO: o sinal do lado dos fatos nao e comparado. `5%` nos slides passa contra fatos com `-5%` (sinal trocado).
3. FURO: unidades fora da lista fechada, espaco como separador de milhar (`1 000 000` passa contra fatos com `1 000`), notacao `1e3` e digitos colados a letras (`Q4`, `H2`, `ISO27001`, `10h45`) nao sao conferidos, e nenhum README nem o SKILL.md avisa disso.
4. Falso positivo: versao `v3.0` ou `v2.1.3` que ESTA nos fatos e reprovada (`number-not-in-facts: "0"`, `"1.3"`).
5. Sensor: 21 de 78 mutantes sobreviveram, 19 deles alem dos dois esperados; varios em comportamento exigido pela spec (VAL-08 bloco U+2900 a U+297F, sinal `+`, U+2212, VAL-15 em outros alfabetos, fatores de ajuste de texto).
6. DOC-05: os dois READMEs afirmam sobre o threads-carousel-claude-skill coisas fora da lista verificada.

Tudo isso e defeito real, entao FAIL, sem adaptar o veredito ao `validate_state.py`.

## Gate

- `bunx tsc --noEmit` no container sem rede: saida 0, sem erros.
- `bun test` no container sem rede: **366 passed, 0 failed**, 4148 expect(), 19 arquivos, 13,73 s. Sem testes pulados. (Rodada 1: 309. Contagem subiu, nenhum teste removido.)
- `scripts/carousel.sh selftest`: 5 de 5 `ok`, saida 0.
- actionlint (`rhysd/actionlint:latest`, `--network none`) sobre `.github/workflows/ci.yml`: saida 0, sem achados.

## Spec-Anchored Acceptance Criteria (38 requisitos)

Legenda: PASS, PASS+LP (passa, com lacuna de precisao da spec), GAP (evidencia parcial ou fraca). Linhas conferidas com `grep -n` e `sed -n`.

| ID | Spec define | Evidencia (`arquivo:linha` + asserção) | Resultado |
| -- | ----------- | -------------------------------------- | --------- |
| VAL-01 | linha `<severity> slide <N> <rule-id>: <message>`, sai 0 so sem erros | `tests/cli.test.ts:56` `toEqual({ code: 0, lines: [] })`; `:63` `toMatch(/^error slide 2 forbidden-char: .+/)` e `:61` `code` 1; `:68` e `:70` aviso nao muda o codigo | PASS |
| VAL-02 | `schema-invalid` com caminho do campo, sai 1 | `tests/schema.test.ts:26` `toMatchObject({ severity: "error", slide: 0, rule: "schema-invalid" })` e `:27` `toContain("$")`; `:45` `toContain("slides")`; `tests/cli.test.ts:101-102` code 1 | PASS |
| VAL-03 | arquivo ilegivel: sai 2 e imprime o caminho | `tests/cli.test.ts:110-111` `toBe(2)` e `toContain(p)`; `:117-118` para facts; `:122` diretorio | PASS |
| VAL-04 | `field-missing` com o nome do campo | `tests/validate.test.ts:48-53` (11 casos) `toContain(\`"${field}"\`)` | PASS |
| VAL-05 | text com mais de 40 palavras: `too-many-words` | `tests/validate.test.ts:232` 40 passam, `:236-238` 41 falham no slide 2 | PASS |
| VAL-06 | hook com mais de 3 linhas: `hook-too-long` | `tests/validate.test.ts:258` 3 passam, `:262-264` 4 falham no slide 1, `:268`, `:272-273` CRLF | PASS |
| VAL-07 | highlight com mais de 2 palavras ou fora dos campos desenhados; autor e handle invalidos | `tests/validate-hardening.test.ts:154` `toEqual(["highlight-invalid"])` (autor); `:158` (handle); `:162-164` aceitos no texto, label e item; `tests/validate.test.ts:288-290` 3 palavras. Mutantes M08, M09, M10 mortos | PASS |
| VAL-08 | lista de tracos e blocos de setas, as sequencias hifen+maior-que, `=>`, `<-`; hifen e U+2212 permitidos | `tests/validate-hardening.test.ts:132` `toContain("forbidden-char")` (10 amostras: U+2012, U+2015, U+FE58, U+FF0D, U+2794, U+27F6, U+2B62, U+2190, `=>`, `<-`); `:139` `toEqual([])` para hifen e U+2212; `tests/validate.test.ts:353-358` U+2013, U+2014, U+2192, U+21D2 e hifen+maior-que. Nao ha amostra dos blocos U+2900 a U+297F, U+27F0 so por U+27F6 | PASS+LP, mutante M14 sobreviveu (bloco sem teste) |
| VAL-09 | menos de 3 ou mais de 10: `slide-count` | `tests/validate.test.ts:139-142` (2), `:145` (3), `:149` (10), `:153` (11), `:157-158` (0, 1) | PASS |
| VAL-10 | aviso `structure`, codigo inalterado | `tests/validate.test.ts:164-176`; `tests/cli.test.ts:68-71` `code 0` com dois `warning ... structure` | PASS |
| VAL-11 | source com mais de 80 caracteres | `tests/validate.test.ts:320` 80 passam, `:324-326` 81 falham, `:330` 80 emoji passam, `:336` 81 falham | PASS |
| VAL-12 | numero inteiro (sem substring), sinal, unidade, NFKC, comparado como escrito | `tests/validate-hardening.test.ts:23` `142%`; `:27-28` `130.000`; `:33-34` `1.5`; `:39-40`; `:45-46`; `:50-51` `-3%` vs `3%`; `:55`; `:59-62` `5K`; `:67-68`; `:72-74` largura total; `:78-83` NBSP. Falhas de execucao em 4.b | GAP: passa nos casos listados, mas ver FURO 1, 2 e 3 (prefixo de unidade nos fatos, sinal nos fatos, unidades fora da lista). Mutantes M17, M19, M25, M26 sobreviveram |
| VAL-13 | sem `--facts`: aviso `facts-skipped` uma vez, sem falhar | `tests/validate.test.ts:478-481` `toHaveLength(1)`, `toMatchObject({ severity: "warning", slide: 2 })`; `tests/cli.test.ts:76-78` | PASS |
| VAL-14 | ler a entrada sem executar codigo | `tests/schema.test.ts:66-70` `polluted` undefined; `:75-76`; `:85-86`; `tests/security-static.test.ts:83-86` `scan(src)` `toEqual([])` (heuristica de 25 padroes). Reexecutado em 4.d com `__proto__` e `constructor` | PASS (a guarda estatica e heuristica, dito no README) |
| VAL-15 | digito decimal fora de 0 a 9 apos NFKC: `non-ascii-digit` | `tests/validate-hardening.test.ts:110` `toContain("non-ascii-digit")` (U+0664 U+0662); `:114` `not.toContain` para ASCII e largura total. So um alfabeto testado: mutante M18 sobreviveu | PASS+LP (cobre so arabe-indicos; spec diz "um texto", mas o codigo checa so os campos de numero, `source` e `highlight` ficam fora) |
| RND-01 | valida primeiro e aborta com o codigo do validador | `tests/cli-render.test.ts:36` `code` 1, `:37` `error slide 3 forbidden-char`, `:38` `readdir(out)` rejeita; `:49-51` fatos | PASS |
| RND-02 | `NN-<type>.png` de 01, tamanho exato | `tests/cli-render.test.ts:63-71` `toEqual([ "01-hook.png", ... "carousel.pdf" ])`; `tests/render.test.ts:65` `pngSize ... toEqual({ width: 1080, height: 1080 })`, `:73` 1080x1350; `tests/e2e.test.ts:46-48` | PASS |
| RND-03 | `out/carousel.pdf` com uma pagina por slide | `tests/cli-render.test.ts:74` `/\/Type \/Page(?![s])/g` `toBe(6)`; `tests/e2e.test.ts:49-50` | PASS |
| RND-04 | desenhar o rodape no PNG e no PDF | `tests/render.test.ts:157-158` PNG com source `equals(...)` `toBe(false)`; `tests/cli-render.test.ts:170-171` `pdfA.equals(pdfB)).toBe(false)`; `tests/layout-footer.test.ts:16-19` texto exato no no. Mutante X2 (rodape nunca desenhado) morto | PASS+LP (a prova de pixel e "a imagem muda", nao "o texto aparece"; spec nao define a forma de prova) |
| RND-05 | trecho na cor de destaque | `tests/layout-hook.test.ts:30-38` e `tests/layout-helpers.test.ts:119-133` span com `ctx.tokens.accent`. Mutante X3 morto | PASS+LP (prova no no do layout, nao em pixel) |
| RND-06 | texto de entrada nunca vira elemento | `tests/render.test.ts:131-150` `not.toContain("<script")`, `<img`, `<foreignObject`, `onerror`; `tests/layout-footer.test.ts:26` | PASS |
| RND-07 | conclui em container `--network none`, so fontes do repo | `scripts/selftest.ts:21-40` (5 checks); execucao: `scripts/carousel.sh selftest` 5/5 `ok`; `scripts/carousel.sh:35-37` flags; render do exemplo no container: saida 0 | PASS (por execucao; nao ha teste bun para isso) |
| RND-08 | falha: codigo diferente de zero, nomeia a etapa, sem PDF | `tests/cli-render.test.ts:96-100` PDF antigo removido, `:109-113` `code 3`, `error: render failed:`, `slide 2`, `:123-125` `error: write failed:`, `:180-183` `toBe("error: pdf failed: boom")`, `:195-196`. Mutantes C03, C04 mortos; C05 sobreviveu (limpeza apos falha de escrita, praticamente equivalente) | PASS |
| RND-09 | PNGs identicos byte a byte e PDFs de mesmo numero e tamanho de paginas | `tests/e2e.test.ts:67-69` `equals(...)` `toBe(true)` para todo arquivo, PDF incluido; `tests/render.test.ts:88` | PASS |
| RND-10 | `slide <i>/<n>` por slide | `tests/cli-render.test.ts:86` `toEqual(["slide 1/6", ... "slide 6/6"])`; `tests/render.test.ts:201` | PASS |
| RND-11 | light: fundo claro e texto escuro; dark o inverso | `tests/render.test.ts:99` `bandIsBackground(...)` `toBe(true)` para cada tema; `tests/theme.test.ts:27-37` tokens; `tests/e2e.test.ts:82` | PASS+LP (cor do texto so no token, nao em pixel) |
| SEC-01 | ordem: instalacao congelada sem scripts, typecheck, testes, exemplo sem rede, trivy | `.github/workflows/ci.yml:30` `bun install --frozen-lockfile --ignore-scripts`, `:33` tsc, `:36` bun test, `:39` render do exemplo, `:52` selftest, `:55-61` trivy | PASS por leitura e actionlint (o CI NUNCA rodou no GitHub) |
| SEC-02 | trivy HIGH ou CRITICAL falha | `ci.yml:60-61` `severity: HIGH,CRITICAL`, `exit-code: "1"` | PASS por leitura (nunca rodou no GitHub) |
| SEC-03 | actions por SHA completo com a tag em comentario, `permissions: contents: read` | `ci.yml:8-9`, `:20` `3d3c42e5...` `# v7.0.1`, `:25` `0c5077e5...` `# v2.2.0`, `:55` `ed142fd0...` `# v0.36.0`. `gh api repos/<dono>/<repo>/git/ref/tags/<tag>`: checkout v7.0.1 e setup-bun v2.2.0 sao `commit` e batem; trivy-action v0.36.0 e tag anotada `a9c7b0f0...`, desreferenciada para o commit `ed142fd0673e97e23eac54620cfb913e5ce36c25`, bate | PASS por leitura e `gh api` (nunca rodou no GitHub) |
| SEC-04 | dependabot `bun` e `github-actions`, semanal, minor e patch agrupados | `.github/dependabot.yml:3`, `:6`, `:16-18`; `:20`, `:23`, `:33-35` | PASS |
| SEC-05 | SECURITY.md, LICENSE MIT, THIRD_PARTY_FONTS.md com texto da licenca | arquivos existem; `SECURITY.md` explica como reportar; `LICENSE` linha 1 `MIT License`; `THIRD_PARTY_FONTS.md` traz o texto OFL 1.1 | PASS |
| SEC-06 | no maximo 4 diretas, `docs/dependencies.md` lista todas com versao, licenca e scripts, audita as diretas | `docs/dependencies.md` secao 1 (2 diretas), 3 (25 transitivas), 4 (trivy). Amostra de 7 com `npm view <pkg>@<versao> license scripts --json`: satori 0.57.2 MPL-2.0 `prepare`; resvg-wasm 2.6.2 MPL-2.0; harfbuzzjs 0.10.0 MIT `prepare`; pako 0.2.9 MIT sem scripts; css-color-keywords 1.0.0 ISC; typescript 5.9.3 Apache-2.0; fflate 0.7.3 MIT. Todas batem com a tabela | PASS |
| SEC-07 | sem telemetria nem rede em execucao | `scripts/selftest.ts:21-29` fetch bloqueado; `tests/security-static.test.ts:20-45` (25 padroes, ampliados) | PASS |
| DOC-01 | SKILL.md descreve o fluxo | `SKILL.md` secoes 1 a 6 (fatos literais, plano com aprovacao, slides.json, validar, gerar, entregar com lista de fatos) | PASS |
| DOC-02 | nunca publicar, nunca inventar numero | `SKILL.md:12` regra 1 e `:13` regra 2 | PASS |
| DOC-03 | validar e gerar so pelo script de container | `SKILL.md:16` regra 3, comandos nas linhas 44 e 52 | PASS |
| DOC-04 | README pt e en com instalacao, exemplo, regras e seguranca | `README.md` e `README.en.md` (secoes Installation `:13`, Full example `:24`, Validator rules `:68`, Security `:98`); regras novas (`non-ascii-digit`, sinal e unidade, mais tracos e setas) descritas nos dois | PASS |
| DOC-05 | comparar com ContentHub e o gerador auditado sem afirmar o que nao foi verificado | `README.md` secao Comparacao. ContentHub, threads-carousel e Slashgear batem com a lista verificada (ver abaixo), mas o item do threads-carousel acrescenta afirmacoes fora da lista | GAP: afirmacao alem da lista |

**Status**: 31 PASS, 5 PASS+LP, 2 GAP (VAL-12, DOC-05). Spec-anchored: 36 de 38 ACs com o resultado definido pela spec e evidencia; os 2 GAP sao defeitos.

### Lacunas de precisao da spec

- VAL-12 nao diz se o sinal do lado dos fatos entra na comparacao, nem se a unidade pode ter um espaco antes (`5 K`), nem trata digitos colados a letras (`Q4`, `COVID19`), nem diz o que fazer com unidade fora da lista fechada. O codigo adiciona `×` (U+00D7) e aceita um espaco (`\s?`) sem a spec dizer.
- VAL-12 define "inteiro" so por digitos e decimais; nao cobre "unidade que e prefixo de outra" (causa do FURO 1).
- VAL-15 diz "um texto" mas o codigo so olha os campos de numero (fora `source` e `highlight`).
- RND-04 e RND-05 nao dizem se a prova e em pixel ou em no do layout.
- VAL-08 lista blocos de setas, mas o teste so amostra alguns.

## Achados da rodada 1: foram corrigidos?

Cada cenario foi reexecutado com `bun src/cli.ts validate` no container (arquivos em `/tmp/.../scratchpad/r1`, fora do repositorio).

| Achado | Comando e saida | Estado |
| ------ | --------------- | ------ |
| F1 `42%` vs `142%` | `validate f1.json --facts f1.facts` (`Caiu 42%`, fatos `A alta foi de 142%`): `error slide 2 number-not-in-facts: ... "42%" ...`, saida 1 | CORRIGIDO |
| F2 largura total e arabe-indicos | `４２` com fatos `foram 42`: saida 0 (normalizado, correto). `٤٢`: `error slide 2 non-ascii-digit: ...`, saida 1; `٤٢ e 42`: mesma saida | CORRIGIDO |
| F3 sinal e sufixos | `-3%` vs `subiu 3%`: erro; `5K` vs `foram 5 mil`: erro; `5 mil` vs `foram 5`: erro; `+7` vs `foram 7`: erro | CORRIGIDO para o que a rodada 1 mostrou; ver FUROS novos (sinal nos fatos, prefixo de unidade) |
| D1 destaque so no autor ou handle | `quote` com `highlight: "Maria"` so no `author`: `error ... highlight-invalid`; `cta` com `@maria` so no handle: `error ... highlight-invalid`, saida 1 | CORRIGIDO |
| DOC-05 "(sem CI)" | `grep -rn "sem CI\|without CI" README* SKILL.md docs`: vazio. Texto atual: "Nao encontramos uma pasta `.github` no repositorio". `gh api repos/thallisribeiro/contenthub/contents/.github`: 404, confere | CORRIGIDO (mas ver afirmacoes extras em DOC-05) |
| RND-04 rodape no PDF | `tests/cli-render.test.ts:157-171` agora compara PDFs com e sem source (`toBe(false)`); mutante X2 morto | CORRIGIDO (prova fraca, "o PDF muda") |
| Mutantes M07 handle, M08 author | meus M09 e M08 (HIGHLIGHT_FIELDS) mortos | CORRIGIDO |
| M13 PDF sem arquivo temporario | meu C07 sobreviveu | ESPERADO (nao observavel) |
| M15 pre-wrap | meu L02 morto | CORRIGIDO |
| M25 ownProp | meu S02 sobreviveu | ESPERADO (equivalente) |
| M30 `%` | meu M21 morto | CORRIGIDO |
| M36 ordenacao | meu M30 morto | CORRIGIDO |
| M42 hook sem ajuste | meu X1 morto (`tests/render.test.ts:206`) | CORRIGIDO |
| Lacuna: tracos e setas nao listados | U+2012, U+2015, U+FE58, U+FF0D, U+2794, U+27F6, U+2B62, `=>`, `<-` todos `forbidden-char`, saida 1 | CORRIGIDO |
| Lacuna: NBSP dentro de numero | `1 000` vs fatos `foram 1000`: erros `"1"` e `"000"` (nao passa); vs `foram 1 000`: passa | CORRIGIDO |
| Lacuna: item de lista so com U+200B | `field-missing ... "items" must be non-empty strings`, saida 1 | CORRIGIDO |
| Lacuna: BOM no JSON | arquivo com U+FEFF no inicio: saida 0 | CORRIGIDO (mutante S01 morto) |
| Lacuna: teste estatico e heuristica | README `Limitacoes conhecidas` e `README.en.md:125` dizem isso; lista de padroes passou de 18 para 25 (`tests/security-static.test.ts:20-45`) | CORRIGIDO |

**Rodada 1: 17 de 17 itens verificaveis corrigidos (2 sobreviventes esperados).** Mas a correcao de F3 abriu a classe de FUROS novos abaixo, e 19 mutantes novos sobrevivem.

## Sensor de discriminacao

Copias isoladas em `/tmp/.../scratchpad` (`pristine`, `w1` a `w4`), sem `.git`; repositorio real intocado (`git status --short` vazio antes e depois). Um mutante por vez, `bun test` no container sem rede (com a copia mutada montada). MORTO se algum teste falha. Os numeros das linhas sao do arquivo original.

**78 mutantes, 57 mortos, 21 sobreviveram.** (2 esperados: C07, S02. 19 outros sao achados.)

| ID | Arquivo:linha | Descricao | Resultado |
| -- | ------------- | --------- | --------- |
| M01 | `src/validate.ts:79` | MAX_TEXT_WORDS 40 para 41 | MORTO (`too-many-words (VAL-05) 41 words fail`) |
| M02 | `src/validate.ts:121` | `words > MAX` para `>=` | MORTO (`40 words pass`) |
| M03 | `src/validate.ts:80` | MAX_HOOK_LINES 3 para 4 | MORTO (`hook-too-long 4 lines fail`) |
| M04 | `src/validate.ts:127` | `lines > MAX` para `>=` | MORTO (`3 lines pass`) |
| M05 | `src/validate.ts:82` | MAX_SOURCE_CHARS 80 para 81 | MORTO (`81 characters fail`) |
| M06 | `src/validate.ts:143` | `chars > MAX` para `>=` | MORTO (`source-too-long`) |
| M07 | `src/validate.ts:134` | limite do highlight de 2 para 3 palavras | MORTO (`highlight-invalid (VAL-07)`) |
| M08 | `src/validate.ts:99` | highlight de quote tambem procura em author | MORTO (`VAL-07 ... quote author`) |
| M09 | `src/validate.ts:100` | highlight de cta tambem procura em handle | MORTO (`VAL-07 ... cta handle`) |
| M10 | `src/validate.ts:109` | highlight nao procurado nos itens da lista | MORTO (`VAL-07 ...`) |
| M11 | `src/validate.ts:155` | FORBIDDEN sem U+2015 | MORTO (`VAL-08 dashes and arrows`) |
| M12 | `src/validate.ts:160` | FORBIDDEN sem a sequencia hifen e maior-que | MORTO (`Independent Test`) |
| M13 | `src/validate.ts:166` | ARROW_CHARS sem U+2B60 a U+2BAF | MORTO (`VAL-08 dashes and arrows`) |
| M14 | `src/validate.ts:166` | ARROW_CHARS sem U+2900 a U+297F | **SOBREVIVEU** (bloco de setas da spec sem teste) |
| M15 | `src/validate.ts:21` | INVISIBLE sem U+2060 | **SOBREVIVEU** (U+2060 sem teste) |
| M16 | `src/validate.ts:223` | normalizeText sem NFKC | MORTO (`VAL-12 ... full-width`) |
| M17 | `src/validate.ts:224` | normalizeText sem U+2212 para hifen | **SOBREVIVEU** (sinal de menos Unicode sem teste) |
| M18 | `src/validate.ts:229` | FOREIGN_DIGIT so arabe-indicos | **SOBREVIVEU** (so um alfabeto testado) |
| M19 | `src/validate.ts:218` | NUMBER_RE sem o sinal `+` | **SOBREVIVEU** (sem teste de `+5%`) |
| M20 | `src/validate.ts:218` | NUMBER_RE sem o lookbehind de letra ou digito | MORTO (`VAL-12 ...`) |
| M21 | `src/validate.ts:211` | UNIT sem `%` | MORTO (`VAL-12 ...`) |
| M22 | `src/validate.ts:211` | UNIT sem a fronteira final | MORTO (`VAL-12 ... 5 minutos`) |
| M23 | `src/validate.ts:259` | lookbehind de `factsContain` sem a parte decimal | MORTO (`VAL-12 ...`) |
| M24 | `src/validate.ts:259` | lookahead de `factsContain` sem a unidade | MORTO (`VAL-12 ...`) |
| M25 | `src/validate.ts:259` | lookahead de `factsContain` sem a parte decimal depois | **SOBREVIVEU** (`5` contra fatos `5,5` sem teste) |
| M26 | `src/validate.ts:225` | normalizeText mantem caracteres de largura zero | **SOBREVIVEU** (sem teste de U+200B dentro de numero) |
| M27 | `src/validate.ts:24` | isBlank so com `trim()` | MORTO (`blank detection`) |
| M28 | `src/validate.ts:234` | numberFields sem `handle` | MORTO (`VAL-12 every visible field`) |
| M29 | `src/validate.ts:319` | `facts-skipped` repetido | MORTO (`facts-skipped (VAL-13)`) |
| M30 | `src/validate.ts:332` | achados sem ordenar por slide | MORTO (`findings come back ordered`) |
| M31 | `src/validate.ts:6` | MIN_SLIDES 3 para 2 | MORTO (`slide-count`) |
| M32 | `src/validate.ts:7` | MAX_SLIDES 10 para 11 | MORTO (`slide-count`) |
| M33 | `src/validate.ts:298` | aviso `structure` vira erro | MORTO (`structure warning`) |
| M34 | `src/validate.ts:8` | MAX_LIST_ITEMS 6 para 7 | MORTO (`field-missing`) |
| M35 | `src/validate.ts:171` | allTexts sem `source` | MORTO (`forbidden-char ... source`) |
| M36 | `src/validate.ts:312` | regra `non-ascii-digit` desligada | MORTO (`VAL-12 non ASCII digits`) |
| M37 | `src/validate.ts:287` | slide de tipo desconhecido sem varredura de proibidos | MORTO (`a slide with an unknown type is still scanned`) |
| M38 | `src/validate.ts:126` | quebra final do hook contada | MORTO (`a trailing line break does not count`) |
| M39 | `src/validate.ts:86` | palavras separadas so por espaco simples | MORTO (`words are separated by any whitespace`) |
| M40 | `src/validate.ts:142` | source contado em unidades UTF-16 | MORTO (`80 emoji pass`) |
| X4 | `src/validate.ts:234` | campo `value` fora da conferencia de numeros | MORTO (`RND-01 ... a number outside the facts file`) |
| S01 | `src/schema.ts:39` | BOM nao removido | MORTO (`schema: a JSON byte order mark`) |
| S02 | `src/schema.ts:22` | `ownProp` le nomes herdados (M25 da rodada 1) | SOBREVIVEU, ESPERADO (equivalente, `Object.hasOwn` sobre JSON.parse) |
| C01 | `src/cli.ts:79` | codigo de saida do validate com erro de 1 para 2 | MORTO (`runValidate (VAL-01)`) |
| C02 | `src/cli.ts:68` | arquivo ilegivel sai 1 em vez de 2 | MORTO (`unreadable files (VAL-03)`) |
| C03 | `src/cli.ts:162` | falha do pdf sai 1 em vez de 3 | MORTO (`RND-08 injected step failures`) |
| C04 | `src/cli.ts:129` | PDF antigo nao removido | MORTO (`stale PDF ... removed`) |
| C05 | `src/cli.ts:178` | limpeza do PDF apos falha de escrita removida | SOBREVIVEU (praticamente equivalente: o PDF so existe depois do rename, ultimo passo) |
| C06 | `src/cli.ts:170` | indice do PNG com 3 digitos | MORTO (`RND-02 and RND-03 outputs`) |
| C07 | `src/cli.ts:173` | PDF gravado sem arquivo temporario (M13 da rodada 1) | SOBREVIVEU, ESPERADO (nao observavel) |
| C08 | `src/cli.ts:120` | uso errado do render sai 1 em vez de 2 | MORTO (`edge cases`) |
| C09 | `src/cli.ts:148` | falha de validacao no render sai 2 em vez de 1 | MORTO (`RND-01`) |
| L01 | `src/layout/common.ts:80` | `boxSizing` removido | MORTO (testes de layout e margens) |
| L02 | `src/layout/common.ts:50` | `pre-wrap` para `normal` | MORTO (testes de layout) |
| L03 | `src/layout/common.ts:19` | highlight com `lastIndexOf` | MORTO (`only the first occurrence is highlighted`) |
| L04 | `src/layout/common.ts:37` | `highlightFirst` destaca todos | MORTO (testes de layout) |
| X3 | `src/layout/common.ts:23` | span do destaque com a cor do texto | MORTO (`highlight becomes an accent span`) |
| X2 | `src/layout/footer.ts:9` | rodape nunca desenhado | MORTO (`RND-04 source footer`) |
| P01 | `src/pdf.ts:23` | alfa nao composto sobre branco | MORTO (`alpha is composited over white`) |
| P02 | `src/pdf.ts:92` | offset da entrada xref +1 | MORTO (`every xref entry points to the start`) |
| P03 | `src/pdf.ts:90` | offset do `startxref` +1 | MORTO (`startxref points to the xref keyword`) |
| P04 | `src/pdf.ts:75` | MediaBox com largura e altura trocadas | MORTO (`MediaBox matches width and height`) |
| F01 | `src/fit.ts:50` | quebra de linha `<` em vez de `<=` | MORTO (`text exactly at the line limit fits`) |
| F02 | `src/fit.ts:73` | altura `<` em vez de `<=` | **SOBREVIVEU** (limite exato de altura sem teste) |
| F03 | `src/fit.ts:12` | largura estimada de 0.6 para 0.5 | MORTO (`default estimate is 0.6 em`) |
| R01 | `src/render.ts:21` | piso da escada de fonte de 0.5 para 0.4 | **SOBREVIVEU** (spec registra 0,5 como valor da implementacao) |
| R02 | `src/render.ts:76` | share do corpo do text 0.65 para 0.9 | **SOBREVIVEU** |
| R03 | `src/render.ts:86` | share da lista 0.7 para 0.95 | **SOBREVIVEU** |
| R04 | `src/render.ts:86` | indentacao da lista 72 para 0 | **SOBREVIVEU** |
| R05 | `src/render.ts:90` | share da citacao 0.7 para 0.95 | **SOBREVIVEU** |
| R06 | `src/render.ts:95` | share do cta 0.6 para 0.9 | **SOBREVIVEU** |
| R07 | `src/render.ts:80` | share do valor do number 0.6 para 0.9 | **SOBREVIVEU** |
| R08 | `src/render.ts:24` | BOTTOM_ROW 64 para 0 | **SOBREVIVEU** |
| R09 | `src/render.ts:117` | escala combinada por `max` em vez de `min` | MORTO (testes de render) |
| R10 | `src/render.ts:72` | share do hook 1 para 1.5 | **SOBREVIVEU** |
| X1 | `src/render.ts:72` | texto do hook sem ajuste (M42 da rodada 1) | MORTO (`a hook that cannot fit fails with text-overflow`) |
| T01 | `src/theme.ts:49` | padding de 88 para 40 | **SOBREVIVEU** (`toBeGreaterThan(0)` apenas) |
| T02 | `src/theme.ts:12` | altura do retrato 1350 para 1349 | MORTO (`portrait format gives 1080x1350`) |

**Profundidade do sensor**: completa (78 mutantes, nucleo P0 de integridade de dados). **Resultado**: 57 de 78 mortos, FAIL: 19 sobreviventes alem dos 2 esperados (M14, M15, M17, M18, M19, M25, M26, F02, R01 a R08, R10, T01, mais C05 quase equivalente).

## Adversarial novo sobre o validador (copia isolada, sem editar)

### 4.a Falsos positivos (texto legitimo; cada linha foi com fatos contendo o mesmo texto)

| Entrada | Numero extraido | Resultado | Avaliacao |
| ------- | --------------- | --------- | --------- |
| `R$ 1,234,56` como `R$ 1.234,56` | `1.234,56` | passa | razoavel |
| `Q3 2026` | `2026` (o `3` colado a `Q` e ignorado) | passa | razoavel, mas `Q3` nao e conferido (ver FURO 3) |
| `COVID-19` | `19` | passa | razoavel |
| `3D` | `3` | passa | razoavel |
| `10h30` | `10` (`30` colado a `h` ignorado) | passa | razoavel, minutos nao conferidos |
| `24/7` | `24`, `7` | passa | razoavel |
| `1º lugar` | `1` | passa | razoavel |
| `50-50` | `50` (o segundo `-50` e colado a digito e e lido com o primeiro) | passa | razoavel |
| `2020-2021` | `2020`, `2021` | passa | razoavel |
| `+5%`, `-3%` | `+5%`, `-3%` | passam | razoavel |
| `14/10/2026` | `14`, `10`, `2026` | passa | razoavel |
| `v2.1.3`, `v3.0`, `v3.1` | `1.3`, `0`, `1` | **reprovado mesmo com a versao nos fatos** (`number-not-in-facts: "1.3"`, `"0"`, `"1"`) | **FALSO POSITIVO**: o numero extraido depois do ponto e recusado por `factsContain` porque nos fatos ele vem precedido de `2.`; a mensagem cita um numero que o autor nunca escreveu |
| `5 minutos` | `5` | passa | razoavel |
| `10 mil reais`, `3,5 milhões` | `10 mil`, `3,5 milhões` | passam | razoavel |
| e-mail `joao2@exemplo.com` | nenhum (digito colado a letra) | passa | razoavel (numero de e-mail nao conferido) |
| URL `example.com/2026/relatorio-3` | `2026`, `3` | passa se os fatos tem a URL | razoavel |
| `4 Milhões` (maiuscula) com fatos `4 milhões` | `4` | **reprovado** | falso positivo menor: a maiuscula faz a unidade nao ser lida e os fatos tem `4 milhões` |
| `12,5 %` com fatos `12,5%` | `12,5 %` | reprovado | consistente com "como escrito" (nao documentado) |

Numero real nos fatos reprovado: 2 casos (versoes com ponto, unidade com maiuscula).

### 4.b Falsos negativos (numero ou unidade nao nos fatos que passa)

Todos reproduzidos por execucao (`adv2.ts` e `adv3.ts` na copia isolada).

| Entrada | Fatos | Resultado | Classe |
| ------- | ----- | --------- | ------ |
| `Foram 10 mi` | `foram 10 mil` ou `10 minutos` | passa | **FURO 1** (milhoes vs milhares) |
| `Foram 4 mil` | `foram 4 milhões` ou `4 milhares` | passa | **FURO 1** |
| `Foram 5 k` | `foram 5 kg` | passa | **FURO 1** |
| `Foram 5 M` | `foram 5 Mb` | passa | **FURO 1** |
| `Foram 3 bi` | `foram 3 bits` ou `3 bilhoes` | passa | **FURO 1** |
| `Subiu 5%` | `caiu -5%` ou `caiu −5%` | passa | **FURO 2** (sinal nos fatos ignorado) |
| `Foram 5` | `foram -5` | passa | **FURO 2** |
| `Valor 1 000 000` | `1 000` | passa (tres numeros `1`, `000`, `000`) | **FURO 3** (milhar por espaco, nao documentado) |
| `Subiu 5 pp` | `5` | passa | **FURO 3** (unidade fora da lista, nao documentado) |
| `Foram 5 kg` | `5 g` | passa | FURO 3 (idem) |
| `Foram 2 trilhões` | `2` ou `2 pessoas` | passa | FURO 3 |
| `Subiu 15 por cento` | `15` | passa | FURO 3 |
| `Valor 1e3`, `Valor 1e9` | `1` | passa (so `1` e extraido) | FURO 3 |
| `Valor 0x10` | `0` | passa | FURO 3 |
| `Foram 5 anos` | `5 dias` | passa | FURO 3 |
| `No Q4 de 2026` | `Q3 2026` | passa (`Q4` ignorado) | FURO 3 (digito colado a letra) |
| `Houve 10h45` | `10h30` | passa | FURO 3 |
| `ISO27001 vale` | `nada` | passa | FURO 3 |
| `Foram 3 bi` | `3 mil` | reprovado | correto |
| `Foram 10x15 cm` | `10` | passa | LIMITACAO (dimensoes) |
| `Foram 10²` | `103` | reprovado (NFKC vira `102`) | correto |

Documentacao: `README.md` e `README.en.md` (secoes Limitacoes conhecidas) e `SKILL.md` (Limitacoes a avisar) citam so numero por extenso e o teste estatico. **Nenhum dos itens acima esta documentado**, nem que o sinal e a unidade dos fatos nao sao comparados, nem que digito colado a letra e ignorado, nem que `1 000 000` conta como tres numeros.

### 4.c Desempenho e ReDoS (timeout de 60 s)

Entradas de 1 MB (`1.` x 500000, `9` x 1000000, `1,` x 500000, `1 ` x 500000, `1 mil ` x 170000, `a1` x 500000, `-` x 1000000, `1.2,` x 250000, `1x` x 500000) contra fatos de 5 MB (linhas repetidas, so `9`, so `1.`) e contra um fato de 1 byte. Pior caso medido: 2,30 s (`9` x 1000000 com 5 MB de fatos) e 3,32 s (`1.` x 500000, execucao fria). Uma execucao fria de `9` x 1000000 levou 5,28 s, mas 3 repeticoes deram 0,94, 0,82 e 0,86 s; o tempo de partida do container e 0,30 s. **Nenhuma entrada passou de 5 s de forma reprodutivel; sem ReDoS.** Linha fria acima de 5 s uma vez: observacao, nao achado.

### 4.d Entradas da rodada 1 repetidas

- `__proto__` e `constructor` no deck (raiz, slide, meta): saida 0 e sem poluicao; `type: "constructor"`, `"__proto__"`, `"toString"`: `type-unknown` por slide, saida 1; `highlight: "constructor"`: `highlight-invalid`. OK.
- Deck de 11 slides: `error slide 0 slide-count: deck has 11 slides, it must have 3 to 10`, saida 1. OK.
- Caracteres de controle (NUL, TAB, BEL, ESC) e U+202E, U+0085 no texto: o validador aceita (saida 0). A spec nao os proibe. LACUNA DE PRECISAO: o override bidirecional U+202E e aceito e nao ha regra; nao medi o efeito no render.

### Classificacao

- **FURO** (contraria o proposito "nenhum numero sem fonte"): FURO 1 (prefixo de unidade nos fatos, `src/validate.ts:259`), FURO 2 (sinal dos fatos, `src/validate.ts:259`), FURO 3 (unidades fora da lista, milhar por espaco, `1e3`, digitos colados a letras, `src/validate.ts:211` e `:218`), por nao estarem avisados na documentacao.
- **LIMITACAO documentada**: numero por extenso (README, SKILL), gancho que quebra mais linhas, texto do PDF vira imagem, teste estatico e heuristica.
- **LACUNA DE PRECISAO**: ver secao acima; U+202E e controles aceitos.
- **Falsos positivos**: 2 (versoes com ponto, unidade com maiuscula).

## Seguranca e isolamento

- `scripts/carousel.sh selftest`: 5 de 5 `ok` (rede e DNS bloqueados, `/app` somente leitura, `/etc` nao gravavel, `/out` gravavel).
- `scripts/carousel.sh:35-45` implementa `--network none`, `--read-only`, `--cap-drop ALL`, `no-new-privileges`, `--pids-limit`, `--memory`, tmpfs `noexec`, usuario nao root, codigo montado com `,readonly` (SEC-07 e RND-07). `validate` e `render` montam so o diretorio de saida como gravavel. A imagem e fixada por digest.
- `tests/security-static.test.ts:20-45` tem 25 padroes (eval, `new Function`, import dinamico, child_process, fetch, XMLHttpRequest, WebSocket, node:http/https/net/dgram/dns/tls/http2/vm, process.env, Bun.env/spawn/connect/listen/serve, worker_threads, `Function(`, `globalThis[`); o teste cria um arquivo com cada amostra (`:92-98`) e exige o achado, e confere que as amostras nao aparecem inteiras no proprio teste. Heuristica, como declarado.
- `.github/workflows/ci.yml`: SEC-01 a SEC-03 por leitura e actionlint, SHAs conferidos com `gh api` (todos batem, trivy-action via tag anotada). **O CI nunca rodou no GitHub.**
- `.github/dependabot.yml` cumpre SEC-04; `docs/dependencies.md` cumpre SEC-06 (amostra de 7 conferida com `npm view`); SECURITY.md, LICENSE e THIRD_PARTY_FONTS.md existem.
- Nenhum e-mail em nenhum arquivo do projeto fora de `node_modules` e `.git` (grep vazio).

## Documentacao

- DOC-01 a DOC-04: PASS (tabela acima). READMEs e SKILL.md descrevem `non-ascii-digit`, numero inteiro com sinal e unidade e os tracos e setas ampliados.
- `grep -rnP "\x{2014}|\x{2013}|\x{2192}"` fora de `.specs`, `node_modules`, `.git` e `THIRD_PARTY_FONTS.md`: vazio.
- DOC-05, comparacao com terceiros, confronto com a lista verificada (re-conferida com `gh api`: ContentHub sem pasta `.github` (404); threads-carousel MIT; Slashgear MIT):
  - ContentHub: "tem um gate factual no fluxo e o carrossel dele e para Instagram. Nao encontramos uma pasta `.github`". Dentro da lista.
  - Slashgear/linkedin-carousel-gen: "MIT, usa Satori e Bun para gerar PDFs de carrossel do LinkedIn". Dentro da lista.
  - threads-carousel-claude-skill: "licenca MIT", "previa em navegador (Next.js)", "exportacao no navegador, em formatos de varias redes". Dentro da lista. **Alem da lista**: "Este projeto nasceu de uma auditoria de seguranca dele: as regras do validador e a ideia de rodar tudo em container vem desse trabalho. O codigo foi reescrito para este repositorio (so a expressao regular de numero e o formato da linha de achado coincidem)" (`README.md` secao Comparacao; `README.en.md:139`). Nao verifiquei isso: a arvore publica do repositorio (`gh api .../git/trees/HEAD?recursive=1`) mostra `template/` em Next.js e nao tem validador nem testes, entao a origem das "regras do validador" e a afirmacao de que so a regex e o formato coincidem nao tem verificacao por mim. Achado de DOC-05.

## Success Criteria

- Exemplo (`examples/slides.json` com `examples/facts.md`) pelo script de container: `validate` saida 0; `render` imprime `slide 1/6` a `slide 6/6`, saida 0; 6 PNGs, todos 1080x1080 (leitura do IHDR), `carousel.pdf` de 152744 bytes com 6 paginas (`/Count 6`, 6 objetos `/Type /Page`, `/MediaBox [0 0 1080 1080]`). O slide de numero tem `source`. PASS.
- Numero fora dos fatos nunca gera PDF: com `out2/carousel.pdf` antigo (conteudo `old`), `render` de um deck com `42%` contra fatos `142%` saiu 1 e a pasta ficou vazia (o PDF antigo sumiu). PASS.
- "Primeiro push publico com CI verde e Dependabot ativo": NAO VERIFICADO (o CI nunca rodou no GitHub e nao ha push).
- "Num Claude Code limpo, pedir o carrossel e receber o PDF": NAO VERIFICADO.
- Dependencias diretas de runtime: 2 (satori, resvg-wasm), transitivas listadas: confere com `docs/dependencies.md`.

## Inspecao visual (Read em PNG)

- Dark, `01-hook.png`: legivel, destaque amarelo em "texto", contagem `1/6` no canto. Defeito: o gancho do exemplo tem 2 linhas por `\n`, mas sai com 4 linhas porque "E se a reuniao semanal" quebra depois de "reuniao" (limitacao documentada, mas o proprio exemplo da documentacao a exibe). Bloco ancorado no centro com muito espaco vazio acima.
- Dark, `03-text.png`: titulo, corpo com destaque "nota escrita" e rodape "Fonte: exemplo da documentacao" a esquerda; sem corte. Sem defeito.
- Dark, `04-list.png`: lista numerada com marcadores na cor de destaque, itens quebram com recuo correto. Sem defeito.
- Light e retrato (1080x1350, accent `#1D4ED8`, deck temporario fora do repositorio), `02-number.png`: numero grande azul, rotulo escuro, rodape de fonte, `2/6`; contraste bom. Sem defeito.
- Light e retrato, `05-quote.png`: barra azul a esquerda, citacao escura, autor em cinza; muito espaco vazio acima e abaixo (bloco centrado). Sem defeito de legibilidade; so vazio grande.

## O que NAO foi verificado

- CI no GitHub (nunca rodou) e Dependabot ativo.
- "Num Claude Code limpo, pedir o carrossel e receber o PDF".
- Efeito no render de U+202E e caracteres de controle.
- Aparencia dos 3 PNGs restantes do exemplo (02-number, 05-quote, 06-cta) e dos 4 restantes do deck light: so as amostras acima foram vistas.
- Origem das "regras do validador" do threads-carousel (item DOC-05).
- Seguranca do Docker em si.

## Lista ordenada de lacunas (da mais grave para a menos)

1. FURO 1: unidade que e prefixo de outra passa contra os fatos (`10 mi` vs `10 mil`, `4 mil` vs `4 milhões`, `5 k` vs `5 kg`) - VAL-12 - `src/validate.ts:259`.
2. FURO 2: sinal dos fatos nao comparado (`5%` passa contra `-5%`) - VAL-12 - `src/validate.ts:259`.
3. FURO 3: unidades fora da lista, milhar por espaco, `1e3`, digitos colados a letras nao conferidos e sem aviso nos READMEs e no SKILL.md - VAL-12 e DOC-04 - `src/validate.ts:211`, `:218`.
4. Falso positivo: `v3.0` e `v2.1.3` presentes nos fatos sao reprovados com mensagem confusa - VAL-12 - `src/validate.ts:259`.
5. Sobreviventes de comportamento exigido pela spec: M14 (VAL-08 bloco U+2900 a U+297F, `src/validate.ts:166`), M19 (sinal `+`, `:218`), M17 (U+2212, `:224`), M18 (VAL-15 so um alfabeto, `:229`), M25 (`5` contra `5,5`, `:259`), M26 e M15 (largura zero, `:225`, `:21`).
6. DOC-05: afirmacao sobre o threads-carousel fora da lista verificada - `README.md` secao Comparacao, `README.en.md:139`.
7. Sobreviventes de renderizacao sem teste: fatores de share R02 a R07 e R10 (`src/render.ts:72`, `:76`, `:80`, `:86`, `:90`, `:95`), piso do ajuste R01 (`:21`), BOTTOM_ROW R08 (`:24`), padding T01 (`src/theme.ts:49`), limite exato de altura F02 (`src/fit.ts:73`).
8. Lacunas de precisao da spec: VAL-12 (sinal nos fatos, espaco antes da unidade, digito colado a letra, unidade fora da lista), VAL-15 ("um texto"), RND-04 e RND-05 (forma da prova), U+202E e controles aceitos.
9. Exemplo da documentacao exibe o gancho de 2 linhas com 4 linhas no PNG - RND-02 (limitacao documentada) - `examples/slides.json` slide 1.
10. Sobreviventes esperados: C07 (M13, PDF sem arquivo temporario) e S02 (M25, `ownProp`); C05 quase equivalente.

## validate_state.py

Saida registrada no chat de entrega.
