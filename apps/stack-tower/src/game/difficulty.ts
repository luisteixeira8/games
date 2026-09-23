import { GAME_CONFIG } from './gameConfig';

export function speedForLevel(level: number): number {
  return Math.min(
    GAME_CONFIG.maxSpeed,
    GAME_CONFIG.initialSpeed + Math.max(0, level - 1) * GAME_CONFIG.speedPerLevel
  );
}

export function difficultyProgress(speed: number): number {
  const range = GAME_CONFIG.maxSpeed - GAME_CONFIG.initialSpeed;
  return Math.max(0, Math.min(1, (speed - GAME_CONFIG.initialSpeed) / range));
}
