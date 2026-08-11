import { expect, test } from "vitest";
import {
  analyzeTextRegions,
  normalizeTextForDiff,
} from "./screenshot-text-diff";
import { createPng, paintRect } from "./screenshot.test-utils";
import type { DecodedRgbaImage } from "./screenshot-resize";

const textBlock = ({
  text,
  x,
  y,
  width = 60,
  height = 12,
  confidence = 0.98,
}: {
  text: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  confidence?: number;
}) => ({
  text,
  confidence,
  bounds: { x, y, width, height },
  words: [
    {
      text,
      confidence,
      bounds: { x, y, width, height },
      blockNum: 1,
      parNum: 1,
      lineNum: 1,
      wordNum: 1,
    },
  ],
});

const toDecodedImage = (
  image: ReturnType<typeof createPng>
): DecodedRgbaImage => ({
  width: image.width,
  height: image.height,
  data: Uint8Array.from(image.data),
});

test("normalizes OCR text for stable matching", () => {
  expect(normalizeTextForDiff("Save 25% & Launch")).toBe("save 25% and launch");
  expect(normalizeTextForDiff("“Hello”—World")).toBe("hello world");
});

test("detects moved text", () => {
  const result = analyzeTextRegions({
    baselineRegions: [textBlock({ text: "Launch faster", x: 10, y: 20 })],
    currentRegions: [textBlock({ text: "Launch faster", x: 38, y: 56 })],
  });

  expect(result.status).toBe("ok");
  expect(result.changes).toEqual([
    expect.objectContaining({
      kind: "moved",
      text: "Launch faster",
      delta: { x: 28, y: 36, width: 0, height: 0 },
      reasonCodes: ["exact_normalized_match", "position_delta"],
    }),
  ]);
});

test("detects appeared, disappeared, and changed text", () => {
  const result = analyzeTextRegions({
    baselineRegions: [
      textBlock({ text: "Old heading", x: 10, y: 20 }),
      textBlock({ text: "Remove me", x: 10, y: 48 }),
    ],
    currentRegions: [
      textBlock({ text: "New heading", x: 10, y: 20 }),
      textBlock({ text: "Add me", x: 10, y: 80 }),
    ],
  });

  expect(result.changes).toEqual([
    expect.objectContaining({
      kind: "content_changed",
      baselineText: "Old heading",
      currentText: "New heading",
    }),
    expect.objectContaining({
      kind: "disappeared",
      text: "Remove me",
    }),
    expect.objectContaining({
      kind: "appeared",
      text: "Add me",
    }),
  ]);
});

test("excludes ignored top-band text from observed text assertions", () => {
  const result = analyzeTextRegions({
    baselineRegions: [],
    currentRegions: [
      textBlock({ text: "Browser chrome", x: 0, y: 0, height: 10 }),
      textBlock({ text: "Page heading", x: 0, y: 20, height: 10 }),
    ],
    ignoreTopPixels: 10,
    includeObservedText: true,
  });

  expect(result.observedText).toEqual(["Page heading"]);
});

test("detects font-style geometry changes for matched text", () => {
  const baseline = createPng(120, 60, { r: 255, g: 255, b: 255 });
  const current = createPng(120, 60, { r: 255, g: 255, b: 255 });
  paintRect(
    baseline,
    { x: 14, y: 23, width: 42, height: 4 },
    { r: 0, g: 0, b: 0 }
  );
  paintRect(
    current,
    { x: 14, y: 23, width: 62, height: 8 },
    { r: 200, g: 40, b: 40 }
  );

  const result = analyzeTextRegions({
    baselineRegions: [
      textBlock({ text: "Button", x: 10, y: 20, width: 50, height: 10 }),
    ],
    currentRegions: [
      textBlock({ text: "Button", x: 10, y: 20, width: 70, height: 14 }),
    ],
    baselineImage: toDecodedImage(baseline),
    currentImage: toDecodedImage(current),
  });

  expect(result.changes).toEqual([
    expect.objectContaining({
      kind: "font_changed",
      text: "Button",
      reasonCodes: expect.arrayContaining([
        "bbox_geometry_delta",
        "text_color_delta",
      ]),
    }),
  ]);
});
