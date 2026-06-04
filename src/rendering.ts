import { DoubleSide, MeshBasicMaterial, Shape, ShapeGeometry } from "three";

export const WALL_BACKDROP_RENDER_ORDER = -10;
export const STICKER_CORNER_RADIUS_RATIO = 0.12;

export function createWallBackdropMaterial(): MeshBasicMaterial {
  return new MeshBasicMaterial({
    color: "#151515",
    side: DoubleSide,
    depthWrite: false,
  });
}

export function createRoundedStickerGeometry(
  size: number,
  radius = size * STICKER_CORNER_RADIUS_RATIO,
): ShapeGeometry {
  const half = size / 2;
  const cornerRadius = Math.max(0, Math.min(radius, half));
  const shape = new Shape();

  shape.moveTo(-half + cornerRadius, -half);
  shape.lineTo(half - cornerRadius, -half);
  shape.quadraticCurveTo(half, -half, half, -half + cornerRadius);
  shape.lineTo(half, half - cornerRadius);
  shape.quadraticCurveTo(half, half, half - cornerRadius, half);
  shape.lineTo(-half + cornerRadius, half);
  shape.quadraticCurveTo(-half, half, -half, half - cornerRadius);
  shape.lineTo(-half, -half + cornerRadius);
  shape.quadraticCurveTo(-half, -half, -half + cornerRadius, -half);

  const geometry = new ShapeGeometry(shape, 8);
  geometry.computeBoundingBox();
  return geometry;
}
