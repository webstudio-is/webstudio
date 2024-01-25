import { z } from "zod";

const MIN_TITLE_LENGTH = 2;

const PageId = z.string();
const FolderId = z.string();

export const FolderName = z
  .string()
  .refine((value) => value.trim() !== "", "Can't be empty");

const Slug = z
  .string()
  .refine(
    (path) => /^[-a-z0-9]*$/.test(path),
    "Only a-z, 0-9 and - are allowed"
  );

export const Folder = z.object({
  id: FolderId,
  name: FolderName,
  slug: Slug,
  children: z.array(z.union([FolderId, PageId])),
});

export type Folder = z.infer<typeof Folder>;

export const PageName = z
  .string()
  .refine((value) => value.trim() !== "", "Can't be empty");

export const PageTitle = z
  .string()
  .refine(
    (val) => val.length >= MIN_TITLE_LENGTH,
    `Minimum ${MIN_TITLE_LENGTH} characters required`
  );

const commonPageFields = {
  id: PageId,
  name: PageName,
  title: PageTitle,
  meta: z.object({
    description: z.string().optional(),
    title: z.string().optional(),
    excludePageFromSearch: z.boolean().optional(),
    socialImageAssetId: z.string().optional(),
    custom: z
      .array(
        z.object({
          property: z.string(),
          content: z.string(),
        })
      )
      .optional(),
  }),
  rootInstanceId: z.string(),
  pathVariableId: z.optional(z.string()),
} as const;

export const HomePagePath = z
  .string()
  .refine((path) => path === "", "Home page path must be empty");

const HomePage = z.object({
  ...commonPageFields,
  path: HomePagePath,
});

export const PagePath = z
  .string()
  .refine((path) => path !== "", "Can't be empty")
  .refine((path) => path !== "/", "Can't be just a /")
  .refine((path) => path === "" || path.startsWith("/"), "Must start with a /")
  .refine((path) => path.endsWith("/") === false, "Can't end with a /")
  .refine((path) => path.includes("//") === false, "Can't contain repeating /")
  .refine(
    (path) => /^[-_a-z0-9*:?\\/]*$/.test(path),
    "Only a-z, 0-9, -, _, /, :, ? and * are allowed"
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
  path: PagePath,
});

const ProjectMeta = z.object({
  // All fields are optional to ensure consistency and allow for the addition of new fields without requiring migration
  siteName: z.string().optional(),
  faviconAssetId: z.string().optional(),
  code: z.string().optional(),
});

export const ProjectNewRedirectPathSchema = PagePath.or(
  z.string().refine((data) => {
    try {
      new URL(data);
      return true;
    } catch {
      return false;
    }
  }, "Must be a valid URL")
);

export const PageRedirectSchema = z.object({
  old: PagePath,
  new: ProjectNewRedirectPathSchema,
});

const ProjectSettings = z.object({
  // All fields are optional to ensure consistency and allow for the addition of new fields without requiring migration
  atomicStyles: z.boolean().optional(),
  redirects: z.array(PageRedirectSchema).optional(),
});

export type PageRedirect = z.infer<typeof PageRedirectSchema>;

export type ProjectMeta = z.infer<typeof ProjectMeta>;

export type Page = z.infer<typeof Page>;

export const Pages = z.object({
  meta: ProjectMeta.optional(),
  settings: ProjectSettings.optional(),
  homePage: HomePage,
  pages: z
    .array(Page)
    .refine(
      (array) => new Set(array.map((page) => page.path)).size === array.length,
      "All paths must be unique"
    ),
  folders: z
    .array(Folder)
    .refine((folders) => folders.length > 0, "Folders can't be empty"),
});

export type Pages = z.infer<typeof Pages>;
