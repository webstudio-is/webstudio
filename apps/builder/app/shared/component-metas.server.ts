import {
  coreMetas,
  type Instance,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import baseComponentRegistry from "@webstudio-is/sdk-components-react/registry";
import animationComponentRegistry from "@webstudio-is/sdk-components-animation/registry";
import radixComponentRegistry from "@webstudio-is/sdk-components-react-radix/registry";
import {
  getNamespacedComponentMetasFromRegistry,
  getPackageNamespacedComponentMetasFromRegistry,
} from "./component-registry";

export const componentMetas = new Map<Instance["component"], WsComponentMeta>([
  ...Object.entries(coreMetas),
  ...getNamespacedComponentMetasFromRegistry({
    registry: baseComponentRegistry,
  }),
  ...getPackageNamespacedComponentMetasFromRegistry(animationComponentRegistry),
  ...getPackageNamespacedComponentMetasFromRegistry(radixComponentRegistry),
]);
