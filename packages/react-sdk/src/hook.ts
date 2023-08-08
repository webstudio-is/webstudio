import type { Instance, Prop } from "@webstudio-is/project-build";

export type HookContext = {
  setPropVariable: (
    instanceId: Instance["id"],
    propName: Prop["name"],
    value: unknown
  ) => void;
};

export type InstanceSelection = Instance[];

type NavigatorEvent = {
  instanceSelection: InstanceSelection;
};

export type Hook = {
  onNavigatorSelect?: (context: HookContext, event: NavigatorEvent) => void;
  onNavigatorDeselect?: (context: HookContext, event: NavigatorEvent) => void;
};

export const getClosestInstance = (
  instanceSelection: InstanceSelection,
  currentInstance: Instance,
  closestComponent: Instance["component"]
) => {
  let matched = false;
  for (const instance of instanceSelection) {
    if (currentInstance === instance) {
      matched = true;
    }
    if (matched && instance.component === closestComponent) {
      return instance;
    }
  }
};
