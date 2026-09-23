<div align="center">

# Tic Tac Toe

A polished browser version of the classic game, built with plain HTML, CSS and JavaScript.

**No framework, build step or runtime dependencies.**

[Live demo](https://luisteixeira8.github.io/games/tictactoe/) · [Run locally](#running-the-game) · [Features](#features) · [How the CPU works](#how-the-cpu-works) · [Controls](#controls)

</div>

## About the game

This project turns Tic Tac Toe into a small arcade-style experience. It includes two-player and CPU modes, three difficulty levels, procedural sound, light and dark themes, and responsive controls for keyboard, mouse and touch.

The interface, styles and game logic are kept in separate files and run directly in the browser. Open `index.html` or serve the repository with any static file server.

## Features

- Play against another person on the same device or challenge the CPU
- Choose between easy, medium and hard CPU difficulty
- Keep track of wins, draws, streaks and recent results during the session
- Switch between light and dark themes
- Adjust procedural sound from 0% to 100%
- Navigate the board with a keyboard, mouse or touchscreen
- Play comfortably on desktop, tablet and mobile screens
- Reduce animations through the operating system's motion preference

The game does not use cookies, analytics or `localStorage`. Scores and settings reset when the page is reloaded.

## Running the game

The quickest option is to open `index.html` in a modern browser.

For a more representative local setup, start a small static server from the app directory:

```bash
cd apps/tictactoe
python3 -m http.server 8000
```

Then visit [http://127.0.0.1:8000](http://127.0.0.1:8000).

There is nothing to install or build.

## Publishing with GitHub Pages

The root repository includes a GitHub Actions workflow that publishes the whole collection whenever a change is pushed to `main`.

To enable the first deployment:

1. Make sure the repository is public when using GitHub Free.
2. Open **Settings → Pages** in the GitHub repository.
3. Under **Build and deployment**, select **GitHub Actions** as the source.
4. Push a change to `main`, or run **Build and deploy Games** manually from the **Actions** tab.

The site will be available at:

<https://luisteixeira8.github.io/games/tictactoe/>

No build command, package installation or paid hosting is required.

## Game modes

| Mode | X | O |
|---|---|---|
| Versus CPU | Player | Computer |
| Local duel | Player 1 | Player 2 |

The starting player alternates between rounds so that neither side always moves first.

### CPU difficulty

| Level | Behaviour |
|---|---|
| Easy | Chooses a random available cell |
| Medium | Mixes random choices with optimal moves |
| Hard | Uses minimax to choose the strongest move |

Easy mode also offers an optional hint for the player's next move.

## How the CPU works

Hard mode uses minimax to explore every possible continuation from the current board. A win scores positively, a loss scores negatively and a draw scores zero. The search also considers depth, so the CPU prefers quicker wins and delays unavoidable losses.

When several moves have the same score, the game chooses between them at random. This adds some variety without weakening the CPU's play. The hint available in easy mode uses a separate minimax evaluation from X's perspective.

## Controls

| Key | Action |
|---|---|
| `Tab` / `Shift + Tab` | Move between controls |
| Arrow keys | Move between board cells |
| `Enter` / `Space` | Place a mark or activate a control |
| `R` | Restart the current round |
| `Escape` | Close the volume panel or return to the menu |

The board uses grid semantics and descriptive labels for screen readers. Turn updates are announced politely, while results use a separate assertive live region. Focus moves to the rematch button when a round ends.

## Design and motion

The interface uses coral for X and acid green for O, with separate palettes for the dark and light themes. Chakra Petch and IBM Plex Mono are loaded from Google Fonts, with system fallbacks when the request is unavailable.

Animations give each action a distinct response: X and O draw differently, winning cells rise before the line appears, draws shake the board, and rematches rebuild the grid. If `prefers-reduced-motion` is enabled, animation and transition durations are reduced.

Sound effects are generated at runtime with the Web Audio API, so the project does not need audio files. Placements, interface actions, wins, losses and draws each have their own short sound.

## Project structure

```text
tictactoe/
├── assets/
│   ├── css/styles.css           # Themes, layout and animation
│   └── js/game.js               # Game logic, CPU, input and sound
├── favicon.svg                  # Browser icon
├── index.html                   # Accessible page structure
└── README.md                    # Project overview
```

The JavaScript is organised by responsibility inside an IIFE:

- game and session state
- move validation and result detection
- CPU strategies and minimax search
- rendering and accessibility labels
- animation triggers
- procedural audio
- pointer, touch and keyboard input

## Browser support

The game targets current versions of Chrome, Edge, Firefox and Safari. It relies on modern browser features such as CSS Grid, custom properties, `color-mix()`, the Web Animations API and the Web Audio API.

Effects such as `backdrop-filter` improve the presentation but are not required to play.

## Customisation

The main design tokens are defined near the top of `assets/css/styles.css`.

### Player colours

```css
:root {
  --x: #ff6047;
  --o: #cbff54;
}
```

If you change them, update the corresponding values under `[data-theme="light"]` as well.

### Animation timing

```css
:root {
  --fast: 160ms;
  --mid: 360ms;
  --ease: cubic-bezier(.2, .8, .2, 1);
  --snap: cubic-bezier(.16, 1, .3, 1);
}
```

### Default CPU difficulty

Change the initial value in the JavaScript state object:

```js
difficulty: 'medium'
```

Valid values are `easy`, `medium` and `hard`.

### Default volume

Keep the state value and range input in sync:

```js
volume: .85
```

```html
<input type="range" value="85">
```
