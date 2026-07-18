import {
  elementComponent,
  findPageByIdOrPath,
  findParentFolderByChildId,
  getAllFolders,
  getAllPages,
  getHomePage,
  getFolderById,
  getPageDraftabilityError,
  getPagePath,
  ROOT_FOLDER_ID,
  folder as sdkFolder,
  type Folder,
  type Page,
  pageAuth,
  homePagePath,
  pagePath,
  pageName,
  pageTitle,
  projectNewRedirectPath,
  documentTypes,
  type PageAuth,
  type Pages,
  isPageDraft,
} from "@webstudio-is/sdk";
import { serializePages } from "@webstudio-is/project-migrations/pages";
import * as bcp47 from "bcp-47";
import slugify from "slugify";
import { z } from "zod";
import {
  compactBuilderPatchPayload,
  type BuilderPatchChange,
} from "../contracts/patch";
import type { BuilderState } from "../state/builder-state";
import type { BuilderRuntimeContext } from "./context";
import { validateBasicAuthCredentials } from "./auth";
import { computeExpression } from "./data";
import {
  formatValidationIssueMessages,
  getZodValidationIssueOptions,
  prefixValidationIssuePaths,
  throwBuilderRuntimeError,
  throwBuilderValidationError,
  type SemanticValidationIssue,
} from "./errors";
import { getNamedExpressionValidationIssues } from "./expression-validation";
import { runtimeGeneratedIdInput } from "./generated-id-input";
import { paginateOutput, type PaginatedOutputInput } from "./output";
import {
  collectExclusiveInstanceIds,
  createInstanceCleanupPayload,
} from "./instances";
import { createRuntimeMutation } from "./mutation";
import { validatePathnamePattern } from "./url-pattern";
import { LOOP_ERROR, wouldCreateLoop } from "./redirect-loop-detection";

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
  isDraft?: boolean;
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

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isSerializedPagePathMatch = (pattern: string, path: string) => {
  if (pattern === path) {
    return true;
  }
  const segments = pattern.split("/");
  const pathSegments = path.split("/");
  const regexParts = segments.map((segment, index) => {
    if (segment === "*") {
      return index === segments.length - 1 ? ".*" : "[^/]+";
    }
    const param = segment.match(/^:(\w+)([?*]?)$/);
    if (param === null) {
      return escapeRegExp(segment);
    }
    const modifier = param[2];
    if (modifier === "?") {
      return "[^/]*";
    }
    if (modifier === "*") {
      return index === segments.length - 1 ? ".*" : "[^/]+";
    }
    return "[^/]+";
  });
  if (
    segments.length !== pathSegments.length &&
    pattern.endsWith("*") === false
  ) {
    return false;
  }
  return new RegExp(`^${regexParts.join("/")}$`).test(path);
};

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
  ...(isPageDraft(page) ? { isDraft: true } : {}),
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
    const exactPage = pages.pages.find(
      (page) => getSerializedPagePath(pages, page) === pagePath
    );
    return (
      exactPage ??
      pages.pages.find((page) =>
        isSerializedPagePathMatch(getSerializedPagePath(pages, page), pagePath)
      )
    );
  }
};

const findExactSerializedPageByPath = (
  pages: SerializedPages,
  path: string
) => {
  const pagePath = normalizeSerializedPagePath(path);
  return pages.pages.find(
    (page) => getSerializedPagePath(pages, page) === pagePath
  );
};

const findMatchingSerializedPageByPath = (
  pages: SerializedPages,
  path: string
) => {
  const pagePath = normalizeSerializedPagePath(path);
  return pages.pages.find((page) =>
    isSerializedPagePathMatch(getSerializedPagePath(pages, page), pagePath)
  );
};

const isSerializedFallbackPage = (
  pages: SerializedPages,
  page: SerializedPage
) => {
  const path = getSerializedPagePath(pages, page);
  return page.meta.status === "404" || path === "/*" || path === "*";
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

export type PageDropTarget = {
  parentId: string;
  beforeId?: string;
  afterId?: string;
  indexWithinChildren: number;
};

export type PageTreeDropTarget = {
  parentLevel: number;
  beforeLevel?: number;
  afterLevel?: number;
};

export const getStoredPageDropTarget = ({
  selector,
  dropTarget,
  pages,
}: {
  selector: string[];
  dropTarget: PageTreeDropTarget;
  pages: Pages;
}): undefined | PageDropTarget => {
  const parentId = selector.at(-dropTarget.parentLevel - 1);
  const beforeId =
    dropTarget.beforeLevel === undefined
      ? undefined
      : selector.at(-dropTarget.beforeLevel - 1);
  const afterId =
    dropTarget.afterLevel === undefined
      ? undefined
      : selector.at(-dropTarget.afterLevel - 1);
  const parentFolder =
    parentId === undefined ? undefined : pages.folders.get(parentId);
  let indexWithinChildren = 0;
  if (parentFolder) {
    const beforeIndex = parentFolder.children.indexOf(beforeId ?? "");
    const afterIndex = parentFolder.children.indexOf(afterId ?? "");
    if (beforeIndex > -1) {
      indexWithinChildren = beforeIndex;
    } else if (afterIndex > -1) {
      indexWithinChildren = afterIndex + 1;
    }
  }
  if (parentId) {
    return { parentId, beforeId, afterId, indexWithinChildren };
  }
};

export const canDropPageTarget = (dropTarget: PageDropTarget, pages: Pages) => {
  if (pages.folders.has(dropTarget.parentId) === false) {
    return false;
  }
  if (
    dropTarget.indexWithinChildren === 0 &&
    dropTarget.parentId === pages.rootFolderId
  ) {
    return false;
  }
  return true;
};

export const listPages = (
  state: Pick<BuilderState, "pages">,
  input: PaginatedOutputInput = {}
) => {
  const pages = getSerializedPages(state);
  const { items, ...pagination } = paginateOutput({
    items: pages.pages.map((page) => serializePageSummary(pages, page)),
    cursor: input.cursor,
    limit: input.limit,
    filters: {},
    verbose: input.verbose,
  });
  return {
    pages: items,
    ...pagination,
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
  const pages = getSerializedPages(state);
  const exactPage = findExactSerializedPageByPath(pages, input.path);
  if (exactPage !== undefined) {
    return {
      ...serializePageDetails(pages, exactPage),
      requestedPath: input.path,
      found: true,
      exactMatch: true,
      matchedPattern: false,
      matchedFallback: false,
    };
  }

  const matchingPage = findMatchingSerializedPageByPath(pages, input.path);
  if (matchingPage === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Page not found");
  }
  const matchingPageDetails = serializePageDetails(pages, matchingPage);
  if (isSerializedFallbackPage(pages, matchingPage)) {
    return {
      requestedPath: input.path,
      found: false,
      exactMatch: false,
      matchedPattern: true,
      matchedFallback: true,
      fallbackPage: matchingPageDetails,
      guidance:
        "No exact page exists for the requested path. The matched page is a fallback route; create a page for this path before editing it.",
    };
  }
  return {
    ...matchingPageDetails,
    requestedPath: input.path,
    found: true,
    exactMatch: false,
    matchedPattern: true,
    matchedFallback: false,
  };
};

export const listFolders = (
  state: Pick<BuilderState, "pages">,
  input: PaginatedOutputInput = {}
) => {
  const pages = getSerializedPages(state);
  const { items, ...pagination } = paginateOutput({
    items: pages.folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      slug: folder.slug,
      parentFolderId: findParentFolderId(pages.folders, folder.id),
      children: folder.children,
    })),
    cursor: input.cursor,
    limit: input.limit,
    filters: {},
    verbose: input.verbose,
  });
  return {
    folders: items,
    ...pagination,
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

export const nameToPath = (pages: Pages | undefined, name: string) => {
  if (name === "") {
    return "";
  }
  const slug = slugify(name, { lower: true, strict: true });
  const path = `/${slug}`;
  if (pages === undefined) {
    return path;
  }
  if (findPageByIdOrPath(path, pages) === undefined) {
    return path;
  }
  let suffix = 1;
  while (findPageByIdOrPath(`${path}${suffix}`, pages) !== undefined) {
    suffix += 1;
  }
  return `${path}${suffix}`;
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

export const getOrderedFolderChildReparentPlan = (
  folders: Pages["folders"],
  childId: Page["id"] | Folder["id"],
  nextFolderId: Folder["id"],
  nextPosition: number
) => {
  const currentFolder = findParentFolderByChildId(childId, folders);
  const nextFolder = folders.get(nextFolderId);
  if (currentFolder === undefined || nextFolder === undefined) {
    return;
  }
  const currentIndex = currentFolder.children.indexOf(childId);
  if (currentIndex === -1) {
    return;
  }
  const nextIndex =
    currentFolder.id === nextFolder.id && currentIndex < nextPosition
      ? nextPosition - 1
      : nextPosition;
  if (currentFolder.id === nextFolder.id && currentIndex === nextIndex) {
    return;
  }
  return {
    currentFolderId: currentFolder.id,
    currentIndex,
    nextFolderId: nextFolder.id,
    nextIndex,
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
  const folderId = context.createId();
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

export const createPageAuthFromCredentials = ({
  login,
  password,
}: {
  login: string;
  password: string;
}): Page["meta"]["auth"] | undefined => {
  const result = pageAuth.safeParse({ method: "basic", login, password });
  return result.success ? result.data : undefined;
};

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
  "excludePageFromSearch",
  "status",
  "content",
] as const satisfies readonly (keyof PageMetaPatchInput)[];

export const listPageMetadataExpressions = (
  page: Pick<Page, "title" | "meta">
) => {
  const expressions: Array<{ path: string[]; expression: string }> = [
    { path: ["title"], expression: page.title },
  ];
  for (const field of pageMetaExpressionFields) {
    const expression = page.meta[field];
    if (typeof expression === "string") {
      expressions.push({ path: ["meta", field], expression });
    }
  }
  for (const [index, item] of (page.meta.custom ?? []).entries()) {
    expressions.push({
      path: ["meta", "custom", String(index), "content"],
      expression: item.content,
    });
  }
  return expressions;
};

export const pageExpressionFieldHint =
  'Plain fixed text is accepted, for example "Plans for teams". For computed values, pass one Webstudio JavaScript expression such as `pageTitle ?? "Plans for teams"`. Read webstudio://project/expressions for syntax and scope rules.';

export const pageStatusFieldHint =
  "Pass a fixed HTTP status code as a number from 200 through 599, for example 302. For a dynamic status, pass one Webstudio JavaScript expression as a string, for example `system.status`.";

const pageStatusCodeInput = z.number().refine(
  (value) => /^[2345]\d\d$/.test(String(value)),
  getZodValidationIssueOptions({
    code: "invalid_page_status",
    path: [],
    message: "Status code expects 2xx, 3xx, 4xx or 5xx",
    constraint: "http_status:200-599",
    example: 200,
  })
);

const jsExpressionStartPattern =
  /^\s*(?:["'`[{(]|(?:await|new|typeof|void)\b|(?:undefined|null|true|false)\s*$)/;
const jsExpressionOperatorPattern =
  /(?:\?\?|&&|\|\||=>|\?\s*.+\s*:|\.\s*[A-Za-z_$]|\[[^\]]*\]|\s(?:[=!<>]=?|[+\-*/%])\s)/;
const urlStringPattern = /^[A-Za-z][A-Za-z0-9+.-]*:\/\//;

const normalizePageExpressionInput = (value: string) => {
  if (urlStringPattern.test(value)) {
    return JSON.stringify(value);
  }
  if (
    jsExpressionStartPattern.test(value) ||
    jsExpressionOperatorPattern.test(value)
  ) {
    return value;
  }
  return JSON.stringify(value);
};

const normalizePageStatusInput = (value: string) => {
  const number = Number(value);
  if (Number.isNaN(number) === false && String(number) === value) {
    return value;
  }
  return normalizePageExpressionInput(value);
};

const pageExpressionStringInput = z
  .preprocess(
    (value) =>
      typeof value === "string" ? normalizePageExpressionInput(value) : value,
    z.string({
      error: (issue) =>
        issue.input !== null &&
        typeof issue.input === "object" &&
        Array.isArray(issue.input) === false
          ? `${pageExpressionFieldHint} Pass it as a string, not as a prop value object like {"type":"string","value":"..."}.`
          : undefined,
    })
  )
  .describe(pageExpressionFieldHint);

const pageStatusExpressionInput = z
  .union([
    pageStatusCodeInput.transform((value) => String(value)),
    z.string().transform(normalizePageStatusInput),
  ])
  .describe(pageStatusFieldHint);

export const pagePathFieldHint =
  'Plain page path. For a new non-home page, start with "/", for example "/pricing". The home page path is the empty string ""; do not use an empty path when creating a new page.';

export const pageDraftFieldHint =
  "Set true to mark the page as draft. Draft pages remain editable and previewable in Builder but are omitted from every publish target, including staging, and from sitemap output. Set false to stage the page for a future publish; this does not deploy the site. The home page and /* catch-all page cannot be drafts.";

const pageCreatePathInput = pagePath.describe(pagePathFieldHint);
const pageUpdatePathInput = z
  .union([homePagePath, pagePath])
  .describe(pagePathFieldHint);
const pageDraftInput = z.boolean().describe(pageDraftFieldHint);

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
  excludePageFromSearch: Page["meta"]["excludePageFromSearch"] | boolean;
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
  isDraft: boolean;
  parentFolderId: string;
  meta: PageMetaPatchInput;
}>;

const normalizePageMetaExpressionInputs = (
  meta: PageMetaPatchInput | undefined
) => {
  if (meta === undefined) {
    return undefined;
  }
  const normalized: PageMetaPatchInput = { ...meta };
  for (const name of pageMetaExpressionFields) {
    const value = normalized[name];
    if (typeof value === "string" && value !== "") {
      normalized[name] =
        name === "status"
          ? normalizePageStatusInput(value)
          : normalizePageExpressionInput(value);
    }
  }
  normalized.custom = normalized.custom?.map((customMeta) => ({
    ...customMeta,
    content: normalizePageExpressionInput(customMeta.content),
  }));
  return normalized;
};

const normalizePageFieldsExpressionInputs = <
  Input extends PageFieldsPatchInput,
>(
  input: Input
): Input => ({
  ...input,
  title:
    typeof input.title === "string"
      ? normalizePageExpressionInput(input.title)
      : input.title,
  meta: normalizePageMetaExpressionInputs(input.meta),
});

const pageMetaInputBase = z.object({
  description: pageExpressionStringInput.optional(),
  language: pageExpressionStringInput.optional(),
  redirect: pageExpressionStringInput.optional(),
  socialImageUrl: pageExpressionStringInput.optional(),
  socialImageAssetId: z.string().optional(),
  excludePageFromSearch: z
    .union([z.boolean(), pageExpressionStringInput])
    .optional(),
  documentType: z.enum(["html", "xml", "text"]).optional(),
  content: pageExpressionStringInput.optional(),
  status: pageStatusExpressionInput.optional(),
  auth: pageAuth.optional(),
  custom: z
    .array(
      z.object({ property: z.string(), content: pageExpressionStringInput })
    )
    .optional(),
});

const collectPageExpressionValidationIssues = (input: PageFieldsPatchInput) => {
  const issues: SemanticValidationIssue[] = [];
  const add = (name: string, expression: string | undefined) => {
    issues.push(
      ...getNamedExpressionValidationIssues(name, expression, {
        hint: pageExpressionFieldHint,
        example: 'pageTitle ?? "Pricing"',
      })
    );
  };
  add("title", input.title);
  if (input.meta !== undefined) {
    for (const name of pageMetaExpressionFields) {
      const expression = input.meta[name];
      if (typeof expression !== "string") {
        continue;
      }
      if (expression === "" && emptyStringRemovesMetaFields.has(name)) {
        continue;
      }
      add(`meta.${name}`, expression);
    }
    for (const [index, customMeta] of (input.meta.custom ?? []).entries()) {
      add(`meta.custom.${index}.content`, customMeta.content);
    }
  }
  return issues;
};

export const getPageExpressionErrors = (input: PageFieldsPatchInput) =>
  formatValidationIssueMessages(collectPageExpressionValidationIssues(input))
    .split("\n")
    .filter(Boolean);

const getPagePathValidationIssues = (
  path: string | undefined,
  pathPrefix: readonly string[] = []
) =>
  getPagePathPatternErrors(path).map(
    (detail): SemanticValidationIssue => ({
      code: "invalid_page_path",
      path: [...pathPrefix, "path"],
      message: "Invalid page path pattern",
      constraint: "valid_page_path_pattern",
      example: "/pricing",
      detail,
    })
  );

const getPagePathPatternErrors = (path: string | undefined) => {
  if (path === undefined || path === "") {
    return [];
  }
  return validatePathnamePattern(path);
};

export const pageMetaInput = pageMetaInputBase;

export const pageTextContentSettingsInput = z.object({
  content: z.string().optional(),
});

export const pageSocialImageSettingsInput = z.object({
  socialImageUrl: z.string().optional(),
});

export const pageCustomMetadataSettingsInput = z.object({
  customMetas: z
    .array(
      z.object({
        property: z.string(),
        content: z.string(),
      })
    )
    .optional(),
});

const emptyLanguageInput = z.literal("");
const pageLanguageInput = z.string().refine(
  (value) => bcp47.parse(value).language !== null,
  getZodValidationIssueOptions({
    code: "invalid_page_language",
    path: [],
    message: "The language is invalid",
    constraint: "bcp_47_language_tag",
    example: "en-US",
  })
);

export const pageSearchSettingsInput = z.object({
  title: pageTitle,
  description: z.string().optional(),
  excludePageFromSearch: z.boolean().optional(),
  language: pageLanguageInput.or(emptyLanguageInput),
});

export const pageTemplateSettingsInput = z.object({
  name: pageName,
  title: pageTitle,
});

export const pageGeneralSettingsInput = z.object({
  name: pageName,
  path: pagePath,
  status: pageStatusCodeInput.optional(),
  redirect: z.optional(projectNewRedirectPath.or(z.literal(""))),
  documentType: z.optional(z.enum(documentTypes)),
});

export const homePageGeneralSettingsInput = pageGeneralSettingsInput.extend({
  path: homePagePath,
});

export const pageFieldsInput = z.object({
  name: z.string().min(1).optional(),
  path: pageUpdatePathInput.optional(),
  title: pageExpressionStringInput.optional(),
  isDraft: pageDraftInput.optional(),
  parentFolderId: z.string().optional(),
  meta: pageMetaInputBase.optional(),
});

export const pageCreateInput = z.object({
  pageId: runtimeGeneratedIdInput,
  name: z.string().min(1),
  path: pageCreatePathInput,
  title: pageExpressionStringInput.optional(),
  parentFolderId: z.string().optional(),
  meta: pageMetaInput.optional(),
});

export const pageUpdateInput = z.object({
  pageId: z.string(),
  values: pageFieldsInput,
});

const pageMarketplaceInput = z.object({
  include: z.boolean().optional(),
  category: z.string().optional(),
  thumbnailAssetId: z.string().optional(),
});

export const pageMarketplaceUpdateInput = z.object({
  pageId: z.string(),
  marketplace: pageMarketplaceInput,
});

export const pageSetHomeInput = z.object({
  pageId: z.string(),
});

const pageSettingsAuthInput = z.object({
  login: z.string(),
  password: z.string(),
});

export const pageSettingsUpdateInput = z.object({
  pageId: z.string(),
  values: z
    .object({
      name: z.string(),
      parentFolderId: z.string(),
      path: z.string(),
      isHomePage: z.boolean(),
      title: z.string(),
      description: z.string(),
      excludePageFromSearch: z.string(),
      language: z.string(),
      socialImageUrl: z.string(),
      socialImageAssetId: z.string(),
      status: z.string().optional(),
      redirect: z.string(),
      documentType: z.enum(documentTypes),
      content: z.string(),
      auth: pageSettingsAuthInput,
      customMetas: z.array(
        z.object({ property: z.string(), content: z.string() })
      ),
      marketplace: z.object({
        include: z.boolean(),
        category: z.string(),
        thumbnailAssetId: z.string(),
      }),
    })
    .partial(),
});

export const pageSavePathInHistoryInput = z.object({
  pageId: z.string(),
  path: z.string(),
});

export const pageDeleteInput = z.object({
  pageId: z.string(),
});

const folderFieldsInput = sdkFolder.pick({ name: true, slug: true });

export const folderSettingsInput = folderFieldsInput.extend({
  parentFolderId: z.string(),
});

export type FolderSettingsValues = z.infer<typeof folderSettingsInput>;

export const folderSettingsDefaultValues = {
  name: "Untitled",
  slug: "untitled",
  parentFolderId: ROOT_FOLDER_ID,
} satisfies FolderSettingsValues;

export const nameToSlug = (name: string) => {
  if (name === "") {
    return "";
  }
  return slugify(name, { lower: true, strict: true });
};

export const getNewFolderSettingsValues = (
  pages: Pages | undefined
): FolderSettingsValues => ({
  ...folderSettingsDefaultValues,
  parentFolderId:
    pages?.rootFolderId ?? folderSettingsDefaultValues.parentFolderId,
  slug: nameToSlug(folderSettingsDefaultValues.name),
});

export const getFolderSettingsValues = ({
  folderId,
  pages,
}: {
  folderId: Folder["id"];
  pages: Pages;
}): FolderSettingsValues => {
  const folder = pages.folders.get(folderId);
  const parentFolder = findParentFolderByChildId(folderId, pages.folders);
  return {
    name: folder?.name ?? "",
    slug: folder?.slug ?? "",
    parentFolderId: parentFolder?.id ?? pages.rootFolderId,
  };
};

export type PageSettingsValues = {
  name: string;
  parentFolderId: string;
  path: string;
  isHomePage: boolean;
  title: string;
  description: string;
  excludePageFromSearch: string;
  language: string;
  socialImageUrl: string;
  socialImageAssetId: string;
  status: string | undefined;
  redirect: string;
  documentType: NonNullable<Page["meta"]["documentType"]>;
  content: string;
  auth: {
    login: string;
    password: string;
  };
  customMetas: { property: string; content: string }[];
  marketplace: {
    include: boolean;
    category: string;
    thumbnailAssetId: string;
  };
};

export type PageSettingsFieldName = keyof PageSettingsValues;

export const pageSettingsDefaultValues: PageSettingsValues = {
  name: "Untitled",
  parentFolderId: ROOT_FOLDER_ID,
  path: "/untitled",
  isHomePage: false,
  title: `"Untitled"`,
  description: `""`,
  excludePageFromSearch: `true`,
  language: `""`,
  socialImageUrl: `""`,
  socialImageAssetId: "",
  status: undefined,
  redirect: `""`,
  documentType: "html",
  content: `""`,
  auth: {
    login: "",
    password: "",
  },
  customMetas: [{ property: "", content: `""` }],
  marketplace: {
    include: false,
    category: "",
    thumbnailAssetId: "",
  },
};

export const getPageSettingsAuthFromValues = (
  values: PageSettingsValues
): Page["meta"]["auth"] => {
  if (values.auth.login === "" && values.auth.password === "") {
    return;
  }
  return createPageAuthFromCredentials({
    login: values.auth.login,
    password: values.auth.password,
  });
};

export const getInitialPageSettingsMeta = (
  values: PageSettingsValues
): z.infer<typeof pageCreateInput>["meta"] => {
  const meta: z.infer<typeof pageCreateInput>["meta"] = {};
  const auth = getPageSettingsAuthFromValues(values);
  if (auth !== undefined) {
    meta.auth = auth;
  }
  return meta;
};

export const getPageSettingsValues = ({
  page,
  pages,
  isHomePage,
}: {
  page: Page;
  pages: Pages;
  isHomePage: boolean;
}): PageSettingsValues => {
  const parentFolder = findParentFolderByChildId(page.id, pages.folders);
  return {
    name: page.name,
    parentFolderId: parentFolder?.id ?? pages.rootFolderId,
    path: page.path,
    title: page.title,
    description: page.meta.description ?? pageSettingsDefaultValues.description,
    socialImageUrl:
      page.meta.socialImageUrl ?? pageSettingsDefaultValues.socialImageUrl,
    socialImageAssetId:
      page.meta.socialImageAssetId ??
      pageSettingsDefaultValues.socialImageAssetId,
    excludePageFromSearch:
      page.meta.excludePageFromSearch ??
      pageSettingsDefaultValues.excludePageFromSearch,
    language: page.meta.language ?? pageSettingsDefaultValues.language,
    status: page.meta.status ?? pageSettingsDefaultValues.status,
    redirect: page.meta.redirect ?? pageSettingsDefaultValues.redirect,
    documentType:
      page.meta.documentType ?? pageSettingsDefaultValues.documentType,
    content: page.meta.content ?? pageSettingsDefaultValues.content,
    auth: {
      login: page.meta.auth?.login ?? pageSettingsDefaultValues.auth.login,
      password:
        page.meta.auth?.password ?? pageSettingsDefaultValues.auth.password,
    },
    isHomePage,
    customMetas: page.meta.custom ?? pageSettingsDefaultValues.customMetas,
    marketplace: {
      include:
        page.marketplace?.include ??
        pageSettingsDefaultValues.marketplace.include,
      category:
        page.marketplace?.category ??
        pageSettingsDefaultValues.marketplace.category,
      thumbnailAssetId:
        page.marketplace?.thumbnailAssetId ??
        pageSettingsDefaultValues.marketplace.thumbnailAssetId,
    },
  };
};

export type PageSettingsErrors = {
  [fieldName in Exclude<PageSettingsFieldName, "auth">]?: string[];
} & {
  auth?: {
    login?: string[];
    password?: string[];
  };
};

const pageSettingsNonAuthFieldNames = [
  "name",
  "parentFolderId",
  "path",
  "isHomePage",
  "title",
  "description",
  "excludePageFromSearch",
  "language",
  "socialImageUrl",
  "socialImageAssetId",
  "status",
  "redirect",
  "documentType",
  "content",
  "customMetas",
  "marketplace",
] satisfies Exclude<PageSettingsFieldName, "auth">[];

export const computePageSettingsPath = (
  values: PageSettingsValues,
  pages: Pages
) => {
  if (values.isHomePage) {
    return "/";
  }
  const foldersPath = getPagePath(values.parentFolderId, pages);
  return [foldersPath, values.path]
    .filter(Boolean)
    .join("/")
    .replace(/\/+/g, "/");
};

export const validatePageSettingsGeneralSection = ({
  pages,
  pageId,
  values,
  variableValues,
}: {
  pages: undefined | Pages;
  pageId: undefined | Page["id"];
  values: PageSettingsValues;
  variableValues: Map<string, unknown>;
}): PageSettingsErrors => {
  const computedValues = {
    name: values.name,
    path: values.path,
    status: computeExpression(values.status ?? `undefined`, variableValues),
    redirect: computeExpression(values.redirect, variableValues),
    documentType: values.documentType,
  };

  const validator = values.isHomePage
    ? homePageGeneralSettingsInput
    : pageGeneralSettingsInput;
  const parsedResult = validator.safeParse(computedValues);
  const errors: PageSettingsErrors =
    parsedResult.success === false
      ? parsedResult.error.flatten().fieldErrors
      : {};

  if (pages !== undefined && values.path !== undefined) {
    if (
      isPathAvailable({
        pages,
        path: values.path,
        parentFolderId: values.parentFolderId,
        pageId,
      }) === false
    ) {
      errors.path = errors.path ?? [];
      errors.path.push("All paths must be unique");
    }
    const messages = validatePathnamePattern(values.path);
    if (messages.length > 0) {
      errors.path = errors.path ?? [];
      errors.path.push(...messages);
    }
  }

  if (
    pages !== undefined &&
    values.path !== undefined &&
    computedValues.redirect &&
    typeof computedValues.redirect === "string" &&
    computedValues.redirect !== ""
  ) {
    const existingRedirects = pages.redirects ?? [];
    if (
      wouldCreateLoop(
        computePageSettingsPath(values, pages),
        computedValues.redirect,
        existingRedirects
      )
    ) {
      errors.redirect = errors.redirect ?? [];
      errors.redirect.push(LOOP_ERROR);
    }
  }

  return errors;
};

export const validatePageSettingsAuthSection = (
  values: PageSettingsValues
): PageSettingsErrors => {
  const hasAuth = values.auth.login !== "" || values.auth.password !== "";
  const authErrors = hasAuth
    ? validateBasicAuthCredentials({
        login: values.auth.login,
        password: values.auth.password,
      })
    : undefined;
  if (authErrors === undefined) {
    return {};
  }
  return { auth: authErrors };
};

export const validatePageSettingsSearchSection = (
  values: PageSettingsValues,
  variableValues: Map<string, unknown>
): PageSettingsErrors => {
  const parsedResult = pageSearchSettingsInput.safeParse({
    title:
      computeExpression(values.title, variableValues) ??
      "exclude from validation",
    description: computeExpression(values.description, variableValues),
    excludePageFromSearch: computeExpression(
      values.excludePageFromSearch,
      variableValues
    ),
    language: computeExpression(values.language, variableValues),
  });
  return parsedResult.success ? {} : parsedResult.error.flatten().fieldErrors;
};

export const validatePageSettingsSocialImageSection = (
  values: PageSettingsValues,
  variableValues: Map<string, unknown>
): PageSettingsErrors => {
  const parsedResult = pageSocialImageSettingsInput.safeParse({
    socialImageUrl: computeExpression(values.socialImageUrl, variableValues),
  });
  return parsedResult.success ? {} : parsedResult.error.flatten().fieldErrors;
};

export const validatePageSettingsCustomMetadataSection = (
  values: PageSettingsValues,
  variableValues: Map<string, unknown>
): PageSettingsErrors => {
  const parsedResult = pageCustomMetadataSettingsInput.safeParse({
    customMetas: values.customMetas.map((item) => ({
      property: item.property,
      content: computeExpression(item.content, variableValues),
    })),
  });
  return parsedResult.success ? {} : parsedResult.error.flatten().fieldErrors;
};

export const validatePageSettingsTextContentSection = (
  values: PageSettingsValues,
  variableValues: Map<string, unknown>
): PageSettingsErrors => {
  if (values.documentType !== "text") {
    return {};
  }

  const parsedResult = pageTextContentSettingsInput.safeParse({
    content: computeExpression(values.content, variableValues),
  });

  return parsedResult.success ? {} : parsedResult.error.flatten().fieldErrors;
};

export const validatePageSettings = ({
  pages,
  pageId,
  values,
  variableValues,
}: {
  pages: undefined | Pages;
  pageId: undefined | Page["id"];
  values: PageSettingsValues;
  variableValues: Map<string, unknown>;
}): PageSettingsErrors => {
  const errors: PageSettingsErrors = {};
  const sectionErrors = [
    validatePageSettingsGeneralSection({
      pages,
      pageId,
      values,
      variableValues,
    }),
    validatePageSettingsAuthSection(values),
  ];
  if (values.documentType === "html") {
    sectionErrors.push(
      validatePageSettingsSearchSection(values, variableValues),
      validatePageSettingsSocialImageSection(values, variableValues),
      validatePageSettingsCustomMetadataSection(values, variableValues)
    );
  }
  if (values.documentType === "text") {
    sectionErrors.push(
      validatePageSettingsTextContentSection(values, variableValues)
    );
  }
  for (const sectionError of sectionErrors) {
    if (sectionError.auth) {
      errors.auth = { ...errors.auth, ...sectionError.auth };
    }
    for (const fieldName of pageSettingsNonAuthFieldNames) {
      const messages = sectionError[fieldName];
      if (messages === undefined) {
        continue;
      }
      errors[fieldName] = [...(errors[fieldName] ?? []), ...messages];
    }
  }
  return errors;
};

export type FolderSettingsFieldErrors = Partial<
  Record<keyof FolderSettingsValues, string[]>
>;

export const validateFolderSettings = ({
  pages,
  values,
  folderId,
}: {
  pages: undefined | Pages;
  values: FolderSettingsValues;
  folderId?: Folder["id"];
}): FolderSettingsFieldErrors => {
  const parsedResult = folderSettingsInput.safeParse(values);
  if (parsedResult.success === false) {
    return parsedResult.error.flatten().fieldErrors;
  }
  if (
    pages !== undefined &&
    isSlugAvailable(
      values.slug,
      pages.folders,
      values.parentFolderId,
      folderId
    ) === false
  ) {
    return { slug: [`Slug "${values.slug}" is already in use`] };
  }
  return {};
};

export const folderCreateInput = folderFieldsInput.extend({
  folderId: runtimeGeneratedIdInput,
  parentFolderId: z.string().optional(),
});

export const folderUpdateInput = z.object({
  folderId: z.string(),
  values: folderFieldsInput.partial().extend({
    parentFolderId: z.string().optional(),
  }),
});

export const folderDeleteInput = z.object({
  folderId: z.string(),
});

export const pageTreeMoveInput = z.object({
  childId: z.string(),
  parentFolderId: z.string(),
  position: z.number().int().min(0),
});

export const pageMetaToPatchValue = (meta: PageMetaPatchInput) => {
  const result: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(meta)) {
    result[name] =
      name === "excludePageFromSearch"
        ? typeof value === "boolean"
          ? String(value)
          : normalizePageMetaValue(name as keyof PageMeta, value as never)
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
  if (input.isDraft === true && isPageDraft(page) === false) {
    patches.push({
      op: page.isDraft === undefined ? "add" : "replace",
      path: ["pages", page.id, "isDraft"],
      value: true,
    });
  } else if (input.isDraft === false && page.isDraft !== undefined) {
    patches.push({ op: "remove", path: ["pages", page.id, "isDraft"] });
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
        // Custom metadata is an optional array. Use `add` for the whole field
        // even when the local page already has it: JSON Patch `add` replaces an
        // object member when present, while also working for a just-created
        // page whose server copy has not received the field yet.
        op:
          name === "custom" || Object.hasOwn(page.meta, name) === false
            ? "add"
            : "replace",
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
  const normalizedInput = normalizePageFieldsExpressionInputs(input);
  const parentFolderId = input.parentFolderId ?? pages.rootFolderId;
  const parentFolder = getFolderOrThrow(pages, parentFolderId);
  const expressionIssues =
    collectPageExpressionValidationIssues(normalizedInput);
  if (expressionIssues.length > 0) {
    return throwBuilderValidationError(
      formatValidationIssueMessages(expressionIssues),
      expressionIssues
    );
  }
  const pathIssues = getPagePathValidationIssues(input.path);
  if (pathIssues.length > 0) {
    return throwBuilderValidationError(
      pathIssues.map((issue) => issue.detail).join("\n"),
      pathIssues
    );
  }
  const pageId = context.createId();
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
    name: normalizedInput.name ?? input.name,
    path: normalizedInput.path ?? input.path,
    title: normalizedInput.title,
    rootInstanceId,
    meta:
      normalizedInput.meta === undefined
        ? {}
        : (pageMetaToPatchValue(normalizedInput.meta) as Page["meta"]),
  });
  const rootInstance = createPageRootInstance(rootInstanceId);
  return createRuntimeMutation({
    payload: createPageCreatePayload({
      page,
      parentFolderId,
      parentChildIndex: parentFolder.children.length,
      rootInstance,
    }),
    result: { pageId, rootInstanceId },
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
  const normalizedValues = normalizePageFieldsExpressionInputs(input.values);
  const nextPath = normalizedValues.path ?? page.path;
  const nextIsDraft = normalizedValues.isDraft ?? isPageDraft(page);
  const draftabilityError = getPageDraftabilityError({
    pageId: page.id,
    pagePath: nextPath,
    homePageId: pages.homePageId,
  });
  if (nextIsDraft && draftabilityError !== undefined) {
    return throwBuilderRuntimeError("BAD_REQUEST", draftabilityError);
  }
  const expressionIssues =
    collectPageExpressionValidationIssues(normalizedValues);
  if (expressionIssues.length > 0) {
    return throwBuilderValidationError(
      formatValidationIssueMessages(expressionIssues),
      prefixValidationIssuePaths(expressionIssues, ["values"])
    );
  }
  const pathIssues = getPagePathValidationIssues(normalizedValues.path, [
    "values",
  ]);
  if (pathIssues.length > 0) {
    return throwBuilderValidationError(
      pathIssues.map((issue) => issue.detail).join("\n"),
      pathIssues
    );
  }
  if (
    (normalizedValues.path !== undefined ||
      normalizedValues.parentFolderId !== undefined) &&
    isPathAvailable({
      pages,
      path: normalizedValues.path ?? page.path,
      parentFolderId:
        normalizedValues.parentFolderId ??
        getParentFolderIdOrThrow(pages, page.id),
      pageId: page.id,
    }) === false
  ) {
    return throwBuilderRuntimeError(
      "CONFLICT",
      `Page path "${normalizedValues.path ?? page.path}" is already in use`
    );
  }
  if (normalizedValues.parentFolderId !== undefined) {
    getFolderOrThrow(pages, normalizedValues.parentFolderId);
    getParentFolderIdOrThrow(pages, page.id);
  }
  return createRuntimeMutation({
    payload: createPageUpdatePayload({
      input: normalizedValues,
      page,
      pages,
    }),
    result: { pageId: input.pageId },
    invalidatesNamespaces: ["pages"],
  });
};

export const getPageSettingsUpdateData = ({
  page,
  pages,
  values,
}: {
  page: Page;
  pages: Pages;
  values: Partial<PageSettingsValues>;
}): {
  pageValues: z.infer<typeof pageFieldsInput>;
  marketplace: z.infer<typeof pageMarketplaceInput> | undefined;
  shouldSetHomePage: boolean;
} => {
  const pageValues: z.infer<typeof pageFieldsInput> = {};
  const meta: NonNullable<z.infer<typeof pageFieldsInput>["meta"]> = {};
  if (values.name !== undefined) {
    pageValues.name = values.name;
  }
  if (values.path !== undefined) {
    pageValues.path = values.path;
  }
  if (values.title !== undefined) {
    pageValues.title = values.title;
  }
  if (values.parentFolderId !== undefined) {
    pageValues.parentFolderId = values.parentFolderId;
  }
  if (values.description !== undefined) {
    meta.description = values.description;
  }
  if (values.excludePageFromSearch !== undefined) {
    meta.excludePageFromSearch = values.excludePageFromSearch;
  }
  if (values.language !== undefined) {
    meta.language = values.language;
  }
  if (Object.hasOwn(values, "status")) {
    meta.status = values.status;
  }
  if (values.redirect !== undefined) {
    meta.redirect = values.redirect;
  }
  if (values.socialImageAssetId !== undefined) {
    meta.socialImageAssetId = values.socialImageAssetId;
  }
  if (values.socialImageUrl !== undefined) {
    meta.socialImageUrl = values.socialImageUrl;
  }
  if (values.customMetas !== undefined) {
    meta.custom = values.customMetas;
  }
  if (values.documentType !== undefined) {
    meta.documentType = values.documentType;
  }
  if (values.content !== undefined) {
    meta.content = values.content;
  }

  if (values.auth !== undefined) {
    const currentValues = getPageSettingsValues({
      page,
      pages,
      isHomePage: page.id === pages.homePageId,
    });
    meta.auth = getPageSettingsAuthFromValues({
      ...currentValues,
      ...values,
      auth: {
        ...currentValues.auth,
        ...values.auth,
      },
    });
  }
  if (Object.keys(meta).length > 0) {
    pageValues.meta = meta;
  }
  return {
    pageValues,
    marketplace: values.marketplace,
    shouldSetHomePage: values.isHomePage === true,
  };
};

export const updatePageSettings = (
  state: Pick<BuilderState, "pages">,
  input: z.infer<typeof pageSettingsUpdateInput>
) => {
  const pages = getRequiredPages(state);
  const page = findPage(pages, input.pageId);
  if (page === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Page not found");
  }
  const { pageValues, marketplace, shouldSetHomePage } =
    getPageSettingsUpdateData({
      page,
      pages,
      values: input.values,
    });
  const mutations = [];
  if (Object.keys(pageValues).length > 0) {
    mutations.push(
      updatePage(state, { pageId: input.pageId, values: pageValues })
    );
  }
  if (marketplace !== undefined) {
    mutations.push(
      updatePageMarketplace(state, { pageId: input.pageId, marketplace })
    );
  }
  if (shouldSetHomePage) {
    mutations.push(setHomePage(state, { pageId: input.pageId }));
  }
  return createRuntimeMutation({
    payload: compactBuilderPatchPayload(
      mutations.flatMap((mutation) => mutation.payload)
    ),
    result: { pageId: input.pageId },
    invalidatesNamespaces:
      mutations.length === 0 ? [] : Array.from(new Set(["pages"] as const)),
  });
};

export const savePagePathInHistory = (
  state: Pick<BuilderState, "pages">,
  input: z.infer<typeof pageSavePathInHistoryInput>
) => {
  const pages = getRequiredPages(state);
  const page = findPage(pages, input.pageId);
  if (page === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Page not found");
  }
  const path = input.path || getPagePath(page.id, pages);
  const history = Array.from(new Set([path, ...(page.history ?? [])])).slice(
    0,
    20
  );
  if (
    page.history !== undefined &&
    page.history.length === history.length &&
    page.history.every((item, index) => item === history[index])
  ) {
    return createRuntimeMutation({
      payload: [],
      result: { pageId: page.id },
      invalidatesNamespaces: ["pages"],
    });
  }
  return createRuntimeMutation({
    payload: [
      {
        namespace: "pages",
        patches: [
          {
            op: page.history === undefined ? "add" : "replace",
            path: ["pages", page.id, "history"],
            value: history,
          },
        ],
      },
    ],
    result: { pageId: page.id },
    invalidatesNamespaces: ["pages"],
  });
};

export const updatePageMarketplace = (
  state: Pick<BuilderState, "pages">,
  input: z.infer<typeof pageMarketplaceUpdateInput>
) => {
  const pages = getRequiredPages(state);
  const page = findPage(pages, input.pageId);
  if (page === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Page not found");
  }

  const marketplace = {
    include: input.marketplace.include,
    category:
      input.marketplace.category === ""
        ? undefined
        : input.marketplace.category,
    thumbnailAssetId:
      input.marketplace.thumbnailAssetId === ""
        ? undefined
        : input.marketplace.thumbnailAssetId,
  } satisfies NonNullable<Page["marketplace"]>;
  const patches: BuilderPatchChange["patches"] = [];
  if (page.marketplace === undefined) {
    patches.push({
      op: "add",
      path: ["pages", page.id, "marketplace"],
      value: marketplace,
    });
  } else {
    for (const [name, value] of Object.entries(marketplace)) {
      const currentValue =
        page.marketplace[name as keyof NonNullable<Page["marketplace"]>];
      const isOptionalField =
        name === "category" || name === "thumbnailAssetId";
      const hasCurrentValue =
        currentValue !== undefined &&
        (isOptionalField === false || currentValue !== "");
      if (
        currentValue === value ||
        (hasCurrentValue === false && value === undefined)
      ) {
        continue;
      }
      if (value === undefined) {
        patches.push({
          op: "remove",
          path: ["pages", page.id, "marketplace", name],
        });
        continue;
      }
      patches.push({
        op: hasCurrentValue ? "replace" : "add",
        path: ["pages", page.id, "marketplace", name],
        value,
      });
    }
  }

  return createRuntimeMutation({
    payload: compactBuilderPatchPayload([{ namespace: "pages", patches }]),
    result: { pageId: page.id, marketplace },
    invalidatesNamespaces: ["pages"],
  });
};

const cleanupFolderChildRefs = (
  folders: Pages["folders"],
  pageId: Page["id"]
) => {
  for (const folder of folders.values()) {
    folder.children = folder.children.filter((childId) => childId !== pageId);
  }
};

export const reparentOrphansMutable = (pages: Pages) => {
  const children = [pages.rootFolderId];
  for (const folder of getAllFolders(pages)) {
    children.push(...folder.children);
  }

  let rootFolder = getFolderById(pages, pages.rootFolderId);
  if (rootFolder === undefined) {
    rootFolder = {
      id: pages.rootFolderId,
      name: "Root",
      slug: "",
      children: [],
    };
    pages.folders.set(rootFolder.id, rootFolder);
  }

  if (pages.pages.has(pages.homePageId)) {
    let homePageRefCount = 0;
    for (const folder of getAllFolders(pages)) {
      for (const childId of folder.children) {
        if (childId === pages.homePageId) {
          homePageRefCount += 1;
        }
      }
    }
    if (rootFolder.children[0] !== pages.homePageId || homePageRefCount !== 1) {
      cleanupFolderChildRefs(pages.folders, pages.homePageId);
      rootFolder.children.unshift(pages.homePageId);
      children.push(pages.homePageId);
    }
  }

  for (const folder of getAllFolders(pages)) {
    if (children.includes(folder.id) === false) {
      rootFolder.children.push(folder.id);
    }
  }

  for (const page of getAllPages(pages)) {
    if (children.includes(page.id) === false) {
      rootFolder.children.push(page.id);
    }
  }
};

export const reparentOrphans = (state: Pick<BuilderState, "pages">) => {
  const pages = getRequiredPages(state);
  const before = structuredClone(pages);
  const after = structuredClone(pages);
  reparentOrphansMutable(after);
  return createRuntimeMutation({
    payload: compactBuilderPatchPayload([
      {
        namespace: "pages",
        patches:
          JSON.stringify(serializePages(before)) ===
          JSON.stringify(serializePages(after))
            ? []
            : [{ op: "replace", path: [], value: after }],
      },
    ]),
    result: {},
    invalidatesNamespaces: ["pages"],
  });
};

export const setHomePage = (
  state: Pick<BuilderState, "pages">,
  input: z.infer<typeof pageSetHomeInput>
) => {
  const pages = getRequiredPages(state);
  if (pages.homePageId === input.pageId) {
    return createRuntimeMutation({
      payload: [],
      result: { pageId: input.pageId },
      invalidatesNamespaces: [],
    });
  }

  const newHomePage = findPage(pages, input.pageId);
  const oldHomePage = getHomePage(pages);
  const rootFolder = pages.folders.get(pages.rootFolderId);
  if (newHomePage === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Page not found");
  }
  const draftabilityError = getPageDraftabilityError({
    pageId: newHomePage.id,
    pagePath: newHomePage.path,
    homePageId: newHomePage.id,
  });
  if (isPageDraft(newHomePage) && draftabilityError !== undefined) {
    return throwBuilderRuntimeError("BAD_REQUEST", draftabilityError);
  }
  if (rootFolder === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Root folder not found");
  }

  const nextFolders = new Map(
    Array.from(pages.folders, ([id, folder]) => [
      id,
      { ...folder, children: [...folder.children] },
    ])
  );
  cleanupFolderChildRefs(nextFolders, newHomePage.id);
  nextFolders.get(pages.rootFolderId)?.children.unshift(newHomePage.id);

  const patches: BuilderPatchChange["patches"] = [
    { op: "replace", path: ["homePageId"], value: newHomePage.id },
    { op: "replace", path: ["pages", newHomePage.id, "path"], value: "" },
    { op: "replace", path: ["pages", newHomePage.id, "name"], value: "Home" },
    {
      op: "replace",
      path: ["pages", oldHomePage.id, "name"],
      value: "Old Home",
    },
    {
      op: "replace",
      path: ["pages", oldHomePage.id, "path"],
      value: nameToPath(pages, "Old Home"),
    },
  ];
  for (const [folderId, folder] of pages.folders) {
    const nextFolder = nextFolders.get(folderId);
    if (
      nextFolder !== undefined &&
      JSON.stringify(folder.children) !== JSON.stringify(nextFolder.children)
    ) {
      patches.push({
        op: "replace",
        path: ["folders", folderId, "children"],
        value: nextFolder.children,
      });
    }
  }

  return createRuntimeMutation({
    payload: compactBuilderPatchPayload([{ namespace: "pages", patches }]),
    result: { pageId: newHomePage.id },
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

export const movePageTreeItem = (
  state: Pick<BuilderState, "pages">,
  input: z.infer<typeof pageTreeMoveInput>
) => {
  const pages = getRequiredPages(state);
  if (input.childId === pages.homePageId) {
    return throwBuilderRuntimeError("BAD_REQUEST", "Home page cannot be moved");
  }
  const isFolderChild = pages.folders.has(input.childId);
  if (isFolderChild) {
    if (input.childId === pages.rootFolderId) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        "Root folder cannot be moved"
      );
    }
    const descendantFolderIds = getAllChildrenAndSelf(
      input.childId,
      pages.folders,
      "folder"
    );
    if (descendantFolderIds.includes(input.parentFolderId)) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        "Folder cannot be moved into itself or a descendant"
      );
    }
  }
  if (isFolderChild === false && pages.pages.has(input.childId) === false) {
    return throwBuilderRuntimeError("NOT_FOUND", "Page or folder not found");
  }
  getFolderOrThrow(pages, input.parentFolderId);

  const plan = getOrderedFolderChildReparentPlan(
    pages.folders,
    input.childId,
    input.parentFolderId,
    input.position
  );
  if (plan === undefined) {
    return createRuntimeMutation({
      payload: [],
      result: { childId: input.childId },
      invalidatesNamespaces: [],
    });
  }
  return createRuntimeMutation({
    payload: [
      {
        namespace: "pages",
        patches: [
          {
            op: "remove",
            path: [
              "folders",
              plan.currentFolderId,
              "children",
              plan.currentIndex,
            ],
          },
          {
            op: "add",
            path: ["folders", plan.nextFolderId, "children", plan.nextIndex],
            value: input.childId,
          },
        ],
      },
    ],
    result: { childId: input.childId },
    invalidatesNamespaces: ["pages"],
  });
};
