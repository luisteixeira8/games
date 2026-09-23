import type { Puzzle } from '../types/puzzle';
import { findConflicts, isSolved, nextCellState, type CellState } from './rules';

export interface Move { index: number; before: CellState; after: CellState }
export interface GameState {
  puzzleId: string; cells: CellState[]; undo: Move[]; redo: Move[];
  elapsed: number; errors: number; hints: number; paused: boolean; completed: boolean; selected: number;
}
export type GameAction =
  | { type: 'cycle'; index: number; puzzle: Puzzle; validate: boolean }
  | { type: 'set'; index: number; value: CellState; puzzle: Puzzle; validate: boolean }
  | { type: 'undo' } | { type: 'redo' } | { type: 'tick' } | { type: 'pause' }
  | { type: 'select'; index: number } | { type: 'hint' } | { type: 'restart' };

export function initialGame(puzzle: Puzzle): GameState {
  return { puzzleId: puzzle.id, cells: Array<CellState>(puzzle.size * puzzle.size).fill(0), undo: [], redo: [], elapsed: 0, errors: 0, hints: 0, paused: false, completed: false, selected: 0 };
}

function applyMove(state: GameState, action: Extract<GameAction, { type: 'set' }>): GameState {
  if (state.paused || state.completed || state.cells[action.index] === action.value) return state;
  const cells = [...state.cells]; const before = cells[action.index]!; cells[action.index] = action.value;
  const conflict = action.validate && action.value === 2 && findConflicts(action.puzzle, cells).some((entry) => entry.index === action.index);
  return { ...state, cells, undo: [...state.undo, { index: action.index, before, after: action.value }], redo: [], errors: state.errors + (conflict ? 1 : 0), completed: isSolved(action.puzzle, cells), selected: action.index };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'cycle': return applyMove(state, { type: 'set', index: action.index, value: nextCellState(state.cells[action.index]!), puzzle: action.puzzle, validate: action.validate });
    case 'set': return applyMove(state, action);
    case 'undo': {
      const move = state.undo.at(-1); if (!move || state.paused) return state;
      const cells = [...state.cells]; cells[move.index] = move.before;
      return { ...state, cells, undo: state.undo.slice(0, -1), redo: [...state.redo, move], completed: false, selected: move.index };
    }
    case 'redo': {
      const move = state.redo.at(-1); if (!move || state.paused) return state;
      const cells = [...state.cells]; cells[move.index] = move.after;
      return { ...state, cells, undo: [...state.undo, move], redo: state.redo.slice(0, -1), selected: move.index };
    }
    case 'tick': return state.paused || state.completed ? state : { ...state, elapsed: state.elapsed + 1 };
    case 'pause': return state.completed ? state : { ...state, paused: !state.paused };
    case 'select': return { ...state, selected: action.index };
    case 'hint': return { ...state, hints: state.hints + 1 };
    case 'restart': return { ...state, cells: state.cells.map(() => 0), undo: [], redo: [], elapsed: 0, errors: 0, hints: 0, paused: false, completed: false, selected: 0 };
  }
}
