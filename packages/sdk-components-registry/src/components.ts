/** Owns registered React component objects and their persisted identities. */
import type { Instance } from "@webstudio-is/sdk";
import * as baseComponents from "@webstudio-is/sdk-components-react/components";
import { canvasComponents as baseCanvasComponents } from "@webstudio-is/sdk-components-react/canvas-components";
import * as animationComponents from "@webstudio-is/sdk-components-animation";
import * as radixComponents from "@webstudio-is/sdk-components-react-radix";
import {
  animationComponentNamespace,
  getComponentName,
  radixComponentNamespace,
} from "./shared";

export const baseComponentLibrary = {
  components: { ...baseComponents, ...baseCanvasComponents },
};

export const radixComponentLibrary = {
  namespace: radixComponentNamespace,
  components: radixComponents,
};

export const animationComponentLibrary = {
  namespace: animationComponentNamespace,
  components: animationComponents,
};

export const componentLibraries = [
  baseComponentLibrary,
  radixComponentLibrary,
  animationComponentLibrary,
] as const;

const mutableComponentIds = new Map<object, Instance["component"]>();
const mutableComponentsById = new Map<Instance["component"], object>();

for (const library of componentLibraries) {
  for (const [exportName, component] of Object.entries(library.components)) {
    const namespace = "namespace" in library ? library.namespace : undefined;
    const componentId = getComponentName({ namespace }, exportName);
    if (mutableComponentsById.has(componentId)) {
      throw new Error(
        `Component ID "${componentId}" is registered more than once`
      );
    }
    mutableComponentsById.set(componentId, component);
  }
}

// A persisted ID can have a runtime and a canvas implementation. Both objects
// must render to the same ID, while componentsById exposes the canvas version.
const componentImplementationLibraries = [
  { components: baseComponents },
  { components: baseCanvasComponents },
  radixComponentLibrary,
  animationComponentLibrary,
] as const;

for (const library of componentImplementationLibraries) {
  for (const [exportName, component] of Object.entries(library.components)) {
    const namespace = "namespace" in library ? library.namespace : undefined;
    const componentId = getComponentName({ namespace }, exportName);
    const existingComponentId = mutableComponentIds.get(component);
    if (
      existingComponentId !== undefined &&
      existingComponentId !== componentId
    ) {
      throw new Error(
        `Component object is registered as both "${existingComponentId}" and "${componentId}"`
      );
    }
    mutableComponentIds.set(component, componentId);
  }
}

export const componentIds: ReadonlyMap<object, Instance["component"]> =
  mutableComponentIds;
export const componentsById: ReadonlyMap<Instance["component"], object> =
  mutableComponentsById;
