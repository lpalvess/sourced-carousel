# sourced-carousel v1 Design

**Spec**: `.specs/features/v1/spec.md`
**Status**: Draft

## Architecture

```
slides.json + facts.md
      |
      v
src/schema.ts (formato) -> src/validate.ts (regras) -> relatório e código de saída
      |
      v  (só se a validação passa)
src/layout/*.ts (um objeto por tipo de slide) -> src/fit.ts (tamanho do texto)
      |
      v
satori (objeto -> SVG, texto como path) -> @resvg/resvg-wasm (SVG -> pixels e PNG)
      |
      +--> out/NN-type.png
      +--> src/pdf.ts (escritor próprio, uma imagem por página) -> out/carousel.pdf
```

Tudo roda em `scripts/carousel.sh`, que usa `docker run` com `--network none`, `--read-only`, `--cap-drop ALL` e o código montado somente leitura.

## Decisões

| Decisão | Escolha | Por quê |
| ------- | ------- | ------- |
| Linguagem e runtime | TypeScript no Bun | Mesma stack do fork auditado e do Satori. |
| Entrada | `slides.json` lido com `JSON.parse` e validado por funções de tipo escritas à mão, sem biblioteca de schema | Zero dependência a mais e nenhum código vindo da entrada é executado (VAL-14). |
| Elementos do Satori | Objetos `{ type, props }`, sem React | Confirmado no Context7 (/vercel/satori). Remove React e JSX do runtime. |
| Rasterização | `@resvg/resvg-wasm` 2.6.2, MPL-2.0 | Sem dependências, sem binário nativo, sem script de instalação (conferido no npm). O `resvg-js` traz 12 pacotes nativos. |
| PDF | Escritor próprio de PDF em `src/pdf.ts`: pixels RGB do resvg, deflate do `node:zlib`, uma imagem por página, sem data nem ID no arquivo | Zero dependência e saída reproduzível (RND-09). A alternativa pdf-lib não recebe release desde 2021 (não reverifiquei hoje). O texto no PDF vira imagem, ou seja, não é selecionável. |
| Fontes | Inter estática (pesos 500, 700 e 800), subconjunto latin, WOFF2, de `@fontsource/inter` 5.3.0 (OFL-1.1), baixada uma vez num diretório descartável e versionada no repositório | O Satori usa opentype.js, e não confirmei suporte a fonte variável, então uso estáticas. A interface do carrossel é só em latim (português e inglês). |
| Texto como caminho | `embedFont` padrão do Satori (texto vira `<path>`) | O resvg não precisa de fontes e o texto da entrada nunca vira elemento (RND-06). |
| Ajuste de texto | Escada de tamanhos de fonte com estimativa conservadora de largura por caractere | O Satori não expõe a medida do texto. A estimativa é aproximada: o limite de palavras do validador reduz o risco, e a tarefa T23 prova com o caso mais longo permitido. Se a estimativa falhar, o erro `text-overflow` é a rede de segurança. |
| Temas | `dark` (padrão) e `light`, cor de destaque configurável em `meta.accent` | RND-05 e RND-11. |
| Formatos | `linkedin-square` 1080x1080 (padrão) e `linkedin-portrait` 1080x1350 | Assumption da spec. |
| Licenças | Projeto MIT. Satori e resvg-wasm são MPL-2.0: usados como dependência sem modificar, o que é compatível. Registrado em `docs/dependencies.md`. | Transparência. |
| Dependências diretas | satori e @resvg/resvg-wasm (2 de no máximo 4). O Satori declara 12 dependências diretas e o fechamento dele chega a 21 pacotes (medido na T32), todos listados em docs/dependencies.md com as licenças. | SEC-06. |
| Exemplo da documentação | Carrossel fictício rotulado como exemplo, sem números reais de terceiros | Os números do artigo da Anthropic vieram de um resumo automático e não vão para um repositório público. |
| CI | Actions fixadas por SHA, reaproveitando as três do fork (checkout, setup-bun, trivy-action), reverificadas na T29 | SEC-03. |
| Isolamento | `scripts/carousel.sh` com `--network none --read-only --cap-drop ALL --security-opt no-new-privileges`, código `:ro` e só `out/` gravável | SEC-07 e RND-07. |

## Propriedade de arquivos (trilhas possíveis em paralelo)

| Trilha | Arquivos |
| ------ | -------- |
| Fundação (primeiro, sozinha) | `package.json`, `tsconfig.json`, `.gitignore`, `LICENSE`, `src/types.ts` |
| Validador | `src/schema.ts`, `src/validate.ts`, `tests/schema.test.ts`, `tests/validate.test.ts`, `tests/security-static.test.ts` |
| Renderização | `src/fonts/`, `src/theme.ts`, `src/layout/`, `src/fit.ts`, `src/render.ts`, `src/pdf.ts`, `THIRD_PARTY_FONTS.md` e os testes correspondentes |
| CLI (junta as duas) | `src/cli.ts` |
| Repositório e documentação (por último) | `scripts/`, `.github/`, `SECURITY.md`, `docs/`, `examples/`, `SKILL.md`, `README.md`, `README.en.md` |
