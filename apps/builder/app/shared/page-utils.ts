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

const deduplicateName = (
  pages: Pages,
  folderId: Folder["id"],
  pageName: Page["name"]
) => {
  const { name = pageName, copyNumber } =
    // extract a number from "name (copyNumber)"
    pageName.match(/^(?<name>.+) \((?<copyNumber>\d+)\)$/)?.groups ?? {};
  const folder = getFolderById(pages, folderId);
  const usedNames = new Set<string>();
  for (const pageId of folder?.children ?? []) {
    const page = findPageByIdOrPath(pageId, pages);
    if (page) {
      usedNames.add(page.name);
    }
  }
  let newName = name;
  let nameNumber = Number(copyNumber ?? "0");
  while (usedNames.has(newName)) {
    nameNumber += 1;
    newName = `${name} (${nameNumber})`;
  }
  return newName;
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
  const project = $project.get();
  if (project === undefined) {
    return;
  }
  if (contentMode === false) {
    // copy paste project :root
    insertWebstudioFragmentCopy({
      data: target,
      fragment: extractWebstudioFragment(source, ROOT_INSTANCE_ID),
      availableVariables: findAvailableVariables({
        ...target,
        startingInstanceId: ROOT_INSTANCE_ID,
      }),
      projectId: project.id,
      conflictResolution,
    });
  }
  const unsetVariables = new Set<DataSource["id"]>();
  const unsetNameById = new Map<DataSource["id"], DataSource["name"]>();
  // replace legacy page system with global variable
  if (systemDataSourceId) {
    unsetVariables.add(systemDataSourceId);
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
  // copy paste page body
  const { newInstanceIds, newDataSourceIds } = insertWebstudioFragmentCopy({
    data: target,
    fragment: extractWebstudioFragment(source, sourceRootInstanceId, {
      unsetVariables,
    }),
    availableVariables,
    projectId: project.id,
    conflictResolution,
    contentMode,
  });
  const transformExpression = (expression: string) => {
    // rebind expressions from page system variable to the global one
    expression = unsetExpressionVariables({ expression, unsetNameById });
    expression = restoreExpressionVariables({ expression, maskedIdByName });
    expression = replaceDataSourcesInExpression(expression, newDataSourceIds);
    return expression;
  };
  return { newInstanceIds, transformExpression };
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
  // unwrap page draft
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
