import { expect, test } from "vitest";
import {
  generatedAppDependencyNotes,
  getVisionVerificationLoop,
  getVisionWorkflowSummary,
  screenshotVerificationSummary,
  visualVerificationRule,
} from "./mcp-guidance";

test("documents generated app setup for visual verification", () => {
  expect(generatedAppDependencyNotes).toEqual([
    expect.stringContaining("install generated app dependencies"),
    expect.stringContaining("Do not add generated-preview dependencies"),
    expect.stringContaining("check npm and network configuration"),
  ]);
  expect(visualVerificationRule).toContain(
    "generated project files are current"
  );
  expect(screenshotVerificationSummary).toContain("preview.start");
  expect(screenshotVerificationSummary).toContain("list-breakpoints");
  expect(screenshotVerificationSummary).toContain("viewport");
});

test("builds vision loop with optional screenshot diff guidance", () => {
  const visionLoopWithDiff = getVisionVerificationLoop({ includeDiff: true });

  expect(getVisionVerificationLoop({ includeDiff: false })).not.toEqual(
    expect.arrayContaining([expect.stringContaining("screenshot.diff")])
  );
  expect(visionLoopWithDiff).toEqual(
    expect.arrayContaining([expect.stringContaining("screenshot.diff")])
  );
  expect(visionLoopWithDiff).toEqual(
    expect.arrayContaining([expect.stringContaining("vision.install-ocr")])
  );
  expect(visionLoopWithDiff).toEqual(
    expect.arrayContaining([expect.stringContaining("expectedText")])
  );
  expect(visionLoopWithDiff).toEqual(
    expect.arrayContaining([expect.stringContaining("expectedVisual")])
  );
  expect(visionLoopWithDiff).toEqual(
    expect.arrayContaining([
      expect.stringContaining("list-breakpoints"),
      expect.stringContaining("viewport"),
    ])
  );
  expect(getVisionWorkflowSummary({ includeDiff: false })).not.toContain(
    "screenshot.diff"
  );
  expect(getVisionWorkflowSummary({ includeDiff: true })).toContain(
    "screenshot.diff"
  );
});
