import { describe, expect, it } from 'vitest';
import { gameReducer, initialGame } from './state';
import { puzzle } from '../test/fixture';

describe('estado e histórico', () => {
  it('faz jogadas, desfaz, refaz e reinicia', () => {
    let state = initialGame(puzzle);
    state = gameReducer(state, { type: 'cycle', index: 0, puzzle, validate: true });
    state = gameReducer(state, { type: 'cycle', index: 0, puzzle, validate: true });
    expect(state.cells[0]).toBe(2);
    state = gameReducer(state, { type: 'undo' }); expect(state.cells[0]).toBe(1);
    state = gameReducer(state, { type: 'redo' }); expect(state.cells[0]).toBe(2);
    state = gameReducer(state, { type: 'restart' }); expect(state.cells.every((cell) => cell === 0)).toBe(true); expect(state.elapsed).toBe(0);
  });
  it('só conclui com uma disposição válida, mesmo diferente da solução guardada', () => {
    let state = initialGame({ ...puzzle, solution: [5, 4, 3, 2, 1, 0] });
    for (const [row, col] of puzzle.solution.entries()) state = gameReducer(state, { type: 'set', index: row * 6 + col, value: 2, puzzle, validate: true });
    expect(state.completed).toBe(true);
  });
});
