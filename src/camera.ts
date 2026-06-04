import { Matrix4, Quaternion, Vector3 } from "three";
import type { ActiveFace } from "./cube";

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

export function getActiveFaceFromForward(forward: Vector3): ActiveFace {
  const absX = Math.abs(forward.x);
  const absY = Math.abs(forward.y);
  const absZ = Math.abs(forward.z);

  if (absX >= absY && absX >= absZ) return forward.x >= 0 ? "right" : "left";
  if (absY >= absX && absY >= absZ) return forward.y >= 0 ? "top" : "bottom";
  return forward.z >= 0 ? "front" : "back";
}

