import { prisma } from "@webstudio-is/prisma-client";
import { z } from "zod";

const ProjectSubjectSet = z.object({
  namespace: z.literal("User"),
  object: z.string(),
  relation: z.enum(["email"]),
});

const ProjectBase = z.object({
  namespace: z.literal("Project"),
  object: z.string(),
  relation: z.enum(["reader", "writer", "owner"]),
});

const ProjectSubjectRelation = ProjectBase.extend({
  subject: z.string(),
});

const ProjectRelation = z.union([
  ProjectSubjectRelation,
  ProjectBase.extend({
    subjectSet: ProjectSubjectSet,
  }).transform(({ namespace, object, relation, subjectSet }) => ({
    namespace,
    object,
    relation,
    subject: null,
    subjectSetNamespace: subjectSet.namespace,
    subjectSetObject: subjectSet.object,
    subjectSetRelation: subjectSet.relation,
  })),
]);

const UserRelation = z.object({
  namespace: z.literal("User"),
  object: z.string(),
  relation: z.enum(["email"]),
  subject: z.string(),
});

const Relation = z.union([ProjectRelation, UserRelation]);

type Relation = z.input<typeof Relation>;

// Api similar to this https://www.ory.sh/docs/keto/reference/rest-api

// Write API

// Create a Relation
export const createAuthRelation = async (relation: Relation) => {
  const dbData = Relation.parse(relation);

  await prisma.auth.create({
    data: dbData,
  });
};

export const deleteAuthRelation = async (relation: Relation) => {
  const dbData = Relation.parse(relation);

  // find relations ad delete them
  await prisma.auth.deleteMany({
    where: dbData,
  });
};

// Read API
const ExistsResult = z.array(z.object({ exists: z.boolean() })).length(1);

export const checkAuthRelation = async (relation: Relation) => {
  const dbData = Relation.parse(relation);
  // In case of SubjectSet in relation. Just check table without expanding
  if (
    "subjectSetNamespace" in dbData &&
    dbData.subjectSetNamespace !== undefined
  ) {
    const result = await prisma.auth.findFirst({
      where: dbData,
    });
    return result !== null;
  }

  // Check expand relation
  const prismaRawResult = await prisma.$queryRaw`
    SELECT
    EXISTS (
      SELECT
        1
      FROM
        "AuthApplyRewrites"
      WHERE
        object = ${dbData.object}
        AND relation = ${dbData.relation}
        AND subject = ${dbData.subject});
  `;

  const result = ExistsResult.parse(prismaRawResult);
  return result[0].exists;
};

// @todo delete this
// pnpm tsx ./packages/authorize/src/index.server.ts
const test = async () => {
  const x = await checkAuthRelation({
    namespace: "Project",
    object: "Project Alice",
    relation: "reader",
    subject: "Alice",
  });

  // eslint-disable-next-line no-console
  console.info(x);
};

test();
