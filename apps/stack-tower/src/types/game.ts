export type GamePhase = 'menu' | 'playing' | 'paused' | 'gameover';
export type GameEvent = 'place' | 'cut' | 'perfect' | 'gameover' | 'record';
export type ColorTheme = 'day' | 'night';

export interface SoundPreferences {
  musicEnabled: boolean;
  ambientEnabled: boolean;
  effectsEnabled: boolean;
}

export interface Block {
  id: number;
  level: number;
  x: number;
  width: number;
  colorIndex: number;
}

export interface MovingBlock extends Block {
  direction: -1 | 1;
  speed: number;
}

export interface FallingSlice {
  id: number;
  level: number;
  x: number;
  width: number;
  colorIndex: number;
  velocityX: number;
  velocityY: number;
  rotation: number;
  age: number;
}

export interface GameSnapshot {
  phase: GamePhase;
  blocks: readonly Block[];
  movingBlock: MovingBlock | null;
  slices: readonly FallingSlice[];
  score: number;
  streak: number;
  bestStreak: number;
  speed: number;
  perfectFlash: number;
  cameraLevel: number;
  worldWidth: number;
}

export interface PlacementResult {
  overlap: number;
  x: number;
  width: number;
  cutX: number | null;
  cutWidth: number;
  perfect: boolean;
  gameOver: boolean;
}

export interface PersistedStats extends SoundPreferences {
  bestScore: number;
  theme: ColorTheme;
  totalGames: number;
  bestStreak: number;
  lastPlayedAt: number | null;
}
