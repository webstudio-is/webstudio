import { atom, computed } from "nanostores";
import { findPageByIdOrPath, type Page, type Pages } from "@webstudio-is/sdk";
import { serverSyncStore } from "../sync";

export const $pages = atom<undefined | Pages>(undefined);

export const $selectedPageId = atom<undefined | Page["id"]>(undefined);
export const $selectedPageHash = atom<string>("");

export const $selectedPage = computed(
  [$pages, $selectedPageId],
  (pages, selectedPageId) => {
    if (pages === undefined || selectedPageId === undefined) {
      return;
    }
    return findPageByIdOrPath(selectedPageId, pages);
  }
);

/**
 * put new path into the beginning of history
 * and drop paths in the end when exceeded 20
 */
export const savePathInHistory = (pageId: string, path: string) => {
  serverSyncStore.createTransaction([$pages], (pages) => {
    if (pages === undefined) {
      return;
    }
    const page = findPageByIdOrPath(pageId, pages);
    if (page === undefined) {
      return;
    }
    const history = Array.from(page.history ?? []);
    history.unshift(path);
    page.history = Array.from(new Set(history)).slice(0, 20);
  });
};
