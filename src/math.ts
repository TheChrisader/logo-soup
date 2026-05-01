import type { AlignBy, NormalizedLogo } from "./types.js";

/**
 * Proportional Image Normalization Formula (PINF).
 *
 * Computes the display width for a logo given its aspect ratio.
 *
 * ```
 * width = (aspectRatio ** scaleFactor) * baseSize
 * ```
 *
 * - scaleFactor = 0  → all logos same width
 * - scaleFactor = 1  → all logos same height
 * - scaleFactor = 0.5 → balanced sweet spot
 *
 * @param aspectRatio  width / height of the logo's content rect
 * @param scaleFactor  0–1 blending factor
 * @param baseSize     target size in pixels
 */
export function computePINFWidth(
  aspectRatio: number,
  scaleFactor: number,
  baseSize: number,
): number {
  if (aspectRatio <= 0) return baseSize;
  return aspectRatio ** scaleFactor * baseSize;
}

export function computeDimensions(
  pinfWidth: number,
  aspectRatio: number,
): { width: number; height: number } {
  return {
    width: pinfWidth,
    height: aspectRatio > 0 ? pinfWidth / aspectRatio : pinfWidth,
  };
}

/**
 * Apply density compensation to a PINF width.
 *
 * Dense (heavy) logos are scaled down; light (thin) logos are scaled up.
 * The compensation is relative to the average density across all logos.
 *
 * @param pinfWidth      width before compensation
 * @param density        pixel density of this logo (0–1)
 * @param avgDensity     average pixel density across all logos
 * @param densityFactor  0 = no compensation, 1 = full
 */
export function applyDensityCompensation(
  pinfWidth: number,
  density: number,
  avgDensity: number,
  densityFactor: number,
): number {
  if (densityFactor === 0 || avgDensity === 0) return pinfWidth;
  const ratio = avgDensity / density;
  const scale = 1 + (ratio - 1) * densityFactor;
  return pinfWidth * scale;
}

/**
 * Build the CSS `transform` string that nudges a logo to its visual center.
 *
 * @param logo    a NormalizedLogo with visual offset measurements
 * @param alignBy the alignment strategy
 */
export function getVisualCenterTransform(
  logo: NormalizedLogo,
  alignBy: AlignBy,
): string {
  if (alignBy === "bounds") return "";

  const scaleX = logo.normalizedWidth / logo.measurements.contentWidth;
  const scaleY = logo.normalizedHeight / logo.measurements.contentHeight;

  const dx =
    alignBy === "visual-center" || alignBy === "visual-center-x"
      ? -(logo.measurements.visualOffsetX * scaleX)
      : 0;

  const dy =
    alignBy === "visual-center" || alignBy === "visual-center-y"
      ? -(logo.measurements.visualOffsetY * scaleY)
      : 0;

  if (dx === 0 && dy === 0) return "";
  return `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`;
}
