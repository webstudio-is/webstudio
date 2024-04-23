import { executeExpression } from "./expression";
import type { Folder, Page, Pages } from "./schema/pages";

export const ROOT_FOLDER_ID = "root";

/**
 * Returns true if folder is the root folder.
 */
export const isRoot = (folder: Folder) => folder.id === ROOT_FOLDER_ID;

/**
 * Find a page by id or path.
 */
export const findPageByIdOrPath = (
  idOrPath: string,
  pages: Pages
): Page | undefined => {
  if (idOrPath === "" || idOrPath === "/" || idOrPath === pages.homePage.id) {
    return pages.homePage;
  }
  return pages.pages.find(
    (page) => page.id === idOrPath || getPagePath(page.id, pages) === idOrPath
  );
};

/**
 * Find a folder that has has that id in the children.
 */
export const findParentFolderByChildId = (
  id: Folder["id"] | Page["id"],
  folders: Array<Folder>
): Folder | undefined => {
  for (const folder of folders) {
    if (folder.children.includes(id)) {
      return folder;
    }
  }
};

/**
 * Get a path from all folder slugs from root to the current folder or page.
 */
export const getPagePath = (id: Folder["id"] | Page["id"], pages: Pages) => {
  const foldersMap = new Map<Folder["id"], Folder>();
  const childParentMap = new Map<Folder["id"] | Page["id"], Folder["id"]>();
  for (const folder of pages.folders) {
    foldersMap.set(folder.id, folder);
    for (const childId of folder.children) {
      childParentMap.set(childId, folder.id);
    }
  }

  const paths = [];
  let currentId: undefined | string = id;

  // In case id is a page id
  const allPages = [pages.homePage, ...pages.pages];
  for (const page of allPages) {
    if (page.id === id) {
      paths.push(page.path);
      currentId = childParentMap.get(page.id);
      break;
    }
  }

  while (currentId) {
    const folder = foldersMap.get(currentId);
    if (folder === undefined) {
      break;
    }
    paths.push(folder.slug);
    currentId = childParentMap.get(currentId);
  }

  return paths.reverse().join("/").replace(/\/+/g, "/");
};

export const getStaticSiteMapXml = (pages: Page[], updatedAt: string) => {
  return (
    pages
      // ignore pages with excludePageFromSearch bound to variables
      // because there is no data from cms available at build time
      .filter(
        (page) => executeExpression(page.meta.excludePageFromSearch) !== true
      )
      .map((page) => ({
        path: page.path,
        lastModified: updatedAt.split("T")[0],
      }))
  );
};
