import { expect, test } from "vitest";
import {
  getVisionVerificationLoop,
  getVisionWorkflowSummary,
} from "./mcp-guidance";

test("includes additional vision steps when diff guidance is enabled", () => {
  const visionLoopWithoutDiff = getVisionVerificationLoop({
    includeDiff: false,
  });
  const visionLoopWithDiff = getVisionVerificationLoop({ includeDiff: true });

  expect(visionLoopWithDiff.length).toBeGreaterThan(
    visionLoopWithoutDiff.length
  );
  expect(
    visionLoopWithDiff.filter(
      (step) => visionLoopWithoutDiff.includes(step) === false
    )
  ).toHaveLength(visionLoopWithDiff.length - visionLoopWithoutDiff.length);
  expect(getVisionWorkflowSummary({ includeDiff: false })).not.toBe(
    getVisionWorkflowSummary({ includeDiff: true })
  );
});
