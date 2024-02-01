import { z } from "zod";

const MIN_TITLE_LENGTH = 2;

export const Title = z
  .string()
  .refine(
    (val) => val.length >= MIN_TITLE_LENGTH,
    `Minimum ${MIN_TITLE_LENGTH} characters required`
  );

export const Project = z.object({
  id: z.string(),
  title: Title,
  createdAt: z.date().transform((date) => date.toISOString()),
  userId: z.string().nullable(),
  isDeleted: z.boolean(),
  domain: z.string(),
  previewImageAsset: z
    .object({
      id: z.string(),
      name: z.string(),
    })
    .nullable(),
  latestBuild: z.optional(
    z
      .object({
        buildId: z.string(),
        isLatestBuild: z.boolean(),
        publishStatus: z.enum(["PENDING", "PUBLISHED", "FAILED"]),
        updatedAt: z.date().transform((date) => date.toISOString()),
      })
      .nullable()
  ),
});
export type Project = z.infer<typeof Project>;

export const Projects = z.array(Project);
export type Projects = z.infer<typeof Projects>;
