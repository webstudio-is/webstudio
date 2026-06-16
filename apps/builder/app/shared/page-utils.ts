import { nanoid } from "nanoid";
import {
  findPageByIdOrPath,
  getFolderById,
  getPagePath,
  type Folder,
  type DataSource,
  type Page,
  type PageTemplate,
  type Pages,
  type WebstudioFragment,
  type WebstudioData,
  ROOT_INSTANCE_ID,
} from "@webstudio-is/sdk";
import { contentModePageMetaFields } from "@webstudio-is/project/content-mode-permissions";
import {
  extractWebstudioFragment,
  insertWebstudioFragmentCopy,
  unwrap,
} from "./instance-utils";
import {
  findAvailableVariables,
  replaceDataSourcesInExpression,
  restoreExpressionVariables,
  unsetExpressionVariables,
} from "./data-variables";
import { $project } from "./sync/data-stores";
import type { ConflictResolution } from "./token-conflict-dialog";

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
  conflictResolution,
  contentMode = false,
}: {
  source: WebstudioData;
  target: WebstudioData;
  sourceRootInstanceId: string;
  systemDataSourceId: string | undefined;
  conflictResolution: ConflictResolution | undefined;
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
    conflictResolution,
    systemDataSourceId,
    contentMode,
  });
};

const copyPageFragmentsMutable = ({
  target,
  rootFragment,
  bodyFragment,
  systemDataSourceId,
  conflictResolution,
  onBreakpointLimitMerge,
  contentMode = false,
}: {
  target: WebstudioData;
  rootFragment?: WebstudioFragment;
  bodyFragment: WebstudioFragment;
  systemDataSourceId: string | undefined;
  conflictResolution: ConflictResolution | undefined;
  onBreakpointLimitMerge?: () => void;
  contentMode?: boolean;
}) => {
  const project = $project.get();
  if (project === undefined) {
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
      projectId: project.id,
      conflictResolution,
      onBreakpointLimitMerge,
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
    projectId: project.id,
    conflictResolution,
    onBreakpointLimitMerge,
    contentMode,
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
}: {
  page: Page;
  copied: NonNullable<ReturnType<typeof copyPageFragmentsMutable>>;
  target: { data: WebstudioData; folderId: Folder["id"] };
}) => {
  const newPage = structuredClone(unwrap(page));
  newPage.id = nanoid();
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
}: {
  template: PageTemplate;
  copied: NonNullable<ReturnType<typeof copyPageFragmentsMutable>>;
  target: { data: WebstudioData };
}) => {
  const newTemplate = structuredClone(unwrap(template));
  newTemplate.id = nanoid();
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

export const copyAndTransformPageMeta = (
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

export const __testing__ = {
  deduplicateName,
  deduplicatePath,
  joinPath,
};

export const insertPageFromTemplateMutable = ({
  templateId,
  source,
  target,
  overrides,
  conflictResolution,
  contentMode = false,
}: {
  templateId: PageTemplate["id"];
  source: { data: WebstudioData };
  target: { data: WebstudioData; folderId: Folder["id"] };
  overrides: { name: string; path: string };
  conflictResolution?: ConflictResolution;
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
    conflictResolution,
    contentMode,
  });
  if (copied === undefined) {
    return;
  }
  const newPage: Page = {
    id: nanoid(),
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
  conflictResolution,
}: {
  source: { data: WebstudioData; pageId: Page["id"] };
  target: { data: WebstudioData; folderId: Folder["id"] };
  conflictResolution?: ConflictResolution;
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
    conflictResolution,
  });
  if (copied === undefined) {
    return;
  }
  return insertCopiedPageMutable({ page, copied, target });
};

export const insertPageCopyFromFragmentsMutable = ({
  source,
  target,
  conflictResolution,
  onBreakpointLimitMerge,
}: {
  source: {
    page: Page;
    rootFragment?: WebstudioFragment;
    bodyFragment: WebstudioFragment;
  };
  target: { data: WebstudioData; folderId: Folder["id"] };
  conflictResolution?: ConflictResolution;
  onBreakpointLimitMerge?: () => void;
}) => {
  const copied = copyPageFragmentsMutable({
    target: target.data,
    rootFragment: source.rootFragment,
    bodyFragment: source.bodyFragment,
    systemDataSourceId: source.page.systemDataSourceId,
    conflictResolution,
    onBreakpointLimitMerge,
  });
  if (copied === undefined) {
    return;
  }
  return insertCopiedPageMutable({ page: source.page, copied, target });
};

export const insertTemplateCopyFromFragmentsMutable = ({
  source,
  target,
  conflictResolution,
  onBreakpointLimitMerge,
}: {
  source: {
    template: PageTemplate;
    rootFragment?: WebstudioFragment;
    bodyFragment: WebstudioFragment;
  };
  target: { data: WebstudioData };
  conflictResolution?: ConflictResolution;
  onBreakpointLimitMerge?: () => void;
}) => {
  const copied = copyPageFragmentsMutable({
    target: target.data,
    rootFragment: source.rootFragment,
    bodyFragment: source.bodyFragment,
    systemDataSourceId: undefined,
    conflictResolution,
    onBreakpointLimitMerge,
  });
  if (copied === undefined) {
    return;
  }
  return insertCopiedTemplateMutable({
    template: source.template,
    copied,
    target,
  });
};

export type PageCopyData = {
  page: Page;
  rootFragment: WebstudioFragment;
  bodyFragment: WebstudioFragment;
};

export type TemplateCopyData = {
  template: PageTemplate;
  rootFragment: WebstudioFragment;
  bodyFragment: WebstudioFragment;
};

export type FolderCopyData = {
  folder: Folder;
  children: Array<PageCopyData | FolderCopyData>;
};

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
  conflictResolution,
  onBreakpointLimitMerge,
  forceFolderCopySuffix = false,
}: {
  source: FolderCopyData;
  target: { data: WebstudioData; parentFolderId: Folder["id"] };
  conflictResolution?: ConflictResolution;
  onBreakpointLimitMerge?: () => void;
  forceFolderCopySuffix?: boolean;
}) => {
  const copyContext = {
    didCopyRootFragment: false,
  };

  return insertFolderCopyFromDataWithContextMutable({
    source,
    target,
    conflictResolution,
    onBreakpointLimitMerge,
    forceFolderCopySuffix,
    copyContext,
  });
};

const insertFolderCopyFromDataWithContextMutable = ({
  source,
  target,
  conflictResolution,
  onBreakpointLimitMerge,
  forceFolderCopySuffix,
  copyContext,
}: {
  source: FolderCopyData;
  target: { data: WebstudioData; parentFolderId: Folder["id"] };
  conflictResolution?: ConflictResolution;
  onBreakpointLimitMerge?: () => void;
  forceFolderCopySuffix?: boolean;
  copyContext: { didCopyRootFragment: boolean };
}) => {
  const parentFolder = target.data.pages.folders.get(target.parentFolderId);
  if (parentFolder === undefined) {
    return;
  }

  const newFolder: Folder = {
    ...structuredClone(unwrap(source.folder)),
    id: nanoid(),
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
        conflictResolution,
        onBreakpointLimitMerge,
        forceFolderCopySuffix,
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
      conflictResolution,
      onBreakpointLimitMerge,
    });
    if (rootFragment !== undefined && pageId !== undefined) {
      copyContext.didCopyRootFragment = true;
    }
  }

  return newFolder.id;
};
