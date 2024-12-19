import type { Instance, Prop } from "@webstudio-is/sdk";
import type { IndexesWithinAncestors } from "./instance-utils";

export type InstanceData = {
  id: Instance["id"];
  instanceKey: string;
  component: Instance["component"];
};

/**
 * Hooks are subscriptions to builder events
 * with limited way to interact with it.
 * Called independently from components.
 */

export type HookContext = {
  indexesWithinAncestors: IndexesWithinAncestors;
  getPropValue: (instanceData: InstanceData, propName: Prop["name"]) => unknown;
  setMemoryProp: (
    instanceData: InstanceData,
    propName: Prop["name"],
    value: unknown
  ) => void;
};

export type InstancePath = InstanceData[];

type NavigatorEvent = {
  /**
   * List of instances from selected to the root
   */
  instancePath: InstancePath;
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
  currentInstance: InstanceData,
  closestComponent: InstanceData["component"]
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
