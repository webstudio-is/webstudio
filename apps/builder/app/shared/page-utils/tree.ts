import {
  findParentFolderByChildId,
  getAllFolders,
  getAllPages,
  getFolderById,
  type Folder,
  type Page,
  type Pages,
} from "@webstudio-is/sdk";
import { getAllChildrenAndSelf } from "@webstudio-is/project-build/runtime/pages";

/**
 * When page or folder needs to be deleted or moved to a different parent,
 * cleanup every existing folder child reference to keep collaboration edge
 * cases from leaving double references behind.
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
 * Put orphaned pages/folders back into the root folder. Home page is always the
 * first root child and must only be referenced once.
 */
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
      cleanupChildRefsMutable(pages.homePageId, pages.folders);
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

export const registerFolderChildMutable = (
  pages: Pick<Pages, "folders" | "rootFolderId">,
  id: Page["id"] | Folder["id"],
  parentFolderId?: Folder["id"]
) => {
  const { folders } = pages;
  const parentFolder =
    (parentFolderId === undefined ? undefined : folders.get(parentFolderId)) ??
    folders.get(pages.rootFolderId);
  cleanupChildRefsMutable(id, folders);
  parentFolder?.children.push(id);
};

export const insertFolderMutable = ({
  pages,
  folder,
  parentFolderId,
}: {
  pages: Pages;
  folder: Folder;
  parentFolderId?: Folder["id"];
}) => {
  pages.folders.set(folder.id, folder);
  registerFolderChildMutable(pages, folder.id, parentFolderId);
};

export const updateFolderFieldsMutable = ({
  folder,
  folderId,
  pages,
  values,
}: {
  folder: Folder;
  folderId: Folder["id"];
  pages: Pages;
  values: Partial<{
    name: Folder["name"];
    slug: Folder["slug"];
    parentFolderId: Folder["id"];
  }>;
}) => {
  if (folderId === pages.rootFolderId) {
    return;
  }
  if (values.name !== undefined) {
    folder.name = values.name;
  }
  if (values.slug !== undefined) {
    folder.slug = values.slug;
  }
  if (values.parentFolderId !== undefined) {
    registerFolderChildMutable(pages, folderId, values.parentFolderId);
  }
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
  if (childrenAndSelf.includes(newFolderId)) {
    return;
  }
  const prevParent = findParentFolderByChildId(pageOrFolderId, folders);
  const nextParent = folders.get(newFolderId);
  if (prevParent === undefined || nextParent === undefined) {
    return;
  }
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
