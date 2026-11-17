import { relative } from "node:path";
import type {
  Reporter,
  TestCase,
  TestResult,
  TestStep,
} from "@playwright/test/reporter";

class TimingReporter implements Reporter {
  private readonly hooks: Array<{
    file: string;
    kind: "beforeAll" | "afterAll";
    duration: number;
  }> = [];
  private readonly tests: Array<{
    file: string;
    title: string;
    duration: number;
    status: string;
  }> = [];

  onStepEnd(test: TestCase, _result: TestResult, step: TestStep) {
    if (step.category !== "hook") {
      return;
    }
    const kind =
      step.title === "beforeAll hook"
        ? "beforeAll"
        : step.title === "afterAll hook"
          ? "afterAll"
          : undefined;
    if (kind === undefined) {
      return;
    }
    this.hooks.push({
      file: relative(process.cwd(), test.location.file),
      kind,
      duration: step.duration,
    });
  }

  onTestEnd(test: TestCase, result: TestResult) {
    this.tests.push({
      file: relative(process.cwd(), test.location.file),
      title: test.title,
      duration: result.duration,
      status: result.status,
    });
  }

  onEnd() {
    for (const hook of this.hooks.sort(
      (left, right) => right.duration - left.duration
    )) {
      console.info(
        `[e2e:hook] duration=${hook.duration}ms kind=${hook.kind} file=${JSON.stringify(hook.file)}`
      );
    }
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
