import { atom, computed, onSet } from "nanostores";
import { findPageByIdOrPath, Instance, type Page } from "@webstudio-is/sdk";
import { $pages } from "./nano-states/pages";
import { $selectedInstanceSelector } from "./nano-states/instances";

type Awareness = {
  pageId: Page["id"];
  instanceSelector?: Instance["id"][];
};

export const $awareness = atom<undefined | Awareness>();

onSet($awareness, ({ newValue }) => {
  $selectedInstanceSelector.set(newValue?.instanceSelector);
});

export const $selectedPage = computed(
  [$pages, $awareness],
  (pages, awareness) => {
    if (pages === undefined || awareness === undefined) {
      return;
    }
    return findPageByIdOrPath(awareness.pageId, pages);
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
  $awareness.set({ pageId: page.id, instanceSelector: [page.rootInstanceId] });
};

export const selectInstance = (
  instanceSelector: undefined | Instance["id"][]
) => {
  const awareness = $awareness.get();
  if (awareness) {
    $awareness.set({
      pageId: awareness.pageId,
      instanceSelector,
    });
  }
};
