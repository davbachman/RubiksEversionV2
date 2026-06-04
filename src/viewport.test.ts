import { describe, expect, it } from "vitest";
import { computeInsideCubeFov } from "./viewport";

describe("inside-cube viewport", () => {
  it("keeps a wide view for desktop screens", () => {
    const fov = computeInsideCubeFov(16 / 9);

    expect(fov).toBeGreaterThanOrEqual(96);
    expect(fov).toBeLessThanOrEqual(110);
  });

  it("opens the vertical FOV on portrait screens so neighboring rows remain visible", () => {
    const fov = computeInsideCubeFov(390 / 844);

    expect(fov).toBeGreaterThan(computeInsideCubeFov(16 / 9));
    expect(fov).toBeLessThanOrEqual(148);
  });
});
