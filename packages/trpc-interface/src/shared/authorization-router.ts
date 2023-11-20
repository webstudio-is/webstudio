import { z } from "zod";
import { router, procedure } from "./trpc";

import { prisma } from "@webstudio-is/prisma-client";

const Relation = z.enum([
  "viewers",
  "editors",
  "builders",
  "administrators",
  "owners",
]);
const AuthPermit = z.enum(["view", "edit", "build", "admin", "own"]);
export type AuthPermit = z.infer<typeof AuthPermit>;

const DeleteCreateInput = z.discriminatedUnion("namespace", [
  z.object({
    namespace: z.literal("Project"),
    id: z.string(),
    relation: Relation,

    subjectSet: z.discriminatedUnion("namespace", [
      z.object({
        namespace: z.literal("User"),
        id: z.string(),
      }),
      z.object({
        namespace: z.literal("Token"),
        id: z.string(),
      }),
      z.object({
        namespace: z.literal("Email"),
        id: z.string(),
        relation: z.literal("owners"),
      }),
    ]),
  }),

  z.object({
    namespace: z.literal("Email"),
    id: z.string(),
    relation: z.enum(["owners"]),
    subjectSet: z.object({
      namespace: z.literal("User"),
      id: z.string(),
    }),
  }),
]);

export const authorizationRouter = router({
  /**
   * Relation expansion in authorize looks like a tree
   *
   * :#@Project:AliceProjectUUID#viewers
   *   :#@Email:bob@bob.com#owner
   *     :#@User:BobUUID️
   *   :#@Token:LinkRandomSequence️
   *
   * We don't need the whole tree in UI and need only the leaf nodes.
   * i.e. @User:BobUUID️, @Token:LinkRandomSequence️ and the root relation i.e "viewers"
   */
  expandLeafNodes: procedure
    .input(
      z.object({
        namespace: z.literal("Project"),
        id: z.string(),
      })
    )
    .output(
      z.array(
        z.object({
          // top level relation
          relation: Relation,
          // subjectSet
          namespace: z.enum(["Email", "User", "Token"]),
          id: z.string(),
        })
      )
    )
    .query(async ({ input }) => {
      // Implement ory expand, on all relations
      const { namespace, id } = input;
      if (namespace !== "Project") {
        throw new Error("Not implemented");
      }

      // At OSS we support only owner relation for the users
      const ownerRow = await prisma.project.findUnique({
        where: {
          id,
        },
        select: {
          userId: true,
        },
      });

      const tokenRows = await prisma.authorizationToken.findMany({
        where: {
          projectId: id,
        },
      });

      const leafSubjectSets = [];

      if (ownerRow !== null && ownerRow.userId !== null) {
        leafSubjectSets.push({
          namespace: "User",
          id: ownerRow.userId,
          relation: "owners",
        } as const);
      }

      for (const tokenRow of tokenRows) {
        leafSubjectSets.push({
          namespace: "Token",
          id: tokenRow.token,
          relation: tokenRow.relation,
        } as const);
      }

      return leafSubjectSets;
    }),

  /**
   * Check if subject has permit on the resource
   */
  check: procedure
    .input(
      z.object({
        namespace: z.enum(["Project"]),
        id: z.string(),

        permit: AuthPermit,

        subjectSet: z.object({
          namespace: z.enum(["User", "Token"]),
          id: z.string(),
        }),
      })
    )
    .output(z.object({ allowed: z.boolean() }))
    .query(async ({ input }) => {
      const { subjectSet } = input;

      if (subjectSet.namespace === "User") {
        // We check only if the user is the owner of the project
        const row = await prisma.project.findFirst({
          where: {
            id: input.id,
            userId: subjectSet.id,
          },
          select: {
            id: true,
          },
        });

        return { allowed: row !== null };
      }

      const permitToRelationRewrite = {
        view: ["viewers", "editors", "builders", "administrators"],
        edit: ["editors", "builders", "administrators"],
        build: ["builders", "administrators"],
        admin: ["administrators"],
      } as const;

      if (subjectSet.namespace === "Token" && input.permit !== "own") {
        const row = await prisma.authorizationToken.findFirst({
          where: {
            token: subjectSet.id,
            relation: {
              in: [...permitToRelationRewrite[input.permit]],
            },
          },
          select: { token: true },
        });

        return { allowed: row !== null };
      }

      return { allowed: false };
    }),
  /**
   * In OSS we extract owner relation from the Project table, and the rest from the authorizationToken table
   */
  create: procedure.input(DeleteCreateInput).mutation(async ({ input }) => {
    // Do nothing in OSS
  }),

  delete: procedure.input(DeleteCreateInput).mutation(async ({ input }) => {
    // Do nothing in OSS
  }),
  patch: procedure
    .input(
      z.array(
        z.object({
          action: z.enum(["insert", "delete"]),
          relationTuple: DeleteCreateInput,
        })
      )
    )
    .mutation(async ({ input }) => {
      // Do nothing in OSS
    }),
});
