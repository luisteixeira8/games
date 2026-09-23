# Games monorepo — design

## Objectivo

Consolidar os repositórios `games`, `coroa`, `stack-tower` e `tictactoe` num único repositório, mantendo cada jogo funcional e testável de forma independente. O portal `games` continua a ser a página inicial da colecção.

## Estrutura

```text
.
├── index.html, styles.css, script.js       # portal Durius Games
├── brand-*.svg, favicon.svg, og-image.svg   # assets do portal
├── apps/
│   ├── coroa/                               # React + Vite + puzzles
│   ├── stack-tower/                         # React + Vite + PWA + Canvas
│   └── tictactoe/                            # HTML + CSS + JavaScript
├── scripts/build.mjs                        # composição do site final
├── package.json                              # comandos do monorepo
└── .github/workflows/deploy.yml             # único pipeline Pages
```

Os projectos dentro de `apps/` mantêm os seus `package.json`, lockfiles, testes, documentação e fontes. Os workflows de publicação individuais deixam de ser necessários e são substituídos pelo workflow da raiz.

## Build e URLs

O build produz `dist/` com esta forma:

```text
dist/
├── index.html                                # portal
├── ...assets do portal...
├── coroa/                                    # build Vite de Coroa
├── stack-tower/                              # build Vite de Stack Tower
└── tictactoe/                                # cópia do site estático
```

O portal usa links relativos para `coroa/`, `stack-tower/` e `tictactoe/`. Em GitHub Pages, o pipeline define as bases Vite para `/<repo>/coroa/` e `/<repo>/stack-tower/`; em builds locais, usa `/coroa/` e `/stack-tower/`. Os recursos de Coroa e Stack Tower devem continuar a resolver correctamente através de `import.meta.env.BASE_URL` e `%BASE_URL%`.

O script de build não mistura as dependências: instala-se e constrói-se cada app Vite no seu próprio directório. O jogo estático é apenas copiado para o destino final.

## Qualidade e publicação

O `package.json` da raiz fornece comandos para construir tudo e correr os checks existentes nos dois projectos React. O workflow instala as dependências de `apps/coroa` e `apps/stack-tower`, executa lint, typecheck, testes, validação dos 1.000 puzzles e build, e publica apenas `dist/`.

Não serão introduzidas dependências partilhadas nem uma reescrita do Tic-Tac-Toe. O objectivo é consolidar o código com a menor alteração de comportamento possível.

## Critérios de aceitação

1. Os quatro projectos estão no mesmo repositório sem directórios `.git` aninhados.
2. O portal abre cada jogo através de URLs relativas dentro do mesmo site.
3. `npm run build` na raiz produz os quatro destinos dentro de `dist/`.
4. Os checks existentes de Coroa e Stack Tower continuam a passar.
5. Os assets, os puzzles e a funcionalidade do Tic-Tac-Toe ficam acessíveis a partir dos novos subcaminhos.
6. Existe apenas um workflow de publicação na raiz.
