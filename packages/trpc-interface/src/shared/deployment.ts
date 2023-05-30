import { z } from "zod";
import { router, procedure } from "./trpc";

const PublishInput = z.object({
  // used to load build data from the builder see routes/rest.build.$buildId.ts
  buildId: z.string(),
  builderApiOrigin: z.string(),
  // preview support
  branchName: z.string(),
  // action log helper (not used for deployment, but for action logs readablity)
  projectDomainName: z.string(),
});

const Output = z.discriminatedUnion("success", [
  z.object({
    success: z.literal(true),
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
  }),
]);

/**
 * This is the ContentManagementService. It is currently used to publish content to a custom domain.
 * In the future, additional methods, such as a 'preview' function, could be added.
 **/
export const deploymentRouter = router({
  publish: procedure
    .input(PublishInput)
    .output(Output)
    .mutation(async ({ input, ctx }) => {
      return { success: false, error: "Not implemented" };
    }),
});
