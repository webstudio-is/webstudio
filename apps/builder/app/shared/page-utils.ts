import { nanoid } from "nanoid";
import {
  decodeDataSourceVariable,
  encodeDataSourceVariable,
  findPageByIdOrPath,
  getPagePath,
  transpileExpression,
  type Folder,
  type DataSource,
  type Page,
  type Pages,
  type WebstudioData,
  ROOT_INSTANCE_ID,
} from "@webstudio-is/sdk";
import {
  extractWebstudioFragment,
  insertWebstudioFragmentCopy,
  unwrap,
} from "./instance-utils";
import {
  findAvailableVariables,
  restoreExpressionVariables,
  unsetExpressionVariables,
} from "./data-variables";

const deduplicateName = (
  pages: Pages,
  folderId: Folder["id"],
  pageName: Page["name"]
) => {
  const { name = pageName, copyNumber } =
    // extract a number from "name (copyNumber)"
    pageName.match(/^(?<name>.+) \((?<copyNumber>\d+)\)$/)?.groups ?? {};
  const folder = pages.folders.find((folder) => folder.id === folderId);
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
  let matchedPage = findPageByIdOrPath(`${folderPath}${path}`, pages);
  if (matchedPage === undefined) {
    return path;
  }
  let counter = 0;
  while (matchedPage) {
    counter += 1;
    matchedPage = findPageByIdOrPath(
      `${folderPath}/copy-${counter}${path}`,
      pages
    );
  }
  return `/copy-${counter}${path}`;
};

const replaceDataSources = (
  expression: string,
  replacements: Map<DataSource["id"], DataSource["id"]>
) => {
  return transpileExpression({
    expression,
    replaceVariable: (identifier) => {
      const dataSourceId = decodeDataSourceVariable(identifier);
      if (dataSourceId === undefined) {
        return;
      }
      return encodeDataSourceVariable(
        replacements.get(dataSourceId) ?? dataSourceId
      );
    },
  });
};

export const insertPageCopyMutable = ({
  source,
  target,
}: {
  source: { data: WebstudioData; pageId: Page["id"] };
  target: { data: WebstudioData; folderId: Folder["id"] };
}) => {
  const page = findPageByIdOrPath(source.pageId, source.data.pages);
  if (page === undefined) {
    return;
  }
  // copy paste project :root
  insertWebstudioFragmentCopy({
    data: target.data,
    fragment: extractWebstudioFragment(source.data, ROOT_INSTANCE_ID),
    availableVariables: findAvailableVariables({
      ...target.data,
      startingInstanceId: ROOT_INSTANCE_ID,
    }),
  });
  const unsetVariables = new Set<DataSource["id"]>();
  const unsetNameById = new Map<DataSource["id"], DataSource["name"]>();
  // replace legacy page system with global variable
  if (page.systemDataSourceId) {
    unsetVariables.add(page.systemDataSourceId);
    unsetNameById.set(page.systemDataSourceId, "system");
  }
  const availableVariables = findAvailableVariables({
    ...target.data,
    startingInstanceId: ROOT_INSTANCE_ID,
  });
  const maskedIdByName = new Map<DataSource["name"], DataSource["id"]>();
  for (const dataSource of availableVariables) {
    maskedIdByName.set(dataSource.name, dataSource.id);
  }
  // copy paste page body
  const { newInstanceIds, newDataSourceIds } = insertWebstudioFragmentCopy({
    data: target.data,
    fragment: extractWebstudioFragment(source.data, page.rootInstanceId, {
      unsetVariables,
    }),
    availableVariables,
  });
  // unwrap page draft
  const newPage = structuredClone(unwrap(page));
  newPage.id = nanoid();
  delete newPage.systemDataSourceId;
  newPage.rootInstanceId =
    newInstanceIds.get(page.rootInstanceId) ?? page.rootInstanceId;
  newPage.name = deduplicateName(target.data.pages, target.folderId, page.name);
  newPage.path = deduplicatePath(target.data.pages, target.folderId, page.path);
  const transformExpression = (expression: string) => {
    // rebind expressions with from page system variable to global one
    expression = unsetExpressionVariables({ expression, unsetNameById });
    expression = restoreExpressionVariables({ expression, maskedIdByName });
    expression = replaceDataSources(expression, newDataSourceIds);
    return expression;
  };
  newPage.title = transformExpression(newPage.title);
  if (newPage.meta.description !== undefined) {
    newPage.meta.description = transformExpression(newPage.meta.description);
  }
  if (newPage.meta.excludePageFromSearch !== undefined) {
    newPage.meta.excludePageFromSearch = transformExpression(
      newPage.meta.excludePageFromSearch
    );
  }
  if (newPage.meta.socialImageUrl !== undefined) {
    newPage.meta.socialImageUrl = transformExpression(
      newPage.meta.socialImageUrl
    );
  }
  if (newPage.meta.language !== undefined) {
    newPage.meta.language = transformExpression(newPage.meta.language);
  }
  if (newPage.meta.status !== undefined) {
    newPage.meta.status = transformExpression(newPage.meta.status);
  }
  if (newPage.meta.redirect !== undefined) {
    newPage.meta.redirect = transformExpression(newPage.meta.redirect);
  }
  if (newPage.meta.custom) {
    newPage.meta.custom = newPage.meta.custom.map(({ property, content }) => ({
      property,
      content: transformExpression(content),
    }));
  }
  target.data.pages.pages.push(newPage);
  for (const folder of target.data.pages.folders) {
    if (folder.id === target.folderId) {
      folder.children.push(newPage.id);
    }
  }
  return newPage.id;
};
