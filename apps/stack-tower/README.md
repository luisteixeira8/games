# Stack Tower

A mobile-first precision game. Stop each moving floor at the right moment, trim the overhang, and build the tallest tower you can. Stack Tower is fast, installable, responsive, and ready for GitHub Pages.

> **Play:** `https://luisteixeira8.github.io/games/stack-tower/` 

<!-- Replace this comment with a gameplay screenshot or GIF. -->

## Features

- Touch, mouse, Space, and Enter controls
- Precise overlap detection with falling cut sections
- Perfect placements, streak bonuses, particles, and sound feedback
- Increasing speed, vertical camera movement, and instant restarts
- Day and night themes with an animated city backdrop
- Separate controls for music, city ambience, and block effects
- Pause, local high scores, and Web Share API support
- Installable PWA with offline support after the first visit
- Safe-area support, portrait-first layout, and reduced-motion mode

## Tech stack

React 19, TypeScript, Vite, Canvas 2D, Vitest, and `vite-plugin-pwa`. Deployment uses the official GitHub Pages actions.

## Setup

Node.js 22 or newer is recommended.

```bash
npm install
npm run dev
```

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run test` | Run tests in watch mode |
| `npm run test:run` | Run the full test suite once |
| `npm run typecheck` | Validate TypeScript types |
| `npm run build` | Generate the production build in `dist/` |
| `npm run preview` | Preview the production build locally |

## Project structure

```text
src/
├── components/       Reusable interface components
├── game/             Engine, collision, difficulty, scoring, and Canvas
├── hooks/            React integration and game lifecycle
├── services/         Audio, storage, and sharing
├── styles/           Visual identity and responsive layout
├── types/            Shared TypeScript domain types
├── App.tsx            Interface states and composition
└── main.tsx           Application entry point and PWA registration
```

The `GameEngine` keeps frame-by-frame state outside React. `requestAnimationFrame` updates movement, while `GameRenderer` draws the game at the correct device pixel ratio. React only receives discrete events such as placements, score changes, pauses, and game over. This avoids rendering React at 60 FPS and keeps collision logic easy to test.

## Technical decisions

- **Canvas 2D:** predictable animation performance with direct drawing control.
- **Pure game modules:** collision, difficulty, and scoring are deterministic and unit tested.
- **Defensive persistence:** stored data is validated and safely migrated from older formats.
- **Procedural audio:** music, city ambience, and effects use one reusable `AudioContext` with no external audio files.
- **No router:** the game has one logical screen and works directly inside a GitHub Pages subdirectory.

## Accessibility and performance

Controls have accessible names, visible focus styles, keyboard support, and comfortable touch targets. Status updates use `aria-live`, and gameplay never relies on sound alone. When `prefers-reduced-motion` is enabled, decorative motion, particles, traffic, clouds, and birds are reduced or stopped.

The animation loop is cancelled on unmount, gameplay pauses when the page becomes hidden, frame delta is capped, and expired particles are removed. Canvas resolution follows the display and is capped at DPR 2 to balance sharpness and performance.

## Tests

The test suite covers overlap calculations, left and right cuts, perfect placement, game over, difficulty progression, scoring, engine lifecycle, and invalid or unavailable storage.

```bash
npm run test:run
npm run typecheck
npm run build
```

## Monorepo deployment

Stack Tower is built by the root `.github/workflows/deploy.yml` workflow and published under `https://luisteixeira8.github.io/games/stack-tower/`.

The root `scripts/build.mjs` passes `VITE_BASE_PATH` to this app so its JavaScript, manifest, service worker and assets work from the `/games/stack-tower/` subpath. When the repository is renamed, the workflow's `GITHUB_REPOSITORY` value supplies the new prefix automatically.

## Possible next steps

- Shareable daily challenges
- Unlockable themes and detailed statistics
- Optional online leaderboards
- A slower accessibility mode
