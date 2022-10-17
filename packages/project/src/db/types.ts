import { z } from "zod";
import {
  Project as BaseProject,
  Build as DbBuild,
} from "@webstudio-is/prisma-client";
import type { Asset } from "@webstudio-is/asset-uploader";

export type Project = Omit<BaseProject, "assets"> & {
  assets?: Array<Asset>;
};

const Page = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  title: z.string(),
  meta: z.record(z.string(), z.string()),
  treeId: z.string(),
});

export type Page = z.infer<typeof Page>;

export const Pages: z.ZodType<{ homePage: Page; pages: Array<Page> }> =
  z.object({
    homePage: Page,
    pages: z.array(Page),
  });
export type Pages = z.infer<typeof Pages>;

export type Build = Omit<DbBuild, "pages"> & { pages: Pages };
