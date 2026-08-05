import { z } from "zod";

const issueReportTrigger = z.enum([
  "user-requested",
  "automatic-friction",
]);

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
        "Stable anonymous technical identity for this problem, using lowercase words separated by dots or hyphens. Do not include user, project, resource, or domain identifiers."
      ),
    title: z.string().trim().min(1).max(160),
    agent: issueReportAgent,
    report: issueReportContent,
  })
  .strict()
  .describe(
    "Anonymous LLM-authored technical issue report. Generalize the user story and omit names, usernames, emails, phone numbers, organizations, project or resource ids, domains, URLs, IP addresses, local paths, credentials, tokens, customer content, and exact unique values. Preserve only stable technical details such as MCP tool names, schema fields, error codes, CLI versions, and generalized input shapes."
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
