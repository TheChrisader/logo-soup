import { describe, it, expect } from "vitest";
import { detectContentBounds, analysePixels } from "../src/canvas.js";

function createImageData(
  width: number,
  height: number,
  fill: (x: number, y: number) => [number, number, number, number],
): ImageData {
  const data = new ImageData(width, height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const [r, g, b, a] = fill(x, y);
      data.data[i] = r;
      data.data[i + 1] = g;
      data.data[i + 2] = b;
      data.data[i + 3] = a;
    }
  }
  return data;
}

function transparentFill(): [number, number, number, number] {
  return [0, 0, 0, 0];
}

function whiteFill(): [number, number, number, number] {
  return [255, 255, 255, 255];
}

function darkFill(): [number, number, number, number] {
  return [30, 30, 30, 255];
}

describe("detectContentBounds", () => {
  it("returns null for a fully transparent image", () => {
    const data = createImageData(10, 10, () => transparentFill());
    expect(detectContentBounds(data)).toBeNull();
  });

  it("returns null for a fully white image (treated as background)", () => {
    const data = createImageData(10, 10, () => whiteFill());
    expect(detectContentBounds(data)).toBeNull();
  });

  it("returns null for low-alpha pixels (below threshold)", () => {
    const data = createImageData(4, 4, () => [100, 100, 100, 5]);
    expect(detectContentBounds(data)).toBeNull();
  });

  it("detects a single content pixel", () => {
    const data = createImageData(10, 10, (x, y) =>
      x === 5 && y === 5 ? darkFill() : transparentFill(),
    );
    const bounds = detectContentBounds(data);
    expect(bounds).toEqual({ top: 5, right: 5, bottom: 5, left: 5 });
  });

  it("detects a rectangular content region", () => {
    const data = createImageData(20, 20, (x, y) =>
      x >= 4 && x <= 9 && y >= 6 && y <= 11 ? darkFill() : transparentFill(),
    );
    const bounds = detectContentBounds(data);
    expect(bounds).toEqual({ top: 6, right: 9, bottom: 11, left: 4 });
  });

  it("detects content at image edges (top-left pixel)", () => {
    const data = createImageData(8, 8, (x, y) =>
      x === 0 && y === 0 ? darkFill() : transparentFill(),
    );
    const bounds = detectContentBounds(data);
    expect(bounds).toEqual({ top: 0, right: 0, bottom: 0, left: 0 });
  });

  it("detects content at image edges (bottom-right pixel)", () => {
    const data = createImageData(8, 8, (x, y) =>
      x === 7 && y === 7 ? darkFill() : transparentFill(),
    );
    const bounds = detectContentBounds(data);
    expect(bounds).toEqual({ top: 7, right: 7, bottom: 7, left: 7 });
  });

  it("treats near-white as background (r=241, g=241, b=241, a=245)", () => {
    const data = createImageData(4, 4, () => [241, 241, 241, 245]);
    expect(detectContentBounds(data)).toBeNull();
  });

  it("treats non-white opaque as content (r=240, g=0, b=0)", () => {
    const data = createImageData(4, 4, (x, y) =>
      x === 2 && y === 2 ? [240, 0, 0, 255] : transparentFill(),
    );
    const bounds = detectContentBounds(data);
    expect(bounds).toEqual({ top: 2, right: 2, bottom: 2, left: 2 });
  });

  it("treats semi-transparent dark pixels as content (alpha just above threshold)", () => {
    const data = createImageData(4, 4, (x, y) =>
      x === 1 && y === 1 ? [50, 50, 50, 15] : transparentFill(),
    );
    const bounds = detectContentBounds(data);
    expect(bounds).toEqual({ top: 1, right: 1, bottom: 1, left: 1 });
  });
});

describe("analysePixels", () => {
  it("returns zero density and zero offsets for fully transparent image", () => {
    const data = createImageData(10, 10, () => transparentFill());
    const result = analysePixels(data);
    expect(result.density).toBe(0);
    expect(result.visualOffsetX).toBe(0);
    expect(result.visualOffsetY).toBe(0);
  });

  it("returns zero density and zero offsets for fully white image", () => {
    const data = createImageData(10, 10, () => whiteFill());
    const result = analysePixels(data);
    expect(result.density).toBe(0);
    expect(result.visualOffsetX).toBe(0);
    expect(result.visualOffsetY).toBe(0);
  });

  it("computes density as content pixels / total pixels within bounds", () => {
    const data = createImageData(4, 4, (x, y) =>
      x >= 1 && x <= 2 && y >= 1 && y <= 2 ? darkFill() : transparentFill(),
    );
    const bounds = { top: 1, right: 2, bottom: 2, left: 1 };
    const result = analysePixels(data, bounds);
    expect(result.density).toBeCloseTo(1);
  });

  it("computes partial density correctly", () => {
    const data = createImageData(4, 4, (x, y) =>
      x === 0 || x === 3 ? darkFill() : transparentFill(),
    );
    const result = analysePixels(data);
    expect(result.density).toBeCloseTo(8 / 16);
  });

  it("returns zero visual offset for symmetric content (centered)", () => {
    const data = createImageData(10, 10, (x, y) =>
      x >= 4 && x <= 6 && y >= 4 && y <= 6 ? darkFill() : transparentFill(),
    );
    const result = analysePixels(data);
    expect(result.visualOffsetX).toBeCloseTo(0, 0);
    expect(result.visualOffsetY).toBeCloseTo(0, 0);
  });

  it("detects positive visualOffsetX when content is shifted right", () => {
    const data = createImageData(10, 10, (x, y) =>
      x >= 6 && x <= 7 && y >= 4 && y <= 5 ? darkFill() : transparentFill(),
    );
    const result = analysePixels(data);
    expect(result.visualOffsetX).toBeGreaterThan(0);
  });

  it("detects negative visualOffsetX when content is shifted left", () => {
    const data = createImageData(10, 10, (x, y) =>
      x >= 2 && x <= 3 && y >= 4 && y <= 5 ? darkFill() : transparentFill(),
    );
    const result = analysePixels(data);
    expect(result.visualOffsetX).toBeLessThan(0);
  });

  it("uses provided bounds to restrict analysis region", () => {
    const data = createImageData(20, 20, (x, y) => {
      if (x >= 1 && x <= 3 && y >= 1 && y <= 3) return darkFill();
      if (x >= 16 && x <= 18 && y >= 16 && y <= 18) return darkFill();
      return transparentFill();
    });
    const bounds = { top: 1, right: 3, bottom: 3, left: 1 };
    const result = analysePixels(data, bounds);
    expect(Math.abs(result.visualOffsetX)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(result.visualOffsetY)).toBeLessThanOrEqual(0.5);
  });

  it("defaults to full image when no bounds provided", () => {
    const data = createImageData(8, 8, (x, y) =>
      x >= 2 && x <= 5 && y >= 2 && y <= 5 ? darkFill() : transparentFill(),
    );
    const noBounds = analysePixels(data);
    const withBounds = analysePixels(data, {
      top: 0,
      right: 7,
      bottom: 7,
      left: 0,
    });
    expect(noBounds.density).toBeCloseTo(withBounds.density);
    expect(noBounds.visualOffsetX).toBeCloseTo(withBounds.visualOffsetX, 5);
    expect(noBounds.visualOffsetY).toBeCloseTo(withBounds.visualOffsetY, 5);
  });
});
