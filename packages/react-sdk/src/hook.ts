import type { DataSource, Instances, Props } from "@webstudio-is/project-build";

export type HookContext = {
  instances: Instances;
  props: Props;
  setVariable: (dataSourceId: DataSource["id"], value: unknown) => void;
};

export type InstanceSelector = [string, ...string[]];

type NavigatorEvent = {
  instanceSelector: InstanceSelector;
};

export type Hook = {
  onNavigatorSelect?: (context: HookContext, event: NavigatorEvent) => void;
  onNavigatorDeselect?: (context: HookContext, event: NavigatorEvent) => void;
};
