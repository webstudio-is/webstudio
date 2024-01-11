import { type Page, Pages, type Folder } from "@webstudio-is/sdk";

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
  foldersMap.set(pages.rootFolder.id, pages.rootFolder);
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

  return { root: folderToTree(pages.rootFolder), index };
};

/**
 * Find a folder by folder id.
 */
export const findFolderById = (
  folderId: Folder["id"],
  pages: Pages
): Folder => {
  for (const folder of pages.folders) {
    if (folder.id === folderId) {
      return folder;
    }
  }
  return pages.rootFolder;
};

/**
 * Find a folder that has has that id in the children.
 */
export const findParentFolderByChildId = (
  id: Folder["id"] | Page["id"],
  pages: Pages
): Folder => {
  for (const folder of pages.folders) {
    if (folder.children.includes(id)) {
      return folder;
    }
  }
  return pages.rootFolder;
};

/**
 * When page or folder needs to be deleted or moved to a different parent,
 * we want to cleanup any existing reference to it in current folder.
 * We could do this in just one folder, but I think its more robust to check all,
 * just in case we got double referencing.
 */
export const cleanupChildRefsMutable = (
  id: Folder["id"] | Page["id"],
  pages: Pages
) => {
  const allFolders = [pages.rootFolder, ...pages.folders];
  for (const folder of allFolders) {
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
  const children = [];
  const allFolders = [pages.rootFolder, ...pages.folders];
  for (const folder of allFolders) {
    children.push(...folder.children);
  }

  for (const folder of pages.folders) {
    // It's an orphan
    if (children.includes(folder.id) === false) {
      pages.rootFolder.children.push(folder.id);
    }
  }

  for (const page of pages.pages) {
    // It's an orphan
    if (children.includes(page.id) === false) {
      pages.rootFolder.children.push(page.id);
    }
  }
};
