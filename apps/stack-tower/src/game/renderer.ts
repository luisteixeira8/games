import { GAME_CONFIG } from './gameConfig';
import type { Block, ColorTheme, FallingSlice, GameSnapshot } from '../types/game';

const PALETTE = [
  ['#6f52ff', '#9b78ff'],
  ['#5d64ff', '#4d9dff'],
  ['#328cff', '#20d2df'],
  ['#12bfc8', '#27e2a4'],
  ['#23d698', '#9be35c'],
  ['#e3da54', '#ffb34b'],
  ['#ff9d4a', '#ff5f76'],
  ['#f1558c', '#c95dff']
] as const;

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

export class GameRenderer {
  private context: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dpr = 1;
  private particles: Particle[] = [];
  private lastPerfectLevel = -1;
  private reducedMotion = false;
  private sceneTime = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is not available');
    this.context = context;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.context.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  render(snapshot: GameSnapshot, dt: number, theme: ColorTheme): void {
    const ctx = this.context;
    if (!this.reducedMotion && snapshot.phase !== 'paused') {
      this.sceneTime += Math.min(dt, 0.05);
    }
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawCity(theme);
    this.drawAtmosphere(snapshot.perfectFlash, theme);

    const foundationBlock = snapshot.blocks[0];
    if (foundationBlock) this.drawFoundation(foundationBlock, snapshot.cameraLevel, theme);
    for (const block of snapshot.blocks) this.drawBlock(block, snapshot.cameraLevel);
    if (snapshot.movingBlock) this.drawBlock(snapshot.movingBlock, snapshot.cameraLevel, true);
    for (const slice of snapshot.slices) this.drawSlice(slice, snapshot.cameraLevel);

    const top = snapshot.blocks[snapshot.blocks.length - 1];
    if (snapshot.perfectFlash > 0.9 && top && top.level !== this.lastPerfectLevel) {
      this.lastPerfectLevel = top.level;
      this.spawnParticles(top, snapshot.cameraLevel);
    }
    this.updateParticles(dt);
    this.drawParticles();
  }

  private screenY(level: number, cameraLevel: number): number {
    const floor = this.height - Math.max(104, this.height * 0.14);
    return floor - (level - cameraLevel) * GAME_CONFIG.blockHeight;
  }

  private drawFoundation(block: Block, cameraLevel: number, theme: ColorTheme): void {
    const ctx = this.context;
    const y = this.screenY(block.level, cameraLevel) + GAME_CONFIG.blockHeight - 4;
    if (y < -24 || y > this.height + 24) return;
    const overhang = Math.min(24, Math.max(14, block.width * 0.09));
    const x = Math.max(5, block.x - overhang);
    const width = Math.min(this.width - x - 5, block.width + overhang * 2);
    const height = 22;
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, theme === 'night' ? '#343a5a' : '#607f8d');
    gradient.addColorStop(0.2, theme === 'night' ? '#20263f' : '#486b7b');
    gradient.addColorStop(1, theme === 'night' ? '#0c1125' : '#2e5265');

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.38)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 8;
    this.roundedRect(x, y, width, height, 5);
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = theme === 'night' ? 'rgba(140, 218, 231, 0.34)' : 'rgba(237, 251, 252, 0.5)';
    ctx.fillRect(x + 5, y + 4, Math.max(0, width - 10), 2);
    ctx.fillStyle = 'rgba(0, 0, 10, 0.26)';
    ctx.fillRect(x + 8, y + height - 5, Math.max(0, width - 16), 5);
    ctx.restore();
  }

  private drawAtmosphere(flash: number, theme: ColorTheme): void {
    const ctx = this.context;
    const glow = ctx.createRadialGradient(
      this.width / 2,
      this.height * 0.55,
      20,
      this.width / 2,
      this.height * 0.55,
      this.width * 0.65
    );
    glow.addColorStop(0, theme === 'night'
      ? `rgba(90, 77, 218, ${0.10 + flash * 0.08})`
      : `rgba(255, 255, 255, ${0.08 + flash * 0.1})`);
    glow.addColorStop(1, theme === 'night' ? 'rgba(9, 11, 24, 0)' : 'rgba(162, 220, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawCity(theme: ColorTheme): void {
    const ctx = this.context;
    const horizon = this.height * 0.78;

    ctx.save();
    const skyGlow = ctx.createRadialGradient(
      this.width * 0.76,
      horizon * 0.34,
      5,
      this.width * 0.76,
      horizon * 0.34,
      this.width * 0.7
    );
    skyGlow.addColorStop(0, theme === 'night' ? 'rgba(104, 108, 218, 0.18)' : 'rgba(255, 239, 156, 0.5)');
    if (theme === 'day') skyGlow.addColorStop(0.42, 'rgba(255, 246, 204, 0.13)');
    skyGlow.addColorStop(1, theme === 'night' ? 'rgba(9, 11, 24, 0)' : 'rgba(139, 206, 246, 0)');
    ctx.fillStyle = skyGlow;
    ctx.fillRect(0, 0, this.width, horizon);

    this.drawSkyDetails(theme, horizon);

    ctx.globalAlpha = theme === 'night' ? 0.72 : 0.9;
    ctx.fillStyle = theme === 'night' ? '#b9c7ff' : '#fff1a8';
    ctx.beginPath();
    ctx.arc(this.width * 0.78, Math.max(88, this.height * 0.16), theme === 'night' ? 20 : 25, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = theme === 'night' ? '#8299ff' : '#ffd45e';
    ctx.shadowBlur = theme === 'night' ? 34 : 50;
    ctx.fill();
    ctx.shadowColor = 'transparent';

    if (theme === 'night') {
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = '#8d9bd6';
      ctx.beginPath();
      ctx.arc(this.width * 0.78 - 7, Math.max(88, this.height * 0.16) - 4, 3, 0, Math.PI * 2);
      ctx.arc(this.width * 0.78 + 6, Math.max(88, this.height * 0.16) + 5, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    this.drawSkylineLayer(horizon - 6, 0.2, 26, 62, theme === 'night' ? '#242947' : '#b7d2da', theme === 'night' ? 0.2 : 0.32, 1, theme);
    this.drawSkylineLayer(horizon + 13, 0.29, 42, 104, theme === 'night' ? '#191e3a' : '#8db4c0', theme === 'night' ? 0.34 : 0.44, 2, theme);
    this.drawSkylineLayer(horizon + 36, 0.4, 60, 150, theme === 'night' ? '#11172f' : '#638fa0', theme === 'night' ? 0.5 : 0.58, 3, theme);
    this.drawSkylineLayer(horizon + 66, 0.52, 82, 205, theme === 'night' ? '#0a1025' : '#3f6b7d', theme === 'night' ? 0.72 : 0.76, 5, theme);

    const haze = ctx.createLinearGradient(0, horizon - 125, 0, horizon + 70);
    haze.addColorStop(0, theme === 'night' ? 'rgba(76, 89, 180, 0)' : 'rgba(220, 244, 255, 0)');
    haze.addColorStop(0.64, theme === 'night' ? 'rgba(94, 104, 205, 0.1)' : 'rgba(225, 246, 255, 0.24)');
    haze.addColorStop(1, theme === 'night' ? 'rgba(9, 11, 24, 0)' : 'rgba(142, 202, 234, 0)');
    ctx.fillStyle = haze;
    ctx.fillRect(0, horizon - 125, this.width, 195);

    this.drawCityTraffic(theme, horizon);

    ctx.globalAlpha = 0.7;
    const cityLine = ctx.createLinearGradient(0, 0, this.width, 0);
    cityLine.addColorStop(0, 'rgba(78, 223, 232, 0)');
    cityLine.addColorStop(0.5, theme === 'night' ? 'rgba(91, 224, 239, 0.34)' : 'rgba(234, 252, 255, 0.5)');
    cityLine.addColorStop(1, 'rgba(78, 223, 232, 0)');
    ctx.fillStyle = cityLine;
    ctx.fillRect(0, horizon + 64, this.width, 1.2);
    ctx.restore();
  }

  private drawCityTraffic(theme: ColorTheme, horizon: number): void {
    const ctx = this.context;
    const travel = this.width + 90;
    ctx.save();
    for (let index = 0; index < 7; index += 1) {
      const direction = index % 2 === 0 ? 1 : -1;
      const speed = 14 + this.seeded(index, 73) * 24;
      const progress = (this.seeded(index, 79) * travel + this.sceneTime * speed) % travel;
      const x = direction === 1 ? progress - 45 : this.width - progress + 45;
      const y = horizon + 46 + (index % 3) * 7;

      if (theme === 'day') {
        const colors = ['#e26d5a', '#f0c34f', '#62a7c7', '#e7eef1'];
        ctx.globalAlpha = 0.48;
        ctx.fillStyle = colors[index % colors.length];
        ctx.fillRect(x, y, 11, 3.5);
        ctx.fillStyle = 'rgba(220, 246, 255, 0.72)';
        ctx.fillRect(x + 3, y - 2, 5, 2);
      } else {
        ctx.globalAlpha = 0.68;
        ctx.shadowBlur = 8;
        ctx.shadowColor = direction === 1 ? '#ffe39a' : '#ff5576';
        ctx.fillStyle = direction === 1 ? '#ffe39a' : '#ff5576';
        ctx.fillRect(x, y, 3.5, 1.8);
        ctx.fillRect(x + 7, y, 3.5, 1.8);
        ctx.shadowColor = 'transparent';
      }
    }
    ctx.restore();
  }

  private drawSkyDetails(theme: ColorTheme, horizon: number): void {
    const ctx = this.context;
    if (theme === 'night') {
      for (let index = 0; index < 34; index += 1) {
        const x = this.seeded(index * 5, 11) * this.width;
        const y = 28 + this.seeded(index * 9, 17) * horizon * 0.58;
        const radius = 0.55 + this.seeded(index, 23) * 1.05;
        const twinkle = this.reducedMotion ? 0 : Math.sin(this.sceneTime * (0.8 + index % 4) + index) * 0.14;
        ctx.globalAlpha = Math.max(0.12, 0.32 + this.seeded(index, 29) * 0.34 + twinkle);
        ctx.fillStyle = index % 6 === 0 ? '#b7eaff' : '#d8ddff';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    const cloudTravel = this.width + 150;
    for (let index = 0; index < 6; index += 1) {
      const cloudSpeed = 5 + this.seeded(index, 59) * 8;
      const initialX = this.seeded(index * 3, 31) * cloudTravel;
      const x = this.reducedMotion
        ? initialX - 75
        : (initialX + this.sceneTime * cloudSpeed) % cloudTravel - 75;
      const y = 65 + this.seeded(index * 7, 37) * horizon * 0.35 + Math.sin(this.sceneTime * 0.18 + index) * 2;
      const scale = 0.7 + this.seeded(index, 41) * 0.65;
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = '#477f9f';
      ctx.beginPath();
      ctx.ellipse(x + 3, y + 5, 35 * scale, 8 * scale, 0, 0, Math.PI * 2);
      ctx.ellipse(x - 16 * scale, y + 6, 20 * scale, 6 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.36;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(x, y, 34 * scale, 8 * scale, 0, 0, Math.PI * 2);
      ctx.ellipse(x - 7 * scale, y - 5 * scale, 17 * scale, 10 * scale, 0, 0, Math.PI * 2);
      ctx.ellipse(x - 18 * scale, y + 2, 20 * scale, 6 * scale, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 24 * scale, y + 3, 24 * scale, 6 * scale, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 0.32;
    ctx.strokeStyle = '#315c75';
    ctx.lineWidth = 1.2;
    for (let index = 0; index < 4; index += 1) {
      const birdTravel = this.width + 80;
      const birdSpeed = 17 + this.seeded(index, 61) * 15;
      const x = this.reducedMotion
        ? this.width * (0.12 + index * 0.18)
        : (this.seeded(index, 67) * birdTravel + this.sceneTime * birdSpeed) % birdTravel - 40;
      const y = horizon * (0.28 + this.seeded(index, 53) * 0.18) + Math.sin(this.sceneTime * 1.3 + index) * 3;
      const wing = this.reducedMotion ? 4 : 3 + Math.sin(this.sceneTime * 5.5 + index * 1.7) * 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 5, y - wing, x + 10, y);
      ctx.quadraticCurveTo(x + 15, y - wing, x + 20, y);
      ctx.stroke();
    }
  }

  private drawSkylineLayer(
    baseline: number,
    widthRatio: number,
    minHeight: number,
    maxHeight: number,
    color: string,
    opacity: number,
    seed: number,
    theme: ColorTheme
  ): void {
    const ctx = this.context;
    const averageWidth = Math.max(30, this.width * widthRatio * 0.22);
    let x = -averageWidth;
    let index = 0;
    ctx.globalAlpha = opacity;

    while (x < this.width + averageWidth) {
      const variation = this.seeded(index, seed);
      const buildingWidth = averageWidth * (0.72 + variation * 0.72);
      const buildingHeight = minHeight + this.seeded(index + 7, seed * 3) * (maxHeight - minHeight);
      const y = baseline - buildingHeight;
      const roofStyle = Math.floor(this.seeded(index + 19, seed * 5) * 5);

      ctx.fillStyle = color;
      ctx.fillRect(x, y, buildingWidth, buildingHeight);
      ctx.fillStyle = theme === 'night' ? 'rgba(255,255,255,0.035)' : 'rgba(255,255,255,0.11)';
      ctx.fillRect(x + 2, y, Math.max(1, buildingWidth * 0.12), buildingHeight);
      if (theme === 'day') {
        const sunlight = ctx.createLinearGradient(x, y, x + buildingWidth, y);
        sunlight.addColorStop(0, 'rgba(255, 252, 222, 0.2)');
        sunlight.addColorStop(0.42, 'rgba(255, 255, 255, 0.04)');
        sunlight.addColorStop(1, 'rgba(35, 76, 94, 0.15)');
        ctx.fillStyle = sunlight;
        ctx.fillRect(x, y, buildingWidth, buildingHeight);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
        ctx.fillRect(x, y, buildingWidth, 1.4);
      }
      ctx.fillStyle = theme === 'night' ? 'rgba(0,0,12,0.2)' : 'rgba(24,66,85,0.16)';
      ctx.fillRect(x + buildingWidth - 5, y, 5, buildingHeight);

      if (roofStyle === 0) {
        ctx.fillStyle = color;
        ctx.fillRect(x - 2, y - 3, buildingWidth + 4, 3);
      } else if (roofStyle === 1) {
        ctx.strokeStyle = theme === 'night' ? 'rgba(126,151,218,.48)' : 'rgba(45,84,102,.44)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + buildingWidth * 0.55, y);
        ctx.lineTo(x + buildingWidth * 0.55, y - 18);
        ctx.stroke();
        const beacon = this.reducedMotion ? 0.7 : 0.28 + (Math.sin(this.sceneTime * 2.4 + index) + 1) * 0.36;
        ctx.fillStyle = theme === 'night' ? `rgba(255, 119, 159, ${beacon})` : `rgba(217, 80, 102, ${beacon})`;
        ctx.shadowColor = theme === 'night' ? '#ff668f' : 'transparent';
        ctx.shadowBlur = theme === 'night' ? 7 * beacon : 0;
        ctx.fillRect(x + buildingWidth * 0.55 - 1, y - 19, 2, 2);
        ctx.shadowColor = 'transparent';
      } else if (roofStyle === 2) {
        ctx.fillStyle = color;
        ctx.fillRect(x + buildingWidth * 0.2, y - 8, buildingWidth * 0.6, 8);
        ctx.fillRect(x + buildingWidth * 0.37, y - 13, buildingWidth * 0.26, 5);
      } else if (roofStyle === 3 && buildingWidth > 34) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + buildingWidth * 0.5, y - 10);
        ctx.lineTo(x + buildingWidth, y);
        ctx.fill();
      } else if (buildingWidth > 32) {
        ctx.fillStyle = color;
        ctx.fillRect(x + buildingWidth * 0.31, y - 7, buildingWidth * 0.38, 7);
        ctx.strokeStyle = theme === 'night' ? 'rgba(140,159,211,.38)' : 'rgba(44,75,91,.35)';
        ctx.strokeRect(x + buildingWidth * 0.27, y - 9, buildingWidth * 0.46, 9);
      }

      if (theme === 'day' && seed >= 3 && (index + seed) % 4 === 1 && buildingWidth > 34) {
        ctx.fillStyle = 'rgba(44, 107, 78, 0.72)';
        ctx.fillRect(x + 7, y - 3, Math.min(18, buildingWidth * 0.35), 3);
        ctx.fillStyle = 'rgba(88, 151, 98, 0.7)';
        for (let plant = 0; plant < 3; plant += 1) {
          ctx.beginPath();
          ctx.arc(x + 10 + plant * 5, y - 4, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const columns = Math.max(1, Math.floor((buildingWidth - 12) / 13));
      const rows = Math.max(1, Math.floor((buildingHeight - 16) / 15));
      const gapX = (buildingWidth - 10) / columns;
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const isLit = this.seeded(index * 31 + column * 7 + row * 13, seed) > 0.58;
          if (theme === 'night' && !isLit) continue;
          const activity = this.reducedMotion
            ? 1
            : 0.78 + Math.sin(this.sceneTime * 0.45 + index * 2.1 + row + column * 0.7) * 0.22;
          ctx.fillStyle = theme === 'night'
            ? (row + column + seed) % 3 === 0
              ? `rgba(111, 218, 232, ${0.58 * activity})`
              : `rgba(255, 211, 132, ${0.5 * activity})`
            : isLit
              ? `rgba(218, 245, 252, ${0.62 * activity})`
              : `rgba(45, 92, 112, ${0.28 + (1 - activity) * 0.16})`;
          ctx.fillRect(x + 7 + column * gapX, y + 10 + row * 15, theme === 'day' ? 3.8 : 3.2, 5);
        }
      }

      if (seed >= 3 && index % 5 === 2 && buildingWidth > 38) {
        const signWidth = Math.min(22, buildingWidth * 0.48);
        ctx.fillStyle = theme === 'night' ? 'rgba(78, 230, 224, 0.72)' : 'rgba(223, 246, 250, 0.56)';
        ctx.shadowColor = theme === 'night' ? '#48dcd9' : 'transparent';
        ctx.shadowBlur = theme === 'night' ? 8 : 0;
        ctx.fillRect(x + (buildingWidth - signWidth) / 2, y + 7, signWidth, 1.5);
        ctx.shadowColor = 'transparent';
      }

      x += buildingWidth + 3;
      index += 1;
    }
    ctx.globalAlpha = 1;
  }

  private seeded(value: number, seed: number): number {
    const result = Math.sin(value * 12.9898 + seed * 78.233) * 43758.5453;
    return result - Math.floor(result);
  }

  private drawBlock(block: Block, cameraLevel: number, moving = false): void {
    const y = this.screenY(block.level, cameraLevel);
    if (y < -GAME_CONFIG.blockHeight || y > this.height + GAME_CONFIG.blockHeight) return;
    const ctx = this.context;
    ctx.save();
    this.drawBuildingFloor(
      block.x,
      y,
      block.width,
      GAME_CONFIG.blockHeight - 3,
      block.colorIndex,
      moving
    );
    ctx.restore();
  }

  private drawSlice(slice: FallingSlice, cameraLevel: number): void {
    const y = this.screenY(slice.level, cameraLevel) + 0.5 * GAME_CONFIG.sliceGravity * slice.age * slice.age;
    const ctx = this.context;
    ctx.save();
    ctx.translate(slice.x + slice.width / 2, y + GAME_CONFIG.blockHeight / 2);
    ctx.rotate(slice.rotation);
    ctx.globalAlpha = Math.max(0, 1 - slice.age / GAME_CONFIG.sliceLifetime);
    this.drawBuildingFloor(
      -slice.width / 2,
      -GAME_CONFIG.blockHeight / 2,
      slice.width,
      GAME_CONFIG.blockHeight - 3,
      slice.colorIndex,
      false
    );
    ctx.restore();
  }

  private drawBuildingFloor(
    x: number,
    y: number,
    width: number,
    height: number,
    colorIndex: number,
    moving: boolean
  ): void {
    const ctx = this.context;
    const [start, end] = PALETTE[colorIndex % PALETTE.length];
    const facade = ctx.createLinearGradient(x, y, x + width, y + height);
    facade.addColorStop(0, start);
    facade.addColorStop(0.58, end);
    facade.addColorStop(1, start);

    ctx.shadowColor = moving ? `${end}99` : 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = moving ? 18 : 11;
    ctx.shadowOffsetY = 6;
    this.roundedRect(x, y, width, height, 4);
    ctx.fillStyle = facade;
    ctx.fill();
    ctx.shadowColor = 'transparent';

    ctx.save();
    this.roundedRect(x, y, width, height, 4);
    ctx.clip();

    const shade = ctx.createLinearGradient(x, y, x, y + height);
    shade.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
    shade.addColorStop(0.22, 'rgba(255, 255, 255, 0)');
    shade.addColorStop(1, 'rgba(3, 7, 22, 0.32)');
    ctx.fillStyle = shade;
    ctx.fillRect(x, y, width, height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillRect(x, y, width, 2);
    ctx.fillStyle = 'rgba(3, 6, 20, 0.32)';
    ctx.fillRect(x, y + height - 3, width, 3);
    ctx.fillRect(x + width - Math.min(5, width * 0.12), y, Math.min(5, width * 0.12), height);

    const horizontalPadding = 7;
    const availableWidth = Math.max(0, width - horizontalPadding * 2);
    const windowCount = Math.floor(availableWidth / 14);
    if (windowCount > 0 && width >= 20) {
      const cellWidth = availableWidth / windowCount;
      const windowWidth = Math.min(6, cellWidth * 0.5);
      const windowRows = Math.max(2, Math.floor((height - 7) / 8));
      for (let row = 0; row < windowRows; row += 1) {
        for (let column = 0; column < windowCount; column += 1) {
          const lit = (colorIndex + column * 3 + row) % 5 !== 0;
          ctx.fillStyle = lit
            ? row === 0 ? 'rgba(255, 238, 170, 0.88)' : 'rgba(176, 244, 255, 0.78)'
            : 'rgba(7, 13, 35, 0.62)';
          ctx.fillRect(
            x + horizontalPadding + column * cellWidth + (cellWidth - windowWidth) / 2,
            y + 6 + row * 8,
            windowWidth,
            4
          );
        }
      }
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 0.8;
    this.roundedRect(x + 0.4, y + 0.4, Math.max(0, width - 0.8), Math.max(0, height - 0.8), 4);
    ctx.stroke();
  }

  private spawnParticles(block: Block, cameraLevel: number): void {
    const count = this.reducedMotion ? 5 : 18;
    const [, color] = PALETTE[block.colorIndex % PALETTE.length];
    const y = this.screenY(block.level, cameraLevel);
    for (let i = 0; i < count; i += 1) {
      this.particles.push({
        x: block.x + Math.random() * block.width,
        y,
        vx: (Math.random() - 0.5) * 160,
        vy: -40 - Math.random() * 130,
        life: 0.45 + Math.random() * 0.35,
        color
      });
    }
  }

  private updateParticles(dt: number): void {
    for (const particle of this.particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 300 * dt;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0).slice(-40);
  }

  private drawParticles(): void {
    const ctx = this.context;
    for (const particle of this.particles) {
      ctx.globalAlpha = Math.min(1, particle.life * 2);
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private roundedRect(x: number, y: number, width: number, height: number, radius: number): void {
    this.context.beginPath();
    this.context.roundRect(x, y, Math.max(0, width), Math.max(0, height), Math.min(radius, width / 2, height / 2));
  }
}
