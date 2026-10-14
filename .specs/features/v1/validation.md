**Verdict: PASS**

## Validation: sourced-carousel v1 - PASS

Rodada 3, em 2026-10-14. As rodadas 1 e 2 reprovaram; os relatórios delas estão no histórico do git (commits `9c13b67` e `a04c094`). Esta rodada foi dividida em partes feitas por agentes independentes, que não escreveram o código. O orquestrador só corrigiu um teste apontado pela parte de mutação e consolidou os resultados neste arquivo.

## Gate

- `bunx tsc --noEmit`: 0 erros.
- `bun test` em contêiner sem rede: 383 testes passando, 0 falhas.
- `scripts/carousel.sh selftest`: 5 de 5 (rede bloqueada, DNS bloqueado, código somente leitura, imagem somente leitura, saída gravável). Prova em `scripts/selftest.ts:19`.
- Exemplo: `scripts/carousel.sh validate examples/slides.json --facts examples/facts.md` sai com 0; `render` gera 6 PNG de 1080x1080 e `carousel.pdf`, sem texto cortado nem sobreposto (inspeção visual de 2 PNGs).
- `actionlint` sem erros. Os 3 SHAs de `.github/workflows/ci.yml` batem com as tags oficiais (conferido na rodada 2).

## Achados da rodada 2, verificados no código atual (parte adversarial)

| Achado | Evidência | Estado |
| ------ | --------- | ------ |
| `42%` passava contra `142%` | `tests/validate-hardening.test.ts:22` | CORRIGIDO |
| Unidade que é prefixo de outra (`10 mi` contra `10 mil`, `5 k` contra `5 kg`) | `tests/validate-hardening.test.ts:202` | CORRIGIDO |
| Sinal dos fatos ignorado (`5%` contra `caiu -5%`) | `tests/validate-hardening.test.ts:209` | CORRIGIDO |
| Versão lida como número (`v3.0`, `v2.1.3`) | `tests/validate-hardening.test.ts:219` | CORRIGIDO |
| Unidade com maiúscula (`4 Milhões` contra `4 milhões`) | `tests/validate-hardening.test.ts:223` | CORRIGIDO |
| Destaque só no autor da citação era aceito | `tests/validate-hardening.test.ts:153` | CORRIGIDO |
| Dígitos de largura total e árabe-índicos | `tests/validate-hardening.test.ts:71`, `tests/validate-hardening.test.ts:109` | CORRIGIDO |
| BOM no JSON | `tests/validate-hardening.test.ts:169` | CORRIGIDO |
| Rodapé de fonte sem prova no PDF | `tests/cli-render.test.ts:157` | CORRIGIDO |
| Passo `pdf` sem teste de falha | `tests/cli-render.test.ts:175` | CORRIGIDO |
| Gancho que estoura sem teste | `tests/render.test.ts:206` | CORRIGIDO |
| Frases sobre terceiros além do verificado | `README.md` e `README.en.md`, seção de comparação | CORRIGIDO |

Falsos positivos em português testados (`R$ 1.234,56`, `Q3 2026`, `COVID-19`, `24/7`, `14/10/2026`, `2020-2021`, `3,5 milhões`, `5 minutos`, `10 mil reais`): todos passam quando o número está nos fatos e reprovam quando não está.

## Sensor de mutação (4 lotes, 24 mutantes)

| Lote | Escopo | Resultado |
| ---- | ------ | --------- |
| 1 | Limites de palavras, linhas, fonte, destaque, itens e slides | 6 de 6 mortos |
| 2 | Caracteres proibidos, unidades, flag de maiúsculas, campos do destaque | 6 de 6 mortos, depois da correção abaixo |
| 3 | Sinal, versão, NFKC, caracteres invisíveis, setas, BOM | 6 de 6 mortos |
| 4 | Dígitos estrangeiros, códigos de saída, limpeza do PDF, progresso, ajuste de texto, box-sizing | 6 de 6 mortos |

Correção feita nesta rodada: remover `U+2192` da lista de proibidos não derrubava nenhum teste. O teste novo em `tests/validate-hardening.test.ts:229` confere uma lista fixa das sequências exigidas, escrita no próprio teste, e o mutante passou a morrer.

Os dois primeiros lançamentos de mutação desta rodada foram descartados: a cópia de trabalho tinha `node_modules` como link simbólico, que não resolve dentro do contêiner, e a base já falhava. Os resultados acima são da cópia corrigida, com a base em 371 e depois 383 testes passando.

## Limitações declaradas (documentadas em README.md, README.en.md e SKILL.md)

- Números por extenso não são conferidos.
- Só as unidades da lista são conferidas; milhar com espaço, notação científica e dígitos colados a letras não são.
- O validador confirma que o número veio do arquivo de fatos, não que o trecho está certo na fonte.
- O teste estático de segurança é uma heurística; a defesa real é o contêiner sem rede.
- O texto do PDF vira imagem e não é selecionável.

## Teste de ponta a ponta da skill

Em 2026-10-14, num clone novo do repositório público, com a skill instalada em `.claude/skills/sourced-carousel/`, rodou-se `claude -p` com `--setting-sources project` (sem configurações nem hooks do usuário), `--strict-mcp-config` (sem MCP), modelo Sonnet e ferramentas limitadas a Skill, Read, Write, Edit, Glob, Grep e `Bash(scripts/carousel.sh:*)`. Pedido: um carrossel a partir de `post.md` e `fatos.md`, com o plano pré-aprovado. Resultado: 5 slides, `out/carousel.pdf` com 5 páginas, só números do arquivo de fatos, nada publicado. Conferido por fora: o `slides.json` gerado valida com código 0 e os PNGs estão legíveis. Ressalva: o `CLAUDE.md` global do usuário ainda é carregado nesse modo, então a sessão não é totalmente limpa. O teste revelou que o README não dizia como instalar a skill; corrigido.

## Não verificado

- O workflow de CI nunca rodou no GitHub. A primeira execução real acontece no primeiro push.
- Windows e macOS.

## Intervalo

Do commit `a116298` (design e tarefas) até o HEAD que contém este relatório.
