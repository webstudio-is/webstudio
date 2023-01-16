import { z } from "zod";
import { router, procedure } from "./trpc";

export const authorizationRouter = router({
  check: procedure
    .input(z.object({ name: z.string() }))
    .output(z.object({ allowed: z.boolean() }))
    .query(async () => {
      return { allowed: false };
    }),
});
