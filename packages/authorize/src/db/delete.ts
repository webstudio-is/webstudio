import { prisma } from "@webstudio-is/prisma-client";
import { AclQuery, AclQueryIn } from "./query";

export const deleteRelation = async (relation: AclQuery) => {
  const where = AclQueryIn.parse(relation);

  await prisma.acl.deleteMany({ where });
};
