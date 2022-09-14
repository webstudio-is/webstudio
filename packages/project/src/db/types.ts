import { z } from "zod";
import {
  Project as BaseProject,
  Build as DbBuild,
} from "@webstudio-is/prisma-client";
import type { Asset } from "@webstudio-is/asset-uploader";

// Project
export type Project = Omit<BaseProject, "assets" | "devBuild"> & {
  assets?: Array<Asset>;
  devBuild?: Build;
};

// Build
const PageSchema = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  title: z.string(),
  meta: z.record(z.string(), z.string()),
  treeId: z.string(),
});

export type Page = z.infer<typeof PageSchema>;

export const PagesSchema: z.ZodType<{ homePage: Page; pages: Array<Page> }> =
  z.object({
    homePage: PageSchema,
    pages: z.array(PageSchema),
  });
export type Pages = z.infer<typeof PagesSchema>;

export type Build = Omit<DbBuild, "pages"> & { pages: Pages };
