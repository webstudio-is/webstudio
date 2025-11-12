import { z } from "zod";
import { procedure, router } from "@webstudio-is/trpc-interface/index.server";
import {
  updateUserProjectsTags,
  userProjectTagSchema,
} from "../shared/db/user.server";

export const userRouter = router({
  updateProjectsTags: procedure
    .input(z.object({ tags: z.array(userProjectTagSchema) }))
    .mutation(async ({ input, ctx }) => {
      return await updateUserProjectsTags(input, ctx);
    }),
});
