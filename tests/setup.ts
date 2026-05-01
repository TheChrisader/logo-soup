class ImageDataPolyfill implements ImageData {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
  readonly colorSpace: PredefinedColorSpace;

  constructor(widthOrData: number | Uint8ClampedArray, height?: number) {
    if (typeof widthOrData === "number") {
      this.width = widthOrData;
      this.height = height ?? widthOrData;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
    } else {
      this.data = widthOrData;
      this.width = height ?? (widthOrData.length / 4) | 0;
      this.height = (widthOrData.length / 4 / this.width) | 0;
    }
    this.colorSpace = "srgb";
  }
}

Object.assign(globalThis, { ImageData: ImageDataPolyfill });
