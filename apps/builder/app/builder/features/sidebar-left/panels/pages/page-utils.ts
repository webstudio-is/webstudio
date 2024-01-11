import type { Page, Pages, Folder } from "@webstudio-is/sdk";

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
    const children: Array<TreeData> = [];
    for (const id of folder.children) {
      const folder = foldersMap.get(id);
      // It is a folder, not a page.
      if (folder) {
        const treeFolder = folderToTree(folder);
        children.push(treeFolder);
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
        children.push(treePage);
        index.set(page.id, treePage);
        continue;
      }
    }
    return {
      type: "folder",
      id: folder.id,
      name: folder.name,
      slug: folder.slug,
      children,
    } satisfies TreeFolder;
  };

  return { root: folderToTree(pages.rootFolder), index };
};

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

export const findParentFolderByChildId = (
  folderId: Folder["id"],
  pages: Pages
): Folder => {
  for (const folder of pages.folders) {
    if (folder.children.includes(folderId)) {
      return folder;
    }
  }
  return pages.rootFolder;
};

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
