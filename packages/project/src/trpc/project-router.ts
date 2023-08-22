import * as db from "../db";
import { z } from "zod";
import { router, procedure } from "./trpc";
import { Title } from "../shared/schema";

export const projectRouter = router({
  rename: procedure
    .input(
      z.object({
        title: Title,
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
    .input(z.object({ projectId: z.string(), title: z.optional(z.string()) }))
    .mutation(async ({ input, ctx }) => {
      return await db.project.duplicate(
        {
          projectId: input.projectId,
          title: input.title,
        },
        ctx
      );
    }),
  create: procedure
    .input(z.object({ title: Title }))
    .mutation(async ({ input, ctx }) => {
      return await db.project.create(input, ctx);
    }),
});

export type ProjectRouter = typeof projectRouter;
