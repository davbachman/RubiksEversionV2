import type { TurnDirection } from "./cube";

export interface Point {
  x: number;
  y: number;
}

export interface CameraRotationDelta {
  yaw: number;
  pitch: number;
}

export interface TwistGestureEnvironment {
  coarsePointer: boolean;
  maxTouchPoints: number;
}

export function dragDeltaToCameraRotation(
  start: Point,
  end: Point,
  sensitivity = 0.004,
): CameraRotationDelta {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  return {
    yaw: Number((dx * sensitivity).toFixed(6)),
    pitch: Number((dy * sensitivity).toFixed(6)),
  };
}

export function classifyTwistTurn(
  rotationDegrees: number,
  threshold = 22,
): TurnDirection | null {
  if (Math.abs(rotationDegrees) < threshold) return null;
  return rotationDegrees > 0 ? "counterClockwise" : "clockwise";
}

export function shouldEnableTwistGestures(environment: TwistGestureEnvironment): boolean {
  return !(environment.coarsePointer && environment.maxTouchPoints > 0);
}

export function toolbarActionToTurnDirection(action: string): TurnDirection | null {
  if (action === "clockwise") return "counterClockwise";
  if (action === "counterClockwise") return "clockwise";
  return null;
}
