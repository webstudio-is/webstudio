import { router, procedure } from "./trpc";
import {
  publishInput,
  unpublishInput,
  output,
  publishLogInput,
  publishLogOutput,
} from "./deployment-contract";

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
  getPublishLog: procedure
    .input(publishLogInput)
    .output(publishLogOutput)
    .query(() => ({ availability: "unavailable" as const })),
});
