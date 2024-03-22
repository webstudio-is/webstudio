import { nanoid } from "nanoid";
import { atom, computed } from "nanostores";
import { createRootFolder } from "@webstudio-is/project-build";
import {
  type Page,
  Pages,
  type Folder,
  findPageByIdOrPath,
  ROOT_FOLDER_ID,
  isRoot,
  type WebstudioData,
  getPagePath,
  findParentFolderByChildId,
  DataSource,
  decodeDataSourceVariable,
  encodeDataSourceVariable,
  transpileExpression,
} from "@webstudio-is/sdk";
import { removeByMutable } from "~/shared/array-utils";
import {
  deleteInstanceMutable,
  extractWebstudioFragment,
  insertWebstudioFragmentCopy,
  updateWebstudioData,
} from "~/shared/instance-utils";
import {
  $dataSourceVariables,
  $dataSources,
  $pages,
  $resourceValues,
  $selectedInstanceSelector,
  $selectedPageId,
} from "~/shared/nano-states";

type TreePage = {
  type: "page";
  id: string;
  data: Page;
};

type TreeFolder = {
  // currently used only for root node
  type: "folder";
  id: Folder["id"];
  name: Folder["name"];
  slug: Folder["slug"];
  children: Array<TreeData>;
};

export type TreeData = TreeFolder | TreePage;

type Index = Map<string, TreeData>;

const PAGES_ROOT_ID = "root";

export const isRootId = (id: string) => id === PAGES_ROOT_ID;

/**
 * Return a nested tree structure from flat pages and folders.
 * To be used for rendering.
 */
export const toTreeData = (
  pages: Pages
): { root: TreeFolder; index: Index } => {
  const pagesMap = new Map(pages.pages.map((page) => [page.id, page]));
  pagesMap.set(pages.homePage.id, pages.homePage);

  const foldersMap = new Map(
    pages.folders.map((folder) => [folder.id, folder])
  );
  const index: Index = new Map();

  const folderToTree = (folder: Folder) => {
    // Using map to ensure uniqueness of children.
    const children = new Map<string, TreeData>();
    for (const id of folder.children) {
      const folder = foldersMap.get(id);
      // It is a folder, not a page.
      if (folder) {
        const treeFolder = folderToTree(folder);
        children.set(treeFolder.id, treeFolder);
        index.set(folder.id, treeFolder);
        continue;
      }
      const page = pagesMap.get(id);
      if (page) {
        const treePage = {
          type: "page",
          id: page.id,
          data: page,
        } satisfies TreePage;
        children.set(treePage.id, treePage);
        index.set(page.id, treePage);
        continue;
      }
    }

    return {
      type: "folder",
      id: folder.id,
      name: folder.name,
      slug: folder.slug,
      children: Array.from(children.values()),
    } satisfies TreeFolder;
  };
  const rootFolder = foldersMap.get(PAGES_ROOT_ID);
  if (rootFolder === undefined) {
    throw new Error("Root folder not found");
  }
  return {
    root: folderToTree(rootFolder),
    index,
  };
};

/**
 * When page or folder needs to be deleted or moved to a different parent,
 * we want to cleanup any existing reference to it in current folder.
 * We could do this in just one folder, but I think its more robust to check all,
 * just in case we got double referencing.
 */
export const cleanupChildRefsMutable = (
  id: Folder["id"] | Page["id"],
  folders: Array<Folder>
) => {
  for (const folder of folders) {
    const index = folder.children.indexOf(id);
    if (index !== -1) {
      // Not exiting here just to be safe and check all folders even though it should be impossible
      // to have the same id in multiple folders.
      folder.children.splice(index, 1);
    }
  }
};

/**
 * When page or folder is found and its not referenced in any other folder children,
 * we consider it orphaned due to collaborative changes and we put it into the root folder.
 */
export const reparentOrphansMutable = (pages: Pages) => {
  const children = [ROOT_FOLDER_ID];
  for (const folder of pages.folders) {
    children.push(...folder.children);
  }

  let rootFolder = pages.folders.find(isRoot);
  // Should never happen, but just in case.
  if (rootFolder === undefined) {
    rootFolder = createRootFolder();
    pages.folders.push(rootFolder);
  }

  for (const folder of pages.folders) {
    // It's an orphan
    if (children.includes(folder.id) === false) {
      rootFolder.children.push(folder.id);
    }
  }

  for (const page of pages.pages) {
    // It's an orphan
    if (children.includes(page.id) === false) {
      rootFolder.children.push(page.id);
    }
  }
};

/**
 * Returns true if folder's slug is unique within it's future parent folder.
 * Needed to verify if the folder can be nested under the parent folder without modifying slug.
 */
export const isSlugUsed = (
  slug: string,
  folders: Array<Folder>,
  parentFolderId: Folder["id"],
  // undefined folder id means new folder
  folderId?: Folder["id"]
) => {
  const foldersMap = new Map(folders.map((folder) => [folder.id, folder]));
  const parentFolder = foldersMap.get(parentFolderId);
  // Should be impossible because at least root folder is always found.
  if (parentFolder === undefined) {
    return false;
  }

  return (
    parentFolder.children.some(
      (id) => foldersMap.get(id)?.slug === slug && id !== folderId
    ) === false
  );
};

/**
 * - Register a folder or a page inside children of a given parent folder.
 * - Fallback to a root folder.
 * - Cleanup any potential references in other folders.
 */
export const registerFolderChildMutable = (
  folders: Array<Folder>,
  id: Page["id"] | Folder["id"],
  // In case we couldn't find the current folder during update for any reason,
  // we will always fall back to the root folder.
  parentFolderId?: Folder["id"]
) => {
  const parentFolder =
    folders.find((folder) => folder.id === parentFolderId) ??
    folders.find(isRoot);
  cleanupChildRefsMutable(id, folders);
  parentFolder?.children.push(id);
};

/**
 * Get all child folder ids of the current folder including itself.
 */
export const getAllChildrenAndSelf = (
  id: Folder["id"] | Page["id"],
  folders: Array<Folder>,
  filter: "folder" | "page"
) => {
  const child = folders.find((folder) => folder.id === id);
  const children: Array<Folder["id"]> = [];
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

/**
 * Deletes a page.
 */
export const deletePageMutable = (pageId: Page["id"], data: WebstudioData) => {
  const { pages } = data;
  // deselect page before deleting to avoid flash of content
  if ($selectedPageId.get() === pageId) {
    $selectedPageId.set(pages.homePage.id);
    $selectedInstanceSelector.set(undefined);
  }
  const rootInstanceId = findPageByIdOrPath(pageId, pages)?.rootInstanceId;
  if (rootInstanceId !== undefined) {
    deleteInstanceMutable(data, [rootInstanceId]);
  }
  removeByMutable(pages.pages, (page) => page.id === pageId);
  cleanupChildRefsMutable(pageId, pages.folders);
};

/**
 * Deletes folder and child folders.
 * Doesn't delete pages, only returns pageIds.
 */
export const deleteFolderWithChildrenMutable = (
  folderId: Folder["id"],
  folders: Array<Folder>
) => {
  const folderIds = getAllChildrenAndSelf(folderId, folders, "folder");
  const pageIds = getAllChildrenAndSelf(folderId, folders, "page");
  for (const folderId of folderIds) {
    cleanupChildRefsMutable(folderId, folders);
    removeByMutable(folders, (folder) => folder.id === folderId);
  }

  return {
    folderIds,
    pageIds,
  };
};

/**
 * Filter out folders that are children of the current folder or the current folder itself.
 */
export const filterSelfAndChildren = (
  folderId: Folder["id"],
  folders: Array<Folder>
) => {
  const folderIds = getAllChildrenAndSelf(folderId, folders, "folder");
  return folders.filter((folder) => {
    return folderIds.includes(folder.id) === false;
  });
};

export const getExistingRoutePaths = (pages?: Pages): Set<string> => {
  const paths: Set<string> = new Set();
  if (pages === undefined) {
    return paths;
  }

  for (const page of pages.pages) {
    const pagePath = getPagePath(page.id, pages);
    if (pagePath === undefined) {
      continue;
    }
    paths.add(pagePath);
  }
  return paths;
};

export const $editingPagesItemId = atom<undefined | Page["id"]>();

const $editingPage = computed(
  [$editingPagesItemId, $pages],
  (editingPagesItemId, pages) => {
    if (editingPagesItemId === undefined || pages === undefined) {
      return;
    }
    return findPageByIdOrPath(editingPagesItemId, pages);
  }
);

const $pageRootVariableValues = computed(
  [$editingPage, $dataSources, $dataSourceVariables, $resourceValues],
  (page, dataSources, dataSourceVariables, resourceValues) => {
    const variableValues = new Map<string, unknown>();
    if (page === undefined) {
      return variableValues;
    }
    for (const variable of dataSources.values()) {
      if (variable.scopeInstanceId !== page.rootInstanceId) {
        continue;
      }
      if (variable.type === "variable") {
        const value = dataSourceVariables.get(variable.id);
        variableValues.set(variable.id, value ?? variable.value.value);
      }
      if (variable.type === "parameter") {
        const value = dataSourceVariables.get(variable.id);
        variableValues.set(variable.id, value);
        if (variable.id === page.systemDataSourceId && value === undefined) {
          variableValues.set(variable.id, {
            params: {},
            search: {},
          });
        }
      }
      if (variable.type === "resource") {
        const value = resourceValues.get(variable.resourceId);
        variableValues.set(variable.id, value);
      }
    }
    return variableValues;
  }
);

export const $pageRootScope = computed(
  [$editingPage, $pageRootVariableValues, $dataSources],
  (editingPage, pageRootVariableValues, dataSources) => {
    const scope: Record<string, unknown> = {};
    const aliases = new Map<string, string>();
    const defaultValues = new Map<string, unknown>();
    if (editingPage === undefined) {
      return { variableValues: defaultValues, scope, aliases };
    }
    for (const [dataSourceId, value] of pageRootVariableValues) {
      const dataSource = dataSources.get(dataSourceId);
      if (dataSource === undefined) {
        continue;
      }
      const name = encodeDataSourceVariable(dataSourceId);
      scope[name] = value;
      aliases.set(name, dataSource.name);
    }
    return { variableValues: pageRootVariableValues, scope, aliases };
  }
);

const deduplicatePath = (pages: Pages, page: Page) => {
  const fullPath = getPagePath(page.id, pages);
  let matchedPage = findPageByIdOrPath(fullPath, pages);
  let { path } = page;

  if (matchedPage === undefined) {
    return path;
  }

  if (path === "/") {
    path = "";
  }

  let counter = 0;
  const folder = findParentFolderByChildId(page.id, pages.folders);
  const folderPath = folder ? getPagePath(folder.id, pages) : "";
  while (matchedPage !== undefined) {
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

export const duplicatePage = (pageId: Page["id"]) => {
  const pages = $pages.get();
  if (pages === undefined) {
    return;
  }
  const page = findPageByIdOrPath(pageId, pages);

  if (page === undefined) {
    return;
  }

  const newPageId = nanoid();
  const { name = page.name, copyNumber } =
    // extract a number from "name (copyNumber)"
    page.name.match(/^(?<name>.+) \((?<copyNumber>\d+)\)$/)?.groups ?? {};
  const newName = `${name} (${Number(copyNumber ?? "0") + 1})`;

  updateWebstudioData((data) => {
    const fragment = extractWebstudioFragment(data, page.rootInstanceId);
    const { newInstanceIds, newDataSourceIds } = insertWebstudioFragmentCopy({
      data,
      fragment,
      availableDataSources: new Set(),
    });
    const newRootInstanceId = newInstanceIds.get(page.rootInstanceId);
    // @todo simplify after releasing migration with system variable
    const newSystemDataSourceId =
      page.systemDataSourceId === undefined
        ? undefined
        : newDataSourceIds.get(page.systemDataSourceId);

    if (newRootInstanceId === undefined) {
      return;
    }
    const newPage = {
      ...page,
      id: newPageId,
      rootInstanceId: newRootInstanceId,
      systemDataSourceId: newSystemDataSourceId,
      // @todo create new data source
      name: newName,
      path: deduplicatePath(pages, page),
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
        custom: page.meta.custom?.map(({ property, content }) => ({
          property,
          content: replaceDataSources(content, newDataSourceIds),
        })),
      },
    } satisfies Page;
    data.pages.pages.push(newPage);
    const currentFolder = findParentFolderByChildId(pageId, data.pages.folders);
    registerFolderChildMutable(
      data.pages.folders,
      newPageId,
      currentFolder?.id
    );
  });
  return newPageId;
};
