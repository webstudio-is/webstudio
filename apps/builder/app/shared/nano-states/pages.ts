import { atom, computed } from "nanostores";
import { findPageByIdOrPath, type Page, type Pages } from "@webstudio-is/sdk";

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
