import { describe, expect, it } from 'vitest';
import { difficultyProgress, speedForLevel } from './difficulty';
import { GAME_CONFIG } from './gameConfig';

describe('difficulty', () => {
  it('aumenta a velocidade por nível', () => {
    expect(speedForLevel(2)).toBeGreaterThan(speedForLevel(1));
  });

  it('respeita o limite máximo', () => {
    expect(speedForLevel(1000)).toBe(GAME_CONFIG.maxSpeed);
  });

  it('normaliza o progresso entre zero e um', () => {
    expect(difficultyProgress(GAME_CONFIG.initialSpeed)).toBe(0);
    expect(difficultyProgress(GAME_CONFIG.maxSpeed)).toBe(1);
  });
});
