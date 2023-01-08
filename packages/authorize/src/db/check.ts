import { prisma } from "@webstudio-is/prisma-client";
import { ProjectSubjectAcl, UserAcl } from "../types";
import { z } from "zod";

const AclCheck = z.union([ProjectSubjectAcl, UserAcl]);
const ExistsResult = z.array(z.object({ exists: z.boolean() })).length(1);
type AclCheck = z.infer<typeof AclCheck>;

export const checkRelation = async (relation: AclCheck) => {
  const dbData = AclCheck.parse(relation);
  // Check expand relation
  const prismaRawResult = await prisma.$queryRaw`
    SELECT
    EXISTS (
      SELECT
        1
      FROM
        "AclExpandRewrites"
      WHERE
        object = ${dbData.object}
        AND relation = ${dbData.relation}
        AND subject = ${dbData.subject});
  `;

  const result = ExistsResult.parse(prismaRawResult);
  return result[0].exists;
};
