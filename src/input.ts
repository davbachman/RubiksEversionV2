import type { TurnDirection } from "./cube";

export interface Point {
  x: number;
  y: number;
}

export function classifySwipeTurn(
  start: Point,
  end: Point,
  threshold = 48,
): TurnDirection | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (Math.abs(dx) < threshold) return null;
  if (Math.abs(dx) < Math.abs(dy) * 1.4) return null;

  return dx > 0 ? "clockwise" : "counterClockwise";
}

