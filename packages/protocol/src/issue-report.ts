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

export const issueReportBrowserAttempt = z
  .object({
    browser: z.enum(["chromium", "chrome", "edge", "brave"]),
    source: z.enum([
      "option",
      "env",
      "path",
      "platform",
      "playwright",
      "chrome-launcher",
    ]),
  })
  .strict();

export const issueReportBrowserSignal = z.enum([
  "SIGABRT",
  "SIGBUS",
  "SIGFPE",
  "SIGHUP",
  "SIGILL",
  "SIGINT",
  "SIGKILL",
  "SIGPIPE",
  "SIGQUIT",
  "SIGSEGV",
  "SIGSYS",
  "SIGTERM",
  "SIGTRAP",
]);

const issueReportId = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[A-Za-z0-9_-]+$/);

export const issueReportEntityIdField = z.enum([
  "assetId",
  "blockInstanceId",
  "breakpointId",
  "collectionInstanceId",
  "dataSourceId",
  "designTokenId",
  "folderId",
  "fragmentId",
  "instanceId",
  "itemRootInstanceId",
  "pageId",
  "parentFolderId",
  "parentInstanceId",
  "propId",
  "relatedInstanceId",
  "resourceId",
  "rootInstanceId",
  "ruleId",
  "scopeInstanceId",
  "slotId",
  "sourceInstanceId",
  "sourceTemplateId",
  "styleSourceId",
  "targetFolderId",
  "targetParentInstanceId",
  "targetTemplateId",
  "templateId",
  "variableId",
]);

export const issueReportEntityId = z
  .object({ field: issueReportEntityIdField, id: issueReportId })
  .strict();

const issueReportRecentFailure = z
  .object({
    tool: z.string().trim().min(1).max(160),
    code: z.string().trim().min(1).max(160),
    httpStatus: z.number().int().min(100).max(599).optional(),
    elapsedMs: z.number().int().nonnegative().optional(),
    entityIds: z.array(issueReportEntityId).max(20).optional(),
    issues: z.array(issueReportFailureIssue).max(30).optional(),
    response: z
      .object({
        format: z.enum(["json", "html", "other"]),
        envelope: z.enum(["result", "error", "other", "missing"]),
        batchSize: z.number().int().min(0).max(1_000).optional(),
      })
      .strict()
      .optional(),
    browser: z
      .object({
        exitSignal: issueReportBrowserSignal.optional(),
        exitCode: z.number().int().min(0).max(255).optional(),
        attempts: z.array(issueReportBrowserAttempt).max(10).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const issueReportSession = z
  .object({
    staleNamespaces: z.array(z.string().max(100)).max(50),
    missingNamespaces: z.array(z.string().max(100)).max(50),
    invalidatedNamespaces: z.array(z.string().max(100)).max(50),
  })
  .strict();

const issueReportPreview = z
  .object({
    stale: z.boolean(),
    hasRenderedVersion: z.boolean(),
    renderedVersionMatchesSession: z.boolean().optional(),
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
    projectId: issueReportId.optional(),
    recentFailure: issueReportRecentFailure.optional(),
    session: issueReportSession.optional(),
    preview: issueReportPreview.optional(),
  })
  .strict()
  .describe(
    "CLI-collected runtime metadata with the project ID and bounded entity IDs from the failed tool input; no raw arguments, URLs, credentials, or customer content."
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
    "LLM-authored technical report. The CLI attaches the project ID and recognized IDs from the failed tool input. Generalize all other context; exclude names, URLs, credentials, customer content, and raw tool data."
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
