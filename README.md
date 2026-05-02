# logo-soup

Framework-agnostic TypeScript library for normalizing logo visuals. Takes a collection of logos with different sizes, aspect ratios, and pixel densities, then produces consistent dimensions so they look balanced when displayed together.

Inspired by [The Logo Soup Problem](https://www.sanity.io/blog/the-logo-soup-problem).

Works in any environment with a DOM or DOM polyfill (browsers, happy-dom, jsdom).

## Install

```bash
npm install @chrisader/logo-soup
```

## Quick start

```ts
import { normalizeLogos } from "@chrisader/logo-soup";

const result = await normalizeLogos([
  { src: "/logos/acme.svg", alt: "Acme" },
  { src: "/logos/globex.png", alt: "Globex" },
]);

for (const logo of result.logos) {
  console.log(`${logo.alt}: ${logo.normalizedWidth}x${logo.normalizedHeight}`);
}
```

Each `NormalizedLogo` in `result.logos` includes `normalizedWidth`, `normalizedHeight`, `renderSrc`, and `measurements` for pixel density and visual center offsets.

## Options

Pass an options object as the second argument to `normalizeLogos`:

| Option          | Type      | Default    | Description                                                                                                                                                                                                                   |
| --------------- | --------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `baseSize`      | `number`  | `48`       | Target size in pixels. Logos are scaled around this value.                                                                                                                                                                    |
| `scaleFactor`   | `number`  | `0.5`      | Controls aspect ratio sensitivity. `0` makes all logos the same width, `1` makes them the same height, `0.5` is a balanced middle ground.                                                                                     |
| `densityAware`  | `boolean` | `true`     | When true, dense (heavy) logos are shrunk and light (thin) logos are enlarged so they appear visually similar in weight.                                                                                                      |
| `densityFactor` | `number`  | `0.5`      | Strength of density compensation. `0` disables it, `1` applies full compensation.                                                                                                                                             |
| `cropToContent` | `boolean` | `false`    | When true, transparent/white padding is cropped and a data URI is generated in `renderSrc`.                                                                                                                                   |
| `alignBy`       | `string`  | `"bounds"` | How logos are centered. `"bounds"` uses the bounding box center. `"visual-center"` shifts each logo so its perceived visual center aligns. Also accepts `"visual-center-x"` or `"visual-center-y"` for single-axis alignment. |

## Visual center alignment

When `alignBy` is set to a visual center mode, each logo includes a CSS `transform` string you can apply to shift it so its perceived weight center lines up with other logos:

```ts
import { normalizeLogos, getVisualCenterTransform } from "@chrisader/logo-soup";

const result = await normalizeLogos(logos, { alignBy: "visual-center" });

for (const logo of result.logos) {
  const transform = getVisualCenterTransform(logo, "visual-center");
  // apply transform to the <img> element
}
```

## How sizing works

Logo-soup uses the Proportional Image Normalization Formula (PINF) to compute display widths:

```
width = (aspectRatio ^ scaleFactor) * baseSize
```

A `scaleFactor` of 0 treats every logo like a square (same width, different heights). A value of 1 equalizes heights (different widths, same height). The default of 0.5 balances between the two.

When density compensation is enabled, each logo's PINF width is further adjusted based on how its pixel density compares to the group average. Dense logos shrink; sparse logos grow. This makes a bold wordmark and a thin line icon feel like they take up similar visual space.

## Content detection

The library scans each image's pixels to find the bounding box of non-background content. A pixel is considered background if it is transparent (alpha below 10) or near-white (RGB all above 240 with alpha above 240).

This content bounding box is used to compute:

- The actual content aspect ratio (ignoring padding)
- Pixel density (ratio of content pixels to total bounding box pixels)
- The visual center (perceptual center of mass using contrast-weighted coordinates)

## Low-level exports

These are available if you need finer control over individual steps:

- `loadImage(src)` - Load an image element from a URL or data URI
- `getImageData(img)` - Draw an image to a canvas and extract pixel data
- `detectContentBounds(imageData)` - Find the bounding box of non-background pixels
- `analysePixels(imageData, bounds?)` - Compute density and visual center offset
- `cropToContentDataURI(img, bounds)` - Crop padding and return a PNG data URI
- `computePINFWidth(aspectRatio, scaleFactor, baseSize)` - Run the sizing formula
- `applyDensityCompensation(width, density, avgDensity, factor)` - Adjust for density
- `getVisualCenterTransform(logo, alignBy)` - Build a CSS transform string

## Types

```ts
interface LogoInput {
  src: string;
  alt?: string;
}

interface LogoSoupOptions {
  baseSize?: number;
  scaleFactor?: number;
  densityAware?: boolean;
  densityFactor?: number;
  cropToContent?: boolean;
  alignBy?: "bounds" | "visual-center" | "visual-center-x" | "visual-center-y";
}

interface LogoMeasurements {
  naturalWidth: number;
  naturalHeight: number;
  contentWidth: number;
  contentHeight: number;
  pixelDensity: number;
  visualOffsetX: number;
  visualOffsetY: number;
  croppedSrc?: string;
}

interface NormalizedLogo extends LogoInput {
  normalizedWidth: number;
  normalizedHeight: number;
  measurements: LogoMeasurements;
  renderSrc: string;
}

interface NormalizeResult {
  logos: NormalizedLogo[];
}
```

## License

MIT
