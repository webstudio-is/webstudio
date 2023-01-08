import { prisma, Prisma } from "@webstudio-is/prisma-client";
import { z } from "zod";
import { Acl } from "../types";

export const AclQuery = z.object({
  namespace: z.union([z.literal("Project"), z.literal("User")]),
  object: z.optional(z.string()),
  relation: z.optional(z.string()),
  subject: z.optional(z.string()),
  subjectSet: z.optional(
    z.object({
      namespace: z.optional(z.literal("User")),
      object: z.optional(z.string()),
      relation: z.optional(z.enum(["email"])),
    })
  ),
});

export type AclQuery = z.infer<typeof AclQuery>;

export const AclQueryIn = AclQuery.transform((relation) => {
  return {
    namespace: relation.namespace,
    object: relation.object,
    relation: relation.relation,
    subject: "subject" in relation ? relation.subject : undefined,
    subjectSetNamespace:
      "subjectSet" in relation ? relation.subjectSet?.namespace : undefined,
    subjectSetObject:
      "subjectSet" in relation ? relation.subjectSet?.object : undefined,
    subjectSetRelation:
      "subjectSet" in relation ? relation.subjectSet?.relation : undefined,
  };
});

const AclOut = z
  .object({
    id: z.string(),
    namespace: z.string(),
    object: z.string(),
    relation: z.string(),
    subject: z.string().nullable(),
    subjectSetNamespace: z.optional(z.string().nullable()),
    subjectSetObject: z.optional(z.string().nullable()),
    subjectSetRelation: z.optional(z.string().nullable()),
  })
  .transform((relation) => {
    const unparsedRelation = {
      namespace: relation.namespace,
      object: relation.object,
      relation: relation.relation,
      subject: relation.subject,
      subjectSet:
        relation.subjectSetNamespace != null
          ? {
              namespace: relation.subjectSetNamespace,
              object: relation.subjectSetObject,
              relation: relation.subjectSetRelation,
            }
          : undefined,
    };

    return Acl.parse(unparsedRelation);
  });

const QueryOut = z.array(AclOut);

export const queryRelation = async (relation: AclQuery, expand = true) => {
  const where = AclQueryIn.parse(relation);

  if (expand === false) {
    const res = await prisma.acl.findMany({ where });

    return QueryOut.parse(res);
  }

  const res = await prisma.$queryRaw`
    SELECT
      *
    FROM
      "AclExpand"
    WHERE
      ${Prisma.join(
        [
          where.object !== undefined
            ? Prisma.sql`object = ${where.object}`
            : undefined,
          where.relation !== undefined
            ? Prisma.sql`relation = ${where.relation}`
            : undefined,
          where.subject !== undefined
            ? Prisma.sql`subject = ${where.subject}`
            : undefined,
        ].filter(Boolean),
        " AND "
      )}
  `;

  return QueryOut.parse(res);
};
