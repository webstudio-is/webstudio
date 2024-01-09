import type { Page, Pages, Folder, Folders } from "@webstudio-is/sdk";

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

export const toTreeData = (
  folders: Folders = new Map(),
  pages: Pages
): TreeData => {
  const pagesMap = new Map(pages.pages.map((page) => [page.id, page]));
  const toTreePage = (page: Page) => {
    return {
      type: "page",
      id: page.id,
      data: page,
    } satisfies TreePage;
  };
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
      type: "folder",
      id: folder.id,
      name: folder.name,
      slug: folder.slug,
      children,
    } satisfies TreeFolder;
  };

  const foldersArray = Array.from(folders.values()).map(folderToTree);
  const pagesArray = Array.from(pagesMap.values()).map(toTreePage);

  return {
    type: "folder",
    id: "root",
    name: "Root",
    slug: "",
    children: [toTreePage(pages.homePage), ...pagesArray, ...foldersArray],
  } satisfies TreeFolder;
};
