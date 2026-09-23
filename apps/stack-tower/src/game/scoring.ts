export function nextStreak(current: number, perfect: boolean): number {
  return perfect ? current + 1 : 0;
}

export function pointsForPlacement(streak: number): number {
  return 1 + Math.min(4, Math.floor(streak / 3));
}
