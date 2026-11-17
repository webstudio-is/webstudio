import { afterEach, expect, test, vi } from "vitest";
import type { TestCase, TestResult, TestStep } from "@playwright/test/reporter";
import TimingReporter from "./timing-reporter";

afterEach(() => {
  vi.restoreAllMocks();
});

test("reports suite hooks separately from test duration", () => {
  const log = vi.spyOn(console, "info").mockImplementation(() => {});
  const reporter = new TimingReporter();
  const testCase = {
    location: { file: `${process.cwd()}/e2e/tests/example.[shard-1].e2e.ts` },
    title: "example",
  } as TestCase;
  const result = { duration: 5, status: "passed" } as TestResult;

  for (const [title, duration] of [
    ["Before Hooks", 65],
    ["beforeAll hook", 60],
    ["beforeEach hook", 2],
    ["afterEach hook", 1],
    ["afterAll hook", 40],
    ["After Hooks", 42],
  ] as const) {
    reporter.onStepEnd(testCase, result, {
      category: "hook",
      title,
      duration,
    } as TestStep);
  }
  reporter.onStepEnd(testCase, result, {
    category: "test.step",
    title: "beforeAll hook",
    duration: 100,
  } as TestStep);
  reporter.onTestEnd(testCase, result);
  reporter.onEnd();

  expect(log.mock.calls.map(([line]) => line)).toEqual([
    '[e2e:hook] duration=60ms kind=beforeAll file="e2e/tests/example.[shard-1].e2e.ts"',
    '[e2e:hook] duration=40ms kind=afterAll file="e2e/tests/example.[shard-1].e2e.ts"',
    '[e2e:test] duration=5ms status=passed file="e2e/tests/example.[shard-1].e2e.ts" title="example"',
  ]);
});
