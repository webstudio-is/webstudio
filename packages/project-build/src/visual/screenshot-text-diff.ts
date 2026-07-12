/**
 * Adapted from Software Mansion Argent's screenshot-diff text checks.
 * Source: https://github.com/software-mansion/argent/tree/main/packages/tool-server/src/tools/screenshot-diff
 * License: Apache-2.0
 */

import { extractOcrTextBlocks, type OcrTextBlock } from "./screenshot-ocr";
import type {
  ScreenshotDiffBounds,
  ScreenshotDiffRgb,
} from "./screenshot-diff";
import type { DecodedRgbaImage } from "./screenshot-resize";

export type ScreenshotTextChangeKind =
  | "moved"
  | "appeared"
  | "disappeared"
  | "content_changed"
  | "font_changed";

export type ScreenshotTextReasonCode =
  | "exact_normalized_match"
  | "ocr_noise_tolerated"
  | "position_delta"
  | "missing_in_current"
  | "missing_in_baseline"
  | "same_location"
  | "text_similarity"
  | "normalized_text_changed"
  | "bbox_geometry_delta"
  | "glyph_density_delta"
  | "text_color_delta"
  | "text_contrast_delta";

export type ScreenshotTextChange = {
  kind: ScreenshotTextChangeKind;
  text?: string;
  baselineText?: string;
  currentText?: string;
  normalizedText?: string;
  baselineBounds?: ScreenshotDiffBounds;
  currentBounds?: ScreenshotDiffBounds;
  delta?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  font?: {
    confidence: number;
    reasonCodes: readonly ScreenshotTextReasonCode[];
    metrics: {
      widthRatio: number;
      heightRatio: number;
      glyphDensityDelta: number;
      textColorDelta: ScreenshotDiffRgb;
      textColorDistance: number;
      textContrastDelta: number;
    };
  };
  confidence: number;
  source: "ocr";
  reasonCodes: readonly ScreenshotTextReasonCode[];
};

export type ScreenshotTextAnalysis = {
  status: "ok" | "unavailable" | "skipped";
  provider: "tesseract";
  changes: readonly ScreenshotTextChange[];
  observedText?: readonly string[];
};

type NormalizedTextRegion = OcrTextBlock & {
  normalizedText: string;
  matchKey: string;
};

type PairCandidate = {
  baselineIndex: number;
  currentIndex: number;
  score: number;
  exact: boolean;
};

type ContentCandidate = {
  baselineIndex: number;
  currentIndex: number;
  score: number;
  reasonCodes: ScreenshotTextReasonCode[];
};

type FontFeatures = {
  glyphDensity: number;
  textColor: ScreenshotDiffRgb;
  textContrast: number;
};

const MOVE_THRESHOLD_PX = 3;
const LOCATION_OVERLAP_THRESHOLD = 0.45;
const LOCATION_CENTER_DISTANCE_PX = 18;
const FUZZY_SAME_TEXT_CENTER_DISTANCE_PX = 60;
const MAX_TEXT_CHANGES = 10;
const DEFAULT_TEXT_CHANGE_MIN_CONFIDENCE = 0.7;

export const analyzeScreenshotTextChanges = async ({
  baselinePath,
  currentPath,
  hasPixelDiff,
  baselineImage,
  currentImage,
  ignoreTopPixels,
  textChangeMinConfidence = DEFAULT_TEXT_CHANGE_MIN_CONFIDENCE,
  includeObservedText = false,
}: {
  baselinePath: string;
  currentPath: string;
  hasPixelDiff: boolean;
  baselineImage: DecodedRgbaImage;
  currentImage: DecodedRgbaImage;
  ignoreTopPixels: number;
  textChangeMinConfidence?: number;
  includeObservedText?: boolean;
}): Promise<ScreenshotTextAnalysis> => {
  if (hasPixelDiff === false && includeObservedText === false) {
    return {
      status: "skipped",
      provider: "tesseract",
      changes: [],
    };
  }

  const [baselineOcr, currentOcr] = await Promise.all([
    extractOcrTextBlocks(baselinePath),
    extractOcrTextBlocks(currentPath),
  ]);
  if (baselineOcr.status !== "ok" || currentOcr.status !== "ok") {
    return {
      status: "unavailable",
      provider: "tesseract",
      changes: [],
    };
  }

  const analysis = analyzeTextRegions({
    baselineRegions: baselineOcr.blocks,
    currentRegions: currentOcr.blocks,
    baselineImage,
    currentImage,
    ignoreTopPixels,
    textChangeMinConfidence,
    includeObservedText,
  });
  return analysis;
};

export const analyzeTextRegions = ({
  baselineRegions,
  currentRegions,
  baselineImage,
  currentImage,
  ignoreTopPixels = 0,
  textChangeMinConfidence = DEFAULT_TEXT_CHANGE_MIN_CONFIDENCE,
  includeObservedText = false,
}: {
  baselineRegions: readonly OcrTextBlock[];
  currentRegions: readonly OcrTextBlock[];
  baselineImage?: DecodedRgbaImage;
  currentImage?: DecodedRgbaImage;
  ignoreTopPixels?: number;
  textChangeMinConfidence?: number;
  includeObservedText?: boolean;
}): ScreenshotTextAnalysis => {
  validateTextChangeMinConfidence(textChangeMinConfidence);

  const baseline = normalizeRegions(
    filterRegionsByTopCutoff(baselineRegions, ignoreTopPixels)
  );
  const current = normalizeRegions(
    filterRegionsByTopCutoff(currentRegions, ignoreTopPixels)
  );
  const usedBaseline = new Set<number>();
  const usedCurrent = new Set<number>();
  const changes: ScreenshotTextChange[] = [];

  for (const pair of pairSameTextRegions(baseline, current)) {
    if (
      usedBaseline.has(pair.baselineIndex) ||
      usedCurrent.has(pair.currentIndex)
    ) {
      continue;
    }
    usedBaseline.add(pair.baselineIndex);
    usedCurrent.add(pair.currentIndex);

    const baselineRegion = baseline[pair.baselineIndex];
    const currentRegion = current[pair.currentIndex];
    const delta = boundsDelta(baselineRegion.bounds, currentRegion.bounds);
    const reasonCodes: ScreenshotTextReasonCode[] = [
      pair.exact ? "exact_normalized_match" : "ocr_noise_tolerated",
    ];

    if (isMeaningfulMove(delta)) {
      changes.push({
        kind: "moved",
        text: baselineRegion.text,
        normalizedText: baselineRegion.normalizedText,
        baselineBounds: baselineRegion.bounds,
        currentBounds: currentRegion.bounds,
        delta,
        confidence: clampConfidence(
          Math.min(baselineRegion.confidence, currentRegion.confidence) *
            (pair.exact ? 0.96 : 0.78)
        ),
        source: "ocr",
        reasonCodes: [...reasonCodes, "position_delta"],
      });
    }

    const font = detectFontChange({
      baselineImage,
      currentImage,
      baselineRegion,
      currentRegion,
    });
    if (font !== undefined) {
      changes.push({
        kind: "font_changed",
        text: baselineRegion.text,
        normalizedText: baselineRegion.normalizedText,
        baselineBounds: baselineRegion.bounds,
        currentBounds: currentRegion.bounds,
        delta,
        font,
        confidence: font.confidence,
        source: "ocr",
        reasonCodes: [...reasonCodes, ...font.reasonCodes],
      });
    }
  }

  for (const pair of pairChangedTextRegions(
    baseline,
    current,
    usedBaseline,
    usedCurrent
  )) {
    if (
      usedBaseline.has(pair.baselineIndex) ||
      usedCurrent.has(pair.currentIndex)
    ) {
      continue;
    }
    usedBaseline.add(pair.baselineIndex);
    usedCurrent.add(pair.currentIndex);
    const baselineRegion = baseline[pair.baselineIndex];
    const currentRegion = current[pair.currentIndex];
    changes.push({
      kind: "content_changed",
      baselineText: baselineRegion.text,
      currentText: currentRegion.text,
      baselineBounds: baselineRegion.bounds,
      currentBounds: currentRegion.bounds,
      delta: boundsDelta(baselineRegion.bounds, currentRegion.bounds),
      confidence: clampConfidence(
        Math.min(baselineRegion.confidence, currentRegion.confidence) *
          pair.score
      ),
      source: "ocr",
      reasonCodes: pair.reasonCodes,
    });
  }

  for (let index = 0; index < baseline.length; index++) {
    if (usedBaseline.has(index)) {
      continue;
    }
    const region = baseline[index];
    changes.push({
      kind: "disappeared",
      text: region.text,
      normalizedText: region.normalizedText,
      baselineBounds: region.bounds,
      confidence: clampConfidence(region.confidence * 0.78),
      source: "ocr",
      reasonCodes: ["missing_in_current"],
    });
  }

  for (let index = 0; index < current.length; index++) {
    if (usedCurrent.has(index)) {
      continue;
    }
    const region = current[index];
    changes.push({
      kind: "appeared",
      text: region.text,
      normalizedText: region.normalizedText,
      currentBounds: region.bounds,
      confidence: clampConfidence(region.confidence * 0.78),
      source: "ocr",
      reasonCodes: ["missing_in_baseline"],
    });
  }

  return {
    status: "ok",
    provider: "tesseract",
    changes: changes
      .filter((change) => change.confidence >= textChangeMinConfidence)
      .sort(
        (left, right) =>
          changeTop(left) - changeTop(right) ||
          changeLeft(left) - changeLeft(right)
      )
      .slice(0, MAX_TEXT_CHANGES),
    ...(includeObservedText
      ? { observedText: current.map((region) => region.text) }
      : {}),
  };
};

export const normalizeTextForDiff = (text: string) => {
  const normalized = text
    .normalize("NFKC")
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2010-\u2015]/g, "-")
    .toLocaleLowerCase("en-US")
    .replace(/&/g, " and ");

  return restoreValueSymbols(
    protectValueSymbols(normalized)
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
};

const normalizeRegions = (
  regions: readonly OcrTextBlock[]
): NormalizedTextRegion[] =>
  regions
    .map((region) => {
      const normalizedText = normalizeTextForDiff(region.text);
      return {
        ...region,
        confidence: clampConfidence(region.confidence),
        normalizedText,
        matchKey: ocrNoiseKey(normalizedText),
      };
    })
    .filter((region) => region.normalizedText.length > 0);

const filterRegionsByTopCutoff = (
  regions: readonly OcrTextBlock[],
  ignoreTopPixels: number
) =>
  ignoreTopPixels <= 0
    ? regions
    : regions.filter(
        (region) => region.bounds.y + region.bounds.height > ignoreTopPixels
      );

const pairSameTextRegions = (
  baseline: readonly NormalizedTextRegion[],
  current: readonly NormalizedTextRegion[]
): PairCandidate[] => {
  const candidates: PairCandidate[] = [];
  for (
    let baselineIndex = 0;
    baselineIndex < baseline.length;
    baselineIndex++
  ) {
    for (let currentIndex = 0; currentIndex < current.length; currentIndex++) {
      const left = baseline[baselineIndex];
      const right = current[currentIndex];
      const exact = left.normalizedText === right.normalizedText;
      const similarity = normalizedTextSimilarity(
        left.matchKey,
        right.matchKey
      );
      const distance = centerDistance(left.bounds, right.bounds);
      const fuzzy =
        exact === false &&
        valueTokensCompatible(left.normalizedText, right.normalizedText) &&
        distance <= FUZZY_SAME_TEXT_CENTER_DISTANCE_PX &&
        similarity >= fuzzyThreshold(left.matchKey, right.matchKey);
      if (exact === false && fuzzy === false) {
        continue;
      }
      candidates.push({
        baselineIndex,
        currentIndex,
        exact,
        score:
          (exact ? 100 : 70 + similarity * 10) - Math.min(25, distance / 8),
      });
    }
  }
  return candidates.sort((left, right) => right.score - left.score);
};

const pairChangedTextRegions = (
  baseline: readonly NormalizedTextRegion[],
  current: readonly NormalizedTextRegion[],
  usedBaseline: Set<number>,
  usedCurrent: Set<number>
): ContentCandidate[] => {
  const candidates: ContentCandidate[] = [];
  for (
    let baselineIndex = 0;
    baselineIndex < baseline.length;
    baselineIndex++
  ) {
    if (usedBaseline.has(baselineIndex)) {
      continue;
    }
    for (let currentIndex = 0; currentIndex < current.length; currentIndex++) {
      if (usedCurrent.has(currentIndex)) {
        continue;
      }
      const left = baseline[baselineIndex];
      const right = current[currentIndex];
      if (left.normalizedText === right.normalizedText) {
        continue;
      }

      const reasonCodes: ScreenshotTextReasonCode[] = [
        "normalized_text_changed",
      ];
      const overlap = intersectionOverUnion(left.bounds, right.bounds);
      const distance = centerDistance(left.bounds, right.bounds);
      const similarity = normalizedTextSimilarity(
        left.matchKey,
        right.matchKey
      );
      let score = 0;
      if (overlap >= LOCATION_OVERLAP_THRESHOLD) {
        score = 0.84 + overlap * 0.1;
        reasonCodes.push("same_location");
      } else if (distance <= LOCATION_CENTER_DISTANCE_PX) {
        score = 0.74;
        reasonCodes.push("same_location");
      } else if (similarity >= 0.65 && distance <= 60) {
        score = 0.64 + similarity * 0.1;
        reasonCodes.push("text_similarity");
      }
      if (score === 0) {
        continue;
      }
      candidates.push({ baselineIndex, currentIndex, score, reasonCodes });
    }
  }
  return candidates.sort((left, right) => right.score - left.score);
};

const detectFontChange = ({
  baselineImage,
  currentImage,
  baselineRegion,
  currentRegion,
}: {
  baselineImage: DecodedRgbaImage | undefined;
  currentImage: DecodedRgbaImage | undefined;
  baselineRegion: OcrTextBlock;
  currentRegion: OcrTextBlock;
}): ScreenshotTextChange["font"] | undefined => {
  if (baselineImage === undefined || currentImage === undefined) {
    return undefined;
  }
  const baselineFeatures = extractFontFeatures(
    baselineImage,
    baselineRegion.bounds
  );
  const currentFeatures = extractFontFeatures(
    currentImage,
    currentRegion.bounds
  );
  if (baselineFeatures === undefined || currentFeatures === undefined) {
    return undefined;
  }

  const widthRatio = relativeDelta(
    baselineRegion.bounds.width,
    currentRegion.bounds.width
  );
  const heightRatio = relativeDelta(
    baselineRegion.bounds.height,
    currentRegion.bounds.height
  );
  const glyphDensityDelta = Math.abs(
    currentFeatures.glyphDensity - baselineFeatures.glyphDensity
  );
  const textColorDelta = {
    r: currentFeatures.textColor.r - baselineFeatures.textColor.r,
    g: currentFeatures.textColor.g - baselineFeatures.textColor.g,
    b: currentFeatures.textColor.b - baselineFeatures.textColor.b,
  };
  const textColorDistance = colorDistance(textColorDelta);
  const textContrastDelta = Math.abs(
    currentFeatures.textContrast - baselineFeatures.textContrast
  );
  const reasonCodes: ScreenshotTextReasonCode[] = [];
  if (widthRatio > 0.08 || heightRatio > 0.08) {
    reasonCodes.push("bbox_geometry_delta");
  }
  if (glyphDensityDelta > 0.045) {
    reasonCodes.push("glyph_density_delta");
  }
  if (textColorDistance > 32) {
    reasonCodes.push("text_color_delta");
  }
  if (textContrastDelta > 24) {
    reasonCodes.push("text_contrast_delta");
  }
  if (reasonCodes.length === 0) {
    return undefined;
  }

  const rawScore =
    Math.min(1, Math.max(widthRatio, heightRatio) / 0.18) * 0.25 +
    Math.min(1, glyphDensityDelta / 0.09) * 0.3 +
    Math.min(1, textColorDistance / 96) * 0.25 +
    Math.min(1, textContrastDelta / 64) * 0.2;
  return {
    confidence: clampConfidence(Math.max(0.72, rawScore)),
    reasonCodes,
    metrics: {
      widthRatio: round(widthRatio),
      heightRatio: round(heightRatio),
      glyphDensityDelta: round(glyphDensityDelta),
      textColorDelta,
      textColorDistance: round(textColorDistance),
      textContrastDelta: round(textContrastDelta),
    },
  };
};

const extractFontFeatures = (
  image: DecodedRgbaImage,
  bounds: ScreenshotDiffBounds
): FontFeatures | undefined => {
  const clamped = clampBounds(bounds, image.width, image.height);
  if (clamped.width <= 0 || clamped.height <= 0) {
    return undefined;
  }

  const borderLuminance: number[] = [];
  for (let y = clamped.y; y < clamped.y + clamped.height; y++) {
    for (let x = clamped.x; x < clamped.x + clamped.width; x++) {
      if (
        x === clamped.x ||
        y === clamped.y ||
        x === clamped.x + clamped.width - 1 ||
        y === clamped.y + clamped.height - 1
      ) {
        borderLuminance.push(readLuminance(image, x, y));
      }
    }
  }
  const background = median(borderLuminance);
  const inkThreshold = 24;
  let glyphPixels = 0;
  let maxContrast = 0;
  const colorSum = { r: 0, g: 0, b: 0 };
  for (let y = clamped.y; y < clamped.y + clamped.height; y++) {
    for (let x = clamped.x; x < clamped.x + clamped.width; x++) {
      const luminance = readLuminance(image, x, y);
      const contrast = Math.abs(luminance - background);
      if (contrast < inkThreshold) {
        continue;
      }
      const color = readRgb(image, x, y);
      glyphPixels++;
      maxContrast = Math.max(maxContrast, contrast);
      colorSum.r += color.r;
      colorSum.g += color.g;
      colorSum.b += color.b;
    }
  }
  if (glyphPixels === 0) {
    return undefined;
  }
  return {
    glyphDensity: glyphPixels / (clamped.width * clamped.height),
    textColor: {
      r: Math.round(colorSum.r / glyphPixels),
      g: Math.round(colorSum.g / glyphPixels),
      b: Math.round(colorSum.b / glyphPixels),
    },
    textContrast: maxContrast,
  };
};

const protectValueSymbols = (text: string) =>
  text
    .replace(/(\p{N})\s*%/gu, "$1ARGENTPERCENTTOKEN")
    .replace(/([$\u20ac\u00a3])\s*(\p{N})/gu, "$1$2");

const restoreValueSymbols = (text: string) =>
  text.replace(/ARGENTPERCENTTOKEN/g, "%");

const ocrNoiseKey = (text: string) =>
  text
    .replace(/[0]/g, "o")
    .replace(/[1|]/g, "l")
    .replace(/[3]/g, "e")
    .replace(/[5]/g, "s")
    .replace(/[8]/g, "b")
    .replace(/\brn/g, "m");

const fuzzyThreshold = (left: string, right: string) => {
  const length = Math.max(left.length, right.length);
  if (length <= 4) {
    return Number.POSITIVE_INFINITY;
  }
  return length <= 8 ? 0.86 : 0.82;
};

const valueTokensCompatible = (left: string, right: string) => {
  const leftTokens = valueTokens(left);
  const rightTokens = valueTokens(right);
  return (
    (leftTokens.length === 0 && rightTokens.length === 0) ||
    (leftTokens.length === rightTokens.length &&
      leftTokens.every((token, index) => token === rightTokens[index]))
  );
};

const valueTokens = (text: string) =>
  text.match(/(?<!\p{L})(?:[$€£+\-/])?\p{N}+(?:[.,]\p{N}+)?%?(?!\p{L})/gu) ??
  [];

const normalizedTextSimilarity = (left: string, right: string) =>
  left === right
    ? 1
    : 1 -
      levenshteinDistance(left, right) / Math.max(left.length, right.length, 1);

const levenshteinDistance = (left: string, right: string) => {
  const previous = new Array<number>(right.length + 1);
  const current = new Array<number>(right.length + 1);
  for (let index = 0; index <= right.length; index++) {
    previous[index] = index;
  }

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex++) {
    current[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex++) {
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + cost
      );
    }
    for (let index = 0; index <= right.length; index++) {
      previous[index] = current[index];
    }
  }
  return previous[right.length];
};

const boundsDelta = (
  baseline: ScreenshotDiffBounds,
  current: ScreenshotDiffBounds
) => ({
  x: current.x - baseline.x,
  y: current.y - baseline.y,
  width: current.width - baseline.width,
  height: current.height - baseline.height,
});

const isMeaningfulMove = (delta: ReturnType<typeof boundsDelta>) =>
  Math.abs(delta.x) >= MOVE_THRESHOLD_PX ||
  Math.abs(delta.y) >= MOVE_THRESHOLD_PX;

const intersectionOverUnion = (
  left: ScreenshotDiffBounds,
  right: ScreenshotDiffBounds
) => {
  const x1 = Math.max(left.x, right.x);
  const y1 = Math.max(left.y, right.y);
  const x2 = Math.min(left.x + left.width, right.x + right.width);
  const y2 = Math.min(left.y + left.height, right.y + right.height);
  const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  if (intersection === 0) {
    return 0;
  }
  return (
    intersection /
    (left.width * left.height + right.width * right.height - intersection)
  );
};

const centerDistance = (
  left: ScreenshotDiffBounds,
  right: ScreenshotDiffBounds
) => {
  const leftCenter = {
    x: left.x + left.width / 2,
    y: left.y + left.height / 2,
  };
  const rightCenter = {
    x: right.x + right.width / 2,
    y: right.y + right.height / 2,
  };
  return Math.sqrt(
    (leftCenter.x - rightCenter.x) ** 2 + (leftCenter.y - rightCenter.y) ** 2
  );
};

const changeTop = (change: ScreenshotTextChange) =>
  (change.baselineBounds ?? change.currentBounds)?.y ?? 0;

const changeLeft = (change: ScreenshotTextChange) =>
  (change.baselineBounds ?? change.currentBounds)?.x ?? 0;

const validateTextChangeMinConfidence = (minConfidence: number) => {
  if (
    Number.isFinite(minConfidence) === false ||
    minConfidence < 0 ||
    minConfidence > 1
  ) {
    throw new Error(
      `textChangeMinConfidence must be a finite number between 0 and 1, received ${minConfidence}`
    );
  }
};

const clampBounds = (
  bounds: ScreenshotDiffBounds,
  width: number,
  height: number
): ScreenshotDiffBounds => {
  const x = Math.max(0, Math.min(width, bounds.x));
  const y = Math.max(0, Math.min(height, bounds.y));
  return {
    x,
    y,
    width: Math.max(0, Math.min(width - x, bounds.width)),
    height: Math.max(0, Math.min(height - y, bounds.height)),
  };
};

const readRgb = (
  image: DecodedRgbaImage,
  x: number,
  y: number
): ScreenshotDiffRgb => {
  const offset = (image.width * y + x) * 4;
  const alpha = image.data[offset + 3] / 255;
  return {
    r: Math.round(image.data[offset] * alpha + 255 * (1 - alpha)),
    g: Math.round(image.data[offset + 1] * alpha + 255 * (1 - alpha)),
    b: Math.round(image.data[offset + 2] * alpha + 255 * (1 - alpha)),
  };
};

const readLuminance = (image: DecodedRgbaImage, x: number, y: number) =>
  luminance(readRgb(image, x, y));

const luminance = (rgb: ScreenshotDiffRgb) =>
  0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;

const median = (values: number[]) => {
  if (values.length === 0) {
    return 255;
  }
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
};

const relativeDelta = (left: number, right: number) =>
  left === 0 && right === 0
    ? 0
    : Math.abs(right - left) / Math.max(Math.abs(left), Math.abs(right), 1);

const colorDistance = (delta: ScreenshotDiffRgb) =>
  Math.sqrt(delta.r * delta.r + delta.g * delta.g + delta.b * delta.b);

const clampConfidence = (value: number) =>
  Math.round(Math.min(1, Math.max(0, value)) * 100) / 100;

const round = (value: number) => Math.round(value * 1000) / 1000;
