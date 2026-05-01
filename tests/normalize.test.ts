import { describe, it, expect, vi, beforeEach } from "vitest";
import { normalizeLogos } from "../src/normalize.js";
import type { NormalizedLogo } from "../src/types.js";

vi.mock("../src/canvas.js", () => ({
  loadImage: vi.fn((src: string) =>
    Promise.resolve({
      src,
      naturalWidth: 200,
      naturalHeight: 100,
    } as HTMLImageElement),
  ),
  getImageData: vi.fn((img: HTMLImageElement) => ({
    canvas: {} as HTMLCanvasElement,
    ctx: {} as CanvasRenderingContext2D,
    data: new ImageData(img.naturalWidth, img.naturalHeight),
  })),
  detectContentBounds: vi.fn((data: ImageData) => ({
    top: Math.floor(data.height / 4),
    right: Math.floor(data.width / 4) + Math.floor(data.width / 2) - 1,
    bottom: Math.floor(data.height / 4) + Math.floor(data.height / 2) - 1,
    left: Math.floor(data.width / 4),
  })),
  analysePixels: vi.fn(() => ({
    density: 0.4,
    visualOffsetX: 0,
    visualOffsetY: 0,
  })),
  cropToContentDataURI: vi.fn(() => "data:image/png;base64,mock"),
}));

import {
  loadImage,
  getImageData,
  detectContentBounds,
  analysePixels,
  cropToContentDataURI,
} from "../src/canvas.js";

const mocked = {
  loadImage: vi.mocked(loadImage),
  getImageData: vi.mocked(getImageData),
  detectContentBounds: vi.mocked(detectContentBounds),
  analysePixels: vi.mocked(analysePixels),
  cropToContentDataURI: vi.mocked(cropToContentDataURI),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("normalizeLogos", () => {
  it("returns empty array for empty input", async () => {
    const result = await normalizeLogos([]);
    expect(result.logos).toEqual([]);
  });

  it("accepts string shorthand inputs", async () => {
    mocked.loadImage.mockResolvedValue({
      src: "a.png",
      naturalWidth: 200,
      naturalHeight: 100,
    } as unknown as HTMLImageElement);
    mocked.getImageData.mockReturnValue({
      canvas: {} as HTMLCanvasElement,
      ctx: {} as CanvasRenderingContext2D,
      data: new ImageData(200, 100),
    });
    mocked.detectContentBounds.mockReturnValue({
      top: 10,
      right: 190,
      bottom: 90,
      left: 10,
    });
    mocked.analysePixels.mockReturnValue({
      density: 0.4,
      visualOffsetX: 0,
      visualOffsetY: 0,
    });

    const result = await normalizeLogos(["a.png", "b.png"]);
    expect(result.logos).toHaveLength(2);
    expect(result.logos[0]!.src).toBe("a.png");
    expect(result.logos[1]!.src).toBe("b.png");
  });

  it("accepts LogoInput objects", async () => {
    mocked.loadImage.mockResolvedValue({
      src: "a.png",
      naturalWidth: 200,
      naturalHeight: 100,
    } as unknown as HTMLImageElement);
    mocked.getImageData.mockReturnValue({
      canvas: {} as HTMLCanvasElement,
      ctx: {} as CanvasRenderingContext2D,
      data: new ImageData(200, 100),
    });
    mocked.detectContentBounds.mockReturnValue({
      top: 0,
      right: 199,
      bottom: 99,
      left: 0,
    });
    mocked.analysePixels.mockReturnValue({
      density: 0.5,
      visualOffsetX: 0,
      visualOffsetY: 0,
    });

    const result = await normalizeLogos([
      { src: "a.png", alt: "Logo A" },
    ]);
    expect(result.logos[0]!.alt).toBe("Logo A");
  });

  it("produces positive normalized dimensions", async () => {
    mocked.loadImage.mockResolvedValue({
      src: "a.png",
      naturalWidth: 200,
      naturalHeight: 100,
    } as unknown as HTMLImageElement);
    mocked.getImageData.mockReturnValue({
      canvas: {} as HTMLCanvasElement,
      ctx: {} as CanvasRenderingContext2D,
      data: new ImageData(200, 100),
    });
    mocked.detectContentBounds.mockReturnValue({
      top: 0,
      right: 199,
      bottom: 99,
      left: 0,
    });
    mocked.analysePixels.mockReturnValue({
      density: 0.5,
      visualOffsetX: 0,
      visualOffsetY: 0,
    });

    const result = await normalizeLogos(["a.png"]);
    const logo = result.logos[0]!;
    expect(logo.normalizedWidth).toBeGreaterThan(0);
    expect(logo.normalizedHeight).toBeGreaterThan(0);
  });

  it("includes measurements in each logo", async () => {
    mocked.loadImage.mockResolvedValue({
      src: "a.png",
      naturalWidth: 200,
      naturalHeight: 100,
    } as unknown as HTMLImageElement);
    mocked.getImageData.mockReturnValue({
      canvas: {} as HTMLCanvasElement,
      ctx: {} as CanvasRenderingContext2D,
      data: new ImageData(200, 100),
    });
    mocked.detectContentBounds.mockReturnValue({
      top: 0,
      right: 199,
      bottom: 99,
      left: 0,
    });
    mocked.analysePixels.mockReturnValue({
      density: 0.6,
      visualOffsetX: 2,
      visualOffsetY: -3,
    });

    const result = await normalizeLogos(["a.png"]);
    const m = result.logos[0]!.measurements;
    expect(m.naturalWidth).toBe(200);
    expect(m.naturalHeight).toBe(100);
    expect(m.pixelDensity).toBe(0.6);
    expect(m.visualOffsetX).toBe(2);
    expect(m.visualOffsetY).toBe(-3);
  });

  it("uses croppedSrc as renderSrc when cropToContent is true", async () => {
    mocked.loadImage.mockResolvedValue({
      src: "a.png",
      naturalWidth: 200,
      naturalHeight: 100,
    } as unknown as HTMLImageElement);
    mocked.getImageData.mockReturnValue({
      canvas: {} as HTMLCanvasElement,
      ctx: {} as CanvasRenderingContext2D,
      data: new ImageData(200, 100),
    });
    mocked.detectContentBounds.mockReturnValue({
      top: 10,
      right: 190,
      bottom: 90,
      left: 10,
    });
    mocked.analysePixels.mockReturnValue({
      density: 0.5,
      visualOffsetX: 0,
      visualOffsetY: 0,
    });
    mocked.cropToContentDataURI.mockReturnValue("data:image/png;base64,cropped");

    const result = await normalizeLogos(["a.png"], { cropToContent: true });
    expect(mocked.cropToContentDataURI).toHaveBeenCalledOnce();
    expect(result.logos[0]!.renderSrc).toBe("data:image/png;base64,cropped");
  });

  it("uses original src as renderSrc when cropToContent is false", async () => {
    mocked.loadImage.mockResolvedValue({
      src: "a.png",
      naturalWidth: 200,
      naturalHeight: 100,
    } as unknown as HTMLImageElement);
    mocked.getImageData.mockReturnValue({
      canvas: {} as HTMLCanvasElement,
      ctx: {} as CanvasRenderingContext2D,
      data: new ImageData(200, 100),
    });
    mocked.detectContentBounds.mockReturnValue({
      top: 10,
      right: 190,
      bottom: 90,
      left: 10,
    });
    mocked.analysePixels.mockReturnValue({
      density: 0.5,
      visualOffsetX: 0,
      visualOffsetY: 0,
    });

    const result = await normalizeLogos(["a.png"], { cropToContent: false });
    expect(mocked.cropToContentDataURI).not.toHaveBeenCalled();
    expect(result.logos[0]!.renderSrc).toBe("a.png");
  });

  it("respects custom baseSize", async () => {
    mocked.loadImage.mockResolvedValue({
      src: "a.png",
      naturalWidth: 100,
      naturalHeight: 100,
    } as unknown as HTMLImageElement);
    mocked.getImageData.mockReturnValue({
      canvas: {} as HTMLCanvasElement,
      ctx: {} as CanvasRenderingContext2D,
      data: new ImageData(100, 100),
    });
    mocked.detectContentBounds.mockReturnValue({
      top: 0,
      right: 99,
      bottom: 99,
      left: 0,
    });
    mocked.analysePixels.mockReturnValue({
      density: 0.5,
      visualOffsetX: 0,
      visualOffsetY: 0,
    });

    const small = await normalizeLogos(["a.png"], { baseSize: 24 });
    const large = await normalizeLogos(["a.png"], { baseSize: 96 });

    expect(small.logos[0]!.normalizedWidth).toBe(24);
    expect(large.logos[0]!.normalizedWidth).toBe(96);
  });

  it("handles blank images (detectContentBounds returns null)", async () => {
    mocked.loadImage.mockResolvedValue({
      src: "blank.png",
      naturalWidth: 200,
      naturalHeight: 200,
    } as unknown as HTMLImageElement);
    mocked.getImageData.mockReturnValue({
      canvas: {} as HTMLCanvasElement,
      ctx: {} as CanvasRenderingContext2D,
      data: new ImageData(200, 200),
    });
    mocked.detectContentBounds.mockReturnValue(null);

    const result = await normalizeLogos(["blank.png"]);
    expect(mocked.analysePixels).not.toHaveBeenCalled();
    expect(result.logos[0]!.measurements.pixelDensity).toBe(0);
    expect(result.logos[0]!.measurements.contentWidth).toBe(200);
    expect(result.logos[0]!.measurements.contentHeight).toBe(200);
  });

  it("does not skip density compensation when densityAware is true and density > 0", async () => {
    mocked.loadImage.mockResolvedValue({
      src: "a.png",
      naturalWidth: 100,
      naturalHeight: 100,
    } as unknown as HTMLImageElement);
    mocked.getImageData.mockReturnValue({
      canvas: {} as HTMLCanvasElement,
      ctx: {} as CanvasRenderingContext2D,
      data: new ImageData(100, 100),
    });
    mocked.detectContentBounds.mockReturnValue({
      top: 0,
      right: 99,
      bottom: 99,
      left: 0,
    });
    mocked.analysePixels.mockReturnValue({
      density: 0.8,
      visualOffsetX: 0,
      visualOffsetY: 0,
    });

    const result = await normalizeLogos(["a.png"], { baseSize: 100 });
    expect(result.logos[0]!.normalizedWidth).toBe(100);
  });

  it("computes different sizes for logos with different aspect ratios", async () => {
    const createMock = (w: number, h: number, cw: number, ch: number) => {
      mocked.loadImage.mockResolvedValue({
        src: `${w}x${h}.png`,
        naturalWidth: w,
        naturalHeight: h,
      } as unknown as HTMLImageElement);
      mocked.getImageData.mockReturnValue({
        canvas: {} as HTMLCanvasElement,
        ctx: {} as CanvasRenderingContext2D,
        data: new ImageData(w, h),
      });
      mocked.detectContentBounds.mockReturnValue({
        top: 0,
        right: cw - 1,
        bottom: ch - 1,
        left: 0,
      });
      mocked.analysePixels.mockReturnValue({
        density: 0.5,
        visualOffsetX: 0,
        visualOffsetY: 0,
      });
    };

    createMock(400, 100, 400, 100);
    const wide = await normalizeLogos(["4x1.png"], {
      baseSize: 48,
      densityAware: false,
    });
    createMock(50, 100, 50, 100);
    const tall = await normalizeLogos(["1x2.png"], {
      baseSize: 48,
      densityAware: false,
    });

    expect(wide.logos[0]!.normalizedWidth).toBeGreaterThan(
      tall.logos[0]!.normalizedWidth,
    );
    expect(tall.logos[0]!.normalizedHeight).toBeGreaterThan(
      wide.logos[0]!.normalizedHeight,
    );
  });
});
