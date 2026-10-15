# Privacy policy / Política de privacidade

Last updated / Última atualização: 2026-10-15

## English

sourced-carousel runs on your machine. It has no server, no account and no telemetry.

- **What it reads:** only the files you pass to it: a `slides.json` and, if you use one, a facts file.
- **What it writes:** PNG images and `carousel.pdf`, only in the output folder you choose (`out/` by default).
- **Network:** validating and rendering run in a Docker container started with `--network none`, so your text never leaves your machine. The only step with network access is `setup`, which downloads the Docker image and the npm packages pinned in `bun.lock`. When you install it as a Claude Code plugin, Claude Code also installs those pinned packages. No data of yours is sent in either step.
- **Personal data:** the project does not collect, store or send personal data. It does not keep anything after the command ends, apart from the files it writes to your output folder.

Claude Code and Docker have their own privacy policies, which this project does not control.

## Português

O sourced-carousel roda na sua máquina. Não tem servidor, conta nem telemetria.

- **O que lê:** só os arquivos que você passa: um `slides.json` e, se usar, um arquivo de fatos.
- **O que grava:** imagens PNG e `carousel.pdf`, só na pasta de saída que você escolher (`out/` por padrão).
- **Rede:** validar e gerar rodam num container Docker iniciado com `--network none`, então seu texto nunca sai da sua máquina. O único passo com rede é o `setup`, que baixa a imagem Docker e os pacotes npm fixados no `bun.lock`. Quando você instala como plugin do Claude Code, o Claude Code também instala esses pacotes fixados. Nenhum dado seu é enviado em nenhum dos dois casos.
- **Dados pessoais:** o projeto não coleta, não guarda e não envia dados pessoais. Não mantém nada depois que o comando termina, além dos arquivos que grava na sua pasta de saída.

O Claude Code e o Docker têm suas próprias políticas de privacidade, que este projeto não controla.
