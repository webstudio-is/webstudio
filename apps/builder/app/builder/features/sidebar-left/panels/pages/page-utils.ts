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

export const toTreeData = (pages: Pages): TreeData => {
  const pagesMap = new Map(pages.pages.map((page) => [page.id, page]));
  const foldersMap = new Map(
    pages.folders.map((folder) => [folder.id, folder])
  );
  pagesMap.set(pages.homePage.id, pages.homePage);

  const folderToTree = (folder: Folder) => {
    const children: Array<TreeData> = [];
    for (const id of folder.children) {
      const folder = foldersMap.get(id);
      // It is a folder, not a page.
      if (folder) {
        children.push(folderToTree(folder));
        continue;
      }
      const page = pagesMap.get(id);
      if (page) {
        children.push({
          type: "page",
          id: page.id,
          data: page,
        } satisfies TreePage);
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

  return folderToTree(pages.rootFolder);
};
