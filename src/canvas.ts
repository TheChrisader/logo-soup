export interface ContentBounds {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PixelAnalysis {
  density: number;
  visualOffsetX: number;
  visualOffsetY: number;
}

const ALPHA_THRESHOLD = 10;
const WHITE_THRESHOLD = 240;

function isBackground(r: number, g: number, b: number, a: number): boolean {
  if (a < ALPHA_THRESHOLD) return true;
  if (
    a > 240 &&
    r > WHITE_THRESHOLD &&
    g > WHITE_THRESHOLD &&
    b > WHITE_THRESHOLD
  )
    return true;
  return false;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

export function getImageData(
  img: HTMLImageElement,
  width = img.naturalWidth,
  height = img.naturalHeight,
): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  data: ImageData;
} {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D canvas context");
  ctx.drawImage(img, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height);
  return { canvas, ctx, data };
}

export function detectContentBounds(data: ImageData): ContentBounds | null {
  const { width, height, data: px } = data;
  let top = height,
    right = 0,
    bottom = 0,
    left = width;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (!isBackground(px[i]!, px[i + 1]!, px[i + 2]!, px[i + 3]!)) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }

  if (top > bottom || left > right) return null;
  return { top, right, bottom, left };
}

export function analysePixels(
  data: ImageData,
  bounds?: ContentBounds,
): PixelAnalysis {
  const { width, height, data: px } = data;
  const bTop = bounds?.top ?? 0;
  const bLeft = bounds?.left ?? 0;
  const bRight = bounds?.right ?? width - 1;
  const bBottom = bounds?.bottom ?? height - 1;

  const regionW = bRight - bLeft + 1;
  const regionH = bBottom - bTop + 1;
  const totalPx = regionW * regionH;

  let contentPx = 0;
  let weightedX = 0;
  let weightedY = 0;
  let totalWeight = 0;

  for (let y = bTop; y <= bBottom; y++) {
    for (let x = bLeft; x <= bRight; x++) {
      const i = (y * width + x) * 4;
      const r = px[i]!,
        g = px[i + 1]!,
        b = px[i + 2]!,
        a = px[i + 3]!;

      if (isBackground(r, g, b, a)) continue;

      contentPx++;

      const dist = Math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2);
      const weight = Math.sqrt(dist) * (a / 255);
      totalWeight += weight;
      weightedX += x * weight;
      weightedY += y * weight;
    }
  }

  const density = totalPx > 0 ? contentPx / totalPx : 0;

  const geoCenterX = bLeft + regionW / 2;
  const geoCenterY = bTop + regionH / 2;

  const visualCenterX = totalWeight > 0 ? weightedX / totalWeight : geoCenterX;
  const visualCenterY = totalWeight > 0 ? weightedY / totalWeight : geoCenterY;

  return {
    density,
    visualOffsetX: visualCenterX - geoCenterX,
    visualOffsetY: visualCenterY - geoCenterY,
  };
}

export function cropToContentDataURI(
  img: HTMLImageElement,
  bounds: ContentBounds,
): string {
  const cropW = bounds.right - bounds.left + 1;
  const cropH = bounds.bottom - bounds.top + 1;

  const canvas = document.createElement("canvas");
  canvas.width = cropW;
  canvas.height = cropH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D canvas context");

  ctx.drawImage(img, bounds.left, bounds.top, cropW, cropH, 0, 0, cropW, cropH);

  return canvas.toDataURL("image/png");
}
