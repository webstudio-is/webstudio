import { executeExpression } from "./expression";
import type { Folder, Page, Pages } from "./schema/pages";
import { isPathnamePattern } from "./url-pattern";

export const ROOT_FOLDER_ID = "root";

/**
 * Returns true if folder is the root folder.
 */
export const isRootFolder = ({ id }: { id: Folder["id"] }) =>
  id === ROOT_FOLDER_ID;

export const getPageById = (
  pages: Pages,
  pageId: Page["id"]
): Page | undefined => {
  return pages.pages.get(pageId);
};

export const getFolderById = (
  pages: Pages,
  folderId: Folder["id"]
): Folder | undefined => {
  return pages.folders.get(folderId);
};

export const getAllPages = (pages: Pages): Page[] => {
  return Array.from(pages.pages.values());
};

export const getAllFolders = (pages: Pages): Folder[] => {
  return Array.from(pages.folders.values());
};

export const getHomePage = (pages: Pages): Page => {
  const homePage = getPageById(pages, pages.homePageId);
  if (homePage === undefined) {
    throw new Error(`Home page "${pages.homePageId}" was not found.`);
  }
  return homePage;
};

/**
 * Find a page by id or path.
 */
export const findPageByIdOrPath = (
  idOrPath: string,
  pages: Pages
): Page | undefined => {
  if (idOrPath === "" || idOrPath === "/" || idOrPath === pages.homePageId) {
    return getHomePage(pages);
  }
  return getAllPages(pages).find(
    (page) => page.id === idOrPath || getPagePath(page.id, pages) === idOrPath
  );
};

/**
 * Find a folder that has has that id in the children.
 */
export const findParentFolderByChildId = (
  id: Folder["id"] | Page["id"],
  folders: Iterable<Folder> | Map<Folder["id"], Folder>
): Folder | undefined => {
  const folderList = folders instanceof Map ? folders.values() : folders;
  for (const folder of folderList) {
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
  for (const folder of getAllFolders(pages)) {
    foldersMap.set(folder.id, folder);
    for (const childId of folder.children) {
      childParentMap.set(childId, folder.id);
    }
  }

  const paths = [];
  let currentId: undefined | string = id;

  // In case id is a page id
  const allPages = getAllPages(pages);
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

export const getStaticSiteMapXml = (pages: Pages, updatedAt: string) => {
  const allPages = getAllPages(pages);
  return (
    allPages
      .filter((page) => (page.meta.documentType ?? "html") === "html")
      // ignore pages with excludePageFromSearch bound to variables
      // because there is no data from cms available at build time
      .filter(
        (page) => executeExpression(page.meta.excludePageFromSearch) !== true
      )
      .filter((page) => false === isPathnamePattern(page.path))
      .map((page) => ({
        path: getPagePath(page.id, pages),
        lastModified: updatedAt.split("T")[0],
      }))
  );
};
