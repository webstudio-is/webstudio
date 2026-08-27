import { z } from "zod";

const issueReportTrigger = z.enum(["user-requested", "automatic-friction"]);

const issueReportCategory = z.enum([
  "tool-failure",
  "incorrect-result",
  "schema-or-docs-mismatch",
  "documented-recovery-failed",
  "undocumented-workaround",
  "hang-or-crash",
  "feature-request",
  "other",
]);

const issueReportReasoningEffort = z.enum([
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
  "ultra",
  "unknown",
]);

const reportText = z.string().trim().min(1).max(4_000);
const reportItems = z.array(reportText).min(1).max(20);

const issueReportAgent = z
  .object({
    client: z.string().trim().min(1).max(100),
    clientVersion: z.string().trim().min(1).max(100).optional(),
    provider: z.string().trim().min(1).max(100).optional(),
    model: z.string().trim().min(1).max(200),
    reasoningEffort: issueReportReasoningEffort,
  })
  .strict();

const issueReportFailureIssue = z
  .object({
    path: z.array(z.string().max(200)).max(30),
    code: z.string().trim().min(1).max(100),
    constraint: z.string().trim().min(1).max(500),
  })
  .strict();

const issueReportRecentFailure = z
  .object({
    tool: z.string().trim().min(1).max(160),
    code: z.string().trim().min(1).max(160),
    issues: z.array(issueReportFailureIssue).max(30).optional(),
  })
  .strict();

const issueReportRuntime = z
  .object({
    cliVersion: z.string().trim().min(1).max(100),
    nodeVersion: z.string().trim().min(1).max(100),
    os: z.string().trim().min(1).max(100),
    osVersion: z.string().trim().min(1).max(100),
    architecture: z.string().trim().min(1).max(100),
    executionMode: z.enum(["mcp"]),
    apiContractVersion: z.string().trim().min(1).max(100),
    bundleVersion: z.string().trim().min(1).max(100).optional(),
    recentFailure: issueReportRecentFailure.optional(),
  })
  .strict()
  .describe(
    "Anonymous CLI-collected runtime metadata without host, user, path, environment, network, location, project, or argument data."
  );

const issueReportContent = z
  .object({
    userStory: reportText,
    summary: reportText,
    attemptedWorkflow: reportItems,
    expectedBehavior: reportText,
    actualResult: reportText,
    recoveryAttempts: reportItems,
    userImpact: reportText,
    technicalContext: reportText,
    acceptanceCriteria: reportItems,
  })
  .strict();

export const issueReportInput = z
  .object({
    trigger: issueReportTrigger,
    category: issueReportCategory,
    deduplicationKey: z
      .string()
      .trim()
      .min(3)
      .max(160)
      .regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/)
      .describe(
        "Stable lowercase anonymous technical slug without user, project, resource, or domain identifiers."
      ),
    title: z.string().trim().min(1).max(160),
    agent: issueReportAgent,
    runtime: issueReportRuntime.optional(),
    report: issueReportContent,
  })
  .strict()
  .describe(
    "Anonymous LLM-authored technical report. Generalize context, exclude all identifying or project-specific data, and preserve only stable tool, schema, error, version, and input-shape details."
  );

export const issueReportResult = z
  .object({
    status: z.enum(["created", "existing"]),
    issueNumber: z.number().int().positive(),
    issueUrl: z.string().url(),
  })
  .strict();

export type IssueReportInput = z.infer<typeof issueReportInput>;
export type IssueReportResult = z.infer<typeof issueReportResult>;
export type IssueReportRuntime = z.infer<typeof issueReportRuntime>;
export type IssueReportRecentFailure = z.infer<typeof issueReportRecentFailure>;
