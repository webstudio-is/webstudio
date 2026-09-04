// Verifies that evaluation setup failures are reported before outcome checks
// can misclassify a missing project snapshot or reachable content plan.
import { describe, expect, test } from "vitest";
import { __testing__ } from "./run-local-agent";

const { getEvaluationContentCompilationInput } = __testing__;

describe("high-impact evaluation content compilation setup", () => {
  test("rejects a missing project-session snapshot explicitly", () => {
    expect(() => getEvaluationContentCompilationInput(undefined)).toThrowError(
      "Evaluation project session is unavailable"
    );
  });

  test("rejects a snapshot without reachable Assets resources explicitly", () => {
    expect(() =>
      getEvaluationContentCompilationInput({ state: {} } as never)
    ).toThrowError("Evaluation blog has no reachable Assets resources");
  });
});
