import {
  type ContentModeCopyableProp,
  extractWebstudioFragment,
  insertWebstudioFragmentCopy,
} from "./fragment";
import { isFragmentContentModeCopyableProp } from "./content-mode-copy-policy";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  createWebstudioDataFromBuild,
  findAvailableVariables,
  produceWebstudioDataMutation,
  replaceDataSourcesInExpression,
  restoreExpressionVariables,
  unsetExpressionVariables,
} from "./data";
import {
  findParentFolderByChildId,
  findPageByIdOrPath,
  getFolderById,
  getPagePath,
  elementComponent,
  type Asset,
  type Folder,
  type DataSource,
  type Page,
  type PageTemplate,
  type Pages,
  type WsComponentMeta,
  type WebstudioFragment,
  type WebstudioData,
  ROOT_INSTANCE_ID,
} from "@webstudio-is/sdk";
import type { ConflictResolution } from "./style-copy";
import type { BuilderState } from "../state/builder-state";
import { webstudioDataNamespaces } from "../contracts/namespaces";
import { throwBuilderRuntimeError } from "./errors";
import { createRuntimeMutation } from "./mutation";
import {
  collectExclusiveInstanceIds,
  createInstanceCleanupPayload,
} from "./instances";
import {
  getPageExpressionErrors,
  getRequiredPages,
  isPathAvailable,
  pageFieldsInput,
  pageMetaToPatchValue,
} from "./pages";
import { unwrap } from "./unwrap";
import { componentMetas } from "@webstudio-is/sdk-components-registry/metas";
import {
  pageTransferItemInput,
  type FolderCopyData,
  type PageCopyData,
  type TemplateCopyData,
} from "./data-formats/page-transfer";

type CreateId = () => string;

export const pageDuplicateInput = z.object({
  projectId: z.string(),
  pageId: z.string(),
  parentFolderId: z.string().optional(),
  name: z.string().min(1).optional(),
  path: z.string().optional(),
});

const isHydratedWebstudioData = (value: unknown): value is WebstudioData => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const data = value as Partial<WebstudioData>;
  return webstudioDataNamespaces.every((namespace) => {
    if (namespace === "pages") {
      return (
        data.pages?.pages instanceof Map && data.pages.folders instanceof Map
      );
    }
    return data[namespace] instanceof Map;
  });
};

const sourceWebstudioDataInput = z
  .custom<WebstudioData>(isHydratedWebstudioData, {
    message:
      "sourceData must be a hydrated WebstudioData object from the source project",
  })
  .describe(
    "Required hydrated WebstudioData from the source project. This is a low-level cross-project transfer command; use duplicate-page to copy a page within the configured project."
  );

export const pageCopyInput = z.object({
  projectId: z.string(),
  sourceData: sourceWebstudioDataInput,
  pageId: z
    .string()
    .describe("ID of the page in sourceData to copy into this project."),
  parentFolderId: z.string().optional(),
  conflictResolution: z.enum(["ours", "theirs", "merge"]).optional(),
});

export const folderDuplicateInput = z.object({
  projectId: z.string(),
  folderId: z.string(),
  parentFolderId: z.string().optional(),
});

export const pageTemplateCreatePageInput = z.object({
  projectId: z.string(),
  templateId: z.string(),
  parentFolderId: z.string().optional(),
  name: z.string().min(1),
  path: z.string(),
  contentMode: z.boolean().optional(),
});

const pageTemplateFieldsInput = pageFieldsInput.pick({
  name: true,
  title: true,
  meta: true,
});

export const pageTemplateCreateInput = pageTemplateFieldsInput.extend({
  name: z.string().min(1),
});

export const pageTemplateUpdateInput = z.object({
  templateId: z.string(),
  values: pageTemplateFieldsInput,
});

export const pageTemplateDeleteInput = z.object({
  templateId: z.string(),
});

export const pageTemplateDuplicateInput = z.object({
  projectId: z.string(),
  templateId: z.string(),
});

export const pageTemplateReorderInput = z.object({
  sourceTemplateId: z.string(),
  targetTemplateId: z.string(),
  position: z.enum(["before", "after"]),
});

const contentModePageMetaFields = new Set([
  "description",
  "title",
  "excludePageFromSearch",
  "language",
  "socialImageAssetId",
  "socialImageUrl",
  "custom",
]);

const getRequiredWebstudioData = (state: BuilderState): WebstudioData => {
  for (const namespace of webstudioDataNamespaces) {
    if (state[namespace] === undefined) {
      return throwBuilderRuntimeError(
        "BAD_REQUEST",
        `${namespace} namespace is missing`
      );
    }
  }
  return state as WebstudioData;
};

const pageCopyInvalidatesNamespaces = webstudioDataNamespaces;

const parseCopyNumberSuffix = (value: string) => {
  const { name = value, copyNumber = "0" } =
    value.match(/^(?<name>.+) \((?<copyNumber>\d+)\)$/)?.groups ?? {};
  return { baseName: name, copyNumber: Number(copyNumber) };
};

const getNextCopyNumberedName = ({
  usedNames,
  name,
  forceCopySuffix = false,
}: {
  usedNames: Set<string>;
  name: string;
  forceCopySuffix?: boolean;
}) => {
  const { baseName, copyNumber } = parseCopyNumberSuffix(name);
  if (forceCopySuffix === false && usedNames.has(baseName) === false) {
    return baseName;
  }

  let nameNumber = copyNumber;
  let newName = baseName;
  do {
    nameNumber += 1;
    newName = `${baseName} (${nameNumber})`;
  } while (usedNames.has(newName));
  return newName;
};

const deduplicateName = (
  pages: Pages,
  folderId: Folder["id"],
  pageName: Page["name"]
) => {
  const folder = getFolderById(pages, folderId);
  const usedNames = new Set<string>();
  for (const pageId of folder?.children ?? []) {
    const page = findPageByIdOrPath(pageId, pages);
    if (page) {
      usedNames.add(page.name);
    }
  }
  return getNextCopyNumberedName({ usedNames, name: pageName });
};

const deduplicatePath = (
  pages: Pages,
  folderId: Folder["id"],
  path: Page["path"]
) => {
  const folderPath = getPagePath(folderId, pages);
  if (path === "/") {
    path = "";
  }
  let matchedPage = findPageByIdOrPath(joinPath(folderPath, path), pages);
  if (matchedPage === undefined) {
    return path;
  }
  let counter = 0;
  while (matchedPage) {
    counter += 1;
    matchedPage = findPageByIdOrPath(
      joinPath(folderPath, `/copy-${counter}`, path),
      pages
    );
  }
  return `/copy-${counter}${path}`;
};

// Normalize to avoid double slashes when folderPath is "/" (empty-slug folder).
const joinPath = (...parts: string[]) => parts.join("").replace(/\/+/g, "/");

/**
 * Copies the project :root and the given page/template body from `source`
 * into `target`. Returns the remapped instance ids plus an expression
 * transformer that rebinds legacy page system variables to the global one.
 */
const copyPageRootAndBodyMutable = ({
  source,
  target,
  sourceRootInstanceId,
  systemDataSourceId,
  projectId,
  metas,
  conflictResolution,
  contentModeCopyableProp,
  createId = nanoid,
  contentMode = false,
}: {
  source: WebstudioData;
  target: WebstudioData;
  sourceRootInstanceId: string;
  systemDataSourceId: string | undefined;
  projectId?: string;
  metas?: Map<string, WsComponentMeta>;
  conflictResolution: ConflictResolution | undefined;
  contentModeCopyableProp?: ContentModeCopyableProp;
  createId?: CreateId;
  contentMode?: boolean;
}) => {
  const unsetVariables = new Set<DataSource["id"]>();
  // replace legacy page system with global variable
  if (systemDataSourceId) {
    unsetVariables.add(systemDataSourceId);
  }

  return copyPageFragmentsMutable({
    target,
    rootFragment:
      contentMode === false
        ? extractWebstudioFragment(source, ROOT_INSTANCE_ID)
        : undefined,
    bodyFragment: extractWebstudioFragment(source, sourceRootInstanceId, {
      unsetVariables,
    }),
    projectId,
    metas,
    conflictResolution,
    systemDataSourceId,
    contentModeCopyableProp,
    createId,
    contentMode,
  });
};

const copyPageFragmentsMutable = ({
  target,
  rootFragment,
  bodyFragment,
  systemDataSourceId,
  projectId,
  metas,
  conflictResolution,
  contentModeCopyableProp,
  onBreakpointLimitMerge,
  createId = nanoid,
  contentMode = false,
}: {
  target: WebstudioData;
  rootFragment?: WebstudioFragment;
  bodyFragment: WebstudioFragment;
  systemDataSourceId: string | undefined;
  projectId?: string;
  metas?: Map<string, WsComponentMeta>;
  conflictResolution: ConflictResolution | undefined;
  contentModeCopyableProp?: ContentModeCopyableProp;
  onBreakpointLimitMerge?: () => void;
  createId?: CreateId;
  contentMode?: boolean;
}) => {
  if (projectId === undefined) {
    return;
  }
  if (contentMode === false && rootFragment !== undefined) {
    insertWebstudioFragmentCopy({
      data: target,
      fragment: rootFragment,
      availableVariables: findAvailableVariables({
        ...target,
        startingInstanceId: ROOT_INSTANCE_ID,
      }),
      projectId,
      metas,
      conflictResolution,
      contentModeCopyableProp,
      onBreakpointLimitMerge,
      createId,
    });
  }
  const unsetNameById = new Map<DataSource["id"], DataSource["name"]>();
  if (systemDataSourceId) {
    unsetNameById.set(systemDataSourceId, "system");
  }
  const availableVariables = findAvailableVariables({
    ...target,
    startingInstanceId: ROOT_INSTANCE_ID,
  });
  const maskedIdByName = new Map<DataSource["name"], DataSource["id"]>();
  for (const dataSource of availableVariables) {
    maskedIdByName.set(dataSource.name, dataSource.id);
  }
  const { newInstanceIds, newDataSourceIds } = insertWebstudioFragmentCopy({
    data: target,
    fragment: bodyFragment,
    availableVariables,
    projectId,
    metas,
    conflictResolution,
    contentModeCopyableProp,
    onBreakpointLimitMerge,
    contentMode,
    createId,
  });
  const transformExpression = (expression: string) => {
    expression = unsetExpressionVariables({ expression, unsetNameById });
    expression = restoreExpressionVariables({ expression, maskedIdByName });
    expression = replaceDataSourcesInExpression(expression, newDataSourceIds);
    return expression;
  };
  return { newInstanceIds, newDataSourceIds, transformExpression };
};

const insertCopiedPageMutable = ({
  page,
  copied,
  target,
  createId,
}: {
  page: Page;
  copied: NonNullable<ReturnType<typeof copyPageFragmentsMutable>>;
  target: { data: WebstudioData; folderId: Folder["id"] };
  createId: CreateId;
}) => {
  const newPage = structuredClone(unwrap(page));
  newPage.id = createId();
  delete newPage.systemDataSourceId;
  newPage.rootInstanceId =
    copied.newInstanceIds.get(page.rootInstanceId) ?? page.rootInstanceId;
  newPage.name = deduplicateName(target.data.pages, target.folderId, page.name);
  newPage.path = deduplicatePath(target.data.pages, target.folderId, page.path);
  newPage.title = copied.transformExpression(newPage.title);
  copyAndTransformPageMeta(
    newPage.meta,
    newPage.meta,
    copied.transformExpression
  );
  target.data.pages.pages.set(newPage.id, newPage);
  target.data.pages.folders.get(target.folderId)?.children.push(newPage.id);
  return newPage.id;
};

const deduplicateTemplateName = (
  pages: Pages,
  templateName: PageTemplate["name"]
) => {
  const usedNames = new Set<string>();
  for (const template of pages.pageTemplates?.values() ?? []) {
    usedNames.add(template.name);
  }
  return getNextCopyNumberedName({ usedNames, name: templateName });
};

const insertCopiedTemplateMutable = ({
  template,
  copied,
  target,
  createId,
}: {
  template: PageTemplate;
  copied: NonNullable<ReturnType<typeof copyPageFragmentsMutable>>;
  target: { data: WebstudioData };
  createId: CreateId;
}) => {
  const newTemplate = structuredClone(unwrap(template));
  newTemplate.id = createId();
  newTemplate.rootInstanceId =
    copied.newInstanceIds.get(template.rootInstanceId) ??
    template.rootInstanceId;
  newTemplate.name = deduplicateTemplateName(target.data.pages, template.name);
  newTemplate.title = copied.transformExpression(newTemplate.title);
  newTemplate.systemDataSourceId =
    template.systemDataSourceId === undefined
      ? undefined
      : (copied.newDataSourceIds.get(template.systemDataSourceId) ??
        template.systemDataSourceId);
  copyAndTransformPageMeta(
    newTemplate.meta,
    newTemplate.meta,
    copied.transformExpression
  );
  target.data.pages.pageTemplates ??= new Map();
  target.data.pages.pageTemplates.set(newTemplate.id, newTemplate);
  return newTemplate.id;
};

const copyAndTransformPageMeta = (
  source: Page["meta"],
  target: Page["meta"],
  transform: (expression: string) => string,
  options?: { fields?: Set<string> }
) => {
  const { fields } = options ?? {};
  const canCopy = (field: string) => fields === undefined || fields.has(field);

  if (source.description !== undefined && canCopy("description")) {
    target.description = transform(source.description);
  }
  if (source.title !== undefined && canCopy("title")) {
    target.title = transform(source.title);
  }
  if (
    source.excludePageFromSearch !== undefined &&
    canCopy("excludePageFromSearch")
  ) {
    target.excludePageFromSearch = transform(source.excludePageFromSearch);
  }
  if (source.socialImageUrl !== undefined && canCopy("socialImageUrl")) {
    target.socialImageUrl = transform(source.socialImageUrl);
  }
  if (
    source.socialImageAssetId !== undefined &&
    canCopy("socialImageAssetId")
  ) {
    target.socialImageAssetId = source.socialImageAssetId;
  }
  if (source.documentType !== undefined && canCopy("documentType")) {
    target.documentType = source.documentType;
  }
  if (source.content !== undefined && canCopy("content")) {
    target.content = source.content;
  }
  if (source.auth !== undefined && canCopy("auth")) {
    target.auth = { ...source.auth };
  }
  if (source.language !== undefined && canCopy("language")) {
    target.language = transform(source.language);
  }
  if (source.status !== undefined && canCopy("status")) {
    target.status = transform(source.status);
  }
  if (source.redirect !== undefined && canCopy("redirect")) {
    target.redirect = transform(source.redirect);
  }
  if (source.custom && canCopy("custom")) {
    target.custom = source.custom.map(({ property, content }) => ({
      property,
      content: transform(content),
    }));
  }
};

export const pageCopyTesting = {
  deduplicateName,
  deduplicatePath,
  joinPath,
};

export const insertPageFromTemplateMutable = ({
  templateId,
  source,
  target,
  overrides,
  projectId,
  metas,
  conflictResolution,
  contentModeCopyableProp,
  createId = nanoid,
  contentMode = false,
}: {
  templateId: PageTemplate["id"];
  source: { data: WebstudioData };
  target: { data: WebstudioData; folderId: Folder["id"] };
  overrides: { name: string; path: string };
  projectId?: string;
  metas?: Map<string, WsComponentMeta>;
  conflictResolution?: ConflictResolution;
  contentModeCopyableProp?: ContentModeCopyableProp;
  createId?: CreateId;
  contentMode?: boolean;
}) => {
  const template = source.data.pages.pageTemplates?.get(templateId);
  if (template === undefined) {
    return;
  }
  const copied = copyPageRootAndBodyMutable({
    source: source.data,
    target: target.data,
    sourceRootInstanceId: template.rootInstanceId,
    systemDataSourceId: template.systemDataSourceId,
    projectId,
    metas,
    conflictResolution,
    contentModeCopyableProp,
    contentMode,
    createId,
  });
  if (copied === undefined) {
    return;
  }
  const newPage: Page = {
    id: createId(),
    name: deduplicateName(target.data.pages, target.folderId, overrides.name),
    path: deduplicatePath(target.data.pages, target.folderId, overrides.path),
    title: copied.transformExpression(template.title),
    rootInstanceId:
      copied.newInstanceIds.get(template.rootInstanceId) ??
      template.rootInstanceId,
    meta: {},
  };
  copyAndTransformPageMeta(
    template.meta,
    newPage.meta,
    copied.transformExpression,
    {
      fields: contentMode ? contentModePageMetaFields : undefined,
    }
  );
  target.data.pages.pages.set(newPage.id, newPage);
  target.data.pages.folders.get(target.folderId)?.children.push(newPage.id);
  return newPage.id;
};

export const insertPageCopyMutable = ({
  source,
  target,
  projectId,
  conflictResolution,
  createId = nanoid,
}: {
  source: { data: WebstudioData; pageId: Page["id"] };
  target: { data: WebstudioData; folderId: Folder["id"] };
  projectId?: string;
  conflictResolution?: ConflictResolution;
  createId?: CreateId;
}) => {
  const page = findPageByIdOrPath(source.pageId, source.data.pages);
  if (page === undefined) {
    return;
  }
  const copied = copyPageRootAndBodyMutable({
    source: source.data,
    target: target.data,
    sourceRootInstanceId: page.rootInstanceId,
    systemDataSourceId: page.systemDataSourceId,
    projectId,
    conflictResolution,
    createId,
  });
  if (copied === undefined) {
    return;
  }
  return insertCopiedPageMutable({ page, copied, target, createId });
};

export const createPageDuplicatePayload = ({
  build,
  assets,
  projectId,
  pageId,
  parentFolderId,
  name,
  path,
  createId = nanoid,
}: {
  build: Parameters<typeof createWebstudioDataFromBuild>[0]["build"];
  assets?: Asset[];
  projectId: string;
  pageId: Page["id"];
  parentFolderId: Folder["id"];
  name?: Page["name"];
  path?: Page["path"];
  createId?: CreateId;
}) => {
  const before = createWebstudioDataFromBuild({ build, assets });
  let duplicatedPageId: Page["id"] | undefined;
  const { payload } = produceWebstudioDataMutation(before, (draft) => {
    duplicatedPageId = insertPageCopyMutable({
      source: { data: draft, pageId },
      target: { data: draft, folderId: parentFolderId },
      projectId,
      createId,
    });
    if (duplicatedPageId === undefined) {
      return;
    }
    const page = draft.pages.pages.get(duplicatedPageId);
    if (page === undefined) {
      duplicatedPageId = undefined;
      return;
    }
    if (name !== undefined) {
      page.name = name;
    }
    if (path !== undefined) {
      page.path = path;
    }
  });
  if (duplicatedPageId === undefined) {
    return;
  }
  return {
    pageId: duplicatedPageId,
    payload,
  };
};

export const duplicatePage = (
  state: BuilderState,
  input: z.infer<typeof pageDuplicateInput>,
  context: { createId: CreateId }
) => {
  const data = getRequiredWebstudioData(state);
  const parentFolderId =
    input.parentFolderId ??
    findParentFolderByChildId(input.pageId, data.pages.folders)?.id;
  if (parentFolderId === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Page parent folder was not found"
    );
  }
  if (data.pages.folders.has(parentFolderId) === false) {
    return throwBuilderRuntimeError("NOT_FOUND", "Parent folder not found");
  }
  if (
    input.path !== undefined &&
    isPathAvailable({
      pages: data.pages,
      path: input.path,
      parentFolderId,
    }) === false
  ) {
    return throwBuilderRuntimeError(
      "CONFLICT",
      `Page path "${input.path}" is already in use`
    );
  }
  const duplicate = createPageDuplicatePayload({
    build: data,
    assets: Array.from(data.assets.values()),
    projectId: input.projectId,
    pageId: input.pageId,
    parentFolderId,
    name: input.name,
    path: input.path,
    createId: context.createId,
  });
  if (duplicate === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Page could not be duplicated"
    );
  }
  return createRuntimeMutation({
    payload: duplicate.payload,
    result: { pageId: duplicate.pageId },
    invalidatesNamespaces: pageCopyInvalidatesNamespaces,
  });
};

export const copyPage = (
  state: BuilderState,
  input: z.infer<typeof pageCopyInput>,
  context: { createId: CreateId }
) => {
  const data = getRequiredWebstudioData(state);
  const parentFolderId = input.parentFolderId ?? data.pages.rootFolderId;
  if (data.pages.folders.has(parentFolderId) === false) {
    return throwBuilderRuntimeError("NOT_FOUND", "Parent folder not found");
  }
  const before = createWebstudioDataFromBuild({
    build: data,
    assets: Array.from(data.assets.values()),
  });
  let pageId: Page["id"] | undefined;
  const { payload } = produceWebstudioDataMutation(before, (draft) => {
    pageId = insertPageCopyMutable({
      source: { data: input.sourceData, pageId: input.pageId },
      target: { data: draft, folderId: parentFolderId },
      projectId: input.projectId,
      conflictResolution: input.conflictResolution,
      createId: context.createId,
    });
  });
  if (pageId === undefined) {
    return throwBuilderRuntimeError("BAD_REQUEST", "Page could not be copied");
  }
  return createRuntimeMutation({
    payload,
    result: { pageId },
    invalidatesNamespaces: pageCopyInvalidatesNamespaces,
  });
};

export const duplicateFolder = (
  state: BuilderState,
  input: z.infer<typeof folderDuplicateInput>,
  context: { createId: CreateId }
) => {
  const data = getRequiredWebstudioData(state);
  const parentFolderId =
    input.parentFolderId ??
    findParentFolderByChildId(input.folderId, data.pages.folders)?.id;
  if (parentFolderId === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Folder parent folder was not found"
    );
  }
  if (data.pages.folders.has(parentFolderId) === false) {
    return throwBuilderRuntimeError("NOT_FOUND", "Parent folder not found");
  }
  const copyData = createFolderCopyData({ data, folderId: input.folderId });
  if (copyData === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Folder not found");
  }

  const before = createWebstudioDataFromBuild({
    build: data,
    assets: Array.from(data.assets.values()),
  });
  let folderId: Folder["id"] | undefined;
  const { payload } = produceWebstudioDataMutation(before, (draft) => {
    folderId = insertFolderCopyFromDataMutable({
      source: copyData,
      target: { data: draft, parentFolderId },
      projectId: input.projectId,
      forceFolderCopySuffix: true,
      createId: context.createId,
    });
  });
  if (folderId === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Folder could not be duplicated"
    );
  }
  return createRuntimeMutation({
    payload,
    result: { folderId },
    invalidatesNamespaces: pageCopyInvalidatesNamespaces,
  });
};

export const createPageTemplate = (
  state: BuilderState,
  input: z.infer<typeof pageTemplateCreateInput>,
  context: { createId: CreateId }
) => {
  const data = getRequiredWebstudioData(state);
  const expressionErrors = getPageExpressionErrors(input);
  if (expressionErrors.length > 0) {
    return throwBuilderRuntimeError("BAD_REQUEST", expressionErrors.join("\n"));
  }

  const before = createWebstudioDataFromBuild({
    build: data,
    assets: Array.from(data.assets.values()),
  });
  const templateId = context.createId();
  const rootInstanceId = context.createId();
  const { payload } = produceWebstudioDataMutation(before, (draft) => {
    draft.pages.pageTemplates ??= new Map();
    draft.pages.pageTemplates.set(templateId, {
      id: templateId,
      name: input.name,
      title: input.title ?? "",
      rootInstanceId,
      meta:
        input.meta === undefined
          ? {}
          : (pageMetaToPatchValue(input.meta) as PageTemplate["meta"]),
    });
    draft.instances.set(rootInstanceId, {
      type: "instance",
      id: rootInstanceId,
      component: elementComponent,
      tag: "body",
      children: [],
    });
  });
  return createRuntimeMutation({
    payload,
    result: { templateId, rootInstanceId },
    invalidatesNamespaces: pageCopyInvalidatesNamespaces,
  });
};

export const updatePageTemplate = (
  state: BuilderState,
  input: z.infer<typeof pageTemplateUpdateInput>
) => {
  const data = getRequiredWebstudioData(state);
  const template = data.pages.pageTemplates?.get(input.templateId);
  if (template === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Page template not found");
  }
  const expressionErrors = getPageExpressionErrors(input.values);
  if (expressionErrors.length > 0) {
    return throwBuilderRuntimeError("BAD_REQUEST", expressionErrors.join("\n"));
  }

  const before = createWebstudioDataFromBuild({
    build: data,
    assets: Array.from(data.assets.values()),
  });
  const { payload } = produceWebstudioDataMutation(before, (draft) => {
    const nextTemplate = draft.pages.pageTemplates?.get(input.templateId);
    if (nextTemplate === undefined) {
      return throwBuilderRuntimeError("NOT_FOUND", "Page template not found");
    }
    if (input.values.name !== undefined) {
      nextTemplate.name = input.values.name;
    }
    if (input.values.title !== undefined) {
      nextTemplate.title = input.values.title;
    }
    if (input.values.meta !== undefined) {
      for (const [name, value] of Object.entries(
        pageMetaToPatchValue(input.values.meta)
      )) {
        if (value === undefined) {
          delete nextTemplate.meta[name as keyof PageTemplate["meta"]];
          continue;
        }
        nextTemplate.meta[name as keyof PageTemplate["meta"]] = value as never;
      }
    }
  });
  return createRuntimeMutation({
    payload,
    result: { templateId: input.templateId },
    invalidatesNamespaces: pageCopyInvalidatesNamespaces,
  });
};

export const deletePageTemplate = (
  state: BuilderState,
  input: z.infer<typeof pageTemplateDeleteInput>
) => {
  const data = getRequiredWebstudioData(state);
  const template = data.pages.pageTemplates?.get(input.templateId);
  if (template === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Page template not found");
  }
  return createRuntimeMutation({
    payload: [
      {
        namespace: "pages",
        patches: [{ op: "remove", path: ["pageTemplates", input.templateId] }],
      },
      ...createInstanceCleanupPayload({
        instanceIds: collectExclusiveInstanceIds(data.instances, [
          template.rootInstanceId,
        ]),
        props: data.props.values(),
        dataSources: data.dataSources.values(),
        styleSources: data.styleSources.values(),
        styleSourceSelections: data.styleSourceSelections.values(),
        styles: data.styles.values(),
      }),
    ],
    result: { templateId: input.templateId },
    invalidatesNamespaces: pageCopyInvalidatesNamespaces,
  });
};

export const duplicatePageTemplate = (
  state: BuilderState,
  input: z.infer<typeof pageTemplateDuplicateInput>,
  context: { createId: CreateId }
) => {
  const data = getRequiredWebstudioData(state);
  const template = data.pages.pageTemplates?.get(input.templateId);
  if (template === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Page template not found");
  }
  const before = createWebstudioDataFromBuild({
    build: data,
    assets: Array.from(data.assets.values()),
  });
  let templateId: PageTemplate["id"] | undefined;
  const { payload } = produceWebstudioDataMutation(before, (draft) => {
    draft.pages.pageTemplates ??= new Map();
    const copyData = createTemplateCopyData({
      data: draft,
      template,
    });
    templateId = insertTemplateCopyFromFragmentsMutable({
      source: {
        template: copyData.template,
        bodyFragment: copyData.bodyFragment,
      },
      target: { data: draft },
      projectId: input.projectId,
      createId: context.createId,
    });
  });
  if (templateId === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Page template could not be duplicated"
    );
  }
  return createRuntimeMutation({
    payload,
    result: { templateId },
    invalidatesNamespaces: pageCopyInvalidatesNamespaces,
  });
};

export const reorderPageTemplatesMutable = (
  sourceId: string,
  targetId: string,
  position: "before" | "after",
  data: Pick<WebstudioData, "pages">
) => {
  const templates = data.pages.pageTemplates;
  if (templates === undefined || sourceId === targetId) {
    return;
  }

  const orderedTemplates = Array.from(templates.values());
  const sourceIndex = orderedTemplates.findIndex((t) => t.id === sourceId);
  if (sourceIndex === -1) {
    return;
  }

  const [sourceTemplate] = orderedTemplates.splice(sourceIndex, 1);

  const targetIndex = orderedTemplates.findIndex((t) => t.id === targetId);
  if (targetIndex === -1) {
    orderedTemplates.push(sourceTemplate);
  } else {
    const insertIndex = position === "before" ? targetIndex : targetIndex + 1;
    orderedTemplates.splice(insertIndex, 0, sourceTemplate);
  }

  templates.clear();
  for (const template of orderedTemplates) {
    templates.set(template.id, template);
  }
};

export const reorderPageTemplates = (
  state: BuilderState,
  input: z.infer<typeof pageTemplateReorderInput>
) => {
  const pages = getRequiredPages(state);
  const templates = pages.pageTemplates;
  if (templates?.has(input.sourceTemplateId) !== true) {
    return throwBuilderRuntimeError(
      "NOT_FOUND",
      "Source page template not found"
    );
  }
  if (templates.has(input.targetTemplateId) === false) {
    return throwBuilderRuntimeError(
      "NOT_FOUND",
      "Target page template not found"
    );
  }

  const after = structuredClone(pages);
  reorderPageTemplatesMutable(
    input.sourceTemplateId,
    input.targetTemplateId,
    input.position,
    { pages: after }
  );
  return createRuntimeMutation({
    payload:
      input.sourceTemplateId === input.targetTemplateId
        ? []
        : [
            {
              namespace: "pages",
              patches: [
                {
                  op: "replace",
                  path: ["pageTemplates"],
                  value: after.pageTemplates ?? new Map(),
                },
              ],
            },
          ],
    result: { templateId: input.sourceTemplateId },
    invalidatesNamespaces: ["pages"],
  });
};

export const listPageTemplates = (state: Pick<BuilderState, "pages">) => {
  const pages = getRequiredPages(state);
  return {
    templates: Array.from(pages.pageTemplates?.values() ?? []).map(
      (template) => ({
        id: template.id,
        name: template.name,
        title: template.title,
        rootInstanceId: template.rootInstanceId,
        systemDataSourceId: template.systemDataSourceId,
        meta: template.meta,
      })
    ),
  };
};

export const createPageFromTemplate = (
  state: BuilderState,
  input: z.infer<typeof pageTemplateCreatePageInput>,
  context: { createId: CreateId }
) => {
  const data = getRequiredWebstudioData(state);
  const template = data.pages.pageTemplates?.get(input.templateId);
  if (template === undefined) {
    return throwBuilderRuntimeError("NOT_FOUND", "Page template not found");
  }
  const parentFolderId = input.parentFolderId ?? data.pages.rootFolderId;
  if (data.pages.folders.has(parentFolderId) === false) {
    return throwBuilderRuntimeError("NOT_FOUND", "Parent folder not found");
  }
  if (
    isPathAvailable({
      pages: data.pages,
      path: input.path,
      parentFolderId,
    }) === false
  ) {
    return throwBuilderRuntimeError(
      "CONFLICT",
      `Page path "${input.path}" is already in use`
    );
  }

  const before = createWebstudioDataFromBuild({
    build: data,
    assets: Array.from(data.assets.values()),
  });
  let pageId: Page["id"] | undefined;
  const { payload } = produceWebstudioDataMutation(before, (draft) => {
    pageId = insertPageFromTemplateMutable({
      templateId: input.templateId,
      source: { data: draft },
      target: { data: draft, folderId: parentFolderId },
      overrides: { name: input.name, path: input.path },
      projectId: input.projectId,
      metas: componentMetas,
      contentModeCopyableProp: isFragmentContentModeCopyableProp,
      contentMode: input.contentMode,
      createId: context.createId,
    });
  });
  if (pageId === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Page could not be created from template"
    );
  }
  return createRuntimeMutation({
    payload,
    result: { pageId },
    invalidatesNamespaces: pageCopyInvalidatesNamespaces,
  });
};

export const insertPageCopyFromFragmentsMutable = ({
  source,
  target,
  projectId,
  conflictResolution,
  contentModeCopyableProp,
  onBreakpointLimitMerge,
  createId = nanoid,
}: {
  source: {
    page: Page;
    rootFragment?: WebstudioFragment;
    bodyFragment: WebstudioFragment;
  };
  target: { data: WebstudioData; folderId: Folder["id"] };
  projectId?: string;
  conflictResolution?: ConflictResolution;
  contentModeCopyableProp?: ContentModeCopyableProp;
  onBreakpointLimitMerge?: () => void;
  createId?: CreateId;
}) => {
  const copied = copyPageFragmentsMutable({
    target: target.data,
    rootFragment: source.rootFragment,
    bodyFragment: source.bodyFragment,
    systemDataSourceId: source.page.systemDataSourceId,
    projectId,
    conflictResolution,
    contentModeCopyableProp,
    onBreakpointLimitMerge,
    createId,
  });
  if (copied === undefined) {
    return;
  }
  return insertCopiedPageMutable({
    page: source.page,
    copied,
    target,
    createId,
  });
};

export const insertTemplateCopyFromFragmentsMutable = ({
  source,
  target,
  projectId,
  conflictResolution,
  contentModeCopyableProp,
  onBreakpointLimitMerge,
  createId = nanoid,
}: {
  source: {
    template: PageTemplate;
    rootFragment?: WebstudioFragment;
    bodyFragment: WebstudioFragment;
  };
  target: { data: WebstudioData };
  projectId?: string;
  conflictResolution?: ConflictResolution;
  contentModeCopyableProp?: ContentModeCopyableProp;
  onBreakpointLimitMerge?: () => void;
  createId?: CreateId;
}) => {
  const copied = copyPageFragmentsMutable({
    target: target.data,
    rootFragment: source.rootFragment,
    bodyFragment: source.bodyFragment,
    systemDataSourceId: undefined,
    projectId,
    conflictResolution,
    contentModeCopyableProp,
    onBreakpointLimitMerge,
    createId,
  });
  if (copied === undefined) {
    return;
  }
  return insertCopiedTemplateMutable({
    template: source.template,
    copied,
    target,
    createId,
  });
};

export const pageTransferInsertInput = z.object({
  projectId: z.string(),
  targetFolderId: z.string(),
  item: pageTransferItemInput,
  conflictResolution: z.enum(["ours", "theirs", "merge"]).optional(),
});

export const createPageCopyData = ({
  data,
  page,
}: {
  data: WebstudioData;
  page: Page;
}): PageCopyData => {
  return {
    page,
    rootFragment: extractWebstudioFragment(data, ROOT_INSTANCE_ID),
    bodyFragment: extractWebstudioFragment(data, page.rootInstanceId, {
      unsetVariables:
        page.systemDataSourceId === undefined
          ? undefined
          : new Set([page.systemDataSourceId]),
    }),
  };
};

export const createTemplateCopyData = ({
  data,
  template,
}: {
  data: WebstudioData;
  template: PageTemplate;
}): TemplateCopyData => {
  return {
    template,
    rootFragment: extractWebstudioFragment(data, ROOT_INSTANCE_ID),
    bodyFragment: extractWebstudioFragment(data, template.rootInstanceId),
  };
};

export const createFolderCopyData = ({
  data,
  folderId,
}: {
  data: WebstudioData;
  folderId: Folder["id"];
}): FolderCopyData | undefined => {
  const folder = data.pages.folders.get(folderId);
  if (folder === undefined) {
    return;
  }
  const children: FolderCopyData["children"] = [];
  for (const childId of folder.children) {
    const childFolder = createFolderCopyData({ data, folderId: childId });
    if (childFolder) {
      children.push(childFolder);
      continue;
    }
    const childPage = findPageByIdOrPath(childId, data.pages);
    if (childPage) {
      children.push(createPageCopyData({ data, page: childPage }));
    }
  }
  return { folder, children };
};

const isFolderCopyData = (
  item: PageCopyData | FolderCopyData
): item is FolderCopyData => "folder" in item;

const deduplicateFolderName = (
  pages: Pages,
  parentFolderId: Folder["id"],
  name: Folder["name"],
  forceCopySuffix = false
) => {
  const parentFolder = getFolderById(pages, parentFolderId);
  const usedNames = new Set<string>();
  for (const childId of parentFolder?.children ?? []) {
    const childFolder = pages.folders.get(childId);
    if (childFolder) {
      usedNames.add(childFolder.name);
      continue;
    }
    const childPage = findPageByIdOrPath(childId, pages);
    if (childPage) {
      usedNames.add(childPage.name);
    }
  }
  return getNextCopyNumberedName({ usedNames, name, forceCopySuffix });
};

const deduplicateFolderSlug = (
  pages: Pages,
  parentFolderId: Folder["id"],
  slug: Folder["slug"],
  forceCopySuffix = false
) => {
  // Empty slugs are explicitly allowed to repeat for folders.
  if (slug === "") {
    return slug;
  }

  const { slug: baseSlug = slug, copyNumber } =
    slug.match(/^(?<slug>.+)-(?<copyNumber>\d+)$/)?.groups ?? {};
  const parentFolder = getFolderById(pages, parentFolderId);
  const usedSlugs = new Set<string>();
  for (const childId of parentFolder?.children ?? []) {
    const childFolder = pages.folders.get(childId);
    if (childFolder) {
      usedSlugs.add(childFolder.slug);
    }
  }
  if (forceCopySuffix === false && usedSlugs.has(baseSlug) === false) {
    return baseSlug;
  }

  let counter = Number(copyNumber ?? "0");
  let newSlug = baseSlug;
  do {
    counter += 1;
    newSlug = baseSlug ? `${baseSlug}-${counter}` : `copy-${counter}`;
  } while (usedSlugs.has(newSlug));
  return newSlug;
};

export const insertFolderCopyFromDataMutable = ({
  source,
  target,
  projectId,
  conflictResolution,
  contentModeCopyableProp,
  onBreakpointLimitMerge,
  forceFolderCopySuffix = false,
  createId = nanoid,
}: {
  source: FolderCopyData;
  target: { data: WebstudioData; parentFolderId: Folder["id"] };
  projectId?: string;
  conflictResolution?: ConflictResolution;
  contentModeCopyableProp?: ContentModeCopyableProp;
  onBreakpointLimitMerge?: () => void;
  forceFolderCopySuffix?: boolean;
  createId?: CreateId;
}) => {
  const copyContext = {
    didCopyRootFragment: false,
  };

  return insertFolderCopyFromDataWithContextMutable({
    source,
    target,
    projectId,
    conflictResolution,
    contentModeCopyableProp,
    onBreakpointLimitMerge,
    forceFolderCopySuffix,
    createId,
    copyContext,
  });
};

export const insertPageTransferItem = (
  state: BuilderState,
  input: z.infer<typeof pageTransferInsertInput>,
  context: { createId: CreateId }
) => {
  const data = getRequiredWebstudioData(state);
  if (data.pages.folders.has(input.targetFolderId) === false) {
    return throwBuilderRuntimeError("NOT_FOUND", "Target folder not found");
  }
  const before = createWebstudioDataFromBuild({
    build: data,
    assets: Array.from(data.assets.values()),
  });
  let didReachBreakpointLimit = false;
  const onBreakpointLimitMerge = () => {
    didReachBreakpointLimit = true;
  };
  let id: Page["id"] | Folder["id"] | undefined;
  const { payload } = produceWebstudioDataMutation(before, (draft) => {
    if (input.item.type === "page") {
      id = insertPageCopyFromFragmentsMutable({
        source: input.item,
        target: { data: draft, folderId: input.targetFolderId },
        projectId: input.projectId,
        conflictResolution: input.conflictResolution,
        onBreakpointLimitMerge,
        createId: context.createId,
      });
    } else if (input.item.type === "template") {
      id = insertTemplateCopyFromFragmentsMutable({
        source: input.item,
        target: { data: draft },
        projectId: input.projectId,
        conflictResolution: input.conflictResolution,
        onBreakpointLimitMerge,
        createId: context.createId,
      });
    } else {
      id = insertFolderCopyFromDataMutable({
        source: input.item,
        target: { data: draft, parentFolderId: input.targetFolderId },
        projectId: input.projectId,
        conflictResolution: input.conflictResolution,
        onBreakpointLimitMerge,
        createId: context.createId,
      });
    }
  });
  if (id === undefined) {
    return throwBuilderRuntimeError(
      "BAD_REQUEST",
      "Transfer item was not inserted"
    );
  }
  return createRuntimeMutation({
    payload,
    result: {
      id,
      type: input.item.type,
      didReachBreakpointLimit,
    },
    invalidatesNamespaces: pageCopyInvalidatesNamespaces,
  });
};

const insertFolderCopyFromDataWithContextMutable = ({
  source,
  target,
  projectId,
  conflictResolution,
  contentModeCopyableProp,
  onBreakpointLimitMerge,
  forceFolderCopySuffix,
  createId,
  copyContext,
}: {
  source: FolderCopyData;
  target: { data: WebstudioData; parentFolderId: Folder["id"] };
  projectId?: string;
  conflictResolution?: ConflictResolution;
  contentModeCopyableProp?: ContentModeCopyableProp;
  onBreakpointLimitMerge?: () => void;
  forceFolderCopySuffix?: boolean;
  createId: CreateId;
  copyContext: { didCopyRootFragment: boolean };
}) => {
  const parentFolder = target.data.pages.folders.get(target.parentFolderId);
  if (parentFolder === undefined) {
    return;
  }

  const newFolder: Folder = {
    ...unwrap(source.folder),
    id: createId(),
    name: deduplicateFolderName(
      target.data.pages,
      target.parentFolderId,
      source.folder.name,
      forceFolderCopySuffix
    ),
    slug: deduplicateFolderSlug(
      target.data.pages,
      target.parentFolderId,
      source.folder.slug,
      forceFolderCopySuffix
    ),
    children: [],
  };
  target.data.pages.folders.set(newFolder.id, newFolder);
  parentFolder.children.push(newFolder.id);

  for (const child of source.children) {
    if (isFolderCopyData(child)) {
      insertFolderCopyFromDataWithContextMutable({
        source: child,
        target: { data: target.data, parentFolderId: newFolder.id },
        projectId,
        conflictResolution,
        contentModeCopyableProp,
        onBreakpointLimitMerge,
        forceFolderCopySuffix,
        createId,
        copyContext,
      });
      continue;
    }
    const rootFragment = copyContext.didCopyRootFragment
      ? undefined
      : child.rootFragment;
    const pageId = insertPageCopyFromFragmentsMutable({
      source: { ...child, rootFragment },
      target: { data: target.data, folderId: newFolder.id },
      projectId,
      conflictResolution,
      contentModeCopyableProp,
      onBreakpointLimitMerge,
      createId,
    });
    if (rootFragment !== undefined && pageId !== undefined) {
      copyContext.didCopyRootFragment = true;
    }
  }

  return newFolder.id;
};
