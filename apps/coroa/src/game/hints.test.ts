import { describe, expect, it } from 'vitest';
import { getHint } from './hints';
import { initialGame } from './state';
import { puzzle } from '../test/fixture';

describe('dicas graduais', () => {
  it('evolui de unidade para impossível, X e coroa', () => {
    const state = initialGame(puzzle);
    expect(getHint(puzzle, state).level).toBe(1);
    expect(getHint(puzzle, { ...state, hints: 1 }).index).toBeTypeOf('number');
    expect(getHint(puzzle, { ...state, hints: 2 }).proposed).toBe(1);
    expect(getHint(puzzle, { ...state, hints: 3 }).proposed).toBe(2);
  });
});
