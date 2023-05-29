import {
  generateDataFromEmbedTemplate,
  type WsEmbedTemplate,
} from "@webstudio-is/react-sdk";
import store from "immerhin";
import { isBaseBreakpoint } from "./breakpoints";
import {
  breakpointsStore,
  instancesStore,
  propsStore,
  selectedInstanceSelectorStore,
  selectedStyleSourceSelectorStore,
  styleSourceSelectionsStore,
  styleSourcesStore,
  stylesStore,
} from "./nano-states";
import {
  insertInstancesMutable,
  insertPropsCopyMutable,
  insertStylesCopyMutable,
  insertStyleSourcesCopyMutable,
  insertStyleSourceSelectionsCopyMutable,
  type DroppableTarget,
} from "./tree-utils";

export const insertTemplate = (
  template: WsEmbedTemplate,
  dropTarget: DroppableTarget
) => {
  const breakpoints = breakpointsStore.get();
  const breakpointValues = Array.from(breakpoints.values());
  const baseBreakpoint = breakpointValues.find(isBaseBreakpoint);

  if (baseBreakpoint === undefined) {
    return;
  }
  const {
    children,
    instances: insertedInstances,
    props: insertedProps,
    styleSourceSelections: insertedStyleSourceSelections,
    styleSources: insertedStyleSources,
    styles: insertedStyles,
  } = generateDataFromEmbedTemplate(template, baseBreakpoint.id);
  const rootInstanceId = insertedInstances[0].id;
  store.createTransaction(
    [
      instancesStore,
      propsStore,
      styleSourceSelectionsStore,
      styleSourcesStore,
      stylesStore,
    ],
    (instances, props, styleSourceSelections, styleSources, styles) => {
      insertInstancesMutable(
        instances,
        insertedInstances,
        children,
        dropTarget
      );
      insertPropsCopyMutable(props, insertedProps, new Map());
      insertStyleSourcesCopyMutable(
        styleSources,
        insertedStyleSources,
        new Set()
      );
      insertStyleSourceSelectionsCopyMutable(
        styleSourceSelections,
        insertedStyleSourceSelections,
        new Map(),
        new Map()
      );
      insertStylesCopyMutable(styles, insertedStyles, new Map(), new Map());
    }
  );

  selectedInstanceSelectorStore.set([
    rootInstanceId,
    ...dropTarget.parentSelector,
  ]);
  selectedStyleSourceSelectorStore.set(undefined);
};
