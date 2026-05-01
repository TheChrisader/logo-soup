export { normalizeLogos } from "./normalize.js";
export { getVisualCenterTransform } from "./math.js";

export type {
  AlignBy,
  LogoInput,
  LogoMeasurements,
  LogoSoupOptions,
  NormalizedLogo,
  NormalizeResult,
} from "./types.js";

export {
  loadImage,
  getImageData,
  detectContentBounds,
  analysePixels,
  cropToContentDataURI,
} from "./canvas.js";
