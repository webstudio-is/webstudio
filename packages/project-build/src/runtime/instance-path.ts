import type { Instance } from "@webstudio-is/sdk";

export type InstanceSelector = Instance["id"][];

export type InstancePathItem = {
  instance: Instance;
  instanceSelector: InstanceSelector;
};

export type InstancePath = InstancePathItem[];
