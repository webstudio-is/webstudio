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
  path: Folder["path"];
  children: Array<TreeData>;
};

export type TreeData = TreeFolder | TreePage;

export const toTreeData = (
  folders: Map<Folder["id"], Folder> = new Map(),
  pages: Pages
): TreeData => {
  const pagesMap = new Map(pages.pages.map((page) => [page.id, page]));
  const toTreePage = (page: Page) => ({
    type: "page" as const,
    id: page.id,
    data: page,
  });
  const folderToTree = (folder: Folder) => {
    const children: Array<TreeData> = [];
    for (const id of folder.children) {
      const folder = folders.get(id);
      if (folder) {
        children.push(folderToTree(folder));
        continue;
      }
      const page = pagesMap.get(id);
      if (page) {
        children.push(toTreePage(page));
        // Pages we add to folders don't need to be in the root.
        pagesMap.delete(id);
        continue;
      }
    }
    return {
      type: "folder" as const,
      id: folder.id,
      name: folder.name,
      path: folder.path,
      children,
    };
  };

  const foldersArray = Array.from(folders.values()).map(folderToTree);
  const pagesArray = Array.from(pagesMap.values()).map(toTreePage);

  return {
    type: "folder",
    id: "root",
    name: "Root",
    path: "",
    children: [toTreePage(pages.homePage), ...foldersArray, ...pagesArray],
  };
};
