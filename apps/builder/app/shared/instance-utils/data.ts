// Data utilities own access to Webstudio's instance-related stores and
// transaction boundaries. Put generic store reads/writes and content-mode data
// guards here, not tree-shape mutations.
import { toast } from "@webstudio-is/design-system";
import {
  type Instances,
  type WebstudioData,
  blockTemplateComponent,
  isPageTemplate,
} from "@webstudio-is/sdk";
import type { BuilderPatchChange } from "@webstudio-is/project-build/contracts/patch";
import type { BuilderState } from "@webstudio-is/project-build/state/builder-state";
import * as builderStatePatch from "@webstudio-is/project-build/state/patch";
import { breakCyclesMutable, findCycles } from "@webstudio-is/project-build";
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

export type WebstudioInstanceData = Pick<
  WebstudioData,
  | "instances"
  | "props"
  | "styleSourceSelections"
  | "styleSources"
  | "styles"
  | "dataSources"
  | "resources"
>;

type PatchableWebstudioData =
  | BuilderState
  | WebstudioData
  | WebstudioInstanceData;

const getPatchNamespaceData = (
  data: PatchableWebstudioData,
  namespace: BuilderPatchChange["namespace"]
) => {
  const namespaceData = data[namespace as keyof PatchableWebstudioData];
  if (namespaceData !== undefined) {
    return namespaceData;
  }
  throw Error(`Cannot apply patch for unavailable namespace "${namespace}"`);
};

export const applyBuilderPatchPayloadMutable = (
  data: PatchableWebstudioData,
  payload: BuilderPatchChange[]
) => {
  builderStatePatch.applyBuilderPatchPayloadMutable(
    (namespace) => getPatchNamespaceData(data, namespace),
    payload
  );
};

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

export const updateWebstudioData = (
  mutate: (data: WebstudioData) => void,
  { validateInstances = true }: { validateInstances?: boolean } = {}
) => {
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

      if (validateInstances === false) {
        return;
      }

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

export const updateInstanceData = (
  mutate: (data: WebstudioInstanceData) => void
) => {
  const selectedPage = $selectedPage.get();
  if (isPageTemplate(selectedPage) && $canOpenPageTemplates.get() === false) {
    return;
  }
  serverSyncStore.createTransaction(
    [
      $instances,
      $props,
      $styleSourceSelections,
      $styleSources,
      $styles,
      $dataSources,
      $resources,
    ],
    (
      instances,
      props,
      styleSourceSelections,
      styleSources,
      styles,
      dataSources,
      resources
    ) => {
      mutate({
        instances,
        props,
        styleSourceSelections,
        styleSources,
        styles,
        dataSources,
        resources,
      });
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
