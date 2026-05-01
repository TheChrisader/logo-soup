export interface LogoInput {
  src: string;
  alt?: string;
}

export type AlignBy =
  | "bounds"
  | "visual-center"
  | "visual-center-x"
  | "visual-center-y";

export interface LogoSoupOptions {
  baseSize?: number;

  scaleFactor?: number;

  densityAware?: boolean;

  densityFactor?: number;

  cropToContent?: boolean;

  alignBy?: AlignBy;
}

export interface LogoMeasurements {
  naturalWidth: number;
  naturalHeight: number;
  contentWidth: number;
  contentHeight: number;
  pixelDensity: number;
  visualOffsetX: number;
  visualOffsetY: number;
  croppedSrc?: string;
}

export interface NormalizedLogo extends LogoInput {
  normalizedWidth: number;
  normalizedHeight: number;
  measurements: LogoMeasurements;
  renderSrc: string;
}

export interface NormalizeResult {
  logos: NormalizedLogo[];
}
