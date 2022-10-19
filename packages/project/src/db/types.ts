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

const HomePage = z.object({
  ...commonPageFields,
  path: z
    .string()
    .refine((path) => path === "", "Home page path must be empty"),
});

const Page = z.object({
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

export type Page = z.infer<typeof Page>;

export const Pages: z.ZodType<{ homePage: Page; pages: Array<Page> }> =
  z.object({
    homePage: HomePage,
    pages: z
      .array(Page)
      .refine(
        (array) =>
          new Set(array.map((page) => page.path)).size === array.length,
        "All paths must be unique"
      ),
  });
export type Pages = z.infer<typeof Pages>;

export type Build = Omit<DbBuild, "pages"> & { pages: Pages };
