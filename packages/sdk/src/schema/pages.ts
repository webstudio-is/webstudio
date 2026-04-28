import { z } from "zod";

export type System = {
  params: Record<string, string | undefined>;
  search: Record<string, string | undefined>;
  pathname: string;
  origin: string;
};

const MIN_TITLE_LENGTH = 2;

export const PageId = z.string();
export const FolderId = z.string();

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

export const documentTypes = ["html", "xml"] as const;

const commonPageFields = {
  id: PageId,
  name: PageName,
  title: PageTitle,
  history: z.optional(z.array(z.string())),
  rootInstanceId: z.string(),
  systemDataSourceId: z.string().optional(),
  meta: z.object({
    description: z.string().optional(),
    title: z.string().optional(),
    excludePageFromSearch: z.string().optional(),
    language: z.string().optional(),
    socialImageAssetId: z.string().optional(),
    socialImageUrl: z.string().optional(),
    status: z.string().optional(),
    redirect: z.string().optional(),
    documentType: z.optional(z.enum(documentTypes)),
    custom: z
      .array(
        z.object({
          property: z.string(),
          content: z.string(),
        })
      )
      .optional(),
  }),
  marketplace: z.optional(
    z.object({
      include: z.optional(z.boolean()),
      category: z.optional(z.string()),
      thumbnailAssetId: z.optional(z.string()),
    })
  ),
} as const;

export const HomePagePath = z
  .string()
  .refine((path) => path === "", "Home page path must be empty");

const DefaultPagePage = z
  .string()
  .refine((path) => path !== "", "Can't be empty")
  .refine((path) => path !== "/", "Can't be just a /")
  .refine((path) => path.endsWith("/") === false, "Can't end with a /")
  .refine((path) => path.includes("//") === false, "Can't contain repeating /")
  .refine(
    (path) => /^[-_a-z0-9*:?\\/.]*$/.test(path),
    "Only a-z, 0-9, -, _, /, :, ?, . and * are allowed"
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
  )
  .refine((path) => path.length <= 255, "Path can't exceed 255 characters");

export const OldPagePath = z
  .string()
  .refine((path) => path !== "", "Can't be empty")
  .refine((path) => path !== "/", "Can't be just a /")
  .refine(
    (path) => path === "" || path.startsWith("/"),
    "Must start with a / or a full URL e.g. https://website.org"
  )
  .refine((path) => path.endsWith("/") === false, "Can't end with a /")
  .refine((path) => path.includes("//") === false, "Can't contain repeating /")
  .refine((path) => {
    // Disallow specific problematic characters that should never appear in paths:
    // - Spaces and whitespace
    // - URL-unsafe characters: < > " { } | \ ^ ` [ ]
    // - Control characters
    // All other characters (including non-Latin Unicode like Chinese, Japanese,
    // Korean, Cyrillic, Arabic, etc.) are allowed as they are valid in modern URLs
    // when properly encoded by the browser
    // eslint-disable-next-line no-control-regex
    const disallowedChars = /[\s<>"{}|\\^`[\]\u0000-\u001f\u007f]/;
    return !disallowedChars.test(path);
  }, "Path contains invalid characters (spaces or URL-unsafe characters are not allowed)")
  .refine(
    (path) => path !== "/s" && path.startsWith("/s/") === false,
    "/s prefix is reserved for the system"
  )
  .refine(
    (path) => path !== "/build" && path.startsWith("/build/") === false,
    "/build prefix is reserved for the system"
  );

export const PagePath = DefaultPagePage.refine(
  (path) => path === "" || path.startsWith("/"),
  "Must start with a / or a full URL e.g. https://website.org"
);

const Page = z.object({
  ...commonPageFields,
  path: z.union([HomePagePath, PagePath]),
});

const ProjectMeta = z.object({
  // All fields are optional to ensure consistency and allow for the addition of new fields without requiring migration
  siteName: z.string().optional(),
  contactEmail: z.string().optional(),
  faviconAssetId: z.string().optional(),
  code: z.string().optional(),
});
export type ProjectMeta = z.infer<typeof ProjectMeta>;

export const ProjectNewRedirectPath = z
  .string()
  .min(1, "Path is required")
  .refine((data) => {
    // Users should be able to redirect from any old-path to the home page in the new project.
    try {
      // can be relative and absolute paths
      new URL(data, "http://url.com");
      return true;
    } catch {
      return false;
    }
  }, "Must be a valid URL");

export const PageRedirect = z.object({
  old: OldPagePath,
  new: ProjectNewRedirectPath,
  status: z.enum(["301", "302"]).optional(),
});
export type PageRedirect = z.infer<typeof PageRedirect>;

export const CompilerSettings = z.object({
  // All fields are optional to ensure consistency and allow for the addition of new fields without requiring migration
  atomicStyles: z.boolean().optional(),
});
export type CompilerSettings = z.infer<typeof CompilerSettings>;

export type Page = z.infer<typeof Page>;

export const Pages = z
  .object({
    meta: ProjectMeta.optional(),
    compiler: CompilerSettings.optional(),
    redirects: z.array(PageRedirect).optional(),
    homePageId: PageId,
    rootFolderId: FolderId,
    pages: z.map(PageId, Page),
    folders: z
      .map(FolderId, Folder)
      .refine((folders) => folders.size > 0, "Folders can't be empty"),
  })
  .superRefine((pages, context) => {
    const homePage = pages.pages.get(pages.homePageId);
    const rootFolder = pages.folders.get(pages.rootFolderId);
    if (homePage === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["homePageId"],
        message: "Home page must reference an existing page",
      });
    }
    if (rootFolder === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rootFolderId"],
        message: "Root folder must reference an existing folder",
      });
    }
    if (homePage !== undefined && homePage.path !== "") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pages", pages.homePageId, "path"],
        message: "Home page path must be empty",
      });
    }
    for (const [pageId, page] of pages.pages) {
      if (page.id !== pageId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pages", pageId, "id"],
          message: "Page id must match its record key",
        });
      }
      if (pageId !== pages.homePageId && page.path === "") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pages", pageId, "path"],
          message: "Page path can't be empty",
        });
      }
    }
    for (const [folderId, folder] of pages.folders) {
      if (folder.id !== folderId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["folders", folderId, "id"],
          message: "Folder id must match its record key",
        });
      }
      for (const [index, childId] of folder.children.entries()) {
        if (
          pages.pages.has(childId) === false &&
          pages.folders.has(childId) === false
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["folders", folderId, "children", index],
            message: "Folder child must reference an existing page or folder",
          });
        }
        if (childId === pages.rootFolderId) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["folders", folderId, "children", index],
            message: "Root folder can't be nested",
          });
        }
      }
    }
    if (
      rootFolder !== undefined &&
      rootFolder.children[0] !== pages.homePageId
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["folders", pages.rootFolderId, "children"],
        message: "Root folder must start with the home page",
      });
    }

    const childParents = new Map<Page["id"] | Folder["id"], Folder["id"]>();
    for (const [folderId, folder] of pages.folders) {
      for (const [index, childId] of folder.children.entries()) {
        const parentId = childParents.get(childId);
        if (parentId !== undefined) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["folders", folderId, "children", index],
            message: `Child is already registered in folder "${parentId}"`,
          });
          continue;
        }
        childParents.set(childId, folderId);
      }
    }

    const hasFolderCycle = (
      folderId: Folder["id"],
      path = new Set<Folder["id"]>()
    ): boolean => {
      if (path.has(folderId)) {
        return true;
      }
      const folder = pages.folders.get(folderId);
      if (folder === undefined) {
        return false;
      }
      path.add(folderId);
      for (const childId of folder.children) {
        if (pages.folders.has(childId) && hasFolderCycle(childId, path)) {
          return true;
        }
      }
      path.delete(folderId);
      return false;
    };

    for (const folderId of pages.folders.keys()) {
      if (hasFolderCycle(folderId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["folders", folderId, "children"],
          message: "Folders can't contain cycles",
        });
      }
    }
  });

export type Pages = z.infer<typeof Pages>;
