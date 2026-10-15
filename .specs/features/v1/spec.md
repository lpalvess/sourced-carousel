# sourced-carousel v1 Specification

## Problem Statement

Geradores de carrossel para LinkedIn transformam texto em slides. Este projeto foca em um ponto específico: provar que cada número do carrossel veio da fonte. Skills de terceiros maliciosas são um risco documentado em 2026 (Snyk ToxicSkills, arXiv 2602.06547). O sourced-carousel gera o PDF do carrossel com número rastreável à fonte, rodapé de fonte por slide, sem navegador, sem rede e auditável.

## Goals

- [ ] Um texto aprovado vira `out/carousel.pdf` e um PNG por slide com um comando, num container sem rede.
- [ ] Nenhum carrossel é gerado com número que não aparece no arquivo de fatos, com travessão ou com seta.
- [ ] O repositório público nasce com CI, Dependabot, actions fixadas por SHA, varredura de vulnerabilidades e teste de isolamento de rede.
- [ ] A skill funciona no Claude Code com documentação em português (padrão) e em inglês.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Publicar no LinkedIn ou chamar API de rede social | A skill nunca publica. |
| Escrever o texto do post | É papel da skill post-linkedin. As duas compartilham o arquivo de fatos. |
| Editor web ou prévia em servidor local | Sem navegador e sem porta aberta. A prévia é o PNG gerado. |
| Mais de 2 temas e editor de estilos | Estilo não é o diferencial. |
| Formatos de Instagram, TikTok ou apresentação | Foco em LinkedIn. |
| Imagens e capturas de tela nos slides | Entram em versão futura. Evita carregar arquivo arbitrário na v1. |
| Buscar e resumir a fonte automaticamente | O fluxo da skill monta o arquivo de fatos com o usuário. O CLI só confere. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --------------------- | -------------- | --------- | ---------- |
| Tipos de slide | hook, text, number, list, quote, cta | Cobrem um post de LinkedIn sem inflar a v1. | y |
| Temas | dark e light, uma cor de destaque configurável | Estilo não é o diferencial. | y |
| Formatos | `linkedin-square` (1080x1080, padrão) e `linkedin-portrait` (1080x1350) | Os dois existem no fork auditado. Não verificamos qual performa melhor. | n |
| Entrada | `slides.json` validado por schema, nunca código executável | Ler a entrada não executa nada. | y |
| Arquivo de fatos | Qualquer texto. O formato recomendado é uma linha por fato com número, contexto, trecho literal e link. | Compatível com a skill post-linkedin. | y |
| Regras de conteúdo | As do validador do fork: body/text 40 palavras, hook 3 linhas, badge 4 caracteres, highlight 2 palavras, source 80 caracteres, 3 a 10 slides | Já testadas (141 testes). | y |
| Renderização | Satori (JSX para SVG), resvg (SVG para PNG), biblioteca de PDF a decidir no Design após auditoria | Sem navegador. Satori aceita WOFF2 (confirmado no Context7). | y |
| Fontes variáveis | Usar as WOFF2 variáveis do fork se o Satori respeitar os pesos; senão, instâncias estáticas | Comportamento de fonte variável no Satori não confirmado. Primeira tarefa prova. | n |
| Licença | MIT, com THIRD_PARTY_FONTS.md para as fontes OFL e crédito a qualquer código MIT reaproveitado | Projeto público. | y |
| Linhas do gancho | Contadas pelas quebras `\n` do texto. A quebra automática ao renderizar não conta, então um gancho de 2 linhas pode sair com 4 no PNG. | Medir a quebra exigiria medir o texto. Fica como limitação documentada. | y |
| Números por extenso | Não são conferidos. O validador só enxerga dígitos. | Ler número por extenso em português exigiria uma gramática. A SKILL.md manda escrever com dígitos. | y |
| Mínimo do ajuste de texto | 0,5 vezes o tamanho base do papel (escada 1, 0,9, 0,8, 0,7, 0,6, 0,5). | Valor da implementação, em src/render.ts. | n |
| Nome dos comandos | `carousel validate` e `carousel render` | Projeto bilíngue. | y |
| Repositório no GitHub | Criado só com o OK explícito do Lucas, na hora | Ação externa. | y |
| Proteção da branch main | Configurada só com o OK explícito do Lucas, na hora | Mudança de configuração no GitHub. | y |

**Open questions:** none - all resolved or logged above (required before the spec is confirmed).

---

## User Stories

### P1: Validar o carrossel antes de gerar (MVP)

**User Story**: Como autor, quero que o carrossel seja reprovado se tiver número sem fonte ou texto fora das regras, para nunca publicar dado errado.

**Why P1**: É o diferencial do projeto.

**Acceptance Criteria**:

1. WHEN `carousel validate <slides.json>` roda THEN the validator SHALL imprimir uma linha por achado no formato `<severity> slide <N> <rule-id>: <message>` e SHALL sair com 0 somente se houver zero erros.
2. IF o arquivo não é JSON válido ou não segue o schema THEN the validator SHALL reportar erro `schema-invalid` com o caminho do campo e sair com 1.
3. IF o arquivo de slides não pode ser lido THEN the validator SHALL sair com 2 e imprimir o caminho.
4. IF um slide não tem um campo obrigatório do seu tipo THEN the validator SHALL reportar erro `field-missing` com o nome do campo.
5. IF um slide text tem mais de 40 palavras THEN the validator SHALL reportar erro `too-many-words`.
6. IF o texto de um hook tem mais de 3 linhas THEN the validator SHALL reportar erro `hook-too-long`.
7. IF o highlight tem mais de 2 palavras ou não aparece em um dos campos em que o layout do tipo o desenha THEN the validator SHALL reportar erro `highlight-invalid`. Os campos são: hook, text; text, title e text; number, value e label; list, title e items; quote, text; cta, text. Um destaque que só existe em `author` ou `handle` é inválido, porque nunca seria desenhado.
8. IF qualquer texto contém U+2012, U+2013, U+2014, U+2015, U+FE58, U+FF0D, um caractere dos blocos Unicode de setas (U+2190 a U+21FF, U+27F0 a U+27FF, U+2794 a U+27BF, U+2900 a U+297F, U+2B00 a U+2B11, U+2B30 a U+2B4F, U+2B60 a U+2BAF) ou as sequências `->`, `=>` e `<-` THEN the validator SHALL reportar erro `forbidden-char` com o caractere. Hífen simples e o sinal de menos U+2212 são permitidos.
9. IF o deck tem menos de 3 ou mais de 10 slides THEN the validator SHALL reportar erro `slide-count`.
10. IF o primeiro slide não é hook ou o último não é cta THEN the validator SHALL reportar aviso `structure` sem alterar o código de saída.
11. IF `source` tem mais de 80 caracteres THEN the validator SHALL reportar erro `source-too-long`.
12. WHERE `--facts <arquivo>` é informado, IF um número dos slides, fora de `source`, não aparece inteiro no arquivo de fatos THEN the validator SHALL reportar erro `number-not-in-facts` com o número. Os textos passam por normalização NFKC antes da comparação. O número é a sequência de dígitos com separadores `.` e `,`, mais o sinal (só quando não está colado a letra ou dígito) e a unidade logo depois (`%`, `x`, `K`, `k`, `M`, `B`, `mil`, `mi`, `bi`, `milhão`, `milhões`, `bilhão`, `bilhões`, `thousand`, `million`, `billion`). Aparecer inteiro significa não estar dentro de outro número nem de uma parte decimal, e com a mesma unidade: `42%` não está em `142%`, `42` ou `42,5%`.
13. WHERE `--facts` não é informado, IF algum slide contém número THEN the validator SHALL imprimir o aviso `facts-skipped` uma vez e SHALL NOT falhar por isso.
14. The validator SHALL ler a entrada sem executar nenhum código vindo dela.
15. IF um texto contém, depois da normalização NFKC, um dígito decimal que não é 0 a 9 THEN the validator SHALL reportar erro `non-ascii-digit`.

**Independent Test**: validar um slides.json com travessão, uma seta e um número ausente dos fatos e ver três erros; validar o `examples/slides.json` com o `examples/facts.md` (ambos fictícios) e ver código 0.

---

### P1: Gerar PNG e PDF sem navegador (MVP)

**User Story**: Como autor, quero gerar o carrossel com um comando, sem navegador e sem rede, para ter um PDF pronto e reproduzível.

**Why P1**: Fecha o fluxo "texto aprovado vira PDF".

**Acceptance Criteria**:

1. WHEN `carousel render <slides.json>` roda THEN the renderer SHALL executar a validação primeiro e SHALL abortar com o código do validador se houver erro.
2. WHEN a validação passa THEN the renderer SHALL escrever um PNG por slide, nomeado `NN-<type>.png` a partir de `01`, com a largura e a altura exatas do formato.
3. WHEN a validação passa THEN the renderer SHALL escrever `out/carousel.pdf` com exatamente uma página por slide.
4. WHERE um slide tem `source`, the renderer SHALL desenhar o texto do rodapé no PNG e no PDF.
5. WHERE um slide tem `highlight`, the renderer SHALL desenhar o trecho na cor de destaque do tema.
6. The renderer SHALL desenhar todo texto da entrada como texto, de modo que `<script>`, `<img onerror>` e similares apareçam como caracteres e nunca como elementos no SVG.
7. The renderer SHALL concluir em container com `--network none`, usando só fontes do repositório.
8. IF qualquer etapa falha THEN the renderer SHALL sair com código diferente de zero, nomear a etapa e SHALL NOT deixar `out/carousel.pdf` no disco.
9. WHEN o mesmo slides.json é gerado duas vezes THEN the renderer SHALL produzir PNGs idênticos byte a byte e PDFs com o mesmo número e tamanho de páginas.
10. WHILE gera, the renderer SHALL imprimir `slide <i>/<n>` por slide.
11. WHERE `meta.theme` é `light`, the renderer SHALL usar fundo claro e texto escuro; no padrão `dark`, o inverso.

**Independent Test**: gerar o carrossel de 6 slides no container sem rede e conferir 6 PNGs de 1080x1080 e um PDF de 6 páginas; comparar cada tema com a imagem de referência.

---

### P2: Repositório seguro desde o primeiro commit

**User Story**: Como mantenedor de um projeto público, quero CI, Dependabot e provas de isolamento para que qualquer pessoa possa auditar a skill antes de instalar.

**Why P2**: É o segundo diferencial e o que torna o projeto confiável.

**Acceptance Criteria**:

1. WHEN há pull request ou push na main THEN the CI SHALL executar, nesta ordem: instalação congelada com scripts desligados, typecheck, testes, geração de um carrossel de exemplo sem rede e varredura do trivy.
2. IF o trivy encontra vulnerabilidade HIGH ou CRITICAL THEN the CI SHALL falhar.
3. The workflows SHALL referenciar toda action de terceiros por SHA completo de commit, com a tag em comentário, e SHALL declarar `permissions: contents: read`.
4. The dependabot.yml SHALL cobrir os ecossistemas `bun` e `github-actions`, semanal, com minor e patch agrupados.
5. The repositório SHALL ter SECURITY.md com como reportar vulnerabilidade, LICENSE MIT e THIRD_PARTY_FONTS.md com o texto da licença de cada fonte.
6. The projeto SHALL ter no máximo 4 dependências diretas de runtime, SHALL listar em `docs/dependencies.md` cada dependência direta e transitiva com versão, licença e scripts de instalação, e SHALL registrar o resultado da auditoria de cada direta.
7. The projeto SHALL NOT enviar telemetria nem fazer requisição de rede em tempo de execução.

**Independent Test**: abrir um PR com uma dependência vulnerável de propósito e ver o CI falhar; rodar a geração com rede desligada e ver sucesso.

---

### P2: Skill do Claude Code e documentação

**User Story**: Como usuário do Claude Code, quero uma skill que conduza do post aprovado ao PDF, para gerar carrosséis sem decorar comandos.

**Why P2**: Transforma o CLI em fluxo de uso.

**Acceptance Criteria**:

1. The SKILL.md SHALL descrever o fluxo: montar ou reaproveitar o arquivo de fatos com trechos literais, propor o plano dos slides e esperar aprovação, escrever o slides.json, validar até passar, gerar e entregar o PDF com a lista de fatos.
2. The SKILL.md SHALL instruir o agente a nunca publicar e a nunca inventar número que não esteja no arquivo de fatos.
3. The SKILL.md SHALL rodar validação e geração somente pelo script de container.
4. The README SHALL existir em português (README.md) e em inglês (README.en.md), com instalação, exemplo completo, as regras do validador e a seção de segurança.
5. The README SHALL comparar o projeto ao ContentHub e ao gerador de carrossel auditado, dizendo o que cada um faz, sem afirmar o que não foi verificado.

**Independent Test**: num Claude Code limpo, pedir "faça um carrossel deste post com este arquivo de fatos" e receber o PDF com a lista de fatos, sem publicação.

---

## Edge Cases

- IF o arquivo de fatos existe mas está vazio THEN the validator SHALL reportar `number-not-in-facts` para cada número dos slides.
- IF o mesmo número aparece em dois slides THEN the validator SHALL reportar um achado por slide.
- WHEN um número tem separador (`2.500`, `2,5`) THEN the validator SHALL comparar exatamente como escrito.
- IF um texto é longo demais para caber no slide mesmo dentro dos limites THEN the renderer SHALL reduzir o tamanho da fonte até o mínimo do tema e, se ainda não couber, SHALL falhar com erro `text-overflow` indicando o slide.
- IF `out/` já existe THEN the renderer SHALL sobrescrever os arquivos de mesmo nome e SHALL NOT apagar outros arquivos.

**Dimensions sweep (Large):**

| Dimensão | Resultado |
| -------- | --------- |
| Input validation e limites | VAL-02 a VAL-14 e o edge case de text-overflow |
| Falha e falha parcial | RND-08 |
| Idempotência e repetição | RND-09 e a regra de sobrescrita |
| Auth e rate limits | N/A porque é ferramenta local de linha de comando, sem usuários nem rede |
| Concorrência e ordem | N/A porque cada execução roda no próprio container e escreve só no seu `out/` |
| Ciclo de vida dos dados | N/A porque `out/` é saída descartável e fica no .gitignore |
| Observabilidade | VAL-01 e RND-10 |
| Falha de dependência externa | RND-07 e SEC-07 (nenhuma dependência de rede em execução) |
| Integridade de transição de estado | N/A porque não há estado persistido |

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| -------------- | ----- | ----- | ------ |
| VAL-01 | P1: Validar | Design | Implementing |
| VAL-02 | P1: Validar | Design | Implementing |
| VAL-03 | P1: Validar | Design | Implementing |
| VAL-04 | P1: Validar | Design | Implementing |
| VAL-05 | P1: Validar | Design | Implementing |
| VAL-06 | P1: Validar | Design | Implementing |
| VAL-07 | P1: Validar | Design | Implementing |
| VAL-08 | P1: Validar | Design | Implementing |
| VAL-09 | P1: Validar | Design | Implementing |
| VAL-10 | P1: Validar | Design | Implementing |
| VAL-11 | P1: Validar | Design | Implementing |
| VAL-12 | P1: Validar | Design | Implementing |
| VAL-13 | P1: Validar | Design | Implementing |
| VAL-14 | P1: Validar | Design | Implementing |
| VAL-15 | P1: Validar | Design | Implementing |
| RND-01 | P1: Gerar | Design | Implementing |
| RND-02 | P1: Gerar | Design | Implementing |
| RND-03 | P1: Gerar | Design | Implementing |
| RND-04 | P1: Gerar | Design | Implementing |
| RND-05 | P1: Gerar | Design | Implementing |
| RND-06 | P1: Gerar | Design | Implementing |
| RND-07 | P1: Gerar | Design | Implementing |
| RND-08 | P1: Gerar | Design | Implementing |
| RND-09 | P1: Gerar | Design | Implementing |
| RND-10 | P1: Gerar | Design | Implementing |
| RND-11 | P1: Gerar | Design | Implementing |
| SEC-01 | P2: Repositório seguro | Design | In Tasks |
| SEC-02 | P2: Repositório seguro | Design | In Tasks |
| SEC-03 | P2: Repositório seguro | Design | In Tasks |
| SEC-04 | P2: Repositório seguro | Design | Implementing |
| SEC-05 | P2: Repositório seguro | Design | Implementing |
| SEC-06 | P2: Repositório seguro | Design | In Tasks |
| SEC-07 | P2: Repositório seguro | Design | Implementing |
| DOC-01 | P2: Skill e documentação | Design | In Tasks |
| DOC-02 | P2: Skill e documentação | Design | In Tasks |
| DOC-03 | P2: Skill e documentação | Design | In Tasks |
| DOC-04 | P2: Skill e documentação | Design | In Tasks |
| DOC-05 | P2: Skill e documentação | Design | In Tasks |

**ID format:** `[CATEGORY]-[NUMBER]`. Os ACs de cada story são numerados na ordem: P1 Validar = VAL-01 a VAL-15, P1 Gerar = RND-01 a RND-11, P2 Repositório seguro = SEC-01 a SEC-07, P2 Skill = DOC-01 a DOC-05.

**Coverage:** 38 total, 38 mapped to tasks, 0 unmapped.

---

## Success Criteria

- [ ] O carrossel de exemplo (fictício, em `examples/`) sai em PDF a partir do slides.json e do arquivo de fatos, no container sem rede, com rodapé de fonte nos slides de número.
- [ ] Um slides.json com número fora dos fatos nunca gera PDF.
- [ ] O primeiro push público já tem CI verde e Dependabot ativo.
- [ ] Nenhuma dependência direta de runtime além das 4 auditadas, e todas as transitivas listadas.
