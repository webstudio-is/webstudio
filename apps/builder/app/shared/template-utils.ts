import {
  generateDataFromEmbedTemplate,
  type WsEmbedTemplate,
} from "@webstudio-is/react-sdk";
import { insertInstances } from "./instance-utils";
import {
  instancesStore,
  selectedInstanceSelectorStore,
  selectedPageStore,
} from "./nano-states";
import { findClosestDroppableTarget, type DroppableTarget } from "./tree-utils";

export const insertTemplate = (
  template: WsEmbedTemplate,
  dropTarget?: DroppableTarget
) => {
  const { instances, props } = generateDataFromEmbedTemplate(template);

  if (!dropTarget) {
    const selectedPage = selectedPageStore.get();
    if (selectedPage === undefined) {
      return;
    }
    dropTarget = findClosestDroppableTarget(
      instancesStore.get(),
      // fallback to root as drop target
      selectedInstanceSelectorStore.get() ?? [selectedPage.rootInstanceId]
    );
  }

  insertInstances(instances, props, dropTarget);
};
