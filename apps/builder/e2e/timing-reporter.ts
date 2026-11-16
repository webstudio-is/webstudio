import { relative } from "node:path";
import type { Reporter, TestCase, TestResult } from "@playwright/test/reporter";

class TimingReporter implements Reporter {
  private readonly tests: Array<{
    file: string;
    title: string;
    duration: number;
    status: string;
  }> = [];

  onTestEnd(test: TestCase, result: TestResult) {
    if (
      process.env.CI !== undefined &&
      process.env.E2E_TEST_SHARD === "shard-6" &&
      test.location.file.endsWith("browser-form-preview.[shard-6].e2e.ts")
    ) {
      for (const after of result.steps.filter(
        ({ title }) => title === "After Hooks" || title === "Worker Cleanup"
      )) {
        console.info(
          `[e2e:profile] shard 6 Preview ${after.title} duration=${after.duration}ms`
        );
        for (const step of after.steps.filter(
          ({ category }) => category === "fixture"
        )) {
          console.info(
            `[e2e:profile] shard 6 Preview ${step.title} duration=${step.duration}ms`
          );
        }
      }
    }
    this.tests.push({
      file: relative(process.cwd(), test.location.file),
      title: test.title,
      duration: result.duration,
      status: result.status,
    });
  }

  onEnd() {
    for (const test of this.tests.sort(
      (left, right) => right.duration - left.duration
    )) {
      console.info(
        `[e2e:test] duration=${test.duration}ms status=${test.status} file=${JSON.stringify(test.file)} title=${JSON.stringify(test.title)}`
      );
    }
  }
}

export default TimingReporter;
