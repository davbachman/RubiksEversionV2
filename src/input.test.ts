import { describe, expect, it } from "vitest";
import { classifySwipeTurn } from "./input";

describe("input gestures", () => {
  it("maps a right click-drag swipe to clockwise", () => {
    expect(classifySwipeTurn({ x: 100, y: 100 }, { x: 176, y: 112 })).toBe("clockwise");
  });

  it("maps a left click-drag swipe to counter-clockwise", () => {
    expect(classifySwipeTurn({ x: 176, y: 100 }, { x: 100, y: 112 })).toBe("counterClockwise");
  });

  it("ignores short or mostly vertical drags", () => {
    expect(classifySwipeTurn({ x: 100, y: 100 }, { x: 126, y: 103 })).toBeNull();
    expect(classifySwipeTurn({ x: 100, y: 100 }, { x: 132, y: 190 })).toBeNull();
  });
});

