export function computeInsideCubeFov(aspect: number): number {
  if (aspect < 0.7) return 112;
  if (aspect <= 1) return 98;
  return 86;
}
