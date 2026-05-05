import { atom, computed } from "nanostores";
import {
  type Page,
  findPageByIdOrPath,
  findParentFolderByChildId,
  getPagePath,
} from "@webstudio-is/sdk";
import { $pages } from "../sync/data-stores";
import { $selectedInstanceSelector } from "./instance-selection";

export const $selectedPageId = atom<undefined | Page["id"]>(undefined);

export const $selectedPageHash = atom<{ hash: string }>({ hash: "" });

export const $editingPageId = atom<undefined | Page["id"]>();

export const $selectedPage = computed(
  [$pages, $selectedPageId],
  (pages, selectedPageId) => {
    if (pages === undefined || selectedPageId === undefined) {
      return;
    }
    return findPageByIdOrPath(selectedPageId, pages);
  }
);

export const $selectedPagePath = computed(
  [$selectedPage, $pages],
  (page, pages) => {
    if (pages === undefined || page === undefined) {
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

export const selectPage = (pageId: Page["id"]) => {
  const pages = $pages.get();
  if (pages === undefined) {
    return;
  }
  const page = findPageByIdOrPath(pageId, pages);
  if (page === undefined) {
    return;
  }
  $selectedPageId.set(page.id);
  $selectedInstanceSelector.set([page.rootInstanceId]);
};
