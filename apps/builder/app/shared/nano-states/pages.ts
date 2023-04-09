import { atom, computed } from "nanostores";
import type { Page, Pages } from "@webstudio-is/project-build";
import { useSyncInitializeOnce } from "../hook-utils";

export const pagesStore = atom<undefined | Pages>(undefined);
export const useSetPages = (pages: Pages) => {
  useSyncInitializeOnce(() => {
    pagesStore.set(pages);
  });
};

export const selectedPageIdStore = atom<undefined | Page["id"]>(undefined);
export const useSetSelectedPageId = (pageId: Page["id"]) => {
  useSyncInitializeOnce(() => {
    selectedPageIdStore.set(pageId);
  });
};

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
