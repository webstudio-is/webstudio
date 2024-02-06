import * as db from "../db";
import { z } from "zod";
import { router, procedure } from "./trpc";
import { ClonableSettings, Title } from "../shared/schema";

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
  clone: procedure
    .input(z.object({ projectId: z.string(), title: z.optional(z.string()) }))
    .mutation(async ({ input, ctx }) => {
      return await db.project.clone(
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
  updateClonableSettings: procedure
    .input(ClonableSettings.extend({ projectId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      return await db.project.updateClonableSettings(input, ctx);
    }),
});

export type ProjectRouter = typeof projectRouter;
