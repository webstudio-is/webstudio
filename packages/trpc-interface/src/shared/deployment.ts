import { z } from "zod";
import { router, procedure } from "./trpc";

// Has corresponding type in saas
export const PublishInput = z.object({
  // used to load build data from the builder with build.loadProjectDataByBuildId
  buildId: z.string(),
  builderOrigin: z.string(),
  githubSha: z.string().optional(),

  destination: z.enum(["saas", "static"]),
  // Self-hosting build mode: "ssg" (static, default), "ssr" (Node subprocess), "cloudflare"
  buildMode: z.enum(["ssg", "ssr", "cloudflare"]).default("ssg"),
  // preview support
  branchName: z.string(),
  // action log helper (not used for deployment, but for action logs readablity)
  logProjectName: z.string(),
});

export const UnpublishInput = z.object({
  domain: z.string(),
});

export const Output = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
  }),
]);

/**
 * Self-hosting deployment router.
 *
 * When SELF_HOSTED_PUBLISHER_URL is set (e.g., http://publisher:4000), publish
 * requests are forwarded to that service which runs `webstudio sync + build`
 * and writes static files to the shared Nginx volume.
 *
 * When not set, publish returns NOT_IMPLEMENTED and the user is shown the CLI instructions.
 **/
export const deploymentRouter = router({
  capabilities: procedure.query(async () => {
    const publisherUrl = process.env.SELF_HOSTED_PUBLISHER_URL;
    if (publisherUrl === undefined) {
      return { cloudflare: false };
    }
    try {
      const response = await fetch(`${publisherUrl}/capabilities`);
      if (response.ok) {
        return (await response.json()) as { cloudflare: boolean };
      }
    } catch {
      // publisher unreachable
    }
    return { cloudflare: false };
  }),

  publish: procedure
    .input(PublishInput)
    .output(Output)
    .mutation(async ({ input }) => {
      const publisherUrl = process.env.SELF_HOSTED_PUBLISHER_URL;

      if (publisherUrl === undefined) {
        return {
          success: false,
          error: "NOT_IMPLEMENTED",
        };
      }

      try {
        const response = await fetch(`${publisherUrl}/publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            buildId: input.buildId,
            builderOrigin: input.builderOrigin,
            buildMode: input.buildMode,
            destination: input.destination,
          }),
        });

        if (response.ok === false) {
          const message = await response.text();
          return {
            success: false,
            error: `Publisher error: ${message.slice(0, 500)}`,
          };
        }

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: `Failed to reach publisher service: ${error instanceof Error ? error.message : "unknown error"}`,
        };
      }
    }),
  unpublish: procedure
    .input(UnpublishInput)
    .output(Output)
    .mutation(() => {
      return {
        success: false,
        error: "NOT_IMPLEMENTED",
      };
    }),
});
