import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadStats, sanitizeStats, saveStats } from './storageService';

describe('storageService', () => {
  beforeEach(() => localStorage.clear());

  it('valida e recupera dados corrompidos', () => {
    expect(sanitizeStats({ bestScore: -4, soundEnabled: 'sim', totalGames: 2.8 })).toMatchObject({
      bestScore: 0,
      musicEnabled: true,
      ambientEnabled: true,
      effectsEnabled: true,
      totalGames: 2
    });
    localStorage.setItem('stack-tower:stats:v1', '{inválido');
    expect(loadStats().bestScore).toBe(0);
  });

  it('persiste a melhor pontuação', () => {
    saveStats({ bestScore: 42, musicEnabled: false, ambientEnabled: true, effectsEnabled: false, theme: 'day', totalGames: 3, bestStreak: 5, lastPlayedAt: 10 });
    expect(loadStats()).toMatchObject({ bestScore: 42, musicEnabled: false, ambientEnabled: true, effectsEnabled: false, theme: 'day', bestStreak: 5 });
  });

  it('não falha quando o armazenamento está indisponível', () => {
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('indisponível');
    });
    expect(() => saveStats({ bestScore: 1, musicEnabled: true, ambientEnabled: true, effectsEnabled: true, theme: 'night', totalGames: 1, bestStreak: 0, lastPlayedAt: null })).not.toThrow();
    spy.mockRestore();
  });
});
