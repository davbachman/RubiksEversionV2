import { describe, expect, it } from "vitest";
import {
  STICKER_CORNER_RADIUS_RATIO,
  WALL_BACKDROP_RENDER_ORDER,
  createRoundedStickerGeometry,
  createWallBackdropMaterial,
} from "./rendering";

describe("wall backdrop rendering", () => {
  it("does not let backdrop planes depth-clip rotating stickers", () => {
    const material = createWallBackdropMaterial();

    expect(material.depthWrite).toBe(false);
    expect(material.depthTest).toBe(true);
    expect(WALL_BACKDROP_RENDER_ORDER).toBeLessThan(0);
  });
});

describe("sticker geometry", () => {
  it("creates a centered rounded rectangle without square corner vertices", () => {
    const size = 0.86;
    const geometry = createRoundedStickerGeometry(size);
    geometry.computeBoundingBox();

    const box = geometry.boundingBox;
    const positions = geometry.getAttribute("position");
    const half = size / 2;
    const radius = size * STICKER_CORNER_RADIUS_RATIO;
    const hasSquareCornerVertex = Array.from({ length: positions.count }).some((_, index) => {
      const x = positions.getX(index);
      const y = positions.getY(index);
      return Math.abs(Math.abs(x) - half) < 0.000001 && Math.abs(Math.abs(y) - half) < 0.000001;
    });

    expect(box?.min.x).toBeCloseTo(-half);
    expect(box?.max.x).toBeCloseTo(half);
    expect(box?.min.y).toBeCloseTo(-half);
    expect(box?.max.y).toBeCloseTo(half);
    expect(radius).toBeGreaterThan(0.07);
    expect(hasSquareCornerVertex).toBe(false);
  });
});
