import { atom, computed } from "nanostores";
import type { Page, Pages } from "@webstudio-is/sdk";

export const pagesStore = atom<undefined | Pages>(undefined);
export const $pages = pagesStore;

export const selectedPageIdStore = atom<undefined | Page["id"]>(undefined);
export const $selectedPageId = selectedPageIdStore;
export const selectedPageHashStore = atom<string>("");

export const selectedPageStore = computed(
  [pagesStore, selectedPageIdStore],
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
export const $selectedPage = selectedPageStore;
