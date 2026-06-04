import { describe, expect, it } from "vitest";
import { computeInsideCubeFov } from "./viewport";

describe("inside-cube viewport", () => {
  it("uses a natural wide view for desktop screens", () => {
    const fov = computeInsideCubeFov(16 / 9);

    expect(fov).toBeGreaterThanOrEqual(82);
    expect(fov).toBeLessThanOrEqual(90);
  });

  it("widens moderately for square screens", () => {
    const fov = computeInsideCubeFov(1);

    expect(fov).toBeGreaterThan(computeInsideCubeFov(16 / 9));
    expect(fov).toBeGreaterThanOrEqual(94);
    expect(fov).toBeLessThanOrEqual(104);
  });

  it("opens the vertical FOV on portrait screens so neighboring rows remain visible", () => {
    const fov = computeInsideCubeFov(390 / 844);

    expect(fov).toBeGreaterThan(computeInsideCubeFov(16 / 9));
    expect(fov).toBeGreaterThanOrEqual(108);
    expect(fov).toBeLessThanOrEqual(118);
  });
});
