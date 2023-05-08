import {
  generateDataFromEmbedTemplate,
  type WsEmbedTemplate,
} from "@webstudio-is/react-sdk";
import { isBaseBreakpoint } from "./breakpoints";
import { insertInstances } from "./instance-utils";
import {
  breakpointsStore,
  instancesStore,
  selectedInstanceSelectorStore,
  selectedPageStore,
} from "./nano-states";
import { findClosestDroppableTarget, type DroppableTarget } from "./tree-utils";

export const insertTemplate = (
  template: WsEmbedTemplate,
  dropTarget?: DroppableTarget
) => {
  const breakpoints = breakpointsStore.get();
  const breakpointValues = Array.from(breakpoints.values());
  const baseBreakpoint = breakpointValues.find(isBaseBreakpoint);
  if (baseBreakpoint === undefined) {
    return;
  }
  const { instances, props, styleSourceSelections, styleSources, styles } =
    generateDataFromEmbedTemplate(template, baseBreakpoint.id);

  if (!dropTarget) {
    const selectedPage = selectedPageStore.get();
    if (selectedPage === undefined) {
      return;
    }
    dropTarget = findClosestDroppableTarget(
      instancesStore.get(),
      // fallback to root as drop target
      selectedInstanceSelectorStore.get() ?? [selectedPage.rootInstanceId],
      []
    );
  }

  insertInstances(
    instances,
    props,
    styleSourceSelections,
    styleSources,
    styles,
    dropTarget
  );
};
