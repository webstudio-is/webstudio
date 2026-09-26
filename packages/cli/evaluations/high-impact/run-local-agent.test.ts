// Covers local agent task and MCP setup, plus content compilation prerequisites.
import { describe, expect, test } from "vitest";
import { authenticatedPageFixture } from "./fixtures";
import { __testing__ } from "./run-local-agent";

const {
  getEvaluationContentCompilationInput,
  getEvaluationPrompt,
  getMcpProxyArgs,
} = __testing__;

describe("high-impact local agent setup", () => {
  test("gives the agent the task without asking it to read a file", () => {
    const prompt = getEvaluationPrompt(authenticatedPageFixture, {
      kind: "source",
      repositoryRoot: "/repo",
    });
    expect(prompt).toContain(authenticatedPageFixture.objective);
    expect(prompt).toContain('"tool":"meta.guide"');
    expect(prompt).not.toContain("WEBSTUDIO_HIGH_IMPACT_AGENT_TASK");
  });
  test("starts the MCP proxy with the workspace export condition", () => {
    expect(
      getMcpProxyArgs("/proxy.ts", "/local.js", "/trace.jsonl")
    ).toMatchObject([
      "--conditions=webstudio",
      expect.stringMatching(/^--import=/),
      "/proxy.ts",
      "/local.js",
      "/trace.jsonl",
    ]);
  });
  test("rejects a missing project-session snapshot explicitly", () => {
    expect(() => getEvaluationContentCompilationInput(undefined)).toThrowError(
      "Evaluation project session is unavailable"
    );
  });

  test("returns no compilation plan when Assets resources are unreachable", () => {
    expect(
      getEvaluationContentCompilationInput({ state: {} } as never).plan
    ).toBeUndefined();
  });
});
