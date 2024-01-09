import { createRootFolder } from "@webstudio-is/project-build";
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
  pagesMap.set(pages.homePage.id, pages.homePage);

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
      // It is a folder, not a page.
      if (folder) {
        children.push(folderToTree(folder));
        continue;
      }
      const page = pagesMap.get(id);
      if (page) {
        children.push(toTreePage(page));
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

  const root = folders.get("root");

  if (root === undefined) {
    // This can only happen if migration didn't go through.
    throw new Error("Root folder is missing");
  }

  return folderToTree(root);
};

export const addFolderChild = (
  folders: Folders,
  id: Page["id"] | Folder["id"]
) => {
  let rootFolder = folders.get("root");
  // This should never happen as the root folder is created when the project is created.
  // And we should have made a migration.
  if (rootFolder === undefined) {
    rootFolder = createRootFolder();
    folders.set(rootFolder.id, rootFolder);
  }
  rootFolder.children.push(id);
};
