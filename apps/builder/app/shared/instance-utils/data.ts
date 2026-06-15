// Data utilities own access to Webstudio's instance-related stores and
// transaction boundaries. Put generic store reads/writes and content-mode data
// guards here, not tree-shape mutations.
import { current, isDraft } from "immer";
import { toast } from "@webstudio-is/design-system";
import {
  type Instances,
  type Props,
  type WebstudioData,
  type WsComponentMeta,
  blockTemplateComponent,
  isPageTemplate,
} from "@webstudio-is/sdk";
import { breakCyclesMutable, findCycles } from "@webstudio-is/project-build";
import { isRichTextTree } from "../content-model";
import { findBlockSelector } from "../nano-states";
import { $canOpenPageTemplates, $selectedPage } from "../nano-states";
import { serverSyncStore } from "../sync/sync-stores";
import {
  $assets,
  $breakpoints,
  $dataSources,
  $instances,
  $pages,
  $props,
  $resources,
  $styles,
  $styleSourceSelections,
  $styleSources,
} from "../sync/data-stores";
import type { InstanceSelector } from "./tree";

/**
 * structuredClone can be invoked on draft and throw error
 * extract current snapshot before cloning
 */
export const unwrap = <Value>(value: Value) =>
  isDraft(value) ? current(value) : value;

export const canDeleteInstanceInContentMode = ({
  instanceSelector,
  instances,
}: {
  instanceSelector: InstanceSelector;
  instances: Instances;
}) => {
  const blockSelector = findBlockSelector(instanceSelector, instances);
  if (blockSelector === undefined) {
    return false;
  }

  const isDirectBlockChild =
    instanceSelector.length - blockSelector.length === 1;
  if (isDirectBlockChild === false) {
    return false;
  }

  return (
    instances.get(instanceSelector[0])?.component !== blockTemplateComponent
  );
};

export const updateWebstudioData = (mutate: (data: WebstudioData) => void) => {
  const selectedPage = $selectedPage.get();
  if (isPageTemplate(selectedPage) && $canOpenPageTemplates.get() === false) {
    return;
  }
  serverSyncStore.createTransaction(
    [
      $pages,
      $instances,
      $props,
      $breakpoints,
      $styleSourceSelections,
      $styleSources,
      $styles,
      $dataSources,
      $resources,
      $assets,
    ],
    (
      pages,
      instances,
      props,
      breakpoints,
      styleSourceSelections,
      styleSources,
      styles,
      dataSources,
      resources,
      assets
    ) => {
      // @todo normalize pages
      if (pages === undefined) {
        return;
      }
      mutate({
        pages,
        instances,
        props,
        dataSources,
        resources,
        breakpoints,
        styleSourceSelections,
        styleSources,
        styles,
        assets,
      });

      const cycles = findCycles(instances.values());

      // Detect and fix cycles in the instance tree, then report
      if (cycles.length > 0) {
        toast.info("Detected and fixed cycles in the instance tree.");

        breakCyclesMutable(
          instances.values(),
          (node) => node.component === "Slot"
        );
      }
    }
  );
};

export const getWebstudioData = (): WebstudioData => {
  const pages = $pages.get();
  if (pages === undefined) {
    throw Error(`Cannot get webstudio data with empty pages`);
  }
  return {
    pages,
    instances: $instances.get(),
    props: $props.get(),
    dataSources: $dataSources.get(),
    resources: $resources.get(),
    breakpoints: $breakpoints.get(),
    styleSourceSelections: $styleSourceSelections.get(),
    styleSources: $styleSources.get(),
    styles: $styles.get(),
    assets: $assets.get(),
  };
};

export const findAllEditableInstanceSelector = ({
  instanceSelector,
  instances,
  props,
  metas,
  results,
}: {
  instanceSelector: InstanceSelector;
  instances: Instances;
  props: Props;
  metas: Map<string, WsComponentMeta>;
  results: InstanceSelector[];
}) => {
  const [instanceId] = instanceSelector;

  if (instanceId === undefined) {
    return;
  }

  // Check if current instance is text editing instance
  if (isRichTextTree({ instanceId, instances, props, metas })) {
    results.push(instanceSelector);
    return;
  }

  const instance = instances.get(instanceId);
  if (instance) {
    for (const child of instance.children) {
      if (child.type === "id") {
        findAllEditableInstanceSelector({
          instanceSelector: [child.value, ...instanceSelector],
          instances,
          props,
          metas,
          results,
        });
      }
    }
  }
};
