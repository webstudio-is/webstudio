import type { Folder, Page, Pages } from "./schema/pages";

export const findPageByIdOrPath = (
  idOrPath: string,
  pages: Pages
): Page | undefined => {
  if (idOrPath === "" || idOrPath === "/" || idOrPath === pages.homePage.id) {
    return pages.homePage;
  }
  const cache = createCache(pages);
  return pages.pages.find(
    (page) =>
      page.id === idOrPath || getPagePath(page.id, pages, cache) === idOrPath
  );
};

type Cache = {
  folderById: Map<Folder["id"], Folder>;
  folderByChildId: Map<Folder["id"] | Page["id"], Folder>;
};

/**
 * Reusable cache specialized for `getPagePath` so it can be used in a loop.
 */
const createCache = (pages: Pages): Cache => {
  const folderById: Cache["folderById"] = new Map();
  const folderByChildId: Cache["folderByChildId"] = new Map();
  for (const folder of pages.folders) {
    folderById.set(folder.id, folder);
    for (const childId of folder.children) {
      folderByChildId.set(childId, folder);
    }
  }

  return { folderById, folderByChildId };
};

/**
 * Get a path from all folder slugs from root to the current folder or page.
 */
export const getPagePath = (
  id: Folder["id"] | Page["id"],
  pages: Pages,
  cache?: Cache
) => {
  cache || (cache = createCache(pages));
  const paths = [];
  let currentId: undefined | string = id;

  // In case id is a page id
  const allPages = [pages.homePage, ...pages.pages];
  for (const page of allPages) {
    if (page.id === id) {
      paths.push(page.path);
      currentId = cache.folderByChildId.get(page.id)?.id;
      break;
    }
  }

  while (currentId) {
    const folder = cache.folderById.get(currentId);
    if (folder === undefined) {
      break;
    }
    paths.push(folder.slug);
    currentId = cache.folderByChildId.get(currentId)?.id;
  }

  return paths.reverse().join("/").replace(/\/+/g, "/");
};
