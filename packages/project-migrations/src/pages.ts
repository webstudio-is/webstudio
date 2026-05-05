import {
  Pages as PagesSchema,
  type Folder,
  type Page,
  type Pages,
  isRootFolder,
  ROOT_FOLDER_ID,
} from "@webstudio-is/sdk";

type LegacyPages = {
  meta?: Pages["meta"];
  compiler?: Pages["compiler"];
  redirects?: Pages["redirects"];
  homePage: Page;
  pages: Page[];
  folders?: Folder[];
};

export type SerializedPages = Omit<Pages, "pages" | "folders"> & {
  pages: Page[];
  folders: Folder[];
};

type MigratablePages = Omit<Pages, "pages" | "folders"> & {
  pages: Page[] | Record<Page["id"], Page> | Map<Page["id"], Page>;
  folders: Folder[] | Record<Folder["id"], Folder> | Map<Folder["id"], Folder>;
};

const toMap = <Item extends { id: string }>(
  items: Item[] | Record<Item["id"], Item> | Map<Item["id"], Item>,
  normalizeItem: (item: Item) => Item = (item) => item
) => {
  if (items instanceof Map) {
    return new Map(
      Array.from(items, ([id, item]) => [id, normalizeItem(item)])
    );
  }
  const list: Item[] = Array.isArray(items) ? items : Object.values(items);
  return new Map(list.map((item) => [item.id, normalizeItem(item)]));
};

const normalizePage = (page: Page): Page => ({
  ...page,
  meta: page.meta ?? {},
});

const isLegacyPages = (pages: unknown): pages is LegacyPages => {
  if (typeof pages !== "object" || pages === null) {
    return false;
  }
  return (
    "homePage" in pages && Array.isArray((pages as { pages?: unknown }).pages)
  );
};

const isSerializedPages = (pages: unknown): pages is MigratablePages => {
  if (typeof pages !== "object" || pages === null) {
    return false;
  }
  const candidate = pages as Partial<MigratablePages>;
  return (
    typeof candidate.homePageId === "string" &&
    typeof candidate.rootFolderId === "string" &&
    candidate.pages !== undefined &&
    candidate.folders !== undefined
  );
};

const removeOrphanFolderChildren = (
  pages: Map<Page["id"], Page>,
  folders: Map<Folder["id"], Folder>
) => {
  const nextFolders = new Map<Folder["id"], Folder>();
  for (const [folderId, folder] of folders) {
    nextFolders.set(folderId, {
      ...folder,
      children: folder.children.filter(
        (childId) => pages.has(childId) || folders.has(childId)
      ),
    });
  }
  return nextFolders;
};

export const serializePages = (pages: Pages): SerializedPages => {
  const parsedPages = PagesSchema.parse(pages);
  return {
    meta: parsedPages.meta,
    compiler: parsedPages.compiler,
    redirects: parsedPages.redirects,
    homePageId: parsedPages.homePageId,
    rootFolderId: parsedPages.rootFolderId,
    pages: Array.from(parsedPages.pages.values()),
    folders: Array.from(parsedPages.folders.values()),
  };
};

export const migratePages = (pages: unknown): Pages => {
  if (
    isSerializedPages(pages) &&
    pages.pages instanceof Map &&
    pages.folders instanceof Map
  ) {
    const currentPages = pages as Pages;
    const result = PagesSchema.safeParse(currentPages);
    if (result.success) {
      return currentPages;
    }
    return {
      ...currentPages,
      folders: removeOrphanFolderChildren(
        currentPages.pages,
        currentPages.folders
      ),
    };
  }

  if (isSerializedPages(pages)) {
    const nextPages = toMap<Page>(pages.pages, normalizePage);
    const nextFolders = toMap<Folder>(pages.folders);
    return {
      meta: pages.meta,
      compiler: pages.compiler,
      redirects: pages.redirects,
      homePageId: pages.homePageId,
      rootFolderId: pages.rootFolderId,
      pages: nextPages,
      folders: removeOrphanFolderChildren(nextPages, nextFolders),
    };
  }

  if (isLegacyPages(pages) === false) {
    throw new Error("Pages data has unsupported shape.");
  }

  const homePage: Page = {
    ...normalizePage(pages.homePage),
    path: "",
  };
  const nextPages: Pages["pages"] = new Map([[homePage.id, homePage]]);
  for (const page of pages.pages) {
    if (page.id === homePage.id) {
      continue;
    }
    nextPages.set(page.id, normalizePage(page));
  }

  const nextFolders: Pages["folders"] = new Map();
  for (const folder of pages.folders ?? []) {
    nextFolders.set(folder.id, { ...folder, children: [...folder.children] });
  }

  const rootFolder =
    Array.from(nextFolders.values()).find(isRootFolder) ??
    pages.folders?.[0] ??
    ({
      id: ROOT_FOLDER_ID,
      name: "Root",
      slug: "",
      children: [],
    } satisfies Folder);

  if (nextFolders.has(rootFolder.id) === false) {
    nextFolders.set(rootFolder.id, { ...rootFolder, children: [] });
  }

  const nextRootFolder = nextFolders.get(rootFolder.id);
  if (nextRootFolder === undefined) {
    throw new Error("Pages must include a root folder.");
  }

  for (const folder of nextFolders.values()) {
    folder.children = folder.children.filter(
      (childId) =>
        childId !== homePage.id &&
        (nextPages.has(childId) || nextFolders.has(childId))
    );
  }
  nextRootFolder.children.unshift(homePage.id);

  const referencedIds = new Set(
    Array.from(nextFolders.values()).flatMap((folder) => folder.children)
  );
  for (const page of pages.pages) {
    if (page.id !== homePage.id && referencedIds.has(page.id) === false) {
      nextRootFolder.children.push(page.id);
      referencedIds.add(page.id);
    }
  }

  return {
    meta: pages.meta,
    compiler: pages.compiler,
    redirects: pages.redirects,
    homePageId: homePage.id,
    rootFolderId: rootFolder.id,
    pages: nextPages,
    folders: nextFolders,
  };
};
