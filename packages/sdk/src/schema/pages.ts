import { z } from "zod";
import { validateBasicAuth } from "@webstudio-is/wsauth";

export type System = {
  params: Record<string, string | undefined>;
  search: Record<string, string | undefined>;
  pathname: string;
  origin: string;
};

const MIN_TITLE_LENGTH = 2;

export const pageId = z.string();
export const folderId = z.string();

export const folderName = z
  .string()
  .refine((value) => value.trim() !== "", "Can't be empty");

const slug = z
  .string()
  .refine(
    (path) => /^[-a-z0-9]*$/.test(path),
    "Only a-z, 0-9 and - are allowed"
  );

export const folder = z.object({
  id: folderId,
  name: folderName,
  slug: slug,
  children: z.array(z.union([folderId, pageId])),
});

export type Folder = z.infer<typeof folder>;

export const pageName = z
  .string()
  .refine((value) => value.trim() !== "", "Can't be empty");

export const pageTitle = z
  .string()
  .refine(
    (val) => val.length >= MIN_TITLE_LENGTH,
    `Minimum ${MIN_TITLE_LENGTH} characters required`
  );

export const documentTypes = ["html", "xml", "text"] as const;

const basicAuthFields = {
  login: z.string(),
  password: z.string(),
};

const validateBasicAuthFields = (
  {
    login,
    password,
  }: {
    login: string;
    password: string;
  },
  context: z.RefinementCtx
) => {
  for (const issue of validateBasicAuth({ login, password }).issues ?? []) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: issue.path,
      message: issue.message,
    });
  }
};

const pageBasicAuth = z
  .object({
    method: z.literal("basic"),
    ...basicAuthFields,
  })
  .superRefine(validateBasicAuthFields);

const legacyPageBasicAuth = z
  .object({
    type: z.literal("basic"),
    ...basicAuthFields,
  })
  .superRefine(validateBasicAuthFields)
  .transform(({ login, password }) => ({
    method: "basic" as const,
    login,
    password,
  }));

export const pageAuth = z.union([pageBasicAuth, legacyPageBasicAuth]);
export type PageAuth = z.infer<typeof pageAuth>;

const commonPageFields = {
  id: pageId,
  name: pageName,
  title: pageTitle,
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
    content: z.string().optional(),
    auth: pageAuth.optional(),
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

export const homePagePath = z
  .string()
  .refine((path) => path === "", "Home page path must be empty");

const defaultPagePath = z
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

export const redirectSourcePath = z
  .string()
  .refine((path) => path !== "", "Can't be empty")
  .refine((path) => path !== "/", "Can't be just a /")
  .refine(
    (path) => path.startsWith("/") && path.startsWith("//") === false,
    "Must start with a /"
  )
  .refine((path) => {
    // Redirect sources may contain any browser-requestable URL characters.
    // Backslashes and control characters are rejected because URL parsers
    // normalize or strip them, making matching ambiguous.
    // eslint-disable-next-line no-control-regex
    if (/[\\\u0000-\u001f\u007f]/.test(path)) {
      return false;
    }

    try {
      new URL(path, "https://example.com");
      return true;
    } catch {
      return false;
    }
  }, "Must be a valid URL path")
  .refine(
    (path) => path !== "/s" && path.startsWith("/s/") === false,
    "/s prefix is reserved for the system"
  )
  .refine(
    (path) => path !== "/build" && path.startsWith("/build/") === false,
    "/build prefix is reserved for the system"
  );

export const pagePath = defaultPagePath.refine(
  (path) => path === "" || path.startsWith("/"),
  "Must start with a / or a full URL e.g. https://website.org"
);

export const page = z.object({
  ...commonPageFields,
  path: z.union([homePagePath, pagePath]),
  isDraft: z.boolean().optional(),
});

export const pageTemplate = z.object({
  id: pageId,
  name: pageName,
  title: pageTitle,
  rootInstanceId: z.string(),
  systemDataSourceId: z.string().optional(),
  meta: commonPageFields.meta,
});

export type PageTemplate = z.infer<typeof pageTemplate>;

export const projectMeta = z.object({
  // All fields are optional to ensure consistency and allow for the addition of new fields without requiring migration
  siteName: z.string().optional(),
  contactEmail: z.string().optional(),
  faviconAssetId: z.string().optional(),
  code: z.string().optional(),
  agentInstructions: z.string().optional(),
  auth: z.string().optional(),
});
export type ProjectMeta = z.infer<typeof projectMeta>;

export const projectNewRedirectPath = z
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

export const pageRedirect = z.object({
  old: redirectSourcePath,
  new: projectNewRedirectPath,
  status: z.enum(["301", "302"]).optional(),
});
export type PageRedirect = z.infer<typeof pageRedirect>;

export const compilerSettings = z.object({
  // All fields are optional to ensure consistency and allow for the addition of new fields without requiring migration
  atomicStyles: z.boolean().optional(),
});
export type CompilerSettings = z.infer<typeof compilerSettings>;

export type Page = z.infer<typeof page>;

export const isPageDraft = (page: Pick<Page, "isDraft">) =>
  page.isDraft === true;

export const getPageDraftabilityError = ({
  pageId,
  pagePath,
  homePageId,
}: {
  pageId: Page["id"];
  pagePath: Page["path"];
  homePageId: Page["id"];
}) => {
  if (pageId === homePageId) {
    return "Home page can't be draft";
  }
  if (pagePath === "/*") {
    return "Catch-all 404 page can't be draft";
  }
};

export const pages = z
  .object({
    meta: projectMeta.optional(),
    compiler: compilerSettings.optional(),
    redirects: z.array(pageRedirect).optional(),
    homePageId: pageId,
    rootFolderId: folderId,
    pages: z.map(pageId, page),
    pageTemplates: z.map(pageId, pageTemplate).optional(),
    folders: z
      .map(folderId, folder)
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
      const draftabilityError = getPageDraftabilityError({
        pageId,
        pagePath: page.path,
        homePageId: pages.homePageId,
      });
      if (isPageDraft(page) && draftabilityError !== undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pages", pageId, "isDraft"],
          message: draftabilityError,
        });
      }
    }
    for (const [templateId, template] of pages.pageTemplates ?? []) {
      if (template.id !== templateId) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pageTemplates", templateId, "id"],
          message: "Page template id must match its record key",
        });
      }
      if (pages.pages.has(templateId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["pageTemplates", templateId, "id"],
          message: "Page template id must not match an existing page id",
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

export type Pages = z.infer<typeof pages>;
