import {
  findParentFolderByChildId,
  getAllFolders,
  getAllPages,
  getFolderById,
  getPagePath,
  type Folder,
  type Page,
  type Pages,
} from "@webstudio-is/sdk";
import { serializePages } from "@webstudio-is/project-migrations/pages";
import type { CompactBuild } from "@webstudio-is/project-build";
import type { buildPatchTransaction } from "@webstudio-is/protocol";
import type { z } from "zod";
import {
  collectInstanceIds,
  createInstanceCleanupPayload,
} from "../instance-utils/tree";
import { compactBuildPatchPayload } from "../build-patch-utils";

type DeletePayloadBuild = Pick<
  CompactBuild,
  | "pages"
  | "instances"
  | "props"
  | "dataSources"
  | "styleSources"
  | "styleSourceSelections"
  | "styles"
>;

const createDeletedInstanceCleanupPayload = (
  build: DeletePayloadBuild,
  rootInstanceIds: Iterable<string>
): z.infer<typeof buildPatchTransaction>["payload"] => {
  const instances = new Map(
    build.instances.map((instance) => [instance.id, instance])
  );
  const instanceIds = new Set(
    Array.from(rootInstanceIds).flatMap((rootInstanceId) =>
      collectInstanceIds(instances, rootInstanceId)
    )
  );
  return createInstanceCleanupPayload({
    instanceIds,
    props: build.props,
    dataSources: build.dataSources,
    styleSources: build.styleSources,
    styleSourceSelections: build.styleSourceSelections,
    styles: build.styles,
  });
};

/**
 * Get all child folder or page ids of the current id, including the id itself
 * when it matches the requested type.
 */
export const getAllChildrenAndSelf = (
  id: Folder["id"] | Page["id"],
  folders: Pages["folders"],
  filter: "folder" | "page"
) => {
  const child = folders.get(id);
  const children: Array<Folder["id"] | Page["id"]> = [];
  const type = child === undefined ? "page" : "folder";

  if (type === filter) {
    children.push(id);
  }

  if (child) {
    for (const childId of child.children) {
      children.push(...getAllChildrenAndSelf(childId, folders, filter));
    }
  }
  return children;
};

export const getFolderDeletionTargets = (
  folderId: Folder["id"],
  pages: Pages
) => {
  const folder = pages.folders.get(folderId);
  if (folder === undefined || folder.id === pages.rootFolderId) {
    return {
      folderIds: [],
      pageIds: [],
    };
  }
  const folderIds = getAllChildrenAndSelf(folderId, pages.folders, "folder");
  const pageIds = getAllChildrenAndSelf(folderId, pages.folders, "page");
  if (pageIds.includes(pages.homePageId)) {
    return {
      folderIds: [],
      pageIds: [],
    };
  }
  return {
    folderIds,
    pageIds,
  };
};

/**
 * When page or folder needs to be deleted or moved to a different parent,
 * cleanup every existing folder child reference to keep collaboration edge
 * cases from leaving double references behind.
 */
export const cleanupChildRefsMutable = (
  id: Folder["id"] | Page["id"],
  folders: Pages["folders"]
) => {
  for (const folder of Array.from(folders.values())) {
    folder.children = folder.children.filter((childId) => childId !== id);
  }
};

/**
 * Put orphaned pages/folders back into the root folder. Home page is always the
 * first root child and must only be referenced once.
 */
export const reparentOrphansMutable = (pages: Pages) => {
  const children = [pages.rootFolderId];
  for (const folder of getAllFolders(pages)) {
    children.push(...folder.children);
  }

  let rootFolder = getFolderById(pages, pages.rootFolderId);
  if (rootFolder === undefined) {
    rootFolder = {
      id: pages.rootFolderId,
      name: "Root",
      slug: "",
      children: [],
    };
    pages.folders.set(rootFolder.id, rootFolder);
  }

  if (pages.pages.has(pages.homePageId)) {
    let homePageRefCount = 0;
    for (const folder of getAllFolders(pages)) {
      for (const childId of folder.children) {
        if (childId === pages.homePageId) {
          homePageRefCount += 1;
        }
      }
    }
    if (rootFolder.children[0] !== pages.homePageId || homePageRefCount !== 1) {
      cleanupChildRefsMutable(pages.homePageId, pages.folders);
      rootFolder.children.unshift(pages.homePageId);
      children.push(pages.homePageId);
    }
  }

  for (const folder of getAllFolders(pages)) {
    if (children.includes(folder.id) === false) {
      rootFolder.children.push(folder.id);
    }
  }

  for (const page of getAllPages(pages)) {
    if (children.includes(page.id) === false) {
      rootFolder.children.push(page.id);
    }
  }
};

export const isSlugAvailable = (
  slug: string,
  folders: Pages["folders"],
  parentFolderId: Folder["id"],
  folderId?: Folder["id"]
) => {
  if (slug === "") {
    return true;
  }
  const parentFolder = folders.get(parentFolderId);
  if (parentFolder === undefined) {
    return false;
  }

  return (
    parentFolder.children.some(
      (id) => folders.get(id)?.slug === slug && id !== folderId
    ) === false
  );
};

export const isPathAvailable = ({
  pages,
  path,
  parentFolderId,
  pageId,
}: {
  pages: Pages;
  path: Page["path"];
  parentFolderId: Folder["id"];
  pageId?: Page["id"];
}) => {
  const map = new Map<Page["path"], Page>();
  for (const page of getAllPages(pages)) {
    map.set(getPagePath(page.id, pages), page);
  }
  const folderPath = getPagePath(parentFolderId, pages);
  const pagePath = folderPath === "/" ? path : `${folderPath}${path}`;
  const existingPage = map.get(pagePath);
  if (pageId && existingPage?.id === pageId) {
    return true;
  }
  return existingPage === undefined;
};

export const registerFolderChildMutable = (
  pages: Pick<Pages, "folders" | "rootFolderId">,
  id: Page["id"] | Folder["id"],
  parentFolderId?: Folder["id"]
) => {
  const { folders } = pages;
  const parentFolder =
    (parentFolderId === undefined ? undefined : folders.get(parentFolderId)) ??
    folders.get(pages.rootFolderId);
  cleanupChildRefsMutable(id, folders);
  parentFolder?.children.push(id);
};

export const createFolderValue = ({
  folderId,
  name,
  slug,
}: {
  folderId: Folder["id"];
  name: Folder["name"];
  slug: Folder["slug"];
}): Folder => ({
  id: folderId,
  name,
  slug,
  children: [],
});

export const createFolderCreatePayload = ({
  folder,
  parentFolderId,
  parentChildIndex,
}: {
  folder: Folder;
  parentFolderId: Folder["id"];
  parentChildIndex: number;
}): z.infer<typeof buildPatchTransaction>["payload"] => [
  {
    namespace: "pages",
    patches: [
      {
        op: "add",
        path: ["folders", folder.id],
        value: folder,
      },
      {
        op: "add",
        path: ["folders", parentFolderId, "children", parentChildIndex],
        value: folder.id,
      },
    ],
  },
];

export const insertFolderMutable = ({
  pages,
  folder,
  parentFolderId,
}: {
  pages: Pages;
  folder: Folder;
  parentFolderId?: Folder["id"];
}) => {
  pages.folders.set(folder.id, folder);
  registerFolderChildMutable(pages, folder.id, parentFolderId);
};

export const updateFolderFieldsMutable = ({
  folder,
  folderId,
  pages,
  values,
}: {
  folder: Folder;
  folderId: Folder["id"];
  pages: Pages;
  values: Partial<{
    name: Folder["name"];
    slug: Folder["slug"];
    parentFolderId: Folder["id"];
  }>;
}) => {
  if (folderId === pages.rootFolderId) {
    return;
  }
  if (values.name !== undefined) {
    folder.name = values.name;
  }
  if (values.slug !== undefined) {
    folder.slug = values.slug;
  }
  if (values.parentFolderId !== undefined) {
    registerFolderChildMutable(pages, folderId, values.parentFolderId);
  }
};

export const createFolderUpdatePayload = ({
  folder,
  pages,
  values,
}: {
  folder: Folder;
  pages: Pages;
  values: Partial<{
    name: Folder["name"];
    slug: Folder["slug"];
    parentFolderId: Folder["id"];
  }>;
}): z.infer<typeof buildPatchTransaction>["payload"] => {
  const patches: Array<{
    op: "add" | "replace" | "remove";
    path: Array<string | number>;
    value?: unknown;
  }> = [];
  if (values.name !== undefined) {
    patches.push({
      op: "replace",
      path: ["folders", folder.id, "name"],
      value: values.name,
    });
  }
  if (values.slug !== undefined) {
    patches.push({
      op: "replace",
      path: ["folders", folder.id, "slug"],
      value: values.slug,
    });
  }
  if (values.parentFolderId !== undefined) {
    const plan = getFolderChildReparentPlan(
      pages.folders,
      folder.id,
      values.parentFolderId
    );
    if (plan !== undefined) {
      patches.push({
        op: "remove",
        path: ["folders", plan.currentFolderId, "children", plan.currentIndex],
      });
      patches.push({
        op: "add",
        path: ["folders", plan.nextFolderId, "children", plan.nextIndex],
        value: folder.id,
      });
    }
  }
  return compactBuildPatchPayload([{ namespace: "pages", patches }]);
};

export const getParentFolderId = (
  folders: Pages["folders"],
  childId: Page["id"] | Folder["id"]
) => findParentFolderByChildId(childId, folders)?.id;

export const findFolder = (
  pages: Pick<Pages, "folders">,
  folderId: Folder["id"]
) => pages.folders.get(folderId);

export const findPage = (pages: Pick<Pages, "pages">, pageId: Page["id"]) =>
  pages.pages.get(pageId);

export const getSerializedPages = (build: Pick<CompactBuild, "pages">) =>
  serializePages(build.pages);

type SerializedPages = ReturnType<typeof getSerializedPages>;
type SerializedPage = SerializedPages["pages"][number];

export const findParentFolderId = (
  folders: SerializedPages["folders"],
  childId: Page["id"] | Folder["id"]
) =>
  getParentFolderId(
    new Map(folders.map((folder) => [folder.id, folder])),
    childId
  );

const joinPath = (...parts: string[]) => parts.join("").replace(/\/+/g, "/");

const getSerializedFolderPath = (
  pages: SerializedPages,
  folderId: Folder["id"] | undefined
): string => {
  if (folderId === undefined || folderId === pages.rootFolderId) {
    return "";
  }
  const folder = pages.folders.find((folder) => folder.id === folderId);
  if (folder === undefined) {
    return "";
  }
  return joinPath(
    getSerializedFolderPath(pages, findParentFolderId(pages.folders, folderId)),
    `/${folder.slug}`
  );
};

export const getSerializedPagePath = (
  pages: SerializedPages,
  page: SerializedPage
) =>
  joinPath(
    getSerializedFolderPath(pages, findParentFolderId(pages.folders, page.id)),
    page.path
  );

export const serializePageSummary = (
  pages: SerializedPages,
  page: SerializedPage
) => ({
  id: page.id,
  name: page.name,
  path: getSerializedPagePath(pages, page),
  localPath: page.path,
  title: page.title,
  rootInstanceId: page.rootInstanceId,
  parentFolderId: findParentFolderId(pages.folders, page.id),
  isHome: page.id === pages.homePageId,
});

export const serializePageDetails = (
  pages: SerializedPages,
  page: SerializedPage
) => ({
  ...serializePageSummary(pages, page),
  meta: {
    description: page.meta.description,
    language: page.meta.language,
    redirect: page.meta.redirect,
    socialImageUrl: page.meta.socialImageUrl,
    socialImageAssetId: page.meta.socialImageAssetId,
    excludePageFromSearch:
      page.meta.excludePageFromSearch === undefined
        ? undefined
        : page.meta.excludePageFromSearch === "true",
    documentType: page.meta.documentType ?? "html",
    content: page.meta.content,
    custom: page.meta.custom,
  },
});

export const getHomePageRootInstanceId = (pages: Pages) =>
  pages.pages.get(pages.homePageId)?.rootInstanceId;

export const findSerializedPageByInput = (
  pages: SerializedPages,
  input: { pageId?: string; pagePath?: string }
) => {
  if (input.pageId !== undefined) {
    return pages.pages.find((page) => page.id === input.pageId);
  }
  if (input.pagePath !== undefined) {
    return pages.pages.find(
      (page) => getSerializedPagePath(pages, page) === input.pagePath
    );
  }
};

export const serializePageDetailsByInput = (
  build: Pick<CompactBuild, "pages">,
  input: { pageId?: string; pagePath?: string }
) => {
  const pages = getSerializedPages(build);
  const page = findSerializedPageByInput(pages, input);
  return page === undefined ? undefined : serializePageDetails(pages, page);
};

export const createPageDeletePayload = ({
  build,
  page,
  parentFolderId,
}: {
  build: DeletePayloadBuild;
  page: Page;
  parentFolderId: Folder["id"];
}): z.infer<typeof buildPatchTransaction>["payload"] => {
  const parentFolder = build.pages.folders.get(parentFolderId);
  const pageIndex = parentFolder?.children.indexOf(page.id) ?? -1;
  return [
    {
      namespace: "pages",
      patches: [
        { op: "remove", path: ["pages", page.id] },
        ...(pageIndex === -1
          ? []
          : [
              {
                op: "remove" as const,
                path: ["folders", parentFolderId, "children", pageIndex],
              },
            ]),
      ],
    },
    ...createDeletedInstanceCleanupPayload(build, [page.rootInstanceId]),
  ];
};

export const createFolderDeletePayload = ({
  build,
  folder,
  parentFolderId,
}: {
  build: DeletePayloadBuild;
  folder: Folder;
  parentFolderId: Folder["id"];
}): {
  folderIds: Folder["id"][];
  pageIds: Page["id"][];
  payload: z.infer<typeof buildPatchTransaction>["payload"];
} => {
  const { folderIds, pageIds } = getFolderDeletionTargets(
    folder.id,
    build.pages
  );
  const parentFolder = build.pages.folders.get(parentFolderId);
  const folderIndex = parentFolder?.children.indexOf(folder.id) ?? -1;
  return {
    folderIds,
    pageIds,
    payload: [
      {
        namespace: "pages",
        patches: [
          ...(folderIndex === -1
            ? []
            : [
                {
                  op: "remove" as const,
                  path: ["folders", parentFolderId, "children", folderIndex],
                },
              ]),
          ...pageIds.map((pageId) => ({
            op: "remove" as const,
            path: ["pages", pageId],
          })),
          ...folderIds.map((folderId) => ({
            op: "remove" as const,
            path: ["folders", folderId],
          })),
        ],
      },
      ...createDeletedInstanceCleanupPayload(
        build,
        pageIds.flatMap((pageId) => {
          const page = build.pages.pages.get(pageId);
          return page === undefined ? [] : [page.rootInstanceId];
        })
      ),
    ],
  };
};

export const getFolderChildReparentPlan = (
  folders: Pages["folders"],
  childId: Page["id"] | Folder["id"],
  nextFolderId: Folder["id"],
  nextPosition?: number
) => {
  const currentFolder = findParentFolderByChildId(childId, folders);
  const nextFolder = folders.get(nextFolderId);
  if (currentFolder === undefined || nextFolder === undefined) {
    return;
  }
  if (currentFolder.id === nextFolder.id) {
    return;
  }
  const currentIndex = currentFolder.children.indexOf(childId);
  if (currentIndex === -1) {
    return;
  }
  return {
    currentFolderId: currentFolder.id,
    currentIndex,
    nextFolderId: nextFolder.id,
    nextIndex: nextPosition ?? nextFolder.children.length,
  };
};

export const reparentPageOrFolderMutable = (
  folders: Pages["folders"],
  pageOrFolderId: string,
  newFolderId: string,
  newPosition: number
) => {
  const childrenAndSelf = getAllChildrenAndSelf(
    pageOrFolderId,
    folders,
    "folder"
  );
  if (childrenAndSelf.includes(newFolderId)) {
    return;
  }
  const prevParent = findParentFolderByChildId(pageOrFolderId, folders);
  const nextParent = folders.get(newFolderId);
  if (prevParent === undefined || nextParent === undefined) {
    return;
  }
  const prevPosition = prevParent.children.indexOf(pageOrFolderId);
  if (prevPosition === -1) {
    return;
  }
  if (prevParent.id === nextParent.id && prevPosition < newPosition) {
    newPosition -= 1;
  }
  prevParent.children.splice(prevPosition, 1);
  nextParent.children.splice(newPosition, 0, pageOrFolderId);
};
