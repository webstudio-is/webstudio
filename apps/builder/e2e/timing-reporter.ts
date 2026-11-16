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
