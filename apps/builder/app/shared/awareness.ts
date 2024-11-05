import { atom, computed } from "nanostores";
import { findPageByIdOrPath } from "@webstudio-is/sdk";
import { $pages } from "./nano-states/pages";

type Awareness = {
  pageId: string;
};

export const $awareness = atom<undefined | Awareness>();

export const $selectedPage = computed(
  [$pages, $awareness],
  (pages, awareness) => {
    if (pages === undefined || awareness === undefined) {
      return;
    }
    return findPageByIdOrPath(awareness.pageId, pages);
  }
);
