import { computed } from "nanostores";
import { nanoid } from "nanoid";
import {
  type Page,
  type Folder,
  type WebstudioData,
  Pages,
  findPageByIdOrPath,
  getPagePath,
  findParentFolderByChildId,
  getAllFolders,
  getAllPages,
  getFolderById,
  encodeDataSourceVariable,
  ROOT_INSTANCE_ID,
  systemParameter,
  SYSTEM_VARIABLE_ID,
} from "@webstudio-is/sdk";
import {
  deleteInstanceMutable,
  updateWebstudioData,
} from "~/shared/instance-utils";
import { $variableValuesByInstanceSelector } from "~/shared/nano-states";
import { $dataSources } from "~/shared/sync/data-stores";
import { $pages } from "~/shared/sync/data-stores";
import { insertPageCopyMutable } from "~/shared/page-utils";
import {
  $selectedPage,
  getInstanceKey,
  getInstancePath,
} from "~/shared/nano-states";
import { selectPage } from "~/shared/nano-states";

/**
 * When page or folder needs to be deleted or moved to a different parent,
 * we want to cleanup any existing reference to it in current folder.
 * We could do this in just one folder, but I think its more robust to check all,
 * just in case we got double referencing.
 */
export const cleanupChildRefsMutable = (
  id: Folder["id"] | Page["id"],
  folders: Pages["folders"]
) => {
  for (const folder of Array.from(folders.values())) {
    folder.children = folder.children.filter((childId) => childId !== id);
  }
};

/**
 * When page or folder is found and its not referenced in any other folder children,
 * we consider it orphaned due to collaborative changes and we put it into the root folder.
 */
export const reparentOrphansMutable = (pages: Pages) => {
  const children = [pages.rootFolderId];
  for (const folder of getAllFolders(pages)) {
    children.push(...folder.children);
  }

  let rootFolder = getFolderById(pages, pages.rootFolderId);
  // Should never happen, but just in case.
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
      cleanupChildRefsMutable(pages.homePageId, pages.folders);
      rootFolder.children.unshift(pages.homePageId);
      children.push(pages.homePageId);
    }
  }

  for (const folder of getAllFolders(pages)) {
    // It's an orphan
    if (children.includes(folder.id) === false) {
      rootFolder.children.push(folder.id);
    }
  }

  for (const page of getAllPages(pages)) {
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
  folders: Pages["folders"],
  parentFolderId: Folder["id"],
  // undefined folder id means new folder
  folderId?: Folder["id"]
) => {
  // Empty slug can appear any amount of times.
  if (slug === "") {
    return true;
  }
  const parentFolder = folders.get(parentFolderId);
  // Should be impossible because at least root folder is always found.
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
  // undefined page id means new page
  pageId?: Page["id"];
}) => {
  const map = new Map<Page["path"], Page>();
  const allPages = getAllPages(pages);
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
  pages: Pick<Pages, "folders" | "rootFolderId">,
  id: Page["id"] | Folder["id"],
  // In case we couldn't find the current folder during update for any reason,
  // we will always fall back to the root folder.
  parentFolderId?: Folder["id"]
) => {
  const { folders } = pages;
  const parentFolder =
    (parentFolderId === undefined ? undefined : folders.get(parentFolderId)) ??
    folders.get(pages.rootFolderId);
  cleanupChildRefsMutable(id, folders);
  parentFolder?.children.push(id);
};

export const reparentPageOrFolderMutable = (
  folders: Pages["folders"],
  pageOrFolderId: string,
  newFolderId: string,
  newPosition: number
) => {
  const childrenAndSelf = getAllChildrenAndSelf(
    pageOrFolderId,
    folders,
    "folder"
  );
  // make sure target folder is not self or descendants
  if (childrenAndSelf.includes(newFolderId)) {
    return;
  }
  const prevParent = findParentFolderByChildId(pageOrFolderId, folders);
  const nextParent = folders.get(newFolderId);
  if (prevParent === undefined || nextParent === undefined) {
    return;
  }
  // if parent is the same, we need to adjust the position
  // to account for the removal of the instance.
  const prevPosition = prevParent.children.indexOf(pageOrFolderId);
  if (prevPosition === -1) {
    return;
  }
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
  folders: Pages["folders"],
  filter: "folder" | "page"
) => {
  const child = folders.get(id);
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
  if (pageId === pages.homePageId) {
    return;
  }
  // deselect page before deleting to avoid flash of content
  if ($selectedPage.get()?.id === pageId) {
    selectPage(pages.homePageId);
  }
  const rootInstanceId = findPageByIdOrPath(pageId, pages)?.rootInstanceId;
  if (rootInstanceId !== undefined) {
    deleteInstanceMutable(
      data,
      getInstancePath([rootInstanceId], data.instances)
    );
  }
  pages.pages.delete(pageId);
  cleanupChildRefsMutable(pageId, pages.folders);
};

/**
 * Deletes folder and child folders.
 * Doesn't delete pages, only returns pageIds.
 */
export const deleteFolderWithChildrenMutable = (
  folderId: Folder["id"],
  pages: Pages
) => {
  const { folders } = pages;
  const folder = folders.get(folderId);
  if (folder === undefined || folderId === pages.rootFolderId) {
    return {
      folderIds: [],
      pageIds: [],
    };
  }
  const folderIds = getAllChildrenAndSelf(folderId, folders, "folder");
  const pageIds = getAllChildrenAndSelf(folderId, folders, "page");
  if (pageIds.includes(pages.homePageId)) {
    return {
      folderIds: [],
      pageIds: [],
    };
  }
  for (const folderId of folderIds) {
    cleanupChildRefsMutable(folderId, folders);
    folders.delete(folderId);
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
  const currentFolder =
    pages === undefined
      ? undefined
      : findParentFolderByChildId(pageId, pages.folders);
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

const deduplicateName = (usedNames: Set<string>, name: string) => {
  const { name: baseName = name, copyNumber } =
    // extract a number from "name (copyNumber)"
    name.match(/^(?<name>.+) \((?<copyNumber>\d+)\)$/)?.groups ?? {};
  let nameNumber = Number(copyNumber ?? "0");
  let newName: string;
  do {
    nameNumber += 1;
    newName = `${baseName} (${nameNumber})`;
  } while (usedNames.has(newName));
  return newName;
};

const deduplicateSlug = (usedSlugs: Set<string>, slug: string) => {
  // extract a number from "slug-N"
  const { slug: baseSlug = slug, copyNumber } =
    slug.match(/^(?<slug>.+)-(?<copyNumber>\d+)$/)?.groups ?? {};
  let counter = Number(copyNumber ?? "0");
  let newSlug: string;
  do {
    counter += 1;
    newSlug = baseSlug ? `${baseSlug}-${counter}` : `copy-${counter}`;
  } while (usedSlugs.has(newSlug));
  return newSlug;
};

const insertFolderCopyMutable = ({
  source,
  target,
}: {
  source: { data: WebstudioData; folderId: Folder["id"] };
  target: { data: WebstudioData; parentFolderId: Folder["id"] };
}): Folder["id"] | undefined => {
  const sourceFolder = source.data.pages.folders.get(source.folderId);
  if (sourceFolder === undefined) {
    return;
  }

  const parentFolder = target.data.pages.folders.get(target.parentFolderId);
  const usedNames = new Set<string>();
  const usedSlugs = new Set<string>();
  for (const childId of parentFolder?.children ?? []) {
    const childFolder = target.data.pages.folders.get(childId);
    if (childFolder) {
      usedNames.add(childFolder.name);
      usedSlugs.add(childFolder.slug);
      continue;
    }
    const childPage = target.data.pages.pages.get(childId);
    if (childPage) {
      usedNames.add(childPage.name);
    }
  }

  // Create new folder with deduplicated name and slug
  const newFolderId = nanoid();
  const newFolder: Folder = {
    id: newFolderId,
    name: deduplicateName(usedNames, sourceFolder.name),
    slug: deduplicateSlug(usedSlugs, sourceFolder.slug),
    children: [],
  };

  // Add new folder to the folders array
  target.data.pages.folders.set(newFolder.id, newFolder);

  // Register new folder in parent
  for (const folder of getAllFolders(target.data.pages)) {
    if (folder.id === target.parentFolderId) {
      folder.children.push(newFolderId);
    }
  }

  // Duplicate all children (pages and nested folders)
  for (const childId of sourceFolder.children) {
    const childFolder = source.data.pages.folders.get(childId);

    if (childFolder) {
      // It's a nested folder - duplicate it recursively
      insertFolderCopyMutable({
        source: { data: source.data, folderId: childId },
        target: { data: target.data, parentFolderId: newFolderId },
      });
    } else {
      // It's a page - duplicate it
      insertPageCopyMutable({
        source: { data: source.data, pageId: childId },
        target: { data: target.data, folderId: newFolderId },
      });
    }
  }

  return newFolderId;
};

export const duplicateFolder = (folderId: Folder["id"]) => {
  const pages = $pages.get();
  const currentFolder =
    pages === undefined
      ? undefined
      : findParentFolderByChildId(folderId, pages.folders);
  if (currentFolder === undefined) {
    return;
  }
  let newFolderId: undefined | string;
  updateWebstudioData((data) => {
    newFolderId = insertFolderCopyMutable({
      source: { data, folderId },
      target: { data, parentFolderId: currentFolder.id },
    });
  });
  return newFolderId;
};

export const isFolder = (id: string, folders: Pages["folders"]) => {
  return folders.get(id) !== undefined;
};

type DropTarget = {
  parentId: string;
  beforeId?: string;
  afterId?: string;
  indexWithinChildren: number;
};

type TreeDropTarget = {
  parentLevel: number;
  beforeLevel?: number;
  afterLevel?: number;
};

export const getStoredDropTarget = (
  selector: string[],
  dropTarget: TreeDropTarget
): undefined | DropTarget => {
  const parentId = selector.at(-dropTarget.parentLevel - 1);
  const beforeId =
    dropTarget.beforeLevel === undefined
      ? undefined
      : selector.at(-dropTarget.beforeLevel - 1);
  const afterId =
    dropTarget.afterLevel === undefined
      ? undefined
      : selector.at(-dropTarget.afterLevel - 1);
  const pages = $pages.get();
  const parentFolder =
    parentId === undefined ? undefined : pages?.folders.get(parentId);
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

export const canDrop = (dropTarget: DropTarget, pages: Pages) => {
  const { folders } = pages;
  // allow dropping only inside folders
  if (isFolder(dropTarget.parentId, folders) === false) {
    return false;
  }
  // forbid dropping in the beginning of root folder
  // which is always used by home page
  if (
    dropTarget.indexWithinChildren === 0 &&
    dropTarget.parentId === pages.rootFolderId
  ) {
    return false;
  }
  return true;
};
