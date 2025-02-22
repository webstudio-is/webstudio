import { computed } from "nanostores";
import { createRootFolder } from "@webstudio-is/project-build";
import {
  type Page,
  type Folder,
  type WebstudioData,
  Pages,
  findPageByIdOrPath,
  getPagePath,
  findParentFolderByChildId,
  encodeDataSourceVariable,
  ROOT_FOLDER_ID,
  isRootFolder,
  ROOT_INSTANCE_ID,
  systemParameter,
  SYSTEM_VARIABLE_ID,
} from "@webstudio-is/sdk";
import { removeByMutable } from "~/shared/array-utils";
import {
  deleteInstanceMutable,
  updateWebstudioData,
} from "~/shared/instance-utils";
import {
  $dataSources,
  $pages,
  $variableValuesByInstanceSelector,
} from "~/shared/nano-states";
import { insertPageCopyMutable } from "~/shared/page-utils";
import {
  $selectedPage,
  getInstanceKey,
  getInstancePath,
  selectPage,
} from "~/shared/awareness";

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

  let rootFolder = pages.folders.find(isRootFolder);
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
export const isSlugAvailable = (
  slug: string,
  folders: Array<Folder>,
  parentFolderId: Folder["id"],
  // undefined folder id means new folder
  folderId?: Folder["id"]
) => {
  // Empty slug can appear any amount of times.
  if (slug === "") {
    return true;
  }
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

export const isPathAvailable = ({
  pages,
  path,
  parentFolderId,
  pageId,
}: {
  pages: Pages;
  path: Page["path"];
  parentFolderId: Folder["id"];
  // undefined page id means new page
  pageId?: Page["id"];
}) => {
  const map = new Map<Page["path"], Page>();
  const allPages = [pages.homePage, ...pages.pages];
  for (const page of allPages) {
    map.set(getPagePath(page.id, pages), page);
  }
  const folderPath = getPagePath(parentFolderId, pages);
  // When slug is empty, folderPath is "/".
  const pagePath = folderPath === "/" ? path : `${folderPath}${path}`;
  const existingPage = map.get(pagePath);
  // We found another page that has the same path and the current page.
  if (pageId && existingPage?.id === pageId) {
    return true;
  }
  return existingPage === undefined;
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
    folders.find(isRootFolder);
  cleanupChildRefsMutable(id, folders);
  parentFolder?.children.push(id);
};

export const reparentPageOrFolderMutable = (
  folders: Folder[],
  pageOrFolderId: string,
  newFolderId: string,
  newPosition: number
) => {
  const prevParent = findParentFolderByChildId(pageOrFolderId, folders);
  const nextParent = folders.find((folder) => folder.id === newFolderId);
  if (prevParent === undefined || nextParent === undefined) {
    return;
  }
  // if parent is the same, we need to adjust the position
  // to account for the removal of the instance.
  const prevPosition = prevParent.children.indexOf(pageOrFolderId);
  if (prevParent.id === nextParent.id && prevPosition < newPosition) {
    newPosition -= 1;
  }
  prevParent.children.splice(prevPosition, 1);
  nextParent.children.splice(newPosition, 0, pageOrFolderId);
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
  if ($selectedPage.get()?.id === pageId) {
    selectPage(pages.homePage.id);
  }
  const rootInstanceId = findPageByIdOrPath(pageId, pages)?.rootInstanceId;
  if (rootInstanceId !== undefined) {
    deleteInstanceMutable(
      data,
      getInstancePath([rootInstanceId], data.instances)
    );
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

export const $pageRootScope = computed(
  [$selectedPage, $variableValuesByInstanceSelector, $dataSources],
  (page, variableValuesByInstanceSelector, dataSources) => {
    const scope: Record<string, unknown> = {};
    const aliases = new Map<string, string>();
    const defaultValues = new Map<string, unknown>();
    if (page === undefined) {
      return { variableValues: defaultValues, scope, aliases };
    }
    const values =
      variableValuesByInstanceSelector.get(
        getInstanceKey([page.rootInstanceId, ROOT_INSTANCE_ID])
      ) ?? new Map<string, unknown>();
    for (const [dataSourceId, value] of values) {
      let dataSource = dataSources.get(dataSourceId);
      if (dataSourceId === SYSTEM_VARIABLE_ID) {
        dataSource = systemParameter;
      }
      if (dataSource === undefined) {
        continue;
      }
      const name = encodeDataSourceVariable(dataSourceId);
      scope[name] = value;
      aliases.set(name, dataSource.name);
    }
    return { variableValues: values, scope, aliases };
  }
);

export const duplicatePage = (pageId: Page["id"]) => {
  const pages = $pages.get();
  const currentFolder = findParentFolderByChildId(pageId, pages?.folders ?? []);
  if (currentFolder === undefined) {
    return;
  }
  let newPageId: undefined | string;
  updateWebstudioData((data) => {
    newPageId = insertPageCopyMutable({
      source: { data, pageId },
      target: { data, folderId: currentFolder.id },
    });
  });
  return newPageId;
};
