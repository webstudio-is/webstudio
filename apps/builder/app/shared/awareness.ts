import { atom, computed, onSet } from "nanostores";
import {
  findPageByIdOrPath,
  Instance,
  Instances,
  ROOT_INSTANCE_ID,
  type Page,
} from "@webstudio-is/sdk";
import { rootComponent } from "@webstudio-is/react-sdk";
import { $pages } from "./nano-states/pages";
import { $instances, $selectedInstanceSelector } from "./nano-states/instances";

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

export const $virtualInstances = computed($selectedPage, (selectedPage) => {
  const virtualInstances: Instances = new Map();
  if (selectedPage) {
    virtualInstances.set(ROOT_INSTANCE_ID, {
      type: "instance",
      id: ROOT_INSTANCE_ID,
      component: rootComponent,
      children: [{ type: "id", value: selectedPage.rootInstanceId }],
    });
  }
  return virtualInstances;
});

export const $selectedInstance = computed(
  [$instances, $virtualInstances, $awareness],
  (instances, virtualInstances, awareness) => {
    if (awareness?.instanceSelector === undefined) {
      return;
    }
    const [selectedInstanceId] = awareness.instanceSelector;
    return (
      instances.get(selectedInstanceId) ??
      virtualInstances.get(selectedInstanceId)
    );
  }
);

export const $selectedInstanceKey = computed($awareness, (awareness) => {
  if (awareness === undefined) {
    return;
  }
  return JSON.stringify(awareness.instanceSelector);
});

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
