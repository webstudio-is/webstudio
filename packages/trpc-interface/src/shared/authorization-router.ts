import { z } from "zod";
import { router, procedure } from "./trpc";

import { prisma } from "@webstudio-is/prisma-client";

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
          relation: z.enum(["owner", "editors", "viewers"]),
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

      const tokenRows = await prisma.authorizationTokens.findMany({
        where: {
          projectId: id,
        },
      });

      const leafSubjectSets = [];

      if (ownerRow !== null && ownerRow.userId !== null) {
        leafSubjectSets.push({
          namespace: "User",
          id: ownerRow.userId,
          relation: "owner",
        } as const);
      }

      for (const tokenRow of tokenRows) {
        leafSubjectSets.push({
          namespace: "Token",
          id: tokenRow.token,
          relation: tokenRow.permit === "EDIT" ? "editors" : "viewers",
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

        permit: z.enum(["view", "edit", "own"]),

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

      if (subjectSet.namespace === "Token" && input.permit !== "own") {
        const row = await prisma.authorizationTokens.findFirst({
          where: {
            token: subjectSet.id,
            permit: {
              // Token with EDIT permit can also VIEW
              in: input.permit === "view" ? ["VIEW", "EDIT"] : ["VIEW"],
            },
          },
          select: { id: true },
        });

        return { allowed: row !== null };
      }

      return { allowed: false };
    }),
  /**
   * In OSS we extract owner relation from the Project table, and the rest from the authorizationTokens table
   */
  create: procedure
    .input(
      z.discriminatedUnion("namespace", [
        z.object({
          namespace: z.literal("Project"),
          id: z.string(),
          relation: z.enum(["viewers", "editors", "owner"]),

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
              relation: z.literal("owner"),
            }),
          ]),
        }),

        z.object({
          namespace: z.literal("Email"),
          id: z.string(),
          relation: z.enum(["owner"]),
          subjectSet: z.object({
            namespace: z.literal("User"),
            id: z.string(),
          }),
        }),
      ])
    )
    .mutation(async ({ input }) => {
      const { namespace, id, relation, subjectSet } = input;
      if (namespace === "Project") {
        if (subjectSet.namespace === "Token") {
          if (relation === "owner") {
            throw new Error("Token relation owner is prohibited");
          }

          await prisma.authorizationTokens.create({
            data: {
              projectId: id,
              token: subjectSet.id,
              permit: relation === "viewers" ? "VIEW" : "EDIT",
            },
          });
        }
      }
    }),

  delete: procedure
    .input(
      z.discriminatedUnion("namespace", [
        z.object({
          namespace: z.literal("Project"),
          id: z.string(),
          relation: z.enum(["viewers", "editors", "owner"]),

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
              relation: z.literal("owner"),
            }),
          ]),
        }),

        z.object({
          namespace: z.literal("Email"),
          id: z.string(),
          relation: z.enum(["owner"]),
          subjectSet: z.object({
            namespace: z.literal("User"),
            id: z.string(),
          }),
        }),
      ])
    )
    .mutation(async ({ input }) => {
      const { namespace, id, relation, subjectSet } = input;
      if (namespace === "Project") {
        if (subjectSet.namespace === "Token") {
          if (relation === "owner") {
            throw new Error("Token relation owner is prohibited");
          }

          await prisma.authorizationTokens.deleteMany({
            where: {
              projectId: id,
              token: subjectSet.id,
              permit: relation === "viewers" ? "VIEW" : "EDIT",
            },
          });
        }
      }
    }),
});
