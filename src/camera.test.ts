import { describe, expect, it } from "vitest";
import { Euler, Quaternion, Vector3 } from "three";
import {
  CAMERA_BACK_OFFSET,
  CUBE_WALL_DISTANCE,
  createSnapOrientations,
  computeBackedOffCameraPosition,
  findNearestFaceSnapOrientation,
  findNearestSnapOrientation,
  forwardAndUpFromQuaternion,
  getHiddenFaceNormalFromForward,
  getActiveFaceFromForward,
  quaternionFromForwardUp,
  shouldRenderFaceNormal,
} from "./camera";

describe("camera snapping", () => {
  it("generates the 24 orthogonal camera orientations", () => {
    const snaps = createSnapOrientations();

    expect(snaps).toHaveLength(24);
    expect(new Set(snaps.map((snap) => `${snap.face}:${snap.upKey}`)).size).toBe(24);
  });

  it("chooses the nearest orthogonal orientation from an off-axis quaternion", () => {
    const target = quaternionFromForwardUp(new Vector3(0, 0, 1), new Vector3(0, 1, 0));
    const perturb = new Quaternion().setFromEuler(new Euler(0.18, -0.12, 0.06));
    const offAxis = target.clone().premultiply(perturb);

    const nearest = findNearestSnapOrientation(offAxis);
    const directions = forwardAndUpFromQuaternion(nearest.quaternion);

    expect(nearest.face).toBe("front");
    expect(directions.forward.toArray()).toEqual([0, 0, 1]);
    expect(directions.up.toArray()).toEqual([0, 1, 0]);
  });

  it("snaps to the nearest face without rolling the view upright", () => {
    const rolledUp = new Vector3(0.5, Math.sqrt(3) / 2, 0);
    const rolledFront = quaternionFromForwardUp(new Vector3(0, 0, 1), rolledUp);

    const nearest = findNearestFaceSnapOrientation(rolledFront);
    const rawForward = new Vector3(0, 0, -1).applyQuaternion(nearest.quaternion);
    const rawUp = new Vector3(0, 1, 0).applyQuaternion(nearest.quaternion);

    expect(nearest.face).toBe("front");
    expect(rawForward.distanceTo(new Vector3(0, 0, 1))).toBeLessThan(0.000001);
    expect(rawUp.distanceTo(rolledUp)).toBeLessThan(0.000001);
  });

  it("derives the active viewed face from snapped forward vectors", () => {
    expect(getActiveFaceFromForward(new Vector3(1, 0, 0))).toBe("right");
    expect(getActiveFaceFromForward(new Vector3(-1, 0, 0))).toBe("left");
    expect(getActiveFaceFromForward(new Vector3(0, 1, 0))).toBe("top");
    expect(getActiveFaceFromForward(new Vector3(0, -1, 0))).toBe("bottom");
    expect(getActiveFaceFromForward(new Vector3(0, 0, 1))).toBe("front");
    expect(getActiveFaceFromForward(new Vector3(0, 0, -1))).toBe("back");
  });

  it("places the camera behind the viewer direction outside the cube", () => {
    const front = quaternionFromForwardUp(new Vector3(0, 0, 1), new Vector3(0, 1, 0));
    const position = computeBackedOffCameraPosition(front);

    expect(position.toArray()).toEqual([0, 0, -CAMERA_BACK_OFFSET]);
    expect(CAMERA_BACK_OFFSET).toBeGreaterThan(CUBE_WALL_DISTANCE);
    expect(Math.max(Math.abs(position.x), Math.abs(position.y), Math.abs(position.z))).toBeGreaterThan(
      CUBE_WALL_DISTANCE,
    );
  });

  it("hides the nearest face when the camera sits outside the cube", () => {
    const forward = new Vector3(0, 0, 1);
    const hidden = getHiddenFaceNormalFromForward(forward);

    expect(hidden.toArray()).toEqual([0, 0, -1]);
    expect(shouldRenderFaceNormal(forward, new Vector3(0, 0, -1))).toBe(false);
    expect(shouldRenderFaceNormal(forward, new Vector3(0, 0, 1))).toBe(true);
    expect(shouldRenderFaceNormal(forward, new Vector3(1, 0, 0))).toBe(true);
  });
});
