import {
  compilerSettings,
  type Folder,
  folder,
  type Page,
  page,
  type PageTemplate,
  pageTemplate,
  projectMeta,
  pageRedirect,
  type Pages,
  pages,
} from "@webstudio-is/sdk/schema";
import { isRootFolder, ROOT_FOLDER_ID } from "@webstudio-is/sdk";
import { z } from "zod";

type LegacyPages = {
  meta?: Pages["meta"];
  compiler?: Pages["compiler"];
  redirects?: Pages["redirects"];
  homePage: Page;
  pages: Page[];
  folders?: Folder[];
};

export type SerializedPages = Omit<
  Pages,
  "pages" | "pageTemplates" | "folders"
> & {
  pages: Page[];
  pageTemplates?: PageTemplate[] | Record<PageTemplate["id"], PageTemplate>;
  folders: Folder[];
};

export const serializedPages: z.ZodType<SerializedPages, unknown> = z.object({
  meta: projectMeta.optional(),
  compiler: compilerSettings.optional(),
  redirects: z.array(pageRedirect).optional(),
  homePageId: z.string(),
  rootFolderId: z.string(),
  pages: z.array(page),
  pageTemplates: z
    .union([z.array(pageTemplate), z.record(z.string(), pageTemplate)])
    .optional(),
  folders: z.array(folder),
});

type MigratablePages = Omit<Pages, "pages" | "pageTemplates" | "folders"> & {
  pages: Page[] | Record<Page["id"], Page> | Map<Page["id"], Page>;
  pageTemplates?:
    | PageTemplate[]
    | Record<PageTemplate["id"], PageTemplate>
    | Map<PageTemplate["id"], PageTemplate>;
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

export const serializePages = (pagesData: Pages): SerializedPages => {
  const parsedPages = pages.parse(pagesData);
  return {
    meta: parsedPages.meta,
    compiler: parsedPages.compiler,
    redirects: parsedPages.redirects,
    homePageId: parsedPages.homePageId,
    rootFolderId: parsedPages.rootFolderId,
    pages: Array.from(parsedPages.pages.values()),
    pageTemplates:
      parsedPages.pageTemplates === undefined
        ? undefined
        : Array.from(parsedPages.pageTemplates.values()),
    folders: Array.from(parsedPages.folders.values()),
  };
};

export const migratePages = (pagesData: unknown): Pages => {
  if (
    isSerializedPages(pagesData) &&
    pagesData.pages instanceof Map &&
    pagesData.folders instanceof Map
  ) {
    const currentPages = pagesData as Pages;
    const result = pages.safeParse(currentPages);
    if (result.success && currentPages.pageTemplates !== undefined) {
      return currentPages;
    }
    return {
      ...currentPages,
      pageTemplates: currentPages.pageTemplates ?? new Map(),
      folders: removeOrphanFolderChildren(
        currentPages.pages,
        currentPages.folders
      ),
    };
  }

  if (isSerializedPages(pagesData)) {
    const nextPages = toMap<Page>(pagesData.pages, normalizePage);
    const nextFolders = toMap<Folder>(pagesData.folders);
    return {
      meta: pagesData.meta,
      compiler: pagesData.compiler,
      redirects: pagesData.redirects,
      homePageId: pagesData.homePageId,
      rootFolderId: pagesData.rootFolderId,
      pages: nextPages,
      pageTemplates:
        pagesData.pageTemplates === undefined
          ? new Map()
          : toMap<PageTemplate>(pagesData.pageTemplates),
      folders: removeOrphanFolderChildren(nextPages, nextFolders),
    };
  }

  if (isLegacyPages(pagesData) === false) {
    throw new Error("Pages data has unsupported shape.");
  }

  const homePage: Page = {
    ...normalizePage(pagesData.homePage),
    path: "",
  };
  const nextPages: Pages["pages"] = new Map([[homePage.id, homePage]]);
  for (const page of pagesData.pages) {
    if (page.id === homePage.id) {
      continue;
    }
    nextPages.set(page.id, normalizePage(page));
  }

  const nextFolders: Pages["folders"] = new Map();
  for (const folder of pagesData.folders ?? []) {
    nextFolders.set(folder.id, { ...folder, children: [...folder.children] });
  }

  const rootFolder =
    Array.from(nextFolders.values()).find(isRootFolder) ??
    pagesData.folders?.[0] ??
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
  for (const page of pagesData.pages) {
    if (page.id !== homePage.id && referencedIds.has(page.id) === false) {
      nextRootFolder.children.push(page.id);
      referencedIds.add(page.id);
    }
  }

  return {
    meta: pagesData.meta,
    compiler: pagesData.compiler,
    redirects: pagesData.redirects,
    homePageId: homePage.id,
    rootFolderId: rootFolder.id,
    pages: nextPages,
    pageTemplates: new Map(),
    folders: nextFolders,
  };
};
