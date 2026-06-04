import { describe, expect, it } from "vitest";
import { classifyTwistTurn, dragDeltaToCameraRotation } from "./input";

describe("input gestures", () => {
  it("converts click-drag movement to camera rotation deltas", () => {
    expect(dragDeltaToCameraRotation({ x: 100, y: 100 }, { x: 176, y: 112 })).toEqual({
      yaw: 0.304,
      pitch: 0.048,
    });
  });

  it("maps clockwise twist rotation to a counter-clockwise face turn", () => {
    expect(classifyTwistTurn(28)).toBe("counterClockwise");
  });

  it("maps counter-clockwise twist rotation to a clockwise face turn", () => {
    expect(classifyTwistTurn(-28)).toBe("clockwise");
  });

  it("ignores small accidental twist rotation", () => {
    expect(classifyTwistTurn(12)).toBeNull();
    expect(classifyTwistTurn(-12)).toBeNull();
  });
});
