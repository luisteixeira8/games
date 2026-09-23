import { calculatePlacement } from './collision';
import { speedForLevel } from './difficulty';
import { GAME_CONFIG, getInitialBlockWidth } from './gameConfig';
import { nextStreak, pointsForPlacement } from './scoring';
import type {
  Block,
  FallingSlice,
  GameEvent,
  GamePhase,
  GameSnapshot,
  MovingBlock
} from '../types/game';

type SnapshotListener = (snapshot: GameSnapshot) => void;
type EventListener = (event: GameEvent) => void;

export class GameEngine {
  private phase: GamePhase = 'menu';
  private blocks: Block[] = [];
  private movingBlock: MovingBlock | null = null;
  private slices: FallingSlice[] = [];
  private score = 0;
  private streak = 0;
  private bestStreak = 0;
  private perfectFlash = 0;
  private worldWidth = 390;
  private initialWidth = getInitialBlockWidth(this.worldWidth);
  private id = 0;
  private placementLocked = false;
  private snapshotListener: SnapshotListener;
  private eventListener: EventListener;

  constructor(onSnapshot: SnapshotListener, onEvent: EventListener) {
    this.snapshotListener = onSnapshot;
    this.eventListener = onEvent;
  }

  start(): void {
    this.id = 0;
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.slices = [];
    this.perfectFlash = 0;
    this.initialWidth = getInitialBlockWidth(this.worldWidth);
    const x = (this.worldWidth - this.initialWidth) / 2;
    this.blocks = [{ id: this.id++, level: 0, x, width: this.initialWidth, colorIndex: 0 }];
    this.phase = 'playing';
    this.spawnMovingBlock();
    this.emitSnapshot();
  }

  showMenu(): void {
    this.phase = 'menu';
    this.blocks = [];
    this.movingBlock = null;
    this.slices = [];
    this.score = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.perfectFlash = 0;
    this.emitSnapshot();
  }

  togglePause(): void {
    if (this.phase === 'playing') this.phase = 'paused';
    else if (this.phase === 'paused') this.phase = 'playing';
    else return;
    this.emitSnapshot();
  }

  pause(): void {
    if (this.phase === 'playing') {
      this.phase = 'paused';
      this.emitSnapshot();
    }
  }

  update(deltaSeconds: number): void {
    if (this.phase === 'menu' || this.phase === 'paused') return;
    const dt = Math.min(deltaSeconds, 0.034);

    if (this.phase === 'playing' && this.movingBlock) {
      this.movingBlock.x += this.movingBlock.direction * this.movingBlock.speed * dt;
      const maxX = Math.max(0, this.worldWidth - this.movingBlock.width);
      if (this.movingBlock.x <= 0) {
        this.movingBlock.x = 0;
        this.movingBlock.direction = 1;
      } else if (this.movingBlock.x >= maxX) {
        this.movingBlock.x = maxX;
        this.movingBlock.direction = -1;
      }
    }

    this.perfectFlash = Math.max(0, this.perfectFlash - dt * 2.5);
    this.updateSlices(dt);
  }

  place(): void {
    if (this.phase !== 'playing' || !this.movingBlock || this.placementLocked) return;
    this.placementLocked = true;

    const moving = this.movingBlock;
    const base = this.blocks[this.blocks.length - 1];
    const result = calculatePlacement(
      moving.x,
      moving.width,
      base.x,
      base.width,
      GAME_CONFIG.perfectTolerance,
      Math.min(this.initialWidth, base.width + GAME_CONFIG.perfectGrowth)
    );

    if (result.gameOver) {
      this.addSlice(moving.x, moving.width, moving.level, moving.colorIndex, moving.direction);
      this.movingBlock = null;
      this.phase = 'gameover';
      this.eventListener('gameover');
      this.emitSnapshot();
      this.placementLocked = false;
      return;
    }

    if (result.cutX !== null && result.cutWidth > 0.01) {
      this.addSlice(result.cutX, result.cutWidth, moving.level, moving.colorIndex, moving.direction);
      this.eventListener('cut');
    }

    this.streak = nextStreak(this.streak, result.perfect);
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    this.score += pointsForPlacement(this.streak);
    this.blocks.push({
      id: this.id++,
      level: moving.level,
      x: result.x,
      width: result.width,
      colorIndex: moving.colorIndex
    });

    if (result.perfect) {
      this.perfectFlash = 1;
      this.eventListener('perfect');
    } else {
      this.eventListener('place');
    }

    this.spawnMovingBlock();
    this.emitSnapshot();
    this.placementLocked = false;
  }

  resize(worldWidth: number): void {
    const nextWidth = Math.max(280, worldWidth);
    if (Math.abs(nextWidth - this.worldWidth) < 0.5) return;
    const ratio = nextWidth / this.worldWidth;
    this.blocks.forEach((block) => {
      block.x *= ratio;
      block.width *= ratio;
    });
    this.slices.forEach((slice) => {
      slice.x *= ratio;
      slice.width *= ratio;
    });
    if (this.movingBlock) {
      this.movingBlock.x *= ratio;
      this.movingBlock.width *= ratio;
    }
    this.initialWidth *= ratio;
    this.worldWidth = nextWidth;
    this.emitSnapshot();
  }

  getSnapshot(): GameSnapshot {
    const level = this.blocks.length - 1;
    return {
      phase: this.phase,
      blocks: this.blocks,
      movingBlock: this.movingBlock,
      slices: this.slices,
      score: this.score,
      streak: this.streak,
      bestStreak: this.bestStreak,
      speed: this.movingBlock?.speed ?? speedForLevel(level),
      perfectFlash: this.perfectFlash,
      cameraLevel: Math.max(0, level - GAME_CONFIG.cameraStartLevel),
      worldWidth: this.worldWidth
    };
  }

  private spawnMovingBlock(): void {
    const base = this.blocks[this.blocks.length - 1];
    const level = base.level + 1;
    const direction: -1 | 1 = level % 2 === 0 ? -1 : 1;
    this.movingBlock = {
      id: this.id++,
      level,
      x: direction === 1 ? 0 : Math.max(0, this.worldWidth - base.width),
      width: base.width,
      colorIndex: level,
      direction,
      speed: speedForLevel(level)
    };
  }

  private addSlice(x: number, width: number, level: number, colorIndex: number, direction: -1 | 1): void {
    this.slices.push({
      id: this.id++,
      level,
      x,
      width,
      colorIndex,
      velocityX: direction * 38,
      velocityY: -25,
      rotation: 0,
      age: 0
    });
  }

  private updateSlices(dt: number): void {
    for (const slice of this.slices) {
      slice.age += dt;
      slice.x += slice.velocityX * dt;
      slice.velocityY += GAME_CONFIG.sliceGravity * dt;
      slice.rotation += slice.velocityX * 0.0018;
    }
    this.slices = this.slices.filter((slice) => slice.age < GAME_CONFIG.sliceLifetime);
  }

  private emitSnapshot(): void {
    this.snapshotListener(this.getSnapshot());
  }
}
