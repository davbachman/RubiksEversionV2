import { Matrix4, Quaternion, Vector3 } from "three";
import type { ActiveFace } from "./cube";

export const CUBE_WALL_DISTANCE = 1.58;
export const CAMERA_BACK_OFFSET = 2.35;

export interface SnapOrientation {
  face: ActiveFace;
  upKey: string;
  forward: Vector3;
  up: Vector3;
  quaternion: Quaternion;
}

const AXIS_DIRECTIONS: Array<{ face: ActiveFace; vector: Vector3 }> = [
  { face: "right", vector: new Vector3(1, 0, 0) },
  { face: "left", vector: new Vector3(-1, 0, 0) },
  { face: "top", vector: new Vector3(0, 1, 0) },
  { face: "bottom", vector: new Vector3(0, -1, 0) },
  { face: "front", vector: new Vector3(0, 0, 1) },
  { face: "back", vector: new Vector3(0, 0, -1) },
];

function vectorKey(vector: Vector3): string {
  return `${Math.round(vector.x)},${Math.round(vector.y)},${Math.round(vector.z)}`;
}

function roundAxisVector(vector: Vector3): Vector3 {
  return new Vector3(Math.round(vector.x), Math.round(vector.y), Math.round(vector.z));
}

function cleanFloat(value: number): number {
  const rounded = Number(value.toFixed(6));
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function quaternionFromForwardUp(forward: Vector3, up: Vector3): Quaternion {
  const normalizedForward = forward.clone().normalize();
  const normalizedUp = up.clone().normalize();
  const zAxis = normalizedForward.clone().multiplyScalar(-1);
  const xAxis = new Vector3().crossVectors(normalizedUp, zAxis).normalize();
  const yAxis = new Vector3().crossVectors(zAxis, xAxis).normalize();
  const matrix = new Matrix4().makeBasis(xAxis, yAxis, zAxis);

  return new Quaternion().setFromRotationMatrix(matrix).normalize();
}

export function forwardAndUpFromQuaternion(quaternion: Quaternion): {
  forward: Vector3;
  up: Vector3;
} {
  return {
    forward: roundAxisVector(new Vector3(0, 0, -1).applyQuaternion(quaternion)),
    up: roundAxisVector(new Vector3(0, 1, 0).applyQuaternion(quaternion)),
  };
}

export function computeBackedOffCameraPosition(
  quaternion: Quaternion,
  offset = CAMERA_BACK_OFFSET,
): Vector3 {
  const forward = new Vector3(0, 0, -1).applyQuaternion(quaternion).normalize();
  return forward.multiplyScalar(-offset).set(
    cleanFloat(forward.x),
    cleanFloat(forward.y),
    cleanFloat(forward.z),
  );
}

export function createSnapOrientations(): SnapOrientation[] {
  const orientations: SnapOrientation[] = [];

  for (const { face, vector: forward } of AXIS_DIRECTIONS) {
    for (const { vector: upCandidate } of AXIS_DIRECTIONS) {
      if (Math.abs(forward.dot(upCandidate)) > 0) continue;

      orientations.push({
        face,
        upKey: vectorKey(upCandidate),
        forward: forward.clone(),
        up: upCandidate.clone(),
        quaternion: quaternionFromForwardUp(forward, upCandidate),
      });
    }
  }

  return orientations;
}

export function findNearestSnapOrientation(quaternion: Quaternion): SnapOrientation {
  const normalized = quaternion.clone().normalize();
  let best = createSnapOrientations()[0];
  let bestDot = -Infinity;

  for (const orientation of createSnapOrientations()) {
    const dot = Math.abs(normalized.dot(orientation.quaternion));
    if (dot > bestDot) {
      bestDot = dot;
      best = orientation;
    }
  }

  return best;
}

export function findNearestFaceSnapOrientation(quaternion: Quaternion): SnapOrientation {
  const forward = new Vector3(0, 0, -1).applyQuaternion(quaternion).normalize();
  const up = new Vector3(0, 1, 0).applyQuaternion(quaternion).normalize();
  const face = getActiveFaceFromForward(forward);
  const snappedForward = AXIS_DIRECTIONS.find((direction) => direction.face === face);
  if (!snappedForward) throw new Error(`No snap axis for face ${face}`);

  const projectedUp = up
    .clone()
    .sub(snappedForward.vector.clone().multiplyScalar(up.dot(snappedForward.vector)));
  const preservedUp = projectedUp.lengthSq() > 0.000001
    ? projectedUp.normalize()
    : fallbackUpForForward(snappedForward.vector);

  return {
    face,
    upKey: "preserved",
    forward: snappedForward.vector.clone(),
    up: preservedUp,
    quaternion: quaternionFromForwardUp(snappedForward.vector, preservedUp),
  };
}

export function getActiveFaceFromForward(forward: Vector3): ActiveFace {
  const absX = Math.abs(forward.x);
  const absY = Math.abs(forward.y);
  const absZ = Math.abs(forward.z);

  if (absX >= absY && absX >= absZ) return forward.x >= 0 ? "right" : "left";
  if (absY >= absX && absY >= absZ) return forward.y >= 0 ? "top" : "bottom";
  return forward.z >= 0 ? "front" : "back";
}

export function getHiddenFaceNormalFromForward(forward: Vector3): Vector3 {
  const face = getActiveFaceFromForward(forward);
  const faceDirection = AXIS_DIRECTIONS.find((direction) => direction.face === face);
  if (!faceDirection) throw new Error(`No axis direction for face ${face}`);

  const hidden = faceDirection.vector.clone().multiplyScalar(-1);
  return new Vector3(cleanFloat(hidden.x), cleanFloat(hidden.y), cleanFloat(hidden.z));
}

export function shouldRenderFaceNormal(forward: Vector3, normal: Vector3): boolean {
  const hiddenNormal = getHiddenFaceNormalFromForward(forward);
  return normal.clone().normalize().dot(hiddenNormal) < 0.95;
}

function fallbackUpForForward(forward: Vector3): Vector3 {
  if (Math.abs(forward.y) > 0.9) return new Vector3(0, 0, -Math.sign(forward.y));
  return new Vector3(0, 1, 0);
}
