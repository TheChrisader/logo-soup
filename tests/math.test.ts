import { describe, it, expect } from "vitest";
import {
  computePINFWidth,
  computeDimensions,
  applyDensityCompensation,
  getVisualCenterTransform,
} from "../src/math.js";
import type { NormalizedLogo } from "../src/types.js";

describe("computePINFWidth", () => {
  it("returns baseSize when aspectRatio is 0", () => {
    expect(computePINFWidth(0, 0.5, 48)).toBe(48);
  });

  it("returns baseSize when aspectRatio is negative", () => {
    expect(computePINFWidth(-2, 0.5, 48)).toBe(48);
  });

  it("returns baseSize when scaleFactor is 0 (uniform width)", () => {
    expect(computePINFWidth(1, 0, 48)).toBe(48);
    expect(computePINFWidth(2, 0, 48)).toBe(48);
    expect(computePINFWidth(0.5, 0, 48)).toBe(48);
  });

  it("scales by full aspect ratio when scaleFactor is 1 (uniform height)", () => {
    expect(computePINFWidth(1, 1, 48)).toBe(48);
    expect(computePINFWidth(2, 1, 48)).toBe(96);
    expect(computePINFWidth(0.5, 1, 48)).toBe(24);
  });

  it("uses 0.5 as default balanced scaleFactor", () => {
    const result = computePINFWidth(4, 0.5, 48);
    expect(result).toBeCloseTo(96);
  });

  it("handles square logos (aspectRatio = 1)", () => {
    expect(computePINFWidth(1, 0, 48)).toBe(48);
    expect(computePINFWidth(1, 0.5, 48)).toBe(48);
    expect(computePINFWidth(1, 1, 48)).toBe(48);
  });

  it("handles wide logos (aspectRatio > 1)", () => {
    const result = computePINFWidth(3, 0.5, 48);
    expect(result).toBeGreaterThan(48);
  });

  it("handles tall logos (aspectRatio < 1)", () => {
    const result = computePINFWidth(0.25, 0.5, 48);
    expect(result).toBeLessThan(48);
  });

  it("is symmetric: sqrt(w/h) * base === 1/sqrt(h/w) * base", () => {
    const base = 48;
    const sf = 0.5;
    const wide = computePINFWidth(4, sf, base);
    const tall = computePINFWidth(0.25, sf, base);
    expect(wide / tall).toBeCloseTo(4);
  });
});

describe("computeDimensions", () => {
  it("computes height from width and aspect ratio", () => {
    const { width, height } = computeDimensions(96, 2);
    expect(width).toBe(96);
    expect(height).toBe(48);
  });

  it("handles square aspect ratio", () => {
    const { width, height } = computeDimensions(48, 1);
    expect(width).toBe(48);
    expect(height).toBe(48);
  });

  it("handles tall aspect ratio", () => {
    const { width, height } = computeDimensions(24, 0.5);
    expect(width).toBe(24);
    expect(height).toBe(48);
  });

  it("falls back to width-as-height when aspect ratio is 0", () => {
    const { width, height } = computeDimensions(48, 0);
    expect(width).toBe(48);
    expect(height).toBe(48);
  });
});

describe("applyDensityCompensation", () => {
  it("returns unchanged width when densityFactor is 0", () => {
    expect(applyDensityCompensation(48, 0.5, 0.3, 0)).toBe(48);
  });

  it("returns unchanged width when avgDensity is 0", () => {
    expect(applyDensityCompensation(48, 0.5, 0, 0.5)).toBe(48);
  });

  it("scales down dense logos above average density", () => {
    const result = applyDensityCompensation(48, 0.8, 0.4, 1);
    expect(result).toBeLessThan(48);
    expect(result).toBe(24);
  });

  it("scales up sparse logos below average density", () => {
    const result = applyDensityCompensation(48, 0.2, 0.4, 1);
    expect(result).toBeGreaterThan(48);
    expect(result).toBe(96);
  });

  it("returns unchanged width when density equals average", () => {
    const result = applyDensityCompensation(48, 0.5, 0.5, 0.75);
    expect(result).toBe(48);
  });

  it("applies partial compensation with intermediate densityFactor", () => {
    const result = applyDensityCompensation(48, 0.8, 0.4, 0.5);
    expect(result).toBe(36);
  });
});

describe("getVisualCenterTransform", () => {
  const makeLogo = (
    visualOffsetX = 0,
    visualOffsetY = 0,
    contentWidth = 100,
    contentHeight = 50,
    normalizedWidth = 200,
    normalizedHeight = 100,
  ): NormalizedLogo => ({
    src: "test.png",
    normalizedWidth,
    normalizedHeight,
    measurements: {
      naturalWidth: 400,
      naturalHeight: 200,
      contentWidth,
      contentHeight,
      pixelDensity: 0.5,
      visualOffsetX,
      visualOffsetY,
    },
    renderSrc: "test.png",
  });

  it("returns empty string for alignBy='bounds'", () => {
    const logo = makeLogo(10, 20);
    expect(getVisualCenterTransform(logo, "bounds")).toBe("");
  });

  it("returns empty string when offsets are zero for visual-center", () => {
    const logo = makeLogo(0, 0);
    expect(getVisualCenterTransform(logo, "visual-center")).toBe("");
  });

  it("produces translate with negative offset for positive visualOffsetX in visual-center-x", () => {
    const logo = makeLogo(10, 0);
    const result = getVisualCenterTransform(logo, "visual-center-x");
    expect(result).toBe("translate(-20.00px, 0.00px)");
  });

  it("produces translate with negative offset for positive visualOffsetY in visual-center-y", () => {
    const logo = makeLogo(0, 5);
    const result = getVisualCenterTransform(logo, "visual-center-y");
    expect(result).toBe("translate(0.00px, -10.00px)");
  });

  it("combines X and Y offsets for visual-center", () => {
    const logo = makeLogo(10, 5);
    const result = getVisualCenterTransform(logo, "visual-center");
    expect(result).toBe("translate(-20.00px, -10.00px)");
  });

  it("handles negative visual offsets (mass shifted left/up)", () => {
    const logo = makeLogo(-8, -4);
    const result = getVisualCenterTransform(logo, "visual-center");
    expect(result).toBe("translate(16.00px, 8.00px)");
  });

  it("scales offsets by the ratio of normalized to content dimensions", () => {
    const logo = makeLogo(5, 0, 100, 50, 300, 150);
    const result = getVisualCenterTransform(logo, "visual-center-x");
    expect(result).toBe("translate(-15.00px, 0.00px)");
  });
});
