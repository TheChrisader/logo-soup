import type {
  LogoInput,
  LogoMeasurements,
  LogoSoupOptions,
  NormalizeResult,
  NormalizedLogo,
} from "./types.js";
import {
  loadImage,
  getImageData,
  detectContentBounds,
  analysePixels,
  cropToContentDataURI,
} from "./canvas.js";
import {
  computePINFWidth,
  applyDensityCompensation,
  computeDimensions,
} from "./math.js";

const DEFAULTS: Required<Omit<LogoSoupOptions, "alignBy">> &
  Pick<LogoSoupOptions, "alignBy"> = {
  baseSize: 48,
  scaleFactor: 0.5,
  densityAware: true,
  densityFactor: 0.5,
  cropToContent: false,
  alignBy: "bounds",
};

export async function normalizeLogos(
  inputs: (string | LogoInput)[],
  options: LogoSoupOptions = {},
): Promise<NormalizeResult> {
  const opts = { ...DEFAULTS, ...options };

  // Normalise string shorthand to LogoInput
  const logoInputs: LogoInput[] = inputs.map((item) =>
    typeof item === "string" ? { src: item } : item,
  );

  if (logoInputs.length === 0) {
    return { logos: [] };
  }

  const measured = await Promise.all(
    logoInputs.map(
      async (
        input,
      ): Promise<{ input: LogoInput; measurements: LogoMeasurements }> => {
        const img = await loadImage(input.src);
        const { data } = getImageData(img);

        const bounds = detectContentBounds(data);

        let contentWidth = img.naturalWidth;
        let contentHeight = img.naturalHeight;
        let croppedSrc: string | undefined;
        let analysis;

        if (bounds) {
          contentWidth = bounds.right - bounds.left + 1;
          contentHeight = bounds.bottom - bounds.top + 1;
          analysis = analysePixels(data, bounds);

          if (opts.cropToContent) {
            croppedSrc = cropToContentDataURI(img, bounds);
          }
        } else {
          // Entirely transparent / blank — treat as 1:1, zero density
          analysis = { density: 0, visualOffsetX: 0, visualOffsetY: 0 };
        }

        const measurements: LogoMeasurements = {
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          contentWidth,
          contentHeight,
          pixelDensity: analysis.density,
          visualOffsetX: analysis.visualOffsetX,
          visualOffsetY: analysis.visualOffsetY,
          ...(croppedSrc !== undefined && { croppedSrc }),
        };

        return { input, measurements };
      },
    ),
  );

  const avgDensity = opts.densityAware
    ? measured.reduce((sum, m) => sum + m.measurements.pixelDensity, 0) /
      measured.length
    : 0;

  const logos: NormalizedLogo[] = measured.map(({ input, measurements }) => {
    const { contentWidth, contentHeight } = measurements;
    const aspectRatio = contentHeight > 0 ? contentWidth / contentHeight : 1;

    let pinfWidth = computePINFWidth(
      aspectRatio,
      opts.scaleFactor,
      opts.baseSize,
    );

    if (opts.densityAware && measurements.pixelDensity > 0 && avgDensity > 0) {
      pinfWidth = applyDensityCompensation(
        pinfWidth,
        measurements.pixelDensity,
        avgDensity,
        opts.densityFactor,
      );
    }

    const { width, height } = computeDimensions(pinfWidth, aspectRatio);

    return {
      ...input,
      normalizedWidth: Math.round(width),
      normalizedHeight: Math.round(height),
      measurements,
      renderSrc: measurements.croppedSrc ?? input.src,
    };
  });

  return { logos };
}
