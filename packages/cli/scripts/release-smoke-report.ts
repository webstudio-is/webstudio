import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import { boundedIdentifierPattern } from "../src/type-utils";

export const releaseSmokePhases = [
  "fixture-api",
  "package",
  "candidate-install",
  "baseline-install",
  "compact-comparison",
  "model-evaluation",
  "audit-help",
  "preview-start",
  "agent-workflow",
  "stdio-workflow",
  "rendered-audit",
  "cached-audit",
  "structured-commands",
  "cleanup",
] as const;

export const compactSmokeOperations = [
  "list-pages",
  "list-assets",
  "list-instances",
  "list-design-tokens",
  "list-css-variables",
  "list-variables",
  "list-resources",
] as const;

export const compactTokenizer = {
  implementation: "webstudio-json-lex",
  version: "1.0.0",
} as const;
export const defaultCandidateTokenBudget = 6_000;

export type ReleaseSmokePhase = (typeof releaseSmokePhases)[number];
export type CompactSmokeOperation = (typeof compactSmokeOperations)[number];

const byteCount = z.number().int().nonnegative();
const count = z.number().int().nonnegative();
const checkStatus = z.enum(["passed", "failed", "skipped"]);
const safeIdentifier = z
  .string()
  .min(1)
  .max(128)
  .regex(boundedIdentifierPattern);

export const countCompactTokens = (source: string) => {
  let tokens = 0;
  let asciiWordBytes = 0;
  let whitespaceBytes = 0;
  const flush = () => {
    tokens += Math.ceil(asciiWordBytes / 4) + Math.ceil(whitespaceBytes / 4);
    asciiWordBytes = 0;
    whitespaceBytes = 0;
  };
  for (const character of source) {
    if (/^[A-Za-z0-9_]$/.test(character)) {
      if (whitespaceBytes > 0) {
        flush();
      }
      asciiWordBytes += 1;
      continue;
    }
    if (/^\s$/u.test(character)) {
      if (asciiWordBytes > 0) {
        flush();
      }
      whitespaceBytes += Buffer.byteLength(character, "utf8");
      continue;
    }
    flush();
    tokens += Math.max(1, Math.ceil(Buffer.byteLength(character, "utf8") / 2));
  }
  flush();
  return tokens;
};

export const getModelVerificationItemCount = (
  operation: "list-pages" | "list-assets",
  structuredContent: unknown
) => {
  if (
    typeof structuredContent !== "object" ||
    structuredContent === null ||
    Array.isArray(structuredContent)
  ) {
    throw new Error(`${operation} model verification response is invalid.`);
  }
  const response = structuredContent as Record<string, unknown>;
  const payload = response.data ?? response;
  const items = Array.isArray(payload)
    ? payload
    : typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)[
          operation === "list-pages" ? "pages" : "items"
        ]
      : undefined;
  if (Array.isArray(items) === false) {
    throw new Error(`${operation} model verification payload is invalid.`);
  }
  return items.length;
};

export const assertPrivacySafeArtifact = (
  value: unknown,
  canaries: readonly string[] = []
) => {
  const source = typeof value === "string" ? value : JSON.stringify(value);
  const forbidden = [
    ...canaries.filter((canary) => canary !== ""),
    "authToken=",
    "Authorization: Bearer ",
  ];
  if (forbidden.some((secret) => source.includes(secret))) {
    throw new Error(
      "Release smoke artifact failed privacy redaction scanning."
    );
  }
  if (
    /(?:^|[\"'\s])(npm_[A-Za-z0-9]{20,}|gh[opsu]_[A-Za-z0-9]{20,}|sk-[A-Za-z0-9_-]{20,})/.test(
      source
    )
  ) {
    throw new Error("Release smoke artifact contains a token-shaped secret.");
  }
};

export const publishedCliManifestContractSchema = z
  .object({
    name: z.literal("webstudio"),
    version: z.string().min(1).max(128),
    type: z.literal("module"),
    bin: z
      .object({
        "webstudio-cli": z.literal("./bin.js"),
        webstudio: z.literal("./bin.js"),
      })
      .strict(),
    files: z.tuple([
      z.literal("lib/*"),
      z.literal("templates/*"),
      z.literal("bin.js"),
      z.literal("!*.{test,stories}.*"),
    ]),
    engines: z.object({ node: z.literal(">=22") }).strict(),
  })
  .strict();

export const releaseSmokeMetricsSchema = z
  .object({
    rssBytes: byteCount.optional(),
    heapUsedBytes: byteCount.optional(),
    networkTransferBytes: byteCount.optional(),
    retainedArtifactBytes: byteCount.optional(),
    generatedBuildBytes: byteCount.optional(),
    generatedBuildGzipBytes: byteCount.optional(),
  })
  .strict();

const operationMeasurementFields = {
  bytes: byteCount,
  tokens: count,
  attempts: count,
  retries: count,
  failures: count,
};

export const compactOperationMeasurementSchema = z
  .object({
    ...operationMeasurementFields,
    fallbacks: z
      .object({
        verbose: count,
        fullResource: count,
        source: count,
      })
      .strict(),
  })
  .strict();

const aggregateMeasurementSchema = z
  .object(operationMeasurementFields)
  .strict();

const releaseSubjectSchema = z
  .object({
    source: z.enum(["local", "registry"]),
    version: z.string().min(1).max(128),
  })
  .strict();

export type ReleaseSmokeMetrics = z.infer<typeof releaseSmokeMetricsSchema>;
export type CompactOperationMeasurement = z.infer<
  typeof compactOperationMeasurementSchema
>;
export type ReleaseSubject = z.infer<typeof releaseSubjectSchema>;

const comparisonOperationSchema = z
  .object({
    operation: z.enum(compactSmokeOperations),
    compact: compactOperationMeasurementSchema,
    verbose: compactOperationMeasurementSchema,
    tokenDelta: z.number().int(),
    retryDelta: z.number().int(),
    failureDelta: z.number().int(),
  })
  .strict();

const historicalOperationSchema = z
  .object({
    operation: z.enum(compactSmokeOperations),
    candidate: compactOperationMeasurementSchema,
    baseline: compactOperationMeasurementSchema,
    tokenDelta: z.number().int().nullable(),
  })
  .strict();

export const releaseSmokeReportSchema = z
  .object({
    schemaVersion: z.literal(4),
    kind: z.literal("deterministic-compact-release-smoke"),
    outcome: z.enum(["passed", "failed"]),
    totalDurationMs: count,
    subjects: z
      .object({
        candidate: releaseSubjectSchema,
        baseline: releaseSubjectSchema,
      })
      .strict(),
    tokenizer: z
      .object({
        implementation: z.literal(compactTokenizer.implementation),
        version: z.literal(compactTokenizer.version),
      })
      .strict(),
    candidateTokenBudget: count.positive(),
    sameCandidate: z
      .object({
        operations: z.array(comparisonOperationSchema),
        totals: z
          .object({
            compact: aggregateMeasurementSchema,
            verbose: aggregateMeasurementSchema,
            tokenDelta: z.number().int(),
            retryDelta: z.number().int(),
            failureDelta: z.number().int(),
          })
          .strict(),
      })
      .strict(),
    historical: z
      .object({
        comparable: z.boolean(),
        operations: z.array(historicalOperationSchema),
        totals: z
          .object({
            candidate: aggregateMeasurementSchema,
            baseline: aggregateMeasurementSchema,
            tokenDelta: z.number().int().nullable(),
          })
          .strict(),
      })
      .strict(),
    phases: z.array(
      z
        .object({
          phase: z.enum(releaseSmokePhases),
          durationMs: count,
          metrics: releaseSmokeMetricsSchema.optional(),
        })
        .strict()
    ),
    checks: z
      .object({
        contracts: z
          .object({
            candidateCompact: checkStatus,
            candidateVerbose: checkStatus,
            historicalBaselineCompact: checkStatus,
          })
          .strict(),
        candidateTokenBudget: checkStatus,
        compactStrictlySmaller: checkStatus,
        retryRegression: checkStatus,
        failureRegression: checkStatus,
        historicalComparable: checkStatus,
        canaryRedaction: checkStatus,
        registryArtifact: checkStatus,
      })
      .strict(),
  })
  .strict();

export type ReleaseSmokeReport = z.infer<typeof releaseSmokeReportSchema>;

export const modelEvaluationTaskId = "minimal-context-discovery-v2" as const;
export const modelEvaluationSubmissionSchema = z
  .object({
    schemaVersion: z.literal(2),
    taskId: z.literal(modelEvaluationTaskId),
    provider: safeIdentifier,
    model: safeIdentifier,
    outcome: z.enum(["completed", "failed"]),
    toolCallCount: count,
    observations: z.object({ pageCount: count, assetCount: count }).strict(),
  })
  .strict();

const modelRunSchema = z
  .object({
    subject: releaseSubjectSchema,
    evidence: z
      .object({
        source: z.literal("configured-agent-command"),
        provider: safeIdentifier,
        model: safeIdentifier,
        commandSha256: z.string().regex(/^[a-f0-9]{64}$/),
        durationMs: count,
        exitCode: z.number().int(),
        toolCallCount: count,
      })
      .strict(),
    observations: z.object({ pageCount: count, assetCount: count }).strict(),
    checks: z
      .object({ submissionContract: checkStatus, projectOutcome: checkStatus })
      .strict(),
  })
  .strict();

export const modelEvaluationReportSchema = z
  .object({
    schemaVersion: z.literal(2),
    kind: z.literal("model-driven-packaged-cli-evaluation"),
    outcome: z.enum(["passed", "failed"]),
    subjects: z
      .object({
        candidate: releaseSubjectSchema,
        baseline: releaseSubjectSchema,
      })
      .strict(),
    taskId: z.literal(modelEvaluationTaskId),
    runs: z
      .object({ candidate: modelRunSchema, baseline: modelRunSchema })
      .strict(),
    checks: z
      .object({ bothOutcomes: checkStatus, canaryRedaction: checkStatus })
      .strict(),
  })
  .strict();

export type ModelEvaluationReport = z.infer<typeof modelEvaluationReportSchema>;

const unknownSubject: ReleaseSubject = {
  source: "local",
  version: "unresolved",
};

export const writeModelEvaluationReport = async (
  path: string,
  report: ModelEvaluationReport,
  canaries: readonly string[] = []
) => {
  const parsed = modelEvaluationReportSchema.parse(report);
  assertPrivacySafeArtifact(parsed, canaries);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(parsed, undefined, 2)}\n`, "utf8");
};

const aggregateMeasurements = (
  values: readonly CompactOperationMeasurement[]
) =>
  values.reduce(
    (total, value) => ({
      bytes: total.bytes + value.bytes,
      tokens: total.tokens + value.tokens,
      attempts: total.attempts + value.attempts,
      retries: total.retries + value.retries,
      failures: total.failures + value.failures,
    }),
    { bytes: 0, tokens: 0, attempts: 0, retries: 0, failures: 0 }
  );

export const createReleaseSmokeReporter = ({
  now = Date.now,
  writeLog = (message: string) => process.stderr.write(message),
  privacyCanary = "",
  candidateTokenBudget = defaultCandidateTokenBudget,
}: {
  now?: () => number;
  writeLog?: (message: string) => void;
  privacyCanary?: string;
  candidateTokenBudget?: number;
} = {}) => {
  const parsedCandidateTokenBudget = count
    .positive()
    .parse(candidateTokenBudget);
  const startedAt = now();
  const phases: ReleaseSmokeReport["phases"] = [];
  const sameCandidateOperations: ReleaseSmokeReport["sameCandidate"]["operations"] =
    [];
  const historicalMeasurements: Array<{
    operation: CompactSmokeOperation;
    candidate: CompactOperationMeasurement;
    baseline: CompactOperationMeasurement;
  }> = [];
  let subjects: ReleaseSmokeReport["subjects"] = {
    candidate: unknownSubject,
    baseline: unknownSubject,
  };
  let contracts: ReleaseSmokeReport["checks"]["contracts"] = {
    candidateCompact: "failed",
    candidateVerbose: "failed",
    historicalBaselineCompact: "failed",
  };
  let registryArtifact: ReleaseSmokeReport["checks"]["registryArtifact"] =
    "skipped";
  let canaryExercised = false;

  const getComparisons = () => {
    const compact = aggregateMeasurements(
      sameCandidateOperations.map((operation) => operation.compact)
    );
    const verbose = aggregateMeasurements(
      sameCandidateOperations.map((operation) => operation.verbose)
    );
    const comparable =
      contracts.candidateCompact === "passed" &&
      contracts.historicalBaselineCompact === "passed";
    const historicalCandidate = aggregateMeasurements(
      historicalMeasurements.map((operation) => operation.candidate)
    );
    const historicalBaseline = aggregateMeasurements(
      historicalMeasurements.map((operation) => operation.baseline)
    );
    return {
      sameCandidate: {
        operations: sameCandidateOperations,
        totals: {
          compact,
          verbose,
          tokenDelta: compact.tokens - verbose.tokens,
          retryDelta: compact.retries - verbose.retries,
          failureDelta: compact.failures - verbose.failures,
        },
      },
      historical: {
        comparable,
        operations: historicalMeasurements.map((operation) => ({
          ...operation,
          tokenDelta: comparable
            ? operation.candidate.tokens - operation.baseline.tokens
            : null,
        })),
        totals: {
          candidate: historicalCandidate,
          baseline: historicalBaseline,
          tokenDelta: comparable
            ? historicalCandidate.tokens - historicalBaseline.tokens
            : null,
        },
      },
    };
  };

  const createReport = (
    outcome: ReleaseSmokeReport["outcome"],
    canaryRedaction: ReleaseSmokeReport["checks"]["canaryRedaction"] = "skipped"
  ): ReleaseSmokeReport => {
    const comparisons = getComparisons();
    const totals = comparisons.sameCandidate.totals;
    const retryRegression = sameCandidateOperations.some(
      (operation) => operation.retryDelta > 0
    );
    const failureRegression = sameCandidateOperations.some(
      (operation) => operation.failureDelta > 0
    );
    return releaseSmokeReportSchema.parse({
      schemaVersion: 4,
      kind: "deterministic-compact-release-smoke",
      outcome,
      totalDurationMs: Math.max(0, now() - startedAt),
      subjects,
      tokenizer: compactTokenizer,
      candidateTokenBudget: parsedCandidateTokenBudget,
      ...comparisons,
      phases,
      checks: {
        contracts,
        candidateTokenBudget:
          totals.compact.tokens <= parsedCandidateTokenBudget
            ? "passed"
            : "failed",
        compactStrictlySmaller:
          totals.compact.tokens < totals.verbose.tokens ? "passed" : "failed",
        retryRegression: retryRegression ? "failed" : "passed",
        failureRegression: failureRegression ? "failed" : "passed",
        historicalComparable: comparisons.historical.comparable
          ? "passed"
          : "skipped",
        canaryRedaction,
        registryArtifact,
      },
    });
  };

  return {
    complete(
      phase: ReleaseSmokePhase,
      phaseStartedAt = now(),
      metrics?: ReleaseSmokeMetrics
    ) {
      const durationMs = Math.max(0, now() - phaseStartedAt);
      phases.push({
        phase,
        durationMs,
        ...(metrics === undefined ? {} : { metrics }),
      });
      writeLog(`[release-smoke] ${phase} (${durationMs}ms)\n`);
    },
    setSubjects(value: ReleaseSmokeReport["subjects"]) {
      subjects = releaseSmokeReportSchema.shape.subjects.parse(value);
    },
    setContract(
      target: keyof ReleaseSmokeReport["checks"]["contracts"],
      status: ReleaseSmokeReport["checks"]["contracts"][typeof target]
    ) {
      contracts = { ...contracts, [target]: status };
    },
    setRegistryArtifact(
      status: ReleaseSmokeReport["checks"]["registryArtifact"]
    ) {
      registryArtifact = status;
    },
    markCanaryExercised() {
      canaryExercised = true;
    },
    recordOperation(
      operation: CompactSmokeOperation,
      compact: CompactOperationMeasurement,
      verbose: CompactOperationMeasurement,
      historicalBaseline: CompactOperationMeasurement
    ) {
      const parsedCompact = compactOperationMeasurementSchema.parse(compact);
      const parsedVerbose = compactOperationMeasurementSchema.parse(verbose);
      const parsedHistoricalBaseline =
        compactOperationMeasurementSchema.parse(historicalBaseline);
      sameCandidateOperations.push({
        operation,
        compact: parsedCompact,
        verbose: parsedVerbose,
        tokenDelta: parsedCompact.tokens - parsedVerbose.tokens,
        retryDelta: parsedCompact.retries - parsedVerbose.retries,
        failureDelta: parsedCompact.failures - parsedVerbose.failures,
      });
      historicalMeasurements.push({
        operation,
        candidate: parsedCompact,
        baseline: parsedHistoricalBaseline,
      });
    },
    candidatePassesCompactRollout() {
      const report = createReport("failed");
      return (
        report.checks.contracts.candidateCompact === "passed" &&
        report.checks.contracts.candidateVerbose === "passed" &&
        report.checks.candidateTokenBudget === "passed" &&
        report.checks.compactStrictlySmaller === "passed" &&
        report.checks.retryRegression === "passed" &&
        report.checks.failureRegression === "passed"
      );
    },
    createReport,
    async write(path: string, outcome: ReleaseSmokeReport["outcome"]) {
      const report = createReport(
        outcome,
        canaryExercised ? "passed" : "skipped"
      );
      assertPrivacySafeArtifact(report, [privacyCanary]);
      const source = `${JSON.stringify(report, undefined, 2)}\n`;
      releaseSmokeReportSchema.parse(JSON.parse(source));
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, source, "utf8");
    },
  };
};
