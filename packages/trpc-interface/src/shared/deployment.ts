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
});

export const unpublishInput = z.object({
  domain: z.string(),
});

export const output = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    executionHandle: z.string().optional(),
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
    dispatchUncertain: z.boolean().optional(),
  }),
]);

export const publishExecutionInput = z.object({
  buildId: z.string(),
  attemptId: z.string().uuid(),
  executionHandle: z.string().max(2048),
  cursor: z.number().int().nonnegative().safe().optional(),
});

export const publishExecutionOutput = z.discriminatedUnion("availability", [
  z.object({ availability: z.literal("pending") }),
  z.object({ availability: z.literal("unavailable") }),
  z.object({
    availability: z.literal("available"),
    outcome: z.enum(["succeeded", "failed"]),
    logAvailability: z.enum(["available", "unavailable"]),
    startedAt: z.string().datetime().optional(),
    completedAt: z.string().datetime().optional(),
    failureReason: z
      .enum([
        "failure",
        "cancelled",
        "timed_out",
        "action_required",
        "startup_failure",
        "stale",
        "unknown",
      ])
      .optional(),
    failedStage: z
      .enum([
        "setup",
        "sync",
        "project-build",
        "application-build",
        "worker-build",
        "assets",
        "deploy",
        "finalize",
      ])
      .optional(),
    log: z
      .object({
        encoding: z.literal("base64url"),
        chunk: z.string().max(400_000),
        complete: z.boolean(),
        nextCursor: z.number().int().nonnegative().safe().optional(),
        issues: z
          .array(
            z.object({
              severity: z.enum(["error", "warning"]),
              message: z.string().max(1024),
            })
          )
          .max(20)
          .optional(),
        issuesOmitted: z.number().int().nonnegative().optional(),
      })
      .optional(),
  }),
]);

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
  getPublishExecution: procedure
    .input(publishExecutionInput)
    .output(publishExecutionOutput)
    .query(() => ({ availability: "unavailable" as const })),
});
