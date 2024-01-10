import { atom, computed } from "nanostores";
import type { Folders, Page, Pages } from "@webstudio-is/sdk";

export const $folders = atom<Folders>(new Map());

export const $pages = atom<undefined | Pages>(undefined);

export const $selectedPageId = atom<undefined | Page["id"]>(undefined);
export const $selectedPageHash = atom<string>("");

export const $selectedPage = computed(
  [$pages, $selectedPageId],
  (pages, selectedPageId) => {
    if (pages === undefined) {
      return undefined;
    }
    if (pages.homePage.id === selectedPageId) {
      return pages.homePage;
    }
    return pages.pages.find((page) => page.id === selectedPageId);
  }
);
