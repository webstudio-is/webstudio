import {
  elementComponent,
  findParentFolderByChildId,
  getAllPages,
  getPagePath,
  type Folder,
  type Page,
  pageAuth,
  type PageAuth,
  type Pages,
} from "@webstudio-is/sdk";
import { serializePages } from "@webstudio-is/project-migrations/pages";
import { z } from "zod";
import {
  compactBuilderPatchPayload,
  type BuilderPatchChange,
} from "../contracts/patch";
import type { BuilderState } from "../state/builder-state";
import type { BuilderRuntimeContext } from "./context";
import { throwBuilderRuntimeError } from "./errors";
import { getNamedExpressionErrors } from "./expression-validation";
import {
  collectExclusiveInstanceIds,
  createInstanceCleanupPayload,
} from "./instances";
import { createRuntimeMutation } from "./mutation";

type SerializedPages = ReturnType<typeof serializePages>;
type SerializedPage = SerializedPages["pages"][number];

export type SerializedPageSummary = {
  id: Page["id"];
  name: Page["name"];
  path: string;
  localPath: Page["path"];
  title: Page["title"];
  rootInstanceId: Page["rootInstanceId"];
  parentFolderId: Folder["id"] | undefined;
  isHome: boolean;
};

export type SerializedPageDetails = SerializedPageSummary & {
  meta: {
    description: Page["meta"]["description"];
    language: Page["meta"]["language"];
    redirect: Page["meta"]["redirect"];
    status: Page["meta"]["status"];
    socialImageUrl: Page["meta"]["socialImageUrl"];
    socialImageAssetId: Page["meta"]["socialImageAssetId"];
    excludePageFromSearch: boolean | undefined;
    documentType: NonNullable<Page["meta"]["documentType"]>;
    content: Page["meta"]["content"];
    auth: Page["meta"]["auth"];
    custom: Page["meta"]["custom"];
  };
};

export const getRequiredPages = (state: Pick<BuilderState, "pages">): Pages => {
  if (state.pages === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Pages namespace is missing"
    );
  }
  return state.pages;
};

export const findPage = (pages: Pick<Pages, "pages">, pageId: Page["id"]) =>
  pages.pages.get(pageId);

export const findFolder = (
  pages: Pick<Pages, "folders">,
  folderId: Folder["id"]
) => pages.folders.get(folderId);

export const getSerializedPages = (
  state: Pick<BuilderState, "pages">
): SerializedPages => serializePages(getRequiredPages(state));

export const findParentFolderId = (
  folders: SerializedPages["folders"],
  childId: Page["id"] | Folder["id"]
) => {
  const map = new Map(folders.map((folder) => [folder.id, folder]));
  for (const folder of map.values()) {
    if (folder.children.includes(childId)) {
      return folder.id;
    }
  }
};

const joinPath = (...parts: string[]) => parts.join("").replace(/\/+/g, "/");

const getSerializedFolderPath = (
  pages: SerializedPages,
  folderId: Folder["id"] | undefined
): string => {
  if (folderId === undefined || folderId === pages.rootFolderId) {
    return "";
  }
  const folder = pages.folders.find((folder) => folder.id === folderId);
  if (folder === undefined) {
    return "";
  }
  return joinPath(
    getSerializedFolderPath(pages, findParentFolderId(pages.folders, folderId)),
    `/${folder.slug}`
  );
};

export const getSerializedPagePath = (
  pages: SerializedPages,
  page: SerializedPage
) =>
  joinPath(
    getSerializedFolderPath(pages, findParentFolderId(pages.folders, page.id)),
    page.path
  );

export const normalizeSerializedPagePath = (path: string) =>
  path === "/" ? "" : path;

export const serializePageSummary = (
  pages: SerializedPages,
  page: SerializedPage
): SerializedPageSummary => ({
  id: page.id,
  name: page.name,
  path: getSerializedPagePath(pages, page),
  localPath: page.path,
  title: page.title,
  rootInstanceId: page.rootInstanceId,
  parentFolderId: findParentFolderId(pages.folders, page.id),
  isHome: page.id === pages.homePageId,
});

export const serializePageDetails = (
  pages: SerializedPages,
  page: SerializedPage
): SerializedPageDetails => ({
  ...serializePageSummary(pages, page),
  meta: {
    description: page.meta.description,
    language: page.meta.language,
    redirect: page.meta.redirect,
    status: page.meta.status,
    socialImageUrl: page.meta.socialImageUrl,
    socialImageAssetId: page.meta.socialImageAssetId,
    excludePageFromSearch:
      page.meta.excludePageFromSearch === undefined
        ? undefined
        : page.meta.excludePageFromSearch === "true",
    documentType: page.meta.documentType ?? "html",
    content: page.meta.content,
    auth: page.meta.auth,
    custom: page.meta.custom,
  },
});

export const findSerializedPageByInput = (
  pages: SerializedPages,
  input: { pageId?: string; pagePath?: string }
) => {
  if (input.pageId !== undefined) {
    return pages.pages.find((page) => page.id === input.pageId);
  }
  if (input.pagePath !== undefined) {
    const pagePath = normalizeSerializedPagePath(input.pagePath);
    return pages.pages.find(
      (page) => getSerializedPagePath(pages, page) === pagePath
    );
  }
};

export const serializePageDetailsByInput = (
  state: Pick<BuilderState, "pages">,
  input: { pageId?: string; pagePath?: string }
) => {
  const pages = getSerializedPages(state);
  const page = findSerializedPageByInput(pages, input);
  return page === undefined ? undefined : serializePageDetails(pages, page);
};

export const getHomePageRootInstanceId = (pages: Pages) =>
  pages.pages.get(pages.homePageId)?.rootInstanceId;

export const listPages = (
  state: Pick<BuilderState, "pages">,
  input: { includeFolders?: boolean } = {}
) => {
  const pages = getSerializedPages(state);
  return {
    pages: pages.pages.map((page) => serializePageSummary(pages, page)),
    folders: input.includeFolders === true ? pages.folders : undefined,
  };
};

export const getPage = (
  state: Pick<BuilderState, "pages">,
  input: { pageId: string }
) => {
  const page = serializePageDetailsByInput(state, input);
  if (page === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Page not found");
  }
  return page;
};

export const getPageByPath = (
  state: Pick<BuilderState, "pages">,
  input: { path: string }
) => {
  const page = serializePageDetailsByInput(state, {
    pagePath: input.path,
  });
  if (page === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Page not found");
  }
  return page;
};

export const listFolders = (
  state: Pick<BuilderState, "pages">,
  input: { includePages?: boolean } = {}
) => {
  const pages = getSerializedPages(state);
  return {
    folders: pages.folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      slug: folder.slug,
      parentFolderId: findParentFolderId(pages.folders, folder.id),
      children: folder.children,
    })),
    pages:
      input.includePages === true
        ? pages.pages.map((page) => serializePageSummary(pages, page))
        : undefined,
  };
};

export const isSlugAvailable = (
  slug: string,
  folders: Pages["folders"],
  parentFolderId: Folder["id"],
  folderId?: Folder["id"]
) => {
  if (slug === "") {
    return true;
  }
  const parentFolder = folders.get(parentFolderId);
  if (parentFolder === undefined) {
    return false;
  }

  return (
    parentFolder.children.some(
      (id) => folders.get(id)?.slug === slug && id !== folderId
    ) === false
  );
};

export const isPathAvailable = ({
  pages,
  path,
  parentFolderId,
  pageId,
}: {
  pages: Pages;
  path: Page["path"];
  parentFolderId: Folder["id"];
  pageId?: Page["id"];
}) => {
  const map = new Map<Page["path"], Page>();
  for (const page of getAllPages(pages)) {
    map.set(getPagePath(page.id, pages), page);
  }
  const folderPath = getPagePath(parentFolderId, pages);
  const pagePath = folderPath === "/" ? path : `${folderPath}${path}`;
  const existingPage = map.get(pagePath);
  if (pageId && existingPage?.id === pageId) {
    return true;
  }
  return existingPage === undefined;
};

export const getAllChildrenAndSelf = (
  id: Folder["id"] | Page["id"],
  folders: Pages["folders"],
  filter: "folder" | "page"
) => {
  const child = folders.get(id);
  const children: Array<Folder["id"] | Page["id"]> = [];
  const type = child === undefined ? "page" : "folder";

  if (type === filter) {
    children.push(id);
  }

  if (child) {
    for (const childId of child.children) {
      children.push(...getAllChildrenAndSelf(childId, folders, filter));
    }
  }
  return children;
};

export const getFolderDeletionTargets = (
  folderId: Folder["id"],
  pages: Pages
) => {
  const folder = pages.folders.get(folderId);
  if (folder === undefined || folder.id === pages.rootFolderId) {
    return {
      folderIds: [],
      pageIds: [],
    };
  }
  const folderIds = getAllChildrenAndSelf(folderId, pages.folders, "folder");
  const pageIds = getAllChildrenAndSelf(folderId, pages.folders, "page");
  if (pageIds.includes(pages.homePageId)) {
    return {
      folderIds: [],
      pageIds: [],
    };
  }
  return {
    folderIds,
    pageIds,
  };
};

export const getParentFolderId = (
  folders: Pages["folders"],
  childId: Page["id"] | Folder["id"]
) => findParentFolderByChildId(childId, folders)?.id;

export const createFolderValue = ({
  folderId,
  name,
  slug,
}: {
  folderId: Folder["id"];
  name: Folder["name"];
  slug: Folder["slug"];
}): Folder => ({
  id: folderId,
  name,
  slug,
  children: [],
});

export const createFolderCreatePayload = ({
  folder,
  parentFolderId,
  parentChildIndex,
}: {
  folder: Folder;
  parentFolderId: Folder["id"];
  parentChildIndex: number;
}): BuilderPatchChange[] => [
  {
    namespace: "pages",
    patches: [
      {
        op: "add",
        path: ["folders", folder.id],
        value: folder,
      },
      {
        op: "add",
        path: ["folders", parentFolderId, "children", parentChildIndex],
        value: folder.id,
      },
    ],
  },
];

export const getFolderChildReparentPlan = (
  folders: Pages["folders"],
  childId: Page["id"] | Folder["id"],
  nextFolderId: Folder["id"],
  nextPosition?: number
) => {
  const currentFolder = findParentFolderByChildId(childId, folders);
  const nextFolder = folders.get(nextFolderId);
  if (currentFolder === undefined || nextFolder === undefined) {
    return;
  }
  if (currentFolder.id === nextFolder.id) {
    return;
  }
  const currentIndex = currentFolder.children.indexOf(childId);
  if (currentIndex === -1) {
    return;
  }
  return {
    currentFolderId: currentFolder.id,
    currentIndex,
    nextFolderId: nextFolder.id,
    nextIndex: nextPosition ?? nextFolder.children.length,
  };
};

export const createFolderUpdatePayload = ({
  folder,
  pages,
  values,
}: {
  folder: Folder;
  pages: Pages;
  values: Partial<{
    name: Folder["name"];
    slug: Folder["slug"];
    parentFolderId: Folder["id"];
  }>;
}): BuilderPatchChange[] => {
  const patches: BuilderPatchChange["patches"] = [];
  if (values.name !== undefined) {
    patches.push({
      op: "replace",
      path: ["folders", folder.id, "name"],
      value: values.name,
    });
  }
  if (values.slug !== undefined) {
    patches.push({
      op: "replace",
      path: ["folders", folder.id, "slug"],
      value: values.slug,
    });
  }
  if (values.parentFolderId !== undefined) {
    const plan = getFolderChildReparentPlan(
      pages.folders,
      folder.id,
      values.parentFolderId
    );
    if (plan !== undefined) {
      patches.push({
        op: "remove",
        path: ["folders", plan.currentFolderId, "children", plan.currentIndex],
      });
      patches.push({
        op: "add",
        path: ["folders", plan.nextFolderId, "children", plan.nextIndex],
        value: folder.id,
      });
    }
  }
  return compactBuilderPatchPayload([{ namespace: "pages", patches }]);
};

const getFolderOrThrow = (pages: Pages, folderId: string) => {
  const folder = findFolder(pages, folderId);
  if (folder === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Folder not found");
  }
  return folder;
};

const getParentFolderIdOrThrow = (pages: Pages, childId: string) => {
  const parentFolderId = getParentFolderId(pages.folders, childId);
  if (parentFolderId === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Parent folder not found");
  }
  return parentFolderId;
};

export const createFolder = (
  state: Pick<BuilderState, "pages">,
  input: z.infer<typeof folderCreateInput>,
  context: BuilderRuntimeContext
) => {
  const pages = getRequiredPages(state);
  const parentFolderId = input.parentFolderId ?? pages.rootFolderId;
  const parentFolder = getFolderOrThrow(pages, parentFolderId);
  const folderId = input.folderId ?? context.createId();
  if (pages.folders.has(folderId)) {
    return throwBuilderRuntimeError("CONFLICT", "Folder id already exists");
  }
  if (
    isSlugAvailable(input.slug, pages.folders, parentFolderId, folderId) ===
    false
  ) {
    return throwBuilderRuntimeError(
      "CONFLICT",
      `Folder slug "${input.slug}" is already in use`
    );
  }
  const folder = createFolderValue({
    folderId,
    name: input.name,
    slug: input.slug,
  });
  return createRuntimeMutation({
    payload: createFolderCreatePayload({
      folder,
      parentFolderId,
      parentChildIndex: parentFolder.children.length,
    }),
    result: { folderId },
    invalidatesNamespaces: ["pages"],
  });
};

export const createPageRootInstance = (rootInstanceId: string) => ({
  type: "instance" as const,
  id: rootInstanceId,
  component: elementComponent,
  tag: "body",
  children: [],
});

export const createPageValue = ({
  pageId,
  name,
  path,
  title = JSON.stringify(name),
  rootInstanceId,
  meta = {},
}: {
  pageId: Page["id"];
  name: Page["name"];
  path: Page["path"];
  title?: Page["title"];
  rootInstanceId: string;
  meta?: Page["meta"];
}): Page => ({
  id: pageId,
  name,
  path,
  title,
  rootInstanceId,
  meta,
});

type PageMeta = Page["meta"];

const emptyStringRemovesMetaFields = new Set<keyof PageMeta>([
  "language",
  "redirect",
  "socialImageAssetId",
  "socialImageUrl",
]);

const pageMetaExpressionFields = [
  "description",
  "language",
  "redirect",
  "socialImageUrl",
  "status",
  "content",
] as const satisfies readonly (keyof PageMetaPatchInput)[];

export const normalizePageMetaValue = <Name extends keyof PageMeta>(
  name: Name,
  value: PageMeta[Name]
) => {
  if (value === "" && emptyStringRemovesMetaFields.has(name)) {
    return undefined;
  }
  return value;
};

type PageMetaPatchInput = Partial<{
  description: Page["meta"]["description"];
  language: Page["meta"]["language"];
  redirect: Page["meta"]["redirect"];
  socialImageUrl: Page["meta"]["socialImageUrl"];
  socialImageAssetId: Page["meta"]["socialImageAssetId"];
  excludePageFromSearch: boolean;
  documentType: Page["meta"]["documentType"];
  content: Page["meta"]["content"];
  status: Page["meta"]["status"];
  auth: PageAuth;
  custom: Page["meta"]["custom"];
}>;

type PageFieldsPatchInput = Partial<{
  name: Page["name"];
  path: Page["path"];
  title: Page["title"];
  parentFolderId: string;
  meta: PageMetaPatchInput;
}>;

const addExpressionIssues = (
  context: z.RefinementCtx,
  errors: readonly string[]
) => {
  for (const message of errors) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message,
    });
  }
};

const pageMetaInputBase = z.object({
  description: z.string().optional(),
  language: z.string().optional(),
  redirect: z.string().optional(),
  socialImageUrl: z.string().optional(),
  socialImageAssetId: z.string().optional(),
  excludePageFromSearch: z.boolean().optional(),
  documentType: z.enum(["html", "xml", "text"]).optional(),
  content: z.string().optional(),
  status: z.string().optional(),
  auth: pageAuth.optional(),
  custom: z
    .array(z.object({ property: z.string(), content: z.string() }))
    .optional(),
});

export const getPageExpressionErrors = (input: PageFieldsPatchInput) => {
  const errors: string[] = [];
  errors.push(...getNamedExpressionErrors("title", input.title));
  if (input.meta !== undefined) {
    for (const name of pageMetaExpressionFields) {
      const expression = input.meta[name];
      if (expression === "" && emptyStringRemovesMetaFields.has(name)) {
        continue;
      }
      errors.push(...getNamedExpressionErrors(`meta.${name}`, expression));
    }
    for (const [index, customMeta] of (input.meta.custom ?? []).entries()) {
      errors.push(
        ...getNamedExpressionErrors(
          `meta.custom.${index}.content`,
          customMeta.content
        )
      );
    }
  }
  return errors;
};

export const pageMetaInput = pageMetaInputBase.superRefine((meta, context) => {
  addExpressionIssues(context, getPageExpressionErrors({ meta }));
});

export const pageFieldsInput = z
  .object({
    name: z.string().min(1).optional(),
    path: z.string().optional(),
    title: z.string().optional(),
    parentFolderId: z.string().optional(),
    meta: pageMetaInputBase.optional(),
  })
  .superRefine((fields, context) => {
    addExpressionIssues(context, getPageExpressionErrors(fields));
  });

export const pageCreateInput = z.object({
  pageId: z.string().optional(),
  name: z.string().min(1),
  path: z.string(),
  title: z.string().optional(),
  parentFolderId: z.string().optional(),
  meta: pageMetaInput.optional(),
});

export const pageUpdateInput = z.object({
  pageId: z.string(),
  values: pageFieldsInput,
});

export const pageDeleteInput = z.object({
  pageId: z.string(),
});

export const folderCreateInput = z.object({
  folderId: z.string().optional(),
  name: z.string().min(1),
  slug: z.string(),
  parentFolderId: z.string().optional(),
});

export const folderUpdateInput = z.object({
  folderId: z.string(),
  values: z.object({
    name: z.string().min(1).optional(),
    slug: z.string().optional(),
    parentFolderId: z.string().optional(),
  }),
});

export const folderDeleteInput = z.object({
  folderId: z.string(),
});

export const pageMetaToPatchValue = (meta: PageMetaPatchInput) => {
  const result: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(meta)) {
    result[name] =
      name === "excludePageFromSearch"
        ? String(value)
        : normalizePageMetaValue(name as keyof PageMeta, value as never);
  }
  return result;
};

export const createPageCreatePayload = ({
  page,
  parentFolderId,
  parentChildIndex,
  rootInstance,
}: {
  page: Page;
  parentFolderId: string;
  parentChildIndex: number;
  rootInstance: ReturnType<typeof createPageRootInstance>;
}): BuilderPatchChange[] => [
  {
    namespace: "pages",
    patches: [
      { op: "add", path: ["pages", page.id], value: page },
      {
        op: "add",
        path: ["folders", parentFolderId, "children", parentChildIndex],
        value: page.id,
      },
    ],
  },
  {
    namespace: "instances",
    patches: [
      {
        op: "add",
        path: [rootInstance.id],
        value: rootInstance,
      },
    ],
  },
];

export const createPageUpdatePatches = ({
  input,
  page,
  pages,
}: {
  input: PageFieldsPatchInput;
  page: Page;
  pages: Pages;
}) => {
  const patches: BuilderPatchChange["patches"] = [];
  const replace = (path: Array<string | number>, value: unknown) => {
    patches.push({ op: "replace", path, value });
  };

  if (input.name !== undefined) {
    replace(["pages", page.id, "name"], input.name);
  }
  if (input.path !== undefined) {
    replace(
      ["pages", page.id, "path"],
      page.id === pages.homePageId ? "" : input.path
    );
  }
  if (input.title !== undefined) {
    replace(["pages", page.id, "title"], input.title);
  }
  if (input.meta !== undefined) {
    for (const [name, value] of Object.entries(
      pageMetaToPatchValue(input.meta)
    )) {
      if (value === undefined) {
        if (Object.hasOwn(page.meta, name)) {
          patches.push({
            op: "remove",
            path: ["pages", page.id, "meta", name],
          });
        }
        continue;
      }
      patches.push({
        op: Object.hasOwn(page.meta, name) ? "replace" : "add",
        path: ["pages", page.id, "meta", name],
        value,
      });
    }
  }
  if (input.parentFolderId !== undefined) {
    const plan = getFolderChildReparentPlan(
      pages.folders,
      page.id,
      input.parentFolderId
    );
    if (plan !== undefined) {
      patches.push({
        op: "remove",
        path: ["folders", plan.currentFolderId, "children", plan.currentIndex],
      });
      patches.push({
        op: "add",
        path: ["folders", plan.nextFolderId, "children", plan.nextIndex],
        value: page.id,
      });
    }
  }
  return patches;
};

export const createPageUpdatePayload = (
  input: Parameters<typeof createPageUpdatePatches>[0]
): BuilderPatchChange[] => {
  const patches = createPageUpdatePatches(input);
  return compactBuilderPatchPayload([{ namespace: "pages", patches }]);
};

export const createPage = (
  state: Pick<BuilderState, "pages">,
  input: z.infer<typeof pageCreateInput>,
  context: BuilderRuntimeContext
) => {
  const pages = getRequiredPages(state);
  const parentFolderId = input.parentFolderId ?? pages.rootFolderId;
  const parentFolder = getFolderOrThrow(pages, parentFolderId);
  const expressionErrors = getPageExpressionErrors(input);
  if (expressionErrors.length > 0) {
    return throwBuilderRuntimeError("BAD_REQUEST", expressionErrors.join("\n"));
  }
  const pageId = input.pageId ?? context.createId();
  if (pages.pages.has(pageId)) {
    return throwBuilderRuntimeError("CONFLICT", "Page id already exists");
  }
  if (
    isPathAvailable({
      pages,
      path: input.path,
      parentFolderId,
      pageId,
    }) === false
  ) {
    return throwBuilderRuntimeError(
      "CONFLICT",
      `Page path "${input.path}" is already in use`
    );
  }
  const rootInstanceId = context.createId();
  const page = createPageValue({
    pageId,
    name: input.name,
    path: input.path,
    title: input.title,
    rootInstanceId,
    meta:
      input.meta === undefined
        ? {}
        : (pageMetaToPatchValue(input.meta) as Page["meta"]),
  });
  const rootInstance = createPageRootInstance(rootInstanceId);
  return createRuntimeMutation({
    payload: createPageCreatePayload({
      page,
      parentFolderId,
      parentChildIndex: parentFolder.children.length,
      rootInstance,
    }),
    result: { pageId },
    invalidatesNamespaces: ["pages", "instances"],
  });
};

export const updatePage = (
  state: Pick<BuilderState, "pages">,
  input: z.infer<typeof pageUpdateInput>
) => {
  const pages = getRequiredPages(state);
  const page = findPage(pages, input.pageId);
  if (page === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Page not found");
  }
  const expressionErrors = getPageExpressionErrors(input.values);
  if (expressionErrors.length > 0) {
    return throwBuilderRuntimeError("BAD_REQUEST", expressionErrors.join("\n"));
  }
  if (
    (input.values.path !== undefined ||
      input.values.parentFolderId !== undefined) &&
    isPathAvailable({
      pages,
      path: input.values.path ?? page.path,
      parentFolderId:
        input.values.parentFolderId ?? getParentFolderIdOrThrow(pages, page.id),
      pageId: page.id,
    }) === false
  ) {
    return throwBuilderRuntimeError(
      "CONFLICT",
      `Page path "${input.values.path ?? page.path}" is already in use`
    );
  }
  if (input.values.parentFolderId !== undefined) {
    getFolderOrThrow(pages, input.values.parentFolderId);
    getParentFolderIdOrThrow(pages, page.id);
  }
  return createRuntimeMutation({
    payload: createPageUpdatePayload({
      input: input.values,
      page,
      pages,
    }),
    result: { pageId: input.pageId },
    invalidatesNamespaces: ["pages"],
  });
};

type DeletePayloadState = Pick<
  BuilderState,
  | "pages"
  | "instances"
  | "props"
  | "dataSources"
  | "styleSources"
  | "styleSourceSelections"
  | "styles"
>;

const getRequiredDeleteState = (state: DeletePayloadState) => {
  const pages = getRequiredPages(state);
  if (
    state.instances === undefined ||
    state.props === undefined ||
    state.dataSources === undefined ||
    state.styleSources === undefined ||
    state.styleSourceSelections === undefined ||
    state.styles === undefined
  ) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Delete namespaces are missing"
    );
  }
  return {
    pages,
    instances: state.instances,
    props: state.props,
    dataSources: state.dataSources,
    styleSources: state.styleSources,
    styleSourceSelections: state.styleSourceSelections,
    styles: state.styles,
  };
};

const createDeletedInstanceCleanupPayload = (
  state: ReturnType<typeof getRequiredDeleteState>,
  rootInstanceIds: Iterable<string>
) => {
  const instanceIds = collectExclusiveInstanceIds(
    state.instances,
    rootInstanceIds
  );
  return createInstanceCleanupPayload({
    instanceIds,
    props: state.props.values(),
    dataSources: state.dataSources.values(),
    styleSources: state.styleSources.values(),
    styleSourceSelections: state.styleSourceSelections.values(),
    styles: state.styles.values(),
  });
};

export const createPageDeletePayload = ({
  state,
  page,
  parentFolderId,
}: {
  state: ReturnType<typeof getRequiredDeleteState>;
  page: Page;
  parentFolderId: Folder["id"];
}): BuilderPatchChange[] => {
  const parentFolder = state.pages.folders.get(parentFolderId);
  const pageIndex = parentFolder?.children.indexOf(page.id) ?? -1;
  return [
    {
      namespace: "pages",
      patches: [
        { op: "remove", path: ["pages", page.id] },
        ...(pageIndex === -1
          ? []
          : [
              {
                op: "remove" as const,
                path: ["folders", parentFolderId, "children", pageIndex],
              },
            ]),
      ],
    },
    ...createDeletedInstanceCleanupPayload(state, [page.rootInstanceId]),
  ];
};

export const deletePage = (
  state: DeletePayloadState,
  input: z.infer<typeof pageDeleteInput>
) => {
  const deleteState = getRequiredDeleteState(state);
  const page = findPage(deleteState.pages, input.pageId);
  if (page === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Page not found");
  }
  if (page.id === deleteState.pages.homePageId) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Home page cannot be deleted"
    );
  }
  const parentFolderId = getParentFolderIdOrThrow(deleteState.pages, page.id);
  return createRuntimeMutation({
    payload: createPageDeletePayload({
      state: deleteState,
      page,
      parentFolderId,
    }),
    result: { pageId: input.pageId },
    invalidatesNamespaces: [
      "pages",
      "instances",
      "props",
      "dataSources",
      "resources",
      "styleSourceSelections",
      "styleSources",
      "styles",
    ],
  });
};

export const createFolderDeletePayload = ({
  state,
  folder,
  parentFolderId,
}: {
  state: ReturnType<typeof getRequiredDeleteState>;
  folder: Folder;
  parentFolderId: Folder["id"];
}) => {
  const { folderIds, pageIds } = getFolderDeletionTargets(
    folder.id,
    state.pages
  );
  const parentFolder = state.pages.folders.get(parentFolderId);
  const folderIndex = parentFolder?.children.indexOf(folder.id) ?? -1;
  return {
    folderIds,
    pageIds,
    payload: [
      {
        namespace: "pages" as const,
        patches: [
          ...(folderIndex === -1
            ? []
            : [
                {
                  op: "remove" as const,
                  path: ["folders", parentFolderId, "children", folderIndex],
                },
              ]),
          ...pageIds.map((pageId) => ({
            op: "remove" as const,
            path: ["pages", pageId],
          })),
          ...folderIds.map((folderId) => ({
            op: "remove" as const,
            path: ["folders", folderId],
          })),
        ],
      },
      ...createDeletedInstanceCleanupPayload(
        state,
        pageIds.flatMap((pageId) => {
          const page = state.pages.pages.get(pageId);
          return page === undefined ? [] : [page.rootInstanceId];
        })
      ),
    ],
  };
};

export const deleteFolder = (
  state: DeletePayloadState,
  input: z.infer<typeof folderDeleteInput>
) => {
  const deleteState = getRequiredDeleteState(state);
  const folder = getFolderOrThrow(deleteState.pages, input.folderId);
  if (folder.id === deleteState.pages.rootFolderId) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Root folder cannot be deleted"
    );
  }
  const parentFolderId = getParentFolderIdOrThrow(deleteState.pages, folder.id);
  const { folderIds, pageIds, payload } = createFolderDeletePayload({
    state: deleteState,
    folder,
    parentFolderId,
  });
  if (folderIds.length === 0) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Folder containing home page cannot be deleted"
    );
  }
  return createRuntimeMutation({
    payload,
    result: { folderId: input.folderId, pageIds, folderIds },
    invalidatesNamespaces: [
      "pages",
      "instances",
      "props",
      "dataSources",
      "resources",
      "styleSourceSelections",
      "styleSources",
      "styles",
    ],
  });
};

export const updateFolder = (
  state: Pick<BuilderState, "pages">,
  input: z.infer<typeof folderUpdateInput>
) => {
  const pages = getRequiredPages(state);
  const folder = getFolderOrThrow(pages, input.folderId);
  if (folder.id === pages.rootFolderId) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Root folder cannot be updated"
    );
  }
  if (input.values.slug !== undefined) {
    if (
      isSlugAvailable(
        input.values.slug,
        pages.folders,
        input.values.parentFolderId ??
          getParentFolderIdOrThrow(pages, folder.id),
        folder.id
      ) === false
    ) {
      return throwBuilderRuntimeError(
        "CONFLICT",
        `Folder slug "${input.values.slug}" is already in use`
      );
    }
  }
  if (input.values.parentFolderId !== undefined) {
    const descendantFolderIds = getAllChildrenAndSelf(
      folder.id,
      pages.folders,
      "folder"
    );
    if (descendantFolderIds.includes(input.values.parentFolderId)) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        "Folder cannot be moved into itself or a descendant"
      );
    }
    const slug = input.values.slug ?? folder.slug;
    if (
      isSlugAvailable(
        slug,
        pages.folders,
        input.values.parentFolderId,
        folder.id
      ) === false
    ) {
      return throwBuilderRuntimeError(
        "CONFLICT",
        `Folder slug "${slug}" is already in use`
      );
    }
    getFolderOrThrow(pages, input.values.parentFolderId);
    getParentFolderIdOrThrow(pages, folder.id);
  }
  return createRuntimeMutation({
    payload: createFolderUpdatePayload({
      folder,
      pages,
      values: input.values,
    }),
    result: { folderId: input.folderId },
    invalidatesNamespaces: ["pages"],
  });
};
