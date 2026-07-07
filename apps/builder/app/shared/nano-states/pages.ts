import { atom, computed } from "nanostores";
import {
  type Folder,
  type Page,
  type PageTemplate,
  findPageByIdOrPath,
  findParentFolderByChildId,
  getPagePath,
  isPage,
} from "@webstudio-is/sdk";
import { $pages } from "../sync/data-stores";
import { clearInstanceSelection, selectInstance } from "./instance-selection";

export const $selectedPageId = atom<
  undefined | Page["id"] | PageTemplate["id"]
>(undefined);

$selectedPageId.listen(() => {
  clearInstanceSelection();
});

export const $selectedPageHash = atom<{ hash: string }>({ hash: "" });

export const $editingPageId = atom<undefined | Page["id"]>();

export const $pageIdToDelete = atom<undefined | Page["id"]>();
export const $folderIdToDelete = atom<undefined | Folder["id"]>();
export const $templateIdToDelete = atom<undefined | PageTemplate["id"]>();

export const $editingTemplateId = atom<undefined | string>();

export const $creatingPageFromTemplateId = atom<undefined | string>();

export const $selectedPage = computed(
  [$pages, $selectedPageId],
  (pages, selectedPageId) => {
    if (pages === undefined || selectedPageId === undefined) {
      return;
    }
    return findPageByIdOrPath(selectedPageId, pages, {
      includeTemplates: true,
    });
  }
);

export const $selectedPagePath = computed(
  [$selectedPage, $pages],
  (page, pages) => {
    if (pages === undefined || page === undefined) {
      return "/";
    }
    if (!isPage(page)) {
      return "/";
    }
    const parentFolder = findParentFolderByChildId(page.id, pages.folders);
    const parentFolderId = parentFolder?.id ?? pages.rootFolderId;
    const foldersPath = getPagePath(parentFolderId, pages);
    return [foldersPath, page?.path ?? ""]
      .filter(Boolean)
      .join("/")
      .replace(/\/+/g, "/");
  }
);

export const selectPage = (pageId: Page["id"] | PageTemplate["id"]) => {
  const pages = $pages.get();
  if (pages === undefined) {
    return;
  }
  const page = findPageByIdOrPath(pageId, pages, { includeTemplates: true });
  if (page === undefined) {
    return;
  }
  $selectedPageId.set(page.id);
  selectInstance([page.rootInstanceId]);
};
