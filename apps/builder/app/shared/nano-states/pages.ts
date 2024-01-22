import { atom, computed } from "nanostores";
import {
  findPageByIdOrPath,
  getPagePath,
  type Page,
  type Pages,
} from "@webstudio-is/sdk";

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

export const $existingRoutePaths = computed([$pages], (pages) => {
  if (pages === undefined) {
    return;
  }

  const paths = [];
  for (const page of pages.pages) {
    const pagePath = getPagePath(page.id, pages);
    if (pagePath === undefined) {
      continue;
    }
    paths.push(pagePath);
  }
  return paths;
});
