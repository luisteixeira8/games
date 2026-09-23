# Coroa

**Coroa** is a static logic game with a daily challenge, free play, progressive hints, local statistics, and 1,000 pre-generated puzzles with unique solutions.

It has no backend, accounts, paid services, or required external resources. Progress is stored in the browser with `localStorage`.

## Rules

Place exactly one crown in every row, column, and colored region. Two crowns cannot touch diagonally. Each cell cycles through empty, X, and crown.

On a computer, right-click to place or remove an X. Use the arrow keys to move; `X`, `Q`, `Enter`, and `Space` change the selected cell. `Ctrl/⌘ Z`, `Ctrl/⌘ Shift Z`, and `Ctrl Y` undo or redo moves.

## Technology

- React, strict TypeScript, and Vite
- Vitest, Testing Library, and jsdom
- ESLint with TypeScript and React rules
- Progressively loaded static JSON puzzle data
- GitHub Actions and GitHub Pages

## Project structure

```text
src/
  components/       reusable interface components
  game/             rules, state, history, and hints without React
  puzzles/          solver, canonicalization, difficulty, and loading
  stats/            local statistics
  storage/          persistence and safe recovery
  types/            data contracts
  test/             test setup and fixtures
tools/
  lib/generator.ts  solutions, connected regions, and puzzle creation
  generate-database.ts
  validate-database.ts
public/puzzles/     manifest and 40 blocks of 25 puzzles
root .github/workflows/deploy.yml
```

## Requirements and installation

Node.js 22 or later and npm 10 or later are required.

```bash
npm ci
```

For an initial installation without `package-lock.json`, use `npm install`. The committed lockfile keeps CI and later installations reproducible.

## Local development

```bash
npm run dev
```

Open the address shown by Vite. In development, the app validates the schema of the manifest and each loaded data block.

## Quality checks

```bash
npm run lint
npm run typecheck
npm test
```

The tests cover game rules, conflicts, connected regions, solution counting, canonical transformations, difficulty classification, deterministic daily selection, state history, hints, persistence, progressive loading, completion, and the main interface flows. The full database test independently solves all 1,000 puzzles.

## Generate the puzzle database

```bash
npm run puzzles:generate
```

The generator starts from the fixed seed `0x00c0a0a` and advances deterministically. It creates a valid permutation, builds connected regions through multi-source growth, and refines region boundaries to eliminate alternative solutions. Invalid seeds are skipped without relaxing any validation rule. Running the command recreates `public/puzzles/` with the same database.

Difficulty is based on solver metrics. The score combines hypotheses (×12), backtracks (×2), depth, explored states, eliminated candidates, a small size factor, and a reduction for direct deductions. Version 1 uses these thresholds:

- Easy: score up to 520
- Medium: 521 to 3,200
- Hard: above 3,200

Board size never determines difficulty on its own.

## Validate all 1,000 puzzles

```bash
npm run puzzles:validate
```

The validator reads every block and checks checksums, schemas, the 300/400/300 distribution, IDs, connected regions, canonical signatures, and difficulty labels. It solves every puzzle independently without trusting the stored solution and stops each search after finding two solutions. Any failure produces a non-zero exit code.

It writes:

- `validation-report.json`: the full report, including solution counts and metric distributions
- `VALIDATION.md`: a readable audit summary

The global signature binds each puzzle ID to its canonical structure and solution. Changing any puzzle changes this signature.

## Production build

```bash
npm run build
npm run preview
```

The build is written to `dist/`. The app does not use client-side routes, so refreshing on GitHub Pages does not produce a 404. JSON resources and the favicon use `import.meta.env.BASE_URL` or Vite's base-aware asset handling.

## Base path and GitHub Pages

In GitHub Actions, Vite reads the repository name from `GITHUB_REPOSITORY` and automatically uses `/<repository-name>/`. To test another path locally:

```bash
VITE_BASE_PATH=/new-path/ npm run build
```

If the repository name changes, no source edit is required. For a site hosted at the domain root, build with `VITE_BASE_PATH=/`.

### Monorepo deployment

Coroa is built by the root `.github/workflows/deploy.yml` workflow and published under `https://luisteixeira8.github.io/games/coroa/`.

The root `scripts/build.mjs` supplies `VITE_BASE_PATH` so the puzzle manifest, lazy-loaded puzzle blocks and favicon resolve correctly from the `/games/coroa/` subpath. The workflow runs linting, type checks, tests, full puzzle validation and the composed production build before deployment.

## Local data and privacy

Settings, active games, history, times, and streaks stay in the browser. Incomplete or corrupted data falls back to safe defaults. Clearing site data removes progress. Sound is optional and off by default.

## Known limitations

- Progress does not sync between devices because the app has no backend.
- Sharing uses Web Share when available and falls back to the clipboard. Clipboard access depends on browser permissions.
- On a 320 px screen, 10×10 boards use the full available width, so their cells are naturally more compact.
