import { coreMetas } from "@webstudio-is/sdk";
import baseComponentRegistry from "@webstudio-is/sdk-components-react/registry";
import animationComponentRegistry from "@webstudio-is/sdk-components-animation/registry";
import radixComponentRegistry from "@webstudio-is/sdk-components-react-radix/registry";
import {
  getComponentMetasFromRegistry,
  getNamespacedComponentMetasFromRegistry,
} from "./component-registry";

export const baseComponentMetas = getComponentMetasFromRegistry(
  baseComponentRegistry
);

export const radixComponentMetas = getComponentMetasFromRegistry(
  radixComponentRegistry
);

export const animationComponentMetas = getComponentMetasFromRegistry(
  animationComponentRegistry
);

export const defaultComponentMetas = new Map([
  ...Object.entries(coreMetas),
  ...baseComponentMetas,
]);

export const defaultNamespacedComponentMetas = new Map([
  ...Object.entries(coreMetas),
  ...baseComponentMetas,
  ...getNamespacedComponentMetasFromRegistry({
    registry: radixComponentRegistry,
    namespace: "@webstudio-is/sdk-components-react-radix",
  }),
  ...getNamespacedComponentMetasFromRegistry({
    registry: animationComponentRegistry,
    namespace: "@webstudio-is/sdk-components-animation",
  }),
]);
