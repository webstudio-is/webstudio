import { z } from "zod";
import {
  Project as BaseProject,
  Build as DbBuild,
} from "@webstudio-is/prisma-client";
import type { Asset } from "@webstudio-is/asset-uploader";

export type Project = Omit<BaseProject, "assets"> & {
  assets?: Array<Asset>;
};

const commonPageFields = {
  id: z.string(),
  name: z.string().refine((val) => val !== "", "Can't be empty"),
  title: z.string(),
  meta: z.record(z.string(), z.string()),
  treeId: z.string(),
} as const;

const HomePageSchema = z.object({
  ...commonPageFields,
  path: z
    .string()
    .refine((path) => path === "", "Home page path must be empty"),
});

const PageSchema = z.object({
  ...commonPageFields,
  path: z
    .string()
    .refine((path) => path !== "" && path !== "/", "Can't be empty")
    .refine((path) => path.startsWith("/"), "Must start with a /")
    .refine((path) => path.endsWith("/") === false, "Can't end with a /")
    .refine(
      (path) => path.includes("//") === false,
      "Can't contain repeating /"
    )
    .refine(
      (path) => /^[-_a-z0-9\\/]*$/.test(path),
      "Only a-z, 0-9, -, _ and / are allowed"
    ),
});

export type Page = z.infer<typeof PageSchema>;

export const PagesSchema: z.ZodType<{ homePage: Page; pages: Array<Page> }> =
  z.object({
    homePage: HomePageSchema,
    pages: z
      .array(PageSchema)
      .refine(
        (array) =>
          new Set(array.map((page) => page.path)).size === array.length,
        "All paths must be unique"
      ),
  });
export type Pages = z.infer<typeof PagesSchema>;

export type Build = Omit<DbBuild, "pages"> & { pages: Pages };
