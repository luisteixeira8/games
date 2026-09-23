# Durius Games

Colecção de pequenos jogos de browser inspirados pelo ritmo e pela paisagem do Douro.

O repositório reúne quatro experiências num único site:

- portal da colecção: `/games/`
- Coroa: `/games/coroa/`
- Stack Tower: `/games/stack-tower/`
- Tic-Tac-Toe: `/games/tictactoe/`

## Estrutura

```text
.
├── index.html, styles.css, script.js       # portal
├── apps/coroa/                              # React + Vite + puzzles
├── apps/stack-tower/                        # React + Vite + PWA + Canvas
├── apps/tictactoe/                          # HTML + CSS + JavaScript
├── scripts/build.mjs                        # composição do site
└── .github/workflows/deploy.yml             # publicação única
```

Cada app mantém o seu próprio `package.json`, lockfile, código e testes. Não há dependências partilhadas entre os jogos.

## Requisitos

- Node.js 22 ou superior
- npm 10 ou superior

## Desenvolvimento e validação

Instalar as duas árvores com dependências:

```bash
npm ci --prefix apps/coroa
npm ci --prefix apps/stack-tower
```

Checks individuais:

```bash
npm run lint
npm run typecheck
npm test
npm run validate:puzzles
```

O build completo limpa `dist/`, copia o portal e o Tic-Tac-Toe, e compila Coroa e Stack Tower para os seus subcaminhos:

```bash
npm run build
```

O resultado fica em `dist/`:

```text
dist/index.html
dist/coroa/
dist/stack-tower/
dist/tictactoe/
```

Para correr tudo de uma vez:

```bash
npm run validate
```

## Publicação

O workflow `.github/workflows/deploy.yml` instala as dependências dos dois apps React, executa lint, typecheck, testes, validação da base de puzzles e o build completo. O único artefacto publicado é `dist/` através do GitHub Pages.

O build detecta `GITHUB_REPOSITORY` para criar bases como `/games/coroa/` e `/games/stack-tower/`. Sem essa variável, os builds locais usam `/coroa/` e `/stack-tower/`.

Consulta os READMEs dentro de cada app para conhecer as regras, controlos e decisões técnicas específicas de cada jogo.
