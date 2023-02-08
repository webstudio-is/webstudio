import { z, type ZodType } from "zod";
import type { Breakpoints } from "@webstudio-is/css-data";
import type { Styles, StyleSource } from "@webstudio-is/project-build";
import type { Data } from "@webstudio-is/react-sdk";

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

const commonPageFields = {
  id: z.string(),
  name: z.string().refine((val) => val !== "", "Can't be empty"),
  title: Title,
  meta: z.record(z.string(), z.string()),
  treeId: z.string(),
} as const;

const HomePage = z.object({
  ...commonPageFields,
  path: z
    .string()
    .refine((path) => path === "", "Home page path must be empty"),
});

export const pathValidators = (
  baseValidator: ZodType<string>
): ZodType<string> =>
  baseValidator
    .refine((path) => path !== "", "Can't be empty")
    .refine((path) => path !== "/", "Can't be just a /")
    .refine(
      (path) => path === "" || path.startsWith("/"),
      "Must start with a /"
    )
    .refine((path) => path.endsWith("/") === false, "Can't end with a /")
    .refine(
      (path) => path.includes("//") === false,
      "Can't contain repeating /"
    )
    .refine(
      (path) => /^[-_a-z0-9\\/]*$/.test(path),
      "Only a-z, 0-9, -, _ and / are allowed"
    )
    .refine(
      // We use /s for our system stuff like /s/css or /s/uploads
      (path) => path !== "/s" && path.startsWith("/s/") === false,
      "/s prefix is reserved for the system"
    )
    .refine(
      // Remix serves build artefacts like JS bundles from /build
      // And we cannot customize it due to bug in Remix: https://github.com/remix-run/remix/issues/2933
      (path) => path !== "/build" && path.startsWith("/build/") === false,
      "/build prefix is reserved for the system"
    );

const Page = z.object({
  ...commonPageFields,
  path: pathValidators(z.string()),
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

export type Build = {
  id: string;
  projectId: string;
  createdAt: string;
  isDev: boolean;
  isProd: boolean;
  pages: Pages;
  breakpoints: Breakpoints;
  styles: Styles;
  styleSources: [StyleSource["id"], StyleSource][];
};

export type CanvasData = Data & {
  build: null | Build;
  buildId: Build["id"];
  page: Page;
};
