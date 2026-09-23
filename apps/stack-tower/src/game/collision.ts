import type { PlacementResult } from '../types/game';

export function calculatePlacement(
  movingX: number,
  movingWidth: number,
  baseX: number,
  baseWidth: number,
  perfectTolerance: number,
  maxWidth = baseWidth
): PlacementResult {
  const difference = movingX - baseX;
  const overlapStart = Math.max(movingX, baseX);
  const overlapEnd = Math.min(movingX + movingWidth, baseX + baseWidth);
  const overlap = Math.max(0, overlapEnd - overlapStart);

  if (overlap <= 0) {
    return {
      overlap: 0,
      x: movingX,
      width: 0,
      cutX: movingX,
      cutWidth: movingWidth,
      perfect: false,
      gameOver: true
    };
  }

  const perfect = Math.abs(difference) <= perfectTolerance;
  if (perfect) {
    const width = Math.min(maxWidth, Math.max(movingWidth, baseWidth));
    return {
      overlap: width,
      x: baseX,
      width,
      cutX: null,
      cutWidth: 0,
      perfect: true,
      gameOver: false
    };
  }

  const cutWidth = Math.max(0, movingWidth - overlap);
  const cutX = difference < 0 ? movingX : overlapEnd;
  return {
    overlap,
    x: overlapStart,
    width: overlap,
    cutX,
    cutWidth,
    perfect: false,
    gameOver: false
  };
}
