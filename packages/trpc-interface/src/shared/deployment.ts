import { z } from "zod";
import { router, procedure } from "./trpc";

// Has corresponding type in saas
export const publishInput = z.object({
  // used to load build data from the builder with build.loadProjectBundleByBuildId
  buildId: z.string(),
  builderOrigin: z.string(),
  githubSha: z.string().optional(),

  destination: z.enum(["saas", "static"]),
  // preview support
  branchName: z.string(),
  // action log helper (not used for deployment, but for action logs readablity)
  logProjectName: z.string(),
  attemptId: z.string().optional(),
  reportRetentionDays: z
    .union([z.literal(0), z.literal(1), z.literal(30)])
    .optional(),
});

export const unpublishInput = z.object({
  domain: z.string(),
});

export const output = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
  }),
]);

export const publishReportInput = z.object({
  attemptId: z.string().uuid(),
  retentionDays: z.union([z.literal(1), z.literal(30)]),
});

const publishIssueSeverity = z.enum(["error", "warning", "info"]);

const publishAuditFinding = z.object({
  ruleId: z.string().max(100),
  severity: publishIssueSeverity,
  message: z.string().max(4096),
  location: z.object({
    pageId: z.string().optional(),
    pageName: z.string().optional(),
    pagePath: z.string().optional(),
    instanceId: z.string().optional(),
    dataSourceId: z.string().optional(),
    propId: z.string().optional(),
    resourceId: z.string().optional(),
  }),
});

const publishDiagnostic = z.object({
  severity: z.enum(["error", "warning"]),
  stage: z.string().max(100),
  message: z.string().max(4096),
});

const publishReportStage = z.object({
  name: z.string().max(100),
  status: z.enum(["pending", "succeeded", "warning", "failed", "skipped"]),
  excerpt: z.string().max(4096).optional(),
  log: z.string().max(600_000).optional(),
  logTruncated: z.boolean().optional(),
});

export const publishReport = z.object({
  version: z.literal(1),
  attemptId: z.string().uuid(),
  buildId: z.string().optional(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  outcome: z.enum(["pending", "succeeded", "warning", "failed"]),
  actorLabel: z.string().max(80).optional(),
  targetLabels: z.array(z.string().max(255)).max(100),
  auditSnapshot: z.array(publishAuditFinding).max(500),
  stages: z.array(publishReportStage).max(32),
  diagnostics: z.array(publishDiagnostic).max(500),
  truncation: z.object({
    stagesOmitted: z.number().int().nonnegative(),
    diagnosticsOmitted: z.number().int().nonnegative(),
  }),
});

export type PublishReport = z.infer<typeof publishReport>;

export const publishReportOutput = z.discriminatedUnion("availability", [
  z.object({ availability: z.literal("available"), report: publishReport }),
  z.object({ availability: z.literal("not_found") }),
  z.object({ availability: z.literal("unavailable") }),
]);

export const storePublishReportInput = z.object({
  attemptId: z.string().uuid(),
  retentionDays: z.union([z.literal(1), z.literal(30)]),
  report: publishReport,
});

export const deletePublishReportsInput = z.object({
  reports: z
    .array(
      z.object({
        attemptId: z.string().uuid(),
        retentionDays: z.union([z.literal(1), z.literal(30)]),
      })
    )
    .max(1000),
});

/**
 * This is the ContentManagementService. It is currently used to publish content to a custom domain.
 * In the future, additional methods, such as a 'preview' function, could be added.
 **/
export const deploymentRouter = router({
  publish: procedure
    .input(publishInput)
    .output(output)
    .mutation(() => {
      return {
        success: false,
        error: "NOT_IMPLEMENTED",
      };
    }),
  unpublish: procedure
    .input(unpublishInput)
    .output(output)
    .mutation(() => {
      return {
        success: false,
        error: "NOT_IMPLEMENTED",
      };
    }),
  getPublishReport: procedure
    .input(publishReportInput)
    .output(publishReportOutput)
    .query(() => ({ availability: "unavailable" as const })),
  storePublishReport: procedure
    .input(storePublishReportInput)
    .output(output)
    .mutation(() => ({ success: false as const, error: "NOT_IMPLEMENTED" })),
  deletePublishReports: procedure
    .input(deletePublishReportsInput)
    .output(output)
    .mutation(() => ({ success: false as const, error: "NOT_IMPLEMENTED" })),
});
