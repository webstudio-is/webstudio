import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import {
  createScreenshotTextAssertions,
  createScreenshotVisualAssertions,
  diffPngFiles,
} from "./screenshot-diff";
import { createPng, paintRect, writePng } from "./screenshot.test-utils";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(tmpdir(), "webstudio-screenshot-diff-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

test("reports pass/fail expected text assertions from OCR text", () => {
  expect(
    createScreenshotTextAssertions(
      {
        status: "ok",
        provider: "tesseract",
        changes: [],
        observedText: ["Pricing plans for teams", "Start free"],
      },
      ["pricing plans", "Contact sales"]
    )
  ).toEqual({
    passed: false,
    status: "ok",
    found: ["Pricing plans for teams", "Start free"],
    missing: ["Contact sales"],
    assertions: [
      {
        expected: "pricing plans",
        passed: true,
        found: ["Pricing plans for teams"],
      },
      {
        expected: "Contact sales",
        passed: false,
        found: [],
      },
    ],
  });
});

test("reports pass/fail visual assertions from diff metrics", () => {
  expect(
    createScreenshotVisualAssertions(
      {
        mismatchPercentage: 3.5,
        changedRegionCount: 2,
        dimensionMismatch: false,
        overallColorChange: {
          delta: { r: 0, g: -10, b: 0 },
          dominantChange: {
            channel: "green",
            direction: "decrease",
            magnitude: 10,
          },
        },
      },
      {
        maxMismatchPercentage: 2,
        minChangedRegions: 1,
        maxChangedRegions: 2,
        dominantColorChange: {
          channel: "green",
          direction: "decrease",
          minMagnitude: 5,
        },
      }
    )
  ).toEqual({
    passed: false,
    assertions: [
      {
        expected: "mismatchPercentage <= 2",
        actual: 3.5,
        passed: false,
      },
      {
        expected: "changedRegionCount >= 1",
        actual: 2,
        passed: true,
      },
      {
        expected: "changedRegionCount <= 2",
        actual: 2,
        passed: true,
      },
      {
        expected: "dominantColorChange=green:decrease magnitude>=5",
        actual: "green:decrease magnitude=10",
        passed: true,
      },
    ],
  });
});

test("detects pixel differences, regions, color deltas, and writes artifacts", async () => {
  const baselinePath = path.join(tempDir, "baseline.png");
  const currentPath = path.join(tempDir, "current.png");
  const outputDir = path.join(tempDir, "diff");

  await writePng(baselinePath, createPng(10, 10, { r: 255, g: 255, b: 255 }));
  const current = createPng(10, 10, { r: 255, g: 255, b: 255 });
  paintRect(current, { x: 2, y: 3, width: 3, height: 2 }, { r: 0, g: 0, b: 0 });
  await writePng(currentPath, current);

  const result = await diffPngFiles({
    baselinePath,
    currentPath,
    outputDir,
    ignoreTopNormalizedY: 0,
  });

  expect(result.totalPixels).toBe(100);
  expect(result.differentPixels).toBe(6);
  expect(result.mismatchPercentage).toBe(6);
  expect(result.imageSize).toEqual({ width: 10, height: 10 });
  expect(result.regions).toEqual([
    expect.objectContaining({
      bounds: { x: 2, y: 3, width: 3, height: 2 },
      pixelCount: 6,
      averageColor: expect.objectContaining({
        delta: { r: -255, g: -255, b: -255 },
        dominantChange: {
          channel: "luminance",
          direction: "decrease",
          magnitude: 255,
        },
      }),
    }),
  ]);
  expect(result.overallColorChange).toEqual({
    delta: { r: -255, g: -255, b: -255 },
    dominantChange: {
      channel: "luminance",
      direction: "decrease",
      magnitude: 255,
    },
  });
  expect(result.summary).toContain("status: changed");
  expect(result.summary).toContain("pixel_mismatch: 6.00%");
  expect(result.summary).toContain("Region 1");
  await expect(readFile(result.diffPath ?? "")).resolves.toBeInstanceOf(Buffer);
  await expect(readFile(result.contextDiffPath ?? "")).resolves.toBeInstanceOf(
    Buffer
  );
});

test("normalizes same-aspect screenshots before comparing", async () => {
  const baselinePath = path.join(tempDir, "baseline.png");
  const currentPath = path.join(tempDir, "current.png");

  await writePng(baselinePath, createPng(2, 2, { r: 20, g: 20, b: 20 }));
  await writePng(currentPath, createPng(4, 4, { r: 20, g: 20, b: 20 }));

  const result = await diffPngFiles({
    baselinePath,
    currentPath,
    outputDir: path.join(tempDir, "diff"),
  });

  expect(result.dimensionMismatch).toBeUndefined();
  expect(result.imageSize).toEqual({ width: 2, height: 2 });
  expect(result.differentPixels).toBe(0);
  expect(result.textAnalysis.status).toBe("skipped");
  expect(result.warnings).toEqual(["ocr_skipped_size_normalized"]);
  expect(result.summary).toContain("status: unchanged");
});

test("reports dimension mismatch for different aspect ratios", async () => {
  const baselinePath = path.join(tempDir, "baseline.png");
  const currentPath = path.join(tempDir, "current.png");

  await writePng(baselinePath, createPng(2, 2, { r: 20, g: 20, b: 20 }));
  await writePng(currentPath, createPng(3, 2, { r: 20, g: 20, b: 20 }));

  const result = await diffPngFiles({
    baselinePath,
    currentPath,
    outputDir: path.join(tempDir, "diff"),
    expectedText: ["Pricing"],
    expectedVisual: { maxMismatchPercentage: 0 },
  });

  expect(result.dimensionMismatch).toEqual({
    expected: { width: 2, height: 2 },
    actual: { width: 3, height: 2 },
  });
  expect(result.diffPath).toBeUndefined();
  expect(result.regions).toEqual([]);
  expect(result.textAnalysis.status).toBe("skipped");
  expect(result.textAssertions).toMatchObject({
    passed: false,
    missing: ["Pricing"],
  });
  expect(result.summary).toContain("status: dimension_mismatch");
  expect(result.summary).toContain("Text Assertions:");
  expect(result.visualAssertions).toMatchObject({ passed: false });
  expect(result.summary).toContain("Visual Assertions:");
});

test("can ignore a normalized top band", async () => {
  const baselinePath = path.join(tempDir, "baseline.png");
  const currentPath = path.join(tempDir, "current.png");

  await writePng(baselinePath, createPng(10, 10, { r: 255, g: 255, b: 255 }));
  const current = createPng(10, 10, { r: 255, g: 255, b: 255 });
  paintRect(
    current,
    { x: 0, y: 0, width: 10, height: 1 },
    { r: 0, g: 0, b: 0 }
  );
  paintRect(current, { x: 0, y: 5, width: 2, height: 1 }, { r: 0, g: 0, b: 0 });
  await writePng(currentPath, current);

  const result = await diffPngFiles({
    baselinePath,
    currentPath,
    outputDir: path.join(tempDir, "diff"),
    ignoreTopNormalizedY: 0.1,
  });

  expect(result.differentPixels).toBe(2);
  expect(result.regions).toEqual([
    expect.objectContaining({
      bounds: { x: 0, y: 5, width: 2, height: 1 },
      pixelCount: 2,
    }),
  ]);
});
