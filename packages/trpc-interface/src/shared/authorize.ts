import { z } from "zod";
import { router, procedure } from "./trpc";

export const authorize = router({
  check: procedure
    .input(z.object({ name: z.string() }))
    .output(z.object({ allowed: z.boolean() }))
    .query(async ({ input, ctx }) => {
      return await { allowed: true };
    }),
});
