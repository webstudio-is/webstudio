import { prisma } from "@webstudio-is/prisma-client";
import { Acl } from "../types";
import { z } from "zod";

const AclIn = Acl.transform((relation) => {
  if ("subjectSet" in relation) {
    return {
      namespace: relation.namespace,
      object: relation.object,
      relation: relation.relation,
      subject: null,
      subjectSetNamespace: relation.subjectSet.namespace,
      subjectSetObject: relation.subjectSet.object,
      subjectSetRelation: relation.subjectSet.relation,
    };
  }

  return {
    namespace: relation.namespace,
    object: relation.object,
    relation: relation.relation,
    subject: relation.subject,
  };
});

export const AclOut = z
  .object({
    id: z.string(),
    namespace: z.string(),
    object: z.string(),
    relation: z.string(),
    subject: z.string().nullable(),
    subjectSetNamespace: z.string().nullable(),
    subjectSetObject: z.string().nullable(),
    subjectSetRelation: z.string().nullable(),
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

export const createRelation = async (relation: Acl): Promise<Acl> => {
  const data = AclIn.parse(relation);

  const res = await prisma.acl.create({
    data,
  });

  return AclOut.parse(res);
};
