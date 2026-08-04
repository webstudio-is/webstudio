import type { ComponentBuildHook, WsComponentMeta } from "@webstudio-is/sdk";
import { buildHooks as baseBuildHooks } from "@webstudio-is/sdk-components-react/build-hooks";
import {
  baseComponentImportSource,
  componentMetaLibraries,
  getComponentName,
} from "./shared";

export type FrameworkComponentRegistry = {
  metas: Record<string, WsComponentMeta>;
  components: Record<string, string>;
  buildHooks: ComponentBuildHook[];
};

export const createFrameworkComponentRegistry = ({
  routerComponents,
  routerComponentPackage,
}: {
  routerComponents?: Record<string, unknown>;
  routerComponentPackage?: string;
} = {}): FrameworkComponentRegistry => {
  const components: Record<string, string> = {};
  const metas: Record<string, WsComponentMeta> = {};
  const buildHooks: ComponentBuildHook[] = [...baseBuildHooks];

  for (const library of componentMetaLibraries) {
    for (const [exportName, meta] of Object.entries(library.metas)) {
      const componentName = getComponentName(library, exportName);
      components[componentName] = `${library.importSource}:${exportName}`;
      metas[componentName] = meta;
    }
  }

  if (routerComponentPackage !== undefined && routerComponents !== undefined) {
    for (const name of Object.keys(routerComponents)) {
      if (components[name] === undefined) {
        continue;
      }
      components[name] = `${routerComponentPackage}:${name}`;
    }
  }

  return { components, metas, buildHooks };
};

export { baseComponentImportSource };
