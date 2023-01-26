import * as db from "../db";
import { z } from "zod";
import { router, procedure } from "./trpc";

export const projectRouter = router({
  rename: procedure
    .input(
      z.object({
        title: z.string(),
        projectId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // @todo pass ctx for authorization
      return await db.project.rename(input, ctx);
    }),
  delete: procedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      // @todo pass ctx for authorization
      return await db.project.markAsDeleted(input.projectId, ctx);
    }),
  duplicate: procedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return await db.project.duplicate(input.projectId, ctx);
    }),
  create: procedure
    .input(z.object({ title: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return await db.project.create(input, ctx);
    }),
});

export type ProjectRouter = typeof projectRouter;
