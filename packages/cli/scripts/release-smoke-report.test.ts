import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test, vi } from "vitest";
import {
  assertPrivacySafeArtifact,
  compactTokenizer,
  countCompactTokens,
  createReleaseSmokeReporter,
  getModelVerificationItemCount,
  modelEvaluationReportSchema,
  modelEvaluationSubmissionSchema,
  publishedCliManifestContractSchema,
  releaseSmokeReportSchema,
} from "./release-smoke-report";

const measurement = (
  bytes: number,
  tokens = bytes,
  retries = 0,
  failures = 0
) => ({
  bytes,
  tokens,
  attempts: 1 + retries,
  retries,
  failures,
  fallbacks: { verbose: 0, fullResource: 0, source: 0 },
});

describe("comparative release smoke report", () => {
  test("separates the same-candidate gate from incomparable history", () => {
    const times = [100, 125, 180];
    const reporter = createReleaseSmokeReporter({
      now: () => times.shift() ?? 180,
      writeLog: vi.fn(),
    });
    reporter.setSubjects({
      candidate: { source: "local", version: "1.2.3" },
      baseline: { source: "registry", version: "1.2.2" },
    });
    reporter.complete("candidate-install", 110);
    reporter.recordOperation(
      "list-pages",
      measurement(80, 20),
      measurement(160, 40),
      measurement(60, 15)
    );
    reporter.setContract("candidateCompact", "passed");
    reporter.setContract("candidateVerbose", "passed");
    reporter.setContract("historicalBaselineCompact", "failed");

    expect(reporter.createReport("passed")).toMatchObject({
      schemaVersion: 4,
      kind: "deterministic-compact-release-smoke",
      outcome: "passed",
      totalDurationMs: 80,
      tokenizer: compactTokenizer,
      candidateTokenBudget: 6_000,
      sameCandidate: {
        totals: {
          compact: {
            bytes: 80,
            tokens: 20,
            attempts: 1,
            retries: 0,
            failures: 0,
          },
          verbose: {
            bytes: 160,
            tokens: 40,
            attempts: 1,
            retries: 0,
            failures: 0,
          },
          tokenDelta: -20,
          retryDelta: 0,
          failureDelta: 0,
        },
      },
      historical: {
        comparable: false,
        operations: [{ operation: "list-pages", tokenDelta: null }],
        totals: { tokenDelta: null },
      },
      checks: {
        compactStrictlySmaller: "passed",
        retryRegression: "passed",
        failureRegression: "passed",
        historicalComparable: "skipped",
      },
    });
    expect(reporter.candidatePassesCompactRollout()).toBe(true);
  });

  test("publishes historical deltas only when both compact contracts pass", () => {
    const reporter = createReleaseSmokeReporter({ writeLog: vi.fn() });
    reporter.recordOperation(
      "list-pages",
      measurement(100, 25),
      measurement(200, 50),
      measurement(120, 30)
    );
    reporter.setContract("candidateCompact", "passed");
    reporter.setContract("candidateVerbose", "passed");
    reporter.setContract("historicalBaselineCompact", "passed");

    const report = reporter.createReport("passed");
    expect(report.historical).toMatchObject({
      comparable: true,
      operations: [{ tokenDelta: -5 }],
      totals: { tokenDelta: -5 },
    });
    expect(report.checks.historicalComparable).toBe("passed");
  });

  test("gates token, retry, and failure regressions against candidate verbose", () => {
    const reporter = createReleaseSmokeReporter({
      candidateTokenBudget: 10,
      writeLog: vi.fn(),
    });
    reporter.recordOperation(
      "list-pages",
      measurement(100, 11, 1, 1),
      measurement(100, 11, 0, 0),
      measurement(1, 1)
    );
    reporter.setContract("candidateCompact", "passed");
    reporter.setContract("candidateVerbose", "passed");

    expect(reporter.createReport("failed").checks).toMatchObject({
      candidateTokenBudget: "failed",
      compactStrictlySmaller: "failed",
      retryRegression: "failed",
      failureRegression: "failed",
    });
    expect(reporter.candidatePassesCompactRollout()).toBe(false);
  });

  test("uses a deterministic versioned tokenizer", () => {
    expect(countCompactTokens('{"hello":"world"}')).toBe(11);
    expect(countCompactTokens("cafe")).toBe(1);
    expect(countCompactTokens("caf\u00e9")).toBe(2);
  });

  test("counts current and historical list response shapes", () => {
    expect(
      getModelVerificationItemCount("list-pages", {
        ok: true,
        data: { pages: [{ id: "home" }] },
      })
    ).toBe(1);
    expect(
      getModelVerificationItemCount("list-assets", {
        ok: true,
        items: [{ id: "logo" }, { id: "hero" }],
      })
    ).toBe(2);
    expect(
      getModelVerificationItemCount("list-assets", {
        ok: true,
        data: [{ id: "logo" }],
      })
    ).toBe(1);
  });

  test("records bounded performance evidence without payload fields", () => {
    const reporter = createReleaseSmokeReporter({
      now: () => 200,
      writeLog: vi.fn(),
    });
    reporter.complete("rendered-audit", 100, {
      rssBytes: 1_000,
      heapUsedBytes: 500,
      networkTransferBytes: 300,
      retainedArtifactBytes: 200,
      generatedBuildBytes: 400,
      generatedBuildGzipBytes: 100,
    });
    expect(reporter.createReport("passed").phases[0]).toMatchObject({
      phase: "rendered-audit",
      durationMs: 100,
      metrics: { rssBytes: 1_000, generatedBuildGzipBytes: 100 },
    });
  });

  test("rejects raw payloads and private diagnostic fields", () => {
    const report = createReleaseSmokeReporter({
      writeLog: vi.fn(),
    }).createReport("failed");
    expect(releaseSmokeReportSchema.parse(report)).toEqual(report);
    for (const field of ["authToken", "payload", "stdout", "errorMessage"]) {
      expect(
        releaseSmokeReportSchema.safeParse({ ...report, [field]: "private" })
          .success
      ).toBe(false);
    }
  });

  test("validates the exact published manifest projection", () => {
    const contract = {
      name: "webstudio",
      version: "1.2.3",
      type: "module",
      bin: { "webstudio-cli": "./bin.js", webstudio: "./bin.js" },
      files: ["lib/*", "templates/*", "bin.js", "!*.{test,stories}.*"],
      engines: { node: ">=22" },
    };
    expect(publishedCliManifestContractSchema.parse(contract)).toEqual(
      contract
    );
    expect(
      publishedCliManifestContractSchema.safeParse({
        ...contract,
        bin: { webstudio: "./other.js" },
      }).success
    ).toBe(false);
    expect(
      publishedCliManifestContractSchema.safeParse({
        ...contract,
        private: true,
      }).success
    ).toBe(false);
  });

  test("requires independent candidate and baseline model evidence", () => {
    const submission = {
      schemaVersion: 2,
      taskId: "minimal-context-discovery-v2",
      provider: "openai",
      model: "gpt-5.1-codex",
      outcome: "completed",
      toolCallCount: 2,
      observations: { pageCount: 2, assetCount: 1 },
    };
    expect(modelEvaluationSubmissionSchema.parse(submission)).toEqual(
      submission
    );
    const run = {
      subject: { source: "local", version: "1.2.3" },
      evidence: {
        source: "configured-agent-command",
        provider: "openai",
        model: "gpt-5.1-codex",
        commandSha256: "a".repeat(64),
        durationMs: 1_000,
        exitCode: 0,
        toolCallCount: 2,
      },
      observations: { pageCount: 2, assetCount: 1 },
      checks: { submissionContract: "passed", projectOutcome: "passed" },
    } as const;
    const report = {
      schemaVersion: 2,
      kind: "model-driven-packaged-cli-evaluation",
      outcome: "passed",
      subjects: {
        candidate: run.subject,
        baseline: { source: "registry", version: "1.2.2" },
      },
      taskId: "minimal-context-discovery-v2",
      runs: {
        candidate: run,
        baseline: {
          ...run,
          subject: { source: "registry", version: "1.2.2" },
        },
      },
      checks: { bothOutcomes: "passed", canaryRedaction: "passed" },
    } as const;
    expect(modelEvaluationReportSchema.parse(report)).toEqual(report);
    expect(
      modelEvaluationReportSchema.safeParse({
        ...report,
        transcript: "private",
      }).success
    ).toBe(false);
    expect(
      modelEvaluationReportSchema.safeParse({
        ...report,
        runs: { candidate: run },
      }).success
    ).toBe(false);
  });

  test("scans reports for canaries and token-shaped secrets", async () => {
    const directory = await mkdtemp(join(tmpdir(), "release-smoke-report-"));
    const path = join(directory, "report.json");
    const canary = "release-smoke-secret-canary";
    try {
      const reporter = createReleaseSmokeReporter({
        privacyCanary: canary,
        writeLog: vi.fn(),
      });
      reporter.markCanaryExercised();
      await reporter.write(path, "passed");
      const source = await readFile(path, "utf8");
      expect(source).not.toContain(canary);
      expect(releaseSmokeReportSchema.parse(JSON.parse(source))).toMatchObject({
        checks: { canaryRedaction: "passed" },
      });
      expect(() =>
        assertPrivacySafeArtifact({ value: canary }, [canary])
      ).toThrow("privacy redaction");
      expect(() =>
        assertPrivacySafeArtifact({ value: `npm_${"a".repeat(24)}` })
      ).toThrow("token-shaped");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
