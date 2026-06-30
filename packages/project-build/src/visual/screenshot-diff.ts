/**
 * Adapted from Software Mansion Argent's screenshot-diff implementation.
 * Source: https://github.com/software-mansion/argent/tree/main/packages/tool-server/src/tools/screenshot-diff
 * License: Apache-2.0
 */

import fs from "node:fs/promises";
import path from "node:path";
import { decode, encode, type DecodedPng, type ImageData } from "fast-png";
import {
  normalizeToCommonSize,
  resizeDecodedRgbaImage,
  type DecodedRgbaImage,
} from "./screenshot-resize";
import {
  analyzeScreenshotTextChanges,
  type ScreenshotTextAnalysis,
} from "./screenshot-text-diff";

export type ScreenshotDiffSize = {
  width: number;
  height: number;
};

export type ScreenshotDiffRgb = {
  r: number;
  g: number;
  b: number;
};

export type ScreenshotDiffBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ScreenshotDiffDominantColorChange = {
  channel: "red" | "green" | "blue" | "luminance" | "none";
  direction: "increase" | "decrease" | "none";
  magnitude: number;
};

export type ScreenshotDiffRegion = {
  bounds: ScreenshotDiffBounds;
  pixelCount: number;
  averageColor: {
    delta: ScreenshotDiffRgb;
    dominantChange: ScreenshotDiffDominantColorChange;
  };
};

export type ScreenshotDiffResult = {
  totalPixels: number;
  differentPixels: number;
  mismatchPercentage: number;
  imageSize?: ScreenshotDiffSize;
  summary: string;
  diffPath?: string;
  contextDiffPath?: string;
  dimensionMismatch?: {
    expected: ScreenshotDiffSize;
    actual: ScreenshotDiffSize;
  };
  regions: ScreenshotDiffRegion[];
  textAnalysis: ScreenshotTextAnalysis;
  warnings: readonly string[];
};

type ChangeRegion = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  pixelCount: number;
  baselineSum: ScreenshotDiffRgb;
  currentSum: ScreenshotDiffRgb;
};

type DiffMask = {
  mask: Uint8Array;
  differentPixels: number;
};

const MAX_RGB_DISTANCE_SQUARED = 255 * 255 * 3;
const DEFAULT_THRESHOLD = 0.1;
const DEFAULT_IGNORE_TOP_NORMALIZED_Y = 0;
const DEFAULT_REGION_MERGE_DISTANCE = 8;
const DEFAULT_CONTEXT_DIFF_SCALE = 0.3;
const MIN_REGION_PIXEL_COUNT = 2;
const MAX_REGIONS_FOR_JOIN = 5000;
const MAX_REGIONS_WITHOUT_JOIN = 64;
const REGION_RECTANGLE_STROKE_WIDTH = 4;
const REGION_RECTANGLE_COLOR: ScreenshotDiffRgb = { r: 255, g: 220, b: 0 };
const DIFF_BRIGHTER_COLOR: ScreenshotDiffRgb = { r: 0, g: 200, b: 0 };
const DIFF_DARKER_COLOR: ScreenshotDiffRgb = { r: 255, g: 0, b: 0 };
const HORIZONTAL_TEXT_MERGE_HEIGHT_MULTIPLIER = 3;
const HORIZONTAL_TEXT_MERGE_MIN_GAP = 32;
const HORIZONTAL_TEXT_MERGE_MAX_GAP = 120;
const UNIFORM_BRIGHTNESS_DELTA_TOLERANCE = 4;
const MAX_SUMMARY_REGIONS = 8;

export const diffPngFiles = async ({
  baselinePath,
  currentPath,
  outputDir,
  threshold = DEFAULT_THRESHOLD,
  ignoreTopNormalizedY = DEFAULT_IGNORE_TOP_NORMALIZED_Y,
}: {
  baselinePath: string;
  currentPath: string;
  outputDir: string;
  threshold?: number;
  ignoreTopNormalizedY?: number;
}): Promise<ScreenshotDiffResult> => {
  const [decodedBaseline, decodedCurrent] = await Promise.all([
    decodePngFile(baselinePath),
    decodePngFile(currentPath),
  ]);

  const normalized = normalizeToCommonSize(decodedBaseline, decodedCurrent);
  if (normalized === undefined) {
    return summarizeResult({
      totalPixels: decodedBaseline.width * decodedBaseline.height,
      differentPixels: 0,
      mismatchPercentage: 0,
      dimensionMismatch: {
        expected: {
          width: decodedBaseline.width,
          height: decodedBaseline.height,
        },
        actual: {
          width: decodedCurrent.width,
          height: decodedCurrent.height,
        },
      },
      regions: [],
      textAnalysis: {
        status: "skipped",
        provider: "tesseract",
        changes: [],
      },
      warnings: ["dimension_mismatch"],
    });
  }

  const baseline = normalized.baseline;
  const current = normalized.current;
  const pixelDiff = markChangedPixels({
    baseline,
    current,
    thresholdSquared: threshold * threshold * MAX_RGB_DISTANCE_SQUARED,
    ignoreTopNormalizedY,
  });
  const regions = getChangedRegions({
    mask: pixelDiff.mask,
    baseline,
    current,
    joinGapPixels: DEFAULT_REGION_MERGE_DISTANCE,
  });
  const totalPixels = baseline.width * baseline.height;
  const artifactPaths = getDiffArtifactPaths({ currentPath, outputDir });
  await writeDiffArtifacts({
    baseline,
    current,
    mask: pixelDiff.mask,
    regions,
    paths: artifactPaths,
    contextDiffScale: DEFAULT_CONTEXT_DIFF_SCALE,
  });
  const canAnalyzeText =
    decodedBaseline.width === decodedCurrent.width &&
    decodedBaseline.height === decodedCurrent.height;
  const textAnalysis: ScreenshotTextAnalysis = canAnalyzeText
    ? await analyzeScreenshotTextChanges({
        baselinePath,
        currentPath,
        hasPixelDiff: pixelDiff.differentPixels > 0,
        baselineImage: baseline,
        currentImage: current,
        ignoreTopPixels: Math.ceil(baseline.height * ignoreTopNormalizedY),
      })
    : createSkippedTextAnalysis();

  return summarizeResult({
    totalPixels,
    differentPixels: pixelDiff.differentPixels,
    mismatchPercentage:
      totalPixels === 0 ? 0 : (pixelDiff.differentPixels / totalPixels) * 100,
    imageSize: { width: baseline.width, height: baseline.height },
    diffPath: artifactPaths.diffPath,
    contextDiffPath: artifactPaths.contextDiffPath,
    regions,
    textAnalysis,
    warnings: getTextAnalysisWarnings({ canAnalyzeText, textAnalysis }),
  });
};

const getTextAnalysisWarnings = ({
  canAnalyzeText,
  textAnalysis,
}: {
  canAnalyzeText: boolean;
  textAnalysis: ScreenshotTextAnalysis;
}) => {
  if (canAnalyzeText === false) {
    return ["ocr_skipped_size_normalized"];
  }
  if (textAnalysis.status === "unavailable") {
    return ["ocr_unavailable_tesseract_not_found_or_failed"];
  }
  return [];
};

const createSkippedTextAnalysis = (): ScreenshotTextAnalysis => ({
  status: "skipped",
  provider: "tesseract",
  changes: [],
});

const summarizeResult = (
  result: Omit<ScreenshotDiffResult, "summary">
): ScreenshotDiffResult => ({
  ...result,
  summary: formatScreenshotDiffSummary(result),
});

const decodePngFile = async (filePath: string): Promise<DecodedRgbaImage> => {
  const buffer = await fs.readFile(filePath);
  const png = decode(buffer);
  return { width: png.width, height: png.height, data: toRgbaData(png) };
};

const toRgbaData = (png: DecodedPng): Uint8Array => {
  if (png.depth !== 8 || png.data instanceof Uint8Array === false) {
    throw new Error("Only 8-bit PNG screenshots are supported.");
  }
  if (png.channels === 4) {
    return Uint8Array.from(png.data);
  }
  const output = new Uint8Array(png.width * png.height * 4);
  for (let pixelIndex = 0; pixelIndex < png.width * png.height; pixelIndex++) {
    const sourceOffset = pixelIndex * png.channels;
    const outputOffset = pixelIndex * 4;
    if (png.channels === 3) {
      output[outputOffset] = png.data[sourceOffset];
      output[outputOffset + 1] = png.data[sourceOffset + 1];
      output[outputOffset + 2] = png.data[sourceOffset + 2];
      output[outputOffset + 3] = 255;
      continue;
    }
    if (png.channels === 2) {
      output[outputOffset] = png.data[sourceOffset];
      output[outputOffset + 1] = png.data[sourceOffset];
      output[outputOffset + 2] = png.data[sourceOffset];
      output[outputOffset + 3] = png.data[sourceOffset + 1];
      continue;
    }
    if (png.channels === 1) {
      output[outputOffset] = png.data[sourceOffset];
      output[outputOffset + 1] = png.data[sourceOffset];
      output[outputOffset + 2] = png.data[sourceOffset];
      output[outputOffset + 3] = 255;
      continue;
    }
    throw new Error(`Unsupported PNG channel count: ${png.channels}.`);
  }
  return output;
};

const markChangedPixels = ({
  baseline,
  current,
  thresholdSquared,
  ignoreTopNormalizedY,
}: {
  baseline: DecodedRgbaImage;
  current: DecodedRgbaImage;
  thresholdSquared: number;
  ignoreTopNormalizedY: number;
}): DiffMask => {
  const totalPixels = baseline.width * baseline.height;
  const mask = new Uint8Array(totalPixels);
  const ignoredTopRows = Math.min(
    baseline.height,
    Math.ceil(baseline.height * ignoreTopNormalizedY)
  );
  let differentPixels = 0;

  for (let y = ignoredTopRows; y < baseline.height; y++) {
    for (let x = 0; x < baseline.width; x++) {
      const pixelIndex = y * baseline.width + x;
      const offset = pixelIndex * 4;
      const redDelta = current.data[offset] - baseline.data[offset];
      const greenDelta = current.data[offset + 1] - baseline.data[offset + 1];
      const blueDelta = current.data[offset + 2] - baseline.data[offset + 2];
      const rgbDistanceSquared =
        redDelta * redDelta + greenDelta * greenDelta + blueDelta * blueDelta;
      if (rgbDistanceSquared > thresholdSquared) {
        mask[pixelIndex] = 1;
        differentPixels++;
      }
    }
  }

  return { mask, differentPixels };
};

const getChangedRegions = ({
  mask,
  baseline,
  current,
  joinGapPixels,
}: {
  mask: Uint8Array;
  baseline: DecodedRgbaImage;
  current: DecodedRgbaImage;
  joinGapPixels: number;
}): ScreenshotDiffRegion[] => {
  const rawRegions = traceChangeRegions({
    mask,
    width: baseline.width,
    height: baseline.height,
    baselineData: baseline.data,
    currentData: current.data,
  });
  const significantRegions = rawRegions.filter(
    (region) => region.pixelCount >= MIN_REGION_PIXEL_COUNT
  );
  const finalRegions =
    significantRegions.length > MAX_REGIONS_FOR_JOIN
      ? topRegionsByPixelCount(significantRegions, MAX_REGIONS_WITHOUT_JOIN)
      : joinChangeRegions(significantRegions, joinGapPixels);
  return finalRegions
    .map(toDiffRegion)
    .sort(
      (left, right) =>
        left.bounds.y - right.bounds.y || left.bounds.x - right.bounds.x
    );
};

const traceChangeRegions = ({
  mask,
  width,
  height,
  baselineData,
  currentData,
}: {
  mask: Uint8Array;
  width: number;
  height: number;
  baselineData: Uint8Array;
  currentData: Uint8Array;
}) => {
  const visited = new Uint8Array(mask.length);
  const queue = new Int32Array(mask.length);
  const regions: ChangeRegion[] = [];

  for (let startIndex = 0; startIndex < mask.length; startIndex++) {
    if (mask[startIndex] === 0 || visited[startIndex] === 1) {
      continue;
    }
    let queueStart = 0;
    let queueEnd = 0;
    queue[queueEnd++] = startIndex;
    visited[startIndex] = 1;

    const startX = startIndex % width;
    const startY = Math.floor(startIndex / width);
    const region: ChangeRegion = {
      minX: startX,
      minY: startY,
      maxX: startX,
      maxY: startY,
      pixelCount: 0,
      baselineSum: { r: 0, g: 0, b: 0 },
      currentSum: { r: 0, g: 0, b: 0 },
    };

    while (queueStart < queueEnd) {
      const pixelIndex = queue[queueStart++];
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);
      absorbChangedPixel(
        region,
        x,
        y,
        baselineData,
        currentData,
        pixelIndex * 4
      );

      for (let yOffset = -1; yOffset <= 1; yOffset++) {
        const nextY = y + yOffset;
        if (nextY < 0 || nextY >= height) {
          continue;
        }
        for (let xOffset = -1; xOffset <= 1; xOffset++) {
          if (xOffset === 0 && yOffset === 0) {
            continue;
          }
          const nextX = x + xOffset;
          if (nextX < 0 || nextX >= width) {
            continue;
          }
          const nextIndex = nextY * width + nextX;
          if (mask[nextIndex] === 0 || visited[nextIndex] === 1) {
            continue;
          }
          visited[nextIndex] = 1;
          queue[queueEnd++] = nextIndex;
        }
      }
    }
    regions.push(region);
  }

  return regions;
};

const absorbChangedPixel = (
  region: ChangeRegion,
  x: number,
  y: number,
  baselineData: Uint8Array,
  currentData: Uint8Array,
  offset: number
) => {
  region.minX = Math.min(region.minX, x);
  region.minY = Math.min(region.minY, y);
  region.maxX = Math.max(region.maxX, x);
  region.maxY = Math.max(region.maxY, y);
  region.pixelCount++;
  region.baselineSum.r += baselineData[offset];
  region.baselineSum.g += baselineData[offset + 1];
  region.baselineSum.b += baselineData[offset + 2];
  region.currentSum.r += currentData[offset];
  region.currentSum.g += currentData[offset + 1];
  region.currentSum.b += currentData[offset + 2];
};

const joinChangeRegions = (
  sourceRegions: ChangeRegion[],
  joinGapPixels: number
) => {
  const regions = sourceRegions.map(copyRegion);
  if (regions.length <= 1) {
    return regions;
  }

  for (let index = 0; index < regions.length; index++) {
    let candidateIndex = 0;
    while (candidateIndex < regions.length) {
      if (index === candidateIndex) {
        candidateIndex++;
        continue;
      }
      if (
        shouldJoinRegions(
          regions[index],
          regions[candidateIndex],
          joinGapPixels
        )
      ) {
        regions[index] = combineRegions(
          regions[index],
          regions[candidateIndex]
        );
        regions.splice(candidateIndex, 1);
        if (candidateIndex < index) {
          index--;
        }
        candidateIndex = 0;
        continue;
      }
      candidateIndex++;
    }
  }
  return regions;
};

const shouldJoinRegions = (
  left: ChangeRegion,
  right: ChangeRegion,
  joinGapPixels: number
) => {
  const deltaX =
    left.maxX < right.minX
      ? right.minX - left.maxX - 1
      : right.maxX < left.minX
        ? left.minX - right.maxX - 1
        : 0;
  const deltaY =
    left.maxY < right.minY
      ? right.minY - left.maxY - 1
      : right.maxY < left.minY
        ? left.minY - right.maxY - 1
        : 0;
  if (Math.sqrt(deltaX * deltaX + deltaY * deltaY) <= joinGapPixels) {
    return true;
  }
  return joinGapPixels > 0 && seemsLikeOneTextRow(left, right);
};

const seemsLikeOneTextRow = (left: ChangeRegion, right: ChangeRegion) => {
  const horizontalGap = regionHorizontalGap(left, right);
  if (horizontalGap <= 0) {
    return false;
  }
  const heightLeft = regionHeight(left);
  const heightRight = regionHeight(right);
  const maxHeight = Math.max(heightLeft, heightRight);
  const minHeight = Math.min(heightLeft, heightRight);
  const allowedGap = Math.min(
    HORIZONTAL_TEXT_MERGE_MAX_GAP,
    Math.max(
      HORIZONTAL_TEXT_MERGE_MIN_GAP,
      maxHeight * HORIZONTAL_TEXT_MERGE_HEIGHT_MULTIPLIER
    )
  );
  if (horizontalGap > allowedGap) {
    return false;
  }
  const verticalOverlap =
    Math.min(left.maxY, right.maxY) - Math.max(left.minY, right.minY) + 1;
  if (verticalOverlap > 0 && verticalOverlap / minHeight >= 0.5) {
    return true;
  }
  return (
    Math.abs(regionCenterY(left) - regionCenterY(right)) <=
    Math.max(4, minHeight * 0.6)
  );
};

const copyRegion = (region: ChangeRegion): ChangeRegion => ({
  minX: region.minX,
  minY: region.minY,
  maxX: region.maxX,
  maxY: region.maxY,
  pixelCount: region.pixelCount,
  baselineSum: { ...region.baselineSum },
  currentSum: { ...region.currentSum },
});

const topRegionsByPixelCount = (regions: ChangeRegion[], limit: number) =>
  regions.length <= limit
    ? regions
    : [...regions]
        .sort((left, right) => right.pixelCount - left.pixelCount)
        .slice(0, limit);

const combineRegions = (
  left: ChangeRegion,
  right: ChangeRegion
): ChangeRegion => ({
  minX: Math.min(left.minX, right.minX),
  minY: Math.min(left.minY, right.minY),
  maxX: Math.max(left.maxX, right.maxX),
  maxY: Math.max(left.maxY, right.maxY),
  pixelCount: left.pixelCount + right.pixelCount,
  baselineSum: {
    r: left.baselineSum.r + right.baselineSum.r,
    g: left.baselineSum.g + right.baselineSum.g,
    b: left.baselineSum.b + right.baselineSum.b,
  },
  currentSum: {
    r: left.currentSum.r + right.currentSum.r,
    g: left.currentSum.g + right.currentSum.g,
    b: left.currentSum.b + right.currentSum.b,
  },
});

const toDiffRegion = (region: ChangeRegion): ScreenshotDiffRegion => {
  const baseline = averageRgb(region.baselineSum, region.pixelCount);
  const current = averageRgb(region.currentSum, region.pixelCount);
  const delta = {
    r: current.r - baseline.r,
    g: current.g - baseline.g,
    b: current.b - baseline.b,
  };
  const luminanceDelta = roundToOne(luminance(current) - luminance(baseline));
  return {
    bounds: {
      x: region.minX,
      y: region.minY,
      width: region.maxX - region.minX + 1,
      height: region.maxY - region.minY + 1,
    },
    pixelCount: region.pixelCount,
    averageColor: {
      delta,
      dominantChange: dominantChange(delta, luminanceDelta),
    },
  };
};

const getDiffArtifactPaths = ({
  currentPath,
  outputDir,
}: {
  currentPath: string;
  outputDir: string;
}) => {
  const currentName = path.parse(path.basename(currentPath)).name;
  return {
    diffPath: path.join(outputDir, `${currentName}-diff.png`),
    contextDiffPath: path.join(outputDir, `${currentName}-context-diff.png`),
  };
};

const writeDiffArtifacts = async ({
  baseline,
  current,
  mask,
  regions,
  paths,
  contextDiffScale,
}: {
  baseline: DecodedRgbaImage;
  current: DecodedRgbaImage;
  mask: Uint8Array;
  regions: ScreenshotDiffRegion[];
  paths: { diffPath: string; contextDiffPath: string };
  contextDiffScale: number;
}) => {
  const diffImage = buildContextDiff({ baseline, current, mask });
  drawRegionRectangles(diffImage, regions);
  await writePngFile(paths.diffPath, diffImage);
  await writePngFile(
    paths.contextDiffPath,
    downscalePng(diffImage, contextDiffScale)
  );
};

const buildContextDiff = ({
  baseline,
  current,
  mask,
}: {
  baseline: DecodedRgbaImage;
  current: DecodedRgbaImage;
  mask: Uint8Array;
}) => {
  const output = createPngImage(current.width, current.height);
  for (let pixelIndex = 0; pixelIndex < mask.length; pixelIndex++) {
    const offset = pixelIndex * 4;
    if (mask[pixelIndex] === 1) {
      const baselineLuminance = luminanceFromOffset(baseline.data, offset);
      const currentLuminance = luminanceFromOffset(current.data, offset);
      const color =
        currentLuminance >= baselineLuminance
          ? DIFF_BRIGHTER_COLOR
          : DIFF_DARKER_COLOR;
      writeRgbOffset(output, offset, color);
      continue;
    }
    output.data[offset] = lighten(current.data[offset]);
    output.data[offset + 1] = lighten(current.data[offset + 1]);
    output.data[offset + 2] = lighten(current.data[offset + 2]);
    output.data[offset + 3] = 255;
  }
  return output;
};

const downscalePng = (source: ImageData, scale: number) => {
  const resized = resizeDecodedRgbaImage(
    {
      width: source.width,
      height: source.height,
      data: Uint8Array.from(source.data),
    },
    source.width * scale,
    source.height * scale
  );
  const target = createPngImage(resized.width, resized.height);
  target.data.set(resized.data);
  return target;
};

const drawRegionRectangles = (
  png: ImageData,
  regions: ScreenshotDiffRegion[]
) => {
  for (const region of regions) {
    drawRectangle(
      png,
      region.bounds,
      REGION_RECTANGLE_STROKE_WIDTH,
      REGION_RECTANGLE_COLOR
    );
  }
};

const drawRectangle = (
  png: ImageData,
  bounds: ScreenshotDiffBounds,
  strokeWidth: number,
  color: ScreenshotDiffRgb
) => {
  const minX = Math.max(0, bounds.x);
  const minY = Math.max(0, bounds.y);
  const maxX = Math.min(png.width - 1, bounds.x + bounds.width - 1);
  const maxY = Math.min(png.height - 1, bounds.y + bounds.height - 1);
  if (minX > maxX || minY > maxY) {
    return;
  }
  for (let strokeOffset = 0; strokeOffset < strokeWidth; strokeOffset++) {
    const left = Math.max(0, minX - strokeOffset);
    const right = Math.min(png.width - 1, maxX + strokeOffset);
    const top = Math.max(0, minY - strokeOffset);
    const bottom = Math.min(png.height - 1, maxY + strokeOffset);
    for (let x = left; x <= right; x++) {
      writeRgb(png, x, top, color);
      writeRgb(png, x, bottom, color);
    }
    for (let y = top; y <= bottom; y++) {
      writeRgb(png, left, y, color);
      writeRgb(png, right, y, color);
    }
  }
};

const writePngFile = async (filePath: string, png: ImageData) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, encode(png));
};

const createPngImage = (width: number, height: number): ImageData => ({
  width,
  height,
  data: new Uint8Array(width * height * 4),
  depth: 8,
  channels: 4,
});

const writeRgb = (
  png: ImageData,
  x: number,
  y: number,
  color: ScreenshotDiffRgb
) => {
  writeRgbOffset(png, (png.width * y + x) * 4, color);
};

const writeRgbOffset = (
  png: ImageData,
  offset: number,
  color: ScreenshotDiffRgb
) => {
  png.data[offset] = color.r;
  png.data[offset + 1] = color.g;
  png.data[offset + 2] = color.b;
  png.data[offset + 3] = 255;
};

const formatScreenshotDiffSummary = (
  result: Omit<ScreenshotDiffResult, "summary">
) => {
  const lines = ["Screenshot diff summary", "", "Overall:"];
  if (result.dimensionMismatch !== undefined) {
    lines.push("- status: dimension_mismatch");
    lines.push(
      `- dimension_mismatch: expected=${formatSize(result.dimensionMismatch.expected)} actual=${formatSize(result.dimensionMismatch.actual)}`
    );
  } else {
    lines.push(
      `- status: ${result.differentPixels > 0 ? "changed" : "unchanged"}`
    );
    lines.push(
      `- pixel_mismatch: ${formatPercentage(result.mismatchPercentage)} - ${describeMismatch(result)}`
    );
  }
  lines.push(
    `- changed_areas: shown=${Math.min(result.regions.length, MAX_SUMMARY_REGIONS)} total=${result.regions.length} omitted=${Math.max(0, result.regions.length - MAX_SUMMARY_REGIONS)}`
  );
  if (result.diffPath !== undefined || result.contextDiffPath !== undefined) {
    lines.push(
      "- diff_images: see diffPath and contextDiffPath in this result"
    );
    lines.push(
      "  - legend: green=pixel brighter in current, red=pixel darker in current, yellow rectangles outline changed regions"
    );
  }
  lines.push("", "Regions:");
  for (const [index, region] of result.regions
    .slice(0, MAX_SUMMARY_REGIONS)
    .entries()) {
    lines.push(
      `- Region ${index + 1}: ${formatBounds(region.bounds, result.imageSize)} - changed_pixels=${region.pixelCount}`
    );
  }
  if (result.regions.length === 0) {
    lines.push("- None detected.");
  }
  lines.push("", "Text OCR:");
  lines.push(`- status: ${result.textAnalysis.status}`);
  lines.push(`- provider: ${result.textAnalysis.provider}`);
  lines.push(`- changes: ${result.textAnalysis.changes.length}`);
  for (const [index, change] of result.textAnalysis.changes.entries()) {
    lines.push(
      `- Text ${index + 1}: ${change.kind} confidence=${formatNormalized(change.confidence)}${formatTextChange(change)}`
    );
  }
  if (result.warnings.length > 0) {
    lines.push("", `Warnings: ${result.warnings.join(", ")}`);
  }
  return lines.join("\n");
};

const formatTextChange = (
  change: ScreenshotTextAnalysis["changes"][number]
) => {
  const text =
    change.text ??
    (change.baselineText === undefined || change.currentText === undefined
      ? undefined
      : `${change.baselineText} -> ${change.currentText}`);
  const bounds = change.currentBounds ?? change.baselineBounds;
  return [
    text === undefined ? "" : ` text=${JSON.stringify(text)}`,
    bounds === undefined ? "" : ` bounds=${formatBounds(bounds, undefined)}`,
    change.reasonCodes.length === 0
      ? ""
      : ` reasons=${change.reasonCodes.join(",")}`,
  ].join("");
};

const describeMismatch = ({
  differentPixels,
  mismatchPercentage,
  regions,
}: Pick<
  ScreenshotDiffResult,
  "differentPixels" | "mismatchPercentage" | "regions"
>) => {
  if (differentPixels === 0) {
    return "no pixel change";
  }
  const severity =
    mismatchPercentage < 5
      ? "minor"
      : mismatchPercentage < 10
        ? "moderate"
        : mismatchPercentage < 20
          ? "significant"
          : "large";
  return `${severity} ${regions.length <= 5 ? "localized" : "broad"} visual change`;
};

const formatBounds = (
  bounds: ScreenshotDiffBounds,
  imageSize: ScreenshotDiffSize | undefined
) => {
  if (imageSize === undefined) {
    return `x=${bounds.x} y=${bounds.y} w=${bounds.width} h=${bounds.height}`;
  }
  return [
    `x=${formatNormalized(bounds.x / imageSize.width)}`,
    `y=${formatNormalized(bounds.y / imageSize.height)}`,
    `w=${formatNormalized(bounds.width / imageSize.width)}`,
    `h=${formatNormalized(bounds.height / imageSize.height)}`,
  ].join(" ");
};

const averageRgb = (
  sum: ScreenshotDiffRgb,
  pixelCount: number
): ScreenshotDiffRgb => ({
  r: Math.round(sum.r / pixelCount),
  g: Math.round(sum.g / pixelCount),
  b: Math.round(sum.b / pixelCount),
});

const dominantChange = (
  delta: ScreenshotDiffRgb,
  luminanceDelta: number
): ScreenshotDiffDominantColorChange => {
  if (isUniformBrightnessDelta(delta)) {
    if (luminanceDelta === 0) {
      return { channel: "none", direction: "none", magnitude: 0 };
    }
    return {
      channel: "luminance",
      direction: luminanceDelta > 0 ? "increase" : "decrease",
      magnitude: roundToOne(Math.abs(luminanceDelta)),
    };
  }
  const candidates = [
    { channel: "red" as const, value: delta.r },
    { channel: "green" as const, value: delta.g },
    { channel: "blue" as const, value: delta.b },
    { channel: "luminance" as const, value: luminanceDelta },
  ];
  const winner = candidates.reduce((best, candidate) =>
    Math.abs(candidate.value) > Math.abs(best.value) ? candidate : best
  );
  if (winner.value === 0) {
    return { channel: "none", direction: "none", magnitude: 0 };
  }
  return {
    channel: winner.channel,
    direction: winner.value > 0 ? "increase" : "decrease",
    magnitude: roundToOne(Math.abs(winner.value)),
  };
};

const isUniformBrightnessDelta = (delta: ScreenshotDiffRgb) => {
  if (delta.r === 0 && delta.g === 0 && delta.b === 0) {
    return false;
  }
  const allIncreasing = delta.r > 0 && delta.g > 0 && delta.b > 0;
  const allDecreasing = delta.r < 0 && delta.g < 0 && delta.b < 0;
  if (allIncreasing === false && allDecreasing === false) {
    return false;
  }
  const magnitudes = [Math.abs(delta.r), Math.abs(delta.g), Math.abs(delta.b)];
  return (
    Math.max(...magnitudes) - Math.min(...magnitudes) <=
    UNIFORM_BRIGHTNESS_DELTA_TOLERANCE
  );
};

const regionHorizontalGap = (left: ChangeRegion, right: ChangeRegion) => {
  if (left.maxX < right.minX) {
    return right.minX - left.maxX - 1;
  }
  if (right.maxX < left.minX) {
    return left.minX - right.maxX - 1;
  }
  return 0;
};

const regionHeight = (region: ChangeRegion) => region.maxY - region.minY + 1;

const regionCenterY = (region: ChangeRegion) => (region.minY + region.maxY) / 2;

const luminance = (rgb: ScreenshotDiffRgb) =>
  0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;

const luminanceFromOffset = (data: Uint8Array, offset: number) =>
  0.2126 * data[offset] + 0.7152 * data[offset + 1] + 0.0722 * data[offset + 2];

const lighten = (value: number) => Math.round(value * 0.55 + 255 * 0.45);

const roundToOne = (value: number) => Math.round(value * 10) / 10;

const formatSize = ({ width, height }: ScreenshotDiffSize) =>
  `${width}x${height}`;

const formatPercentage = (value: number) => `${value.toFixed(2)}%`;

const formatNormalized = (value: number) =>
  Math.min(1, Math.max(0, value)).toFixed(3);
