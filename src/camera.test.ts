import { describe, expect, it } from "vitest";
import { Euler, Quaternion, Vector3 } from "three";
import {
  createSnapOrientations,
  findNearestSnapOrientation,
  forwardAndUpFromQuaternion,
  getActiveFaceFromForward,
  quaternionFromForwardUp,
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

  it("derives the active viewed face from snapped forward vectors", () => {
    expect(getActiveFaceFromForward(new Vector3(1, 0, 0))).toBe("right");
    expect(getActiveFaceFromForward(new Vector3(-1, 0, 0))).toBe("left");
    expect(getActiveFaceFromForward(new Vector3(0, 1, 0))).toBe("top");
    expect(getActiveFaceFromForward(new Vector3(0, -1, 0))).toBe("bottom");
    expect(getActiveFaceFromForward(new Vector3(0, 0, 1))).toBe("front");
    expect(getActiveFaceFromForward(new Vector3(0, 0, -1))).toBe("back");
  });
});

