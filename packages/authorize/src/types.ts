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

export const ProjectSubjectAcl = ProjectBase.extend({
  subject: z.string(),
});

export const ProjectSubjectSetAcl = ProjectBase.extend({
  subjectSet: ProjectSubjectSet,
});

export const ProjectAcl = z.union([ProjectSubjectAcl, ProjectSubjectSetAcl]);

export const UserAcl = z.object({
  namespace: z.literal("User"),
  object: z.string(),
  relation: z.enum(["email"]),
  subject: z.string(),
});

export const Acl = z.union([ProjectAcl, UserAcl]);
export type Acl = z.infer<typeof Acl>;
