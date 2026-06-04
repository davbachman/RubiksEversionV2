export function computeInsideCubeFov(aspect: number): number {
  if (aspect < 0.7) return 142;
  if (aspect < 1) return 122;
  return 98;
}
