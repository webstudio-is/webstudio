// import { prisma } from "@webstudio-is/prisma-client";
// import { z } from "zod";

export { createRelation } from "./db/create";
export { checkRelation } from "./db/check";
export { deleteRelation } from "./db/delete";
export { queryRelation } from "./db/query";

// Api similar to this https://www.ory.sh/docs/keto/reference/rest-api
/*
export const deleteRelation = async (relation: Acl) => {
  const where = AclIn.parse(relation);

  await prisma.acl.deleteMany({
    where: where,
  });
};

export const queryRelation = async (relation: Acl): Promise<Acl[]> => {
  const where = AclIn.parse(relation);

  const relations = await prisma.acl.findMany({
    where,
  });

  return AclOutArray.parse(relations);
};

// Read API
*/
