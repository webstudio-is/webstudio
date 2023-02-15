import { z } from "zod";
import type { Data } from "@webstudio-is/react-sdk";
import type { Build, Page } from "@webstudio-is/project-build";

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
});
export type Project = z.infer<typeof Project>;

export const Projects = z.array(Project);
export type Projects = z.infer<typeof Projects>;

export type CanvasData = Data & {
  build: null | Build;
  buildId: Build["id"];
  page: Page;
};
