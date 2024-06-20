import type { Instance, Prop } from "@webstudio-is/sdk";
import type { IndexesWithinAncestors } from "./instance-utils";

/**
 * Hooks are subscriptions to builder events
 * with limited way to interact with it.
 * Called independently from components.
 */

export type HookContext = {
  indexesWithinAncestors: IndexesWithinAncestors;
  getPropValue: (instanceId: Instance["id"], propName: Prop["name"]) => unknown;
  setPropVariable: (
    instanceId: Instance["id"],
    propName: Prop["name"],
    value: unknown
  ) => void;
  setMemoryProp: (
    instanceId: readonly Instance["id"][],
    propName: Prop["name"],
    value: unknown
  ) => void;
};

export type InstancePath = Instance[];

type NavigatorEvent = {
  /**
   * List of instances from selected to the root
   */
  instancePath: InstancePath;
  instanceSelector: readonly Instance["id"][];
};

export type Hook = {
  onNavigatorSelect?: (context: HookContext, event: NavigatorEvent) => void;
  onNavigatorUnselect?: (context: HookContext, event: NavigatorEvent) => void;
};

/**
 * Find closest matching instance by component name
 * by lookup in instance path
 */
export const getClosestInstance = (
  instancePath: InstancePath,
  currentInstance: Instance,
  closestComponent: Instance["component"]
) => {
  let matched = false;
  for (const instance of instancePath) {
    if (currentInstance === instance) {
      matched = true;
    }
    if (matched && instance.component === closestComponent) {
      return instance;
    }
  }
};

export const getInstanceSelectorById = (
  instanceSelector: readonly Instance["id"][],
  instanceId: Instance["id"]
) => {
  const index = instanceSelector.findIndex(
    (selector) => selector === instanceId
  );
  if (index === -1) {
    return [];
  }
  return instanceSelector.slice(index);
};
