import type { Folder, Page, Pages } from "./schema/pages";

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
