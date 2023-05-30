/**
 * Localhost implementation of the dashboard trpc interface
 * It's playground, and just emulates real 3rd party apis
 */
import { z } from "zod";
import { router, procedure } from "./trpc";

const PublishInput = z.object({
  buildId: z.string(),
  builderApiOrigin: z.string(),
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
export const cmsRouter = router({
  publish: procedure
    .input(PublishInput)
    .output(Output)
    .mutation(async ({ input, ctx }) => {
      return { success: false, error: "Not implemented" };
    }),
});
