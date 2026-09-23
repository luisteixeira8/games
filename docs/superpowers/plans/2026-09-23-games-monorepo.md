# Games Monorepo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidar o portal Durius Games, Coroa, Stack Tower e Tic-Tac-Toe num único site GitHub Pages sem misturar as dependências ou alterar a lógica dos jogos.

**Architecture:** O portal fica na raiz e os três jogos ficam em `apps/`, cada um com o seu próprio projecto e lockfile. Um script Node na raiz compõe `dist/`: copia o portal e o Tic-Tac-Toe e constrói os dois apps Vite nos seus subcaminhos. Um único workflow GitHub Pages valida e publica esse resultado.

**Tech Stack:** HTML, CSS e JavaScript estático; React 19; TypeScript; Vite; Vitest; ESLint; Node.js 22; GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-23-games-monorepo-design.md`

## Global Constraints

- Os projectos dentro de `apps/` mantêm os seus `package.json`, lockfiles, testes, documentação e fontes.
- Não serão introduzidas dependências partilhadas nem uma reescrita do Tic-Tac-Toe.
- O portal usa links relativos para `coroa/`, `stack-tower/` e `tictactoe/`.
- Em GitHub Pages, as bases Vite são `/<repo>/coroa/` e `/<repo>/stack-tower/`; em builds locais, são `/coroa/` e `/stack-tower/`.
- O workflow publica apenas `dist/`.

## Review Focus

- Um build GitHub Pages servido num subdirectório precisa de manter CSS, JS, manifestos, service workers, favicons e puzzles sob a base do repositório; coberto pelas verificações de saída da Task 4.
- A cópia do Tic-Tac-Toe não pode levar o `.git` ou workflows aninhados nem perder `assets/`; coberto pela listagem estrutural da Task 1 e pelo build da Task 4.
- Um portal aberto em `/games/` precisa de navegar para os três jogos com links relativos, sem continuar a apontar para os repositórios antigos; coberto pelo teste textual da Task 3.
- Os comandos dos dois apps React devem continuar a usar o directório certo e os lockfiles certos; coberto pelos checks da Task 2 e da Task 4.
- Um build repetido deve limpar o `dist/` antigo para não publicar ficheiros órfãos; coberto pelo teste de composição da Task 2.

### Task 1: Criar a árvore consolidada

**Files:**
- Create: `index.html`, `styles.css`, `script.js`, `brand-lockup.svg`, `brand-mark.svg`, `brand-pattern.svg`, `favicon.svg`, `og-image.svg`
- Create: `apps/coroa/**` a partir do conteúdo do repo `coroa`
- Create: `apps/stack-tower/**` a partir do conteúdo do repo `stack-tower`
- Create: `apps/tictactoe/**` a partir do conteúdo do repo `tictactoe`
- Create: `docs/superpowers/specs/2026-09-23-games-monorepo-design.md`
- Create: `docs/superpowers/plans/2026-09-23-games-monorepo.md`
- Remove from copied app trees: `.git/` e `.github/workflows/*`

**Interfaces:**
- Produces the source tree consumed by Tasks 2–5.
- Preserves the app-local entry points: `apps/coroa/src/main.tsx`, `apps/stack-tower/src/main.tsx` and `apps/tictactoe/index.html`.

- [ ] **Step 1: Copy the portal and app source trees**

  ```bash
  mkdir -p apps
  cp -R /private/tmp/repo-merge.i4g4Yu/games/. ./
  cp -R /private/tmp/repo-merge.i4g4Yu/coroa ./apps/coroa
  cp -R /private/tmp/repo-merge.i4g4Yu/stack-tower ./apps/stack-tower
  cp -R /private/tmp/repo-merge.i4g4Yu/tictactoe ./apps/tictactoe
  rm -rf apps/coroa/.git apps/stack-tower/.git apps/tictactoe/.git
  rm -rf apps/coroa/.github apps/stack-tower/.github apps/tictactoe/.github
  ```

- [ ] **Step 2: Verify the copied boundaries**

  ```bash
  test -f index.html
  test -f apps/coroa/package.json
  test -f apps/stack-tower/package.json
  test -f apps/tictactoe/index.html
  test -f apps/tictactoe/assets/js/game.js
  test -f apps/coroa/public/puzzles/manifest.json
  test ! -d apps/coroa/.git
  test ! -d apps/stack-tower/.git
  test ! -d apps/tictactoe/.git
  ```

### Task 2: Centralizar os comandos e a composição do build

**Files:**
- Create: `package.json`
- Create: `scripts/build.mjs`
- Create: `scripts/validate-puzzles.mjs`

**Interfaces:**
- `npm run build` calls `scripts/build.mjs` and produces `dist/index.html`, `dist/coroa/`, `dist/stack-tower/` and `dist/tictactoe/`.
- `scripts/build.mjs` invokes `npm run build` inside each Vite app with `VITE_BASE_PATH` and an app-specific `--outDir`.

- [ ] **Step 1: Add root scripts**

  Create `package.json` with no runtime dependencies:

  ```json
  {
    "name": "durius-games",
    "private": true,
    "version": "1.0.0",
    "type": "module",
    "scripts": {
      "build": "node scripts/build.mjs",
      "lint": "npm --prefix apps/coroa run lint",
      "typecheck": "npm --prefix apps/coroa run typecheck && npm --prefix apps/stack-tower run typecheck",
      "test": "npm --prefix apps/coroa test && npm --prefix apps/stack-tower run test:run",
      "validate:puzzles": "node scripts/validate-puzzles.mjs",
      "validate": "npm run lint && npm run typecheck && npm run test && npm run validate:puzzles && npm run build"
    }
  }
  ```

- [ ] **Step 2: Implement the clean composition script**

  Create `scripts/build.mjs` with these exact responsibilities:

  ```js
  import { cp, mkdir, rm } from 'node:fs/promises';
  import { spawnSync } from 'node:child_process';
  import { resolve } from 'node:path';

  const root = resolve(import.meta.dirname, '..');
  const dist = resolve(root, 'dist');
  const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1];
  const sitePrefix = repositoryName ? `/${repositoryName}` : '';

  const run = (args, env = {}) => {
    const result = spawnSync('npm', args, { cwd: root, env: { ...process.env, ...env }, stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status ?? 1);
  };

  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  for (const file of ['index.html', 'styles.css', 'script.js', 'brand-lockup.svg', 'brand-mark.svg', 'brand-pattern.svg', 'favicon.svg', 'og-image.svg']) {
    await cp(resolve(root, file), resolve(dist, file));
  }

  run(['--prefix', resolve(root, 'apps/coroa'), 'run', 'build', '--', '--outDir', resolve(dist, 'coroa')], {
    VITE_BASE_PATH: `${sitePrefix}/coroa/`,
  });
  run(['--prefix', resolve(root, 'apps/stack-tower'), 'run', 'build', '--', '--outDir', resolve(dist, 'stack-tower')], {
    VITE_BASE_PATH: `${sitePrefix}/stack-tower/`,
  });
  await cp(resolve(root, 'apps/tictactoe'), resolve(dist, 'tictactoe'), { recursive: true });
  ```

- [ ] **Step 3: Run the root script once after installing app dependencies**

  ```bash
  npm ci --prefix apps/coroa
  npm ci --prefix apps/stack-tower
  npm run build
  ```

  Expected: the command exits with status 0 and `dist/coroa/index.html`, `dist/stack-tower/index.html` and `dist/tictactoe/index.html` exist.

- [ ] **Step 4: Keep puzzle validation independent from the tsx IPC launcher**

  Create `scripts/validate-puzzles.mjs` to run the existing Coroa validator from `apps/coroa` with `node --import tsx/esm`. Use `npm run validate:puzzles` from the root and keep `apps/coroa`'s standalone `puzzles:validate` script unchanged.

### Task 3: Adapt base paths and portal navigation

**Files:**
- Modify: `apps/stack-tower/vite.config.ts`
- Modify: `apps/coroa/index.html`
- Modify: `index.html`

**Interfaces:**
- `VITE_BASE_PATH` overrides the default Vite base for both React apps.
- Every game card and console link in the portal points to a relative subdirectory.

- [ ] **Step 1: Make Stack Tower honour the composed base**

  Change the base calculation in `apps/stack-tower/vite.config.ts` to prefer the explicit environment value:

  ```ts
  const repositoryName = runtime.process?.env?.GITHUB_REPOSITORY?.split('/')[1] ?? 'stack-tower';
  const base = runtime.process?.env?.VITE_BASE_PATH ?? (mode === 'production' ? `/${repositoryName}/` : '/');
  ```

- [ ] **Step 2: Make Coroa's favicon base-aware**

  In `apps/coroa/index.html`, replace the root-absolute favicon path with Vite's base placeholder:

  ```html
  <link rel="icon" type="image/svg+xml" href="%BASE_URL%favicon.svg" />
  ```

- [ ] **Step 3: Point the portal at local game paths**

  Replace all six absolute `https://luisteixeira8.github.io/.../` game links in the root `index.html` with these relative targets:

  ```text
  https://luisteixeira8.github.io/coroa/       -> coroa/
  https://luisteixeira8.github.io/stack-tower/ -> stack-tower/
  https://luisteixeira8.github.io/tictactoe/   -> tictactoe/
  ```

- [ ] **Step 4: Pin the navigation regression**

  ```bash
  ! rg -n 'https://luisteixeira8\.github\.io/(coroa|stack-tower|tictactoe)' index.html
  test "$(rg -o 'href="(coroa|stack-tower|tictactoe)/"' index.html | wc -l | tr -d ' ')" -eq 6
  ```

### Task 4: Add the single GitHub Pages workflow and verify the output

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- The workflow installs both dependency trees, runs all existing checks, builds the composed `dist/`, and uploads only that directory.

- [ ] **Step 1: Create the root workflow**

  ```yaml
  name: Build and deploy Games

  on:
    push:
      branches: [main]
    workflow_dispatch:

  permissions:
    contents: read
    pages: write
    id-token: write

  concurrency:
    group: pages
    cancel-in-progress: true

  jobs:
    build:
      runs-on: ubuntu-latest
      steps:
        - name: Checkout
          uses: actions/checkout@v4
        - name: Setup Node.js
          uses: actions/setup-node@v4
          with:
            node-version: 22
        - name: Install Coroa dependencies
          run: npm ci --prefix apps/coroa
        - name: Install Stack Tower dependencies
          run: npm ci --prefix apps/stack-tower
        - name: Validate Coroa
          run: npm --prefix apps/coroa run lint && npm --prefix apps/coroa run typecheck && npm --prefix apps/coroa test && npm run validate:puzzles
        - name: Validate Stack Tower
          run: npm --prefix apps/stack-tower run typecheck && npm --prefix apps/stack-tower run test:run
        - name: Build site
          run: npm run build
        - name: Configure Pages
          uses: actions/configure-pages@v5
        - name: Upload site
          uses: actions/upload-pages-artifact@v3
          with:
            path: dist
        - name: Deploy site
          id: deployment
          uses: actions/deploy-pages@v4
  ```

- [ ] **Step 2: Verify all local checks**

  ```bash
  npm run lint
  npm run typecheck
  npm test
  npm run validate:puzzles
  npm run build
  ```

  Expected: all commands exit successfully, the validation report remains approved, and all four entry points exist in `dist/`.

- [ ] **Step 3: Verify path-sensitive build output**

  ```bash
  rg -n 'href="/(favicon|assets)|src="/(assets|src)' dist/coroa dist/stack-tower dist/tictactoe || true
  test -f dist/coroa/puzzles/manifest.json
  test -f dist/stack-tower/manifest.webmanifest
  test -f dist/tictactoe/assets/css/styles.css
  ```

  Expected: no root-absolute app asset references are reported; the three apps contain their required runtime assets.

### Task 5: Update documentation for the monorepo

**Files:**
- Create: `README.md`
- Modify: `apps/stack-tower/README.md`
- Modify: `apps/tictactoe/README.md`

**Interfaces:**
- The root README documents installation, validation, build and the three published game paths.
- App READMEs no longer claim that the apps are separate repositories with separate deployment pipelines.

- [ ] **Step 1: Add the root README**

  Document the structure, the required Node.js version, the two `npm ci --prefix` commands, `npm run validate`, the output directories and the relative published paths.

- [ ] **Step 2: Update stale standalone URLs and deployment instructions**

  In the Stack Tower and Tic-Tac-Toe READMEs, replace standalone live-demo URLs with `/games/stack-tower/` and `/games/tictactoe/`, and describe the root workflow as the deployment entry point.

- [ ] **Step 3: Check documentation links and claims**

  ```bash
  ! rg -n 'luisteixeira8\.github\.io/(coroa|stack-tower|tictactoe)/?' apps README.md
  rg -n 'apps/(coroa|stack-tower|tictactoe)|npm run validate|dist/' README.md
  ```

### Task 6: Final structural and visual handoff

**Files:**
- Verify: `dist/**`, `apps/**`, `.github/workflows/deploy.yml`

**Interfaces:**
- Produces the final local deliverable and a truthful verification summary.

- [ ] **Step 1: Check for nested repositories and stale workflows**

  ```bash
  test "$(find . -type d -name .git -print | wc -l | tr -d ' ')" -eq 1
  test "$(find apps -path '*/.github/workflows/*' -type f | wc -l | tr -d ' ')" -eq 0
  test -f .github/workflows/deploy.yml
  ```

- [ ] **Step 2: Inspect the final generated tree**

  ```bash
  find dist -maxdepth 2 -type f -print | sort
  du -sh dist
  ```

- [ ] **Step 3: Report the verification boundary**

  Report the commands that passed and distinguish them from browser visual QA. If the local browser/server policy blocks opening `dist/`, say so explicitly instead of claiming visual verification.

No Git commit is included in the execution steps because this Codex workspace currently rejects creation of `.git`; the finished files remain available for the user to copy or commit in a normal checkout.
