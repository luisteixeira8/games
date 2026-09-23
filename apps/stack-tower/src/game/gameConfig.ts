export const GAME_CONFIG = {
  blockHeight: 42,
  initialWidthRatio: 0.56,
  maxInitialWidth: 248,
  minInitialWidth: 150,
  initialSpeed: 155,
  speedPerLevel: 5.2,
  maxSpeed: 390,
  perfectTolerance: 5.5,
  perfectGrowth: 2,
  cameraStartLevel: 5,
  visibleLevels: 8,
  sliceGravity: 920,
  sliceLifetime: 1.4
} as const;

export function getInitialBlockWidth(worldWidth: number): number {
  return Math.min(
    GAME_CONFIG.maxInitialWidth,
    Math.max(GAME_CONFIG.minInitialWidth, worldWidth * GAME_CONFIG.initialWidthRatio)
  );
}
