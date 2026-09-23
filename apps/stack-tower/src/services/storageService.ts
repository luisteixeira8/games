import type { PersistedStats } from '../types/game';

const KEY = 'stack-tower:stats:v1';
const DEFAULTS: PersistedStats = {
  bestScore: 0,
  musicEnabled: true,
  ambientEnabled: true,
  effectsEnabled: true,
  theme: 'night',
  totalGames: 0,
  bestStreak: 0,
  lastPlayedAt: null
};

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function sanitizeStats(value: unknown): PersistedStats {
  if (!value || typeof value !== 'object') return { ...DEFAULTS };
  const data = value as Partial<PersistedStats> & { soundEnabled?: unknown };
  const legacySound = typeof data.soundEnabled === 'boolean' ? data.soundEnabled : true;
  return {
    bestScore: isNonNegativeNumber(data.bestScore) ? Math.floor(data.bestScore) : 0,
    musicEnabled: typeof data.musicEnabled === 'boolean' ? data.musicEnabled : legacySound,
    ambientEnabled: typeof data.ambientEnabled === 'boolean' ? data.ambientEnabled : legacySound,
    effectsEnabled: typeof data.effectsEnabled === 'boolean' ? data.effectsEnabled : legacySound,
    theme: data.theme === 'day' || data.theme === 'night' ? data.theme : 'night',
    totalGames: isNonNegativeNumber(data.totalGames) ? Math.floor(data.totalGames) : 0,
    bestStreak: isNonNegativeNumber(data.bestStreak) ? Math.floor(data.bestStreak) : 0,
    lastPlayedAt: isNonNegativeNumber(data.lastPlayedAt) ? data.lastPlayedAt : null
  };
}

export function loadStats(): PersistedStats {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? sanitizeStats(JSON.parse(raw)) : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveStats(stats: PersistedStats): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(sanitizeStats(stats)));
  } catch {
    // Storage can be unavailable in private browsing or restricted contexts.
  }
}
