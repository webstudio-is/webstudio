/**
 * Adapted from Software Mansion Argent's screenshot-diff resize helpers.
 * Source: https://github.com/software-mansion/argent/tree/main/packages/tool-server/src/tools/screenshot-diff
 * License: Apache-2.0
 */

export type DecodedRgbaImage = {
  width: number;
  height: number;
  data: Uint8Array;
};

const ASPECT_RATIO_TOLERANCE = 0.01;
const LANCZOS3_RADIUS = 3;
const LANCZOS3_EPSILON = 1e-9;

export const normalizeToCommonSize = (
  baseline: DecodedRgbaImage,
  current: DecodedRgbaImage
): { baseline: DecodedRgbaImage; current: DecodedRgbaImage } | undefined => {
  if (baseline.width === current.width && baseline.height === current.height) {
    return { baseline, current };
  }

  if (aspectRatiosMatch(baseline, current) === false) {
    return undefined;
  }

  const baselineArea = baseline.width * baseline.height;
  const currentArea = current.width * current.height;

  if (baselineArea <= currentArea) {
    return {
      baseline,
      current: resizeDecodedRgbaImage(current, baseline.width, baseline.height),
    };
  }

  return {
    baseline: resizeDecodedRgbaImage(baseline, current.width, current.height),
    current,
  };
};

export const resizeDecodedRgbaImage = (
  source: DecodedRgbaImage,
  width: number,
  height: number
): DecodedRgbaImage => {
  const targetWidth = Math.max(1, Math.round(width));
  const targetHeight = Math.max(1, Math.round(height));
  if (targetWidth === source.width && targetHeight === source.height) {
    return {
      width: source.width,
      height: source.height,
      data: Uint8Array.from(source.data),
    };
  }

  const horizontal = buildLanczos3AxisWeights(source.width, targetWidth);
  const vertical = buildLanczos3AxisWeights(source.height, targetHeight);
  const intermediate = new Float32Array(targetWidth * source.height * 4);

  for (let y = 0; y < source.height; y++) {
    const rowOffset = y * source.width * 4;
    const targetRowOffset = y * targetWidth * 4;
    for (let x = 0; x < targetWidth; x++) {
      const { start, weights } = horizontal[x];
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      const baseOffset = rowOffset + start * 4;
      for (let index = 0; index < weights.length; index++) {
        const sampleOffset = baseOffset + index * 4;
        const weight = weights[index];
        r += source.data[sampleOffset] * weight;
        g += source.data[sampleOffset + 1] * weight;
        b += source.data[sampleOffset + 2] * weight;
        a += source.data[sampleOffset + 3] * weight;
      }
      const targetOffset = targetRowOffset + x * 4;
      intermediate[targetOffset] = r;
      intermediate[targetOffset + 1] = g;
      intermediate[targetOffset + 2] = b;
      intermediate[targetOffset + 3] = a;
    }
  }

  const output = new Uint8Array(targetWidth * targetHeight * 4);
  const rowStride = targetWidth * 4;
  for (let y = 0; y < targetHeight; y++) {
    const { start, weights } = vertical[y];
    const targetRowOffset = y * rowStride;
    for (let x = 0; x < targetWidth; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      const columnOffset = start * rowStride + x * 4;
      for (let index = 0; index < weights.length; index++) {
        const sampleOffset = columnOffset + index * rowStride;
        const weight = weights[index];
        r += intermediate[sampleOffset] * weight;
        g += intermediate[sampleOffset + 1] * weight;
        b += intermediate[sampleOffset + 2] * weight;
        a += intermediate[sampleOffset + 3] * weight;
      }
      const targetOffset = targetRowOffset + x * 4;
      output[targetOffset] = clampToByte(r);
      output[targetOffset + 1] = clampToByte(g);
      output[targetOffset + 2] = clampToByte(b);
      output[targetOffset + 3] = clampToByte(a);
    }
  }

  return { width: targetWidth, height: targetHeight, data: output };
};

type ResampleAxisWeights = {
  start: number;
  weights: Float32Array;
};

const aspectRatiosMatch = (left: DecodedRgbaImage, right: DecodedRgbaImage) => {
  if (
    left.width <= 0 ||
    left.height <= 0 ||
    right.width <= 0 ||
    right.height <= 0
  ) {
    return false;
  }
  const leftAspect = left.width / left.height;
  const rightAspect = right.width / right.height;
  const largest = Math.max(leftAspect, rightAspect);
  if (largest === 0) {
    return false;
  }
  return Math.abs(leftAspect - rightAspect) / largest <= ASPECT_RATIO_TOLERANCE;
};

const buildLanczos3AxisWeights = (
  sourceSize: number,
  targetSize: number
): ResampleAxisWeights[] => {
  const scale = targetSize / sourceSize;
  const filterScale = scale < 1 ? scale : 1;
  const supportInSource = LANCZOS3_RADIUS / filterScale;
  const axis: ResampleAxisWeights[] = new Array(targetSize);

  for (let index = 0; index < targetSize; index++) {
    const center = (index + 0.5) / scale - 0.5;
    const start = Math.max(
      0,
      Math.ceil(center - supportInSource - LANCZOS3_EPSILON)
    );
    const end = Math.min(
      sourceSize - 1,
      Math.floor(center + supportInSource + LANCZOS3_EPSILON)
    );
    const length = Math.max(1, end - start + 1);
    const weights = new Float32Array(length);
    let sum = 0;
    for (let offset = 0; offset < length; offset++) {
      const sampleIndex = start + offset;
      const weight = lanczos3Kernel((sampleIndex - center) * filterScale);
      weights[offset] = weight;
      sum += weight;
    }
    if (sum !== 0) {
      const inverseSum = 1 / sum;
      for (let offset = 0; offset < length; offset++) {
        weights[offset] *= inverseSum;
      }
    }
    axis[index] = { start, weights };
  }
  return axis;
};

const lanczos3Kernel = (value: number) => {
  if (value === 0) {
    return 1;
  }
  if (value <= -LANCZOS3_RADIUS || value >= LANCZOS3_RADIUS) {
    return 0;
  }
  const piValue = Math.PI * value;
  return (
    (LANCZOS3_RADIUS *
      Math.sin(piValue) *
      Math.sin(piValue / LANCZOS3_RADIUS)) /
    (piValue * piValue)
  );
};

const clampToByte = (value: number) => {
  if (value <= 0) {
    return 0;
  }
  if (value >= 255) {
    return 255;
  }
  return Math.round(value);
};
