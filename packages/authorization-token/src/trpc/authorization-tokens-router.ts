import { z } from "zod";
import { router, procedure } from "@webstudio-is/trpc-interface/index.server";
import { db } from "../db";
import type { IsEqual } from "type-fest";
import type { Database } from "@webstudio-is/postrest/index.server";

type Relation =
  Database["public"]["Tables"]["AuthorizationToken"]["Row"]["relation"];

const TokenProjectRelation = z.enum([
  "viewers",
  "editors",
  "builders",
  "administrators",
]);

// Check DB types are compatible with zod types
type TokenRelation = z.infer<typeof TokenProjectRelation>;
true satisfies IsEqual<TokenRelation, Relation>;

export const authorizationTokenRouter = router({
  findMany: procedure
    .input(
      z.object({
        projectId: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      return await db.findMany({ projectId: input.projectId }, ctx);
    }),
  create: procedure
    .input(
      z.object({
        projectId: z.string(),
        relation: TokenProjectRelation,
        name: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await db.create(
        {
          projectId: input.projectId,
          relation: input.relation,
          name: input.name,
        },
        ctx
      );
    }),
  remove: procedure
    .input(
      z.object({
        projectId: z.string(),
        token: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await db.remove(
        { projectId: input.projectId, token: input.token },
        ctx
      );
    }),
  update: procedure
    .input(
      z.object({
        projectId: z.string(),
        token: z.string(),
        name: z.string(),
        relation: TokenProjectRelation,
        canClone: z.boolean(),
        canCopy: z.boolean(),
        canPublish: z.boolean(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await db.update(
        input.projectId,
        {
          token: input.token,
          name: input.name,
          relation: input.relation,
          canPublish: input.canPublish,
          canClone: input.canClone,
          canCopy: input.canCopy,
        },
        ctx
      );
    }),
});

export type AuthorizationTokensRouter = typeof authorizationTokenRouter;
