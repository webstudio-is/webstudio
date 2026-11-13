import { z } from "zod";

export const publishInput = z.object({
  // used to load build data from the builder with build.loadProjectBundleByBuildId
  buildId: z.string(),
  builderOrigin: z.string(),
  githubSha: z.string().optional(),
  destination: z.enum(["saas", "static"]),
  branchName: z.string(),
  logProjectName: z.string(),
});

export const unpublishInput = z.object({ domain: z.string() });

export const output = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
    logHandle: z.string().optional(),
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
    dispatchUncertain: z.boolean().optional(),
  }),
]);

export const publishLogInput = z.object({
  buildId: z.string(),
  logHandle: z.string().max(2048),
  cursor: z.number().int().nonnegative().safe().optional(),
  includeLog: z.boolean().optional(),
});

export const publishLogOutput = z.discriminatedUnion("availability", [
  z.object({ availability: z.literal("pending") }),
  z.object({ availability: z.literal("unavailable") }),
  z.object({
    availability: z.literal("available"),
    outcome: z.enum(["succeeded", "failed"]),
    logAvailability: z.enum(["available", "unavailable"]),
    startedAt: z.string().datetime().optional(),
    completedAt: z.string().datetime().optional(),
    code: z
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
        steps: z
          .array(
            z.object({
              name: z.string(),
              status: z.string(),
              offset: z.number().int().nonnegative().safe(),
              contentOffset: z.number().int().nonnegative().safe(),
            })
          )
          .optional(),
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
