import { z } from "zod";
import { router, procedure } from "@webstudio-is/trpc-interface/index.server";
import { topicNames } from "./types";
import { resolveTopics } from "./topic-resolvers.server";

export const subscriptionRouter = router({
  poll: procedure
    .input(
      z.object({
        topics: z.array(z.enum(topicNames)),
      })
    )
    .query(async ({ input, ctx }) => {
      return resolveTopics(input.topics, ctx);
    }),
});
