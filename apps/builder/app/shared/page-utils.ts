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
} from "@webstudio-is/sdk";
import {
  extractWebstudioFragment,
  insertWebstudioFragmentCopy,
} from "./instance-utils";

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
  const fragment = extractWebstudioFragment(source.data, page.rootInstanceId);
  const { newInstanceIds, newDataSourceIds } = insertWebstudioFragmentCopy({
    data: target.data,
    fragment,
    availableDataSources: new Set(),
  });
  const newPageId = nanoid();
  const newRootInstanceId =
    newInstanceIds.get(page.rootInstanceId) ?? page.rootInstanceId;
  const newSystemDataSourceId =
    newDataSourceIds.get(page.systemDataSourceId) ?? page.systemDataSourceId;
  const newPage: Page = {
    ...page,
    id: newPageId,
    rootInstanceId: newRootInstanceId,
    systemDataSourceId: newSystemDataSourceId,
    name: deduplicateName(target.data.pages, target.folderId, page.name),
    path: deduplicatePath(target.data.pages, target.folderId, page.path),
    title: replaceDataSources(page.title, newDataSourceIds),
    meta: {
      ...page.meta,
      description:
        page.meta.description === undefined
          ? undefined
          : replaceDataSources(page.meta.description, newDataSourceIds),
      excludePageFromSearch:
        page.meta.excludePageFromSearch === undefined
          ? undefined
          : replaceDataSources(
              page.meta.excludePageFromSearch,
              newDataSourceIds
            ),
      socialImageUrl:
        page.meta.socialImageUrl === undefined
          ? undefined
          : replaceDataSources(page.meta.socialImageUrl, newDataSourceIds),
      language:
        page.meta.language === undefined
          ? undefined
          : replaceDataSources(page.meta.language, newDataSourceIds),
      status:
        page.meta.status === undefined
          ? undefined
          : replaceDataSources(page.meta.status, newDataSourceIds),
      redirect:
        page.meta.redirect === undefined
          ? undefined
          : replaceDataSources(page.meta.redirect, newDataSourceIds),
      custom: page.meta.custom?.map(({ property, content }) => ({
        property,
        content: replaceDataSources(content, newDataSourceIds),
      })),
    },
  };
  target.data.pages.pages.push(newPage);
  for (const folder of target.data.pages.folders) {
    if (folder.id === target.folderId) {
      folder.children.push(newPageId);
    }
  }
  return newPageId;
};
