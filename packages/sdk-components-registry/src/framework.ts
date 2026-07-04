import type { WsComponentMeta } from "@webstudio-is/sdk";
import {
  baseComponentImportSource,
  componentMetaLibraries,
  getComponentName,
  routerComponentNames,
} from "./shared";

export type FrameworkComponentRegistry = {
  metas: Record<string, WsComponentMeta>;
  components: Record<string, string>;
};

export const createFrameworkComponentRegistry = ({
  routerComponentPackage,
}: {
  routerComponentPackage?: string;
} = {}): FrameworkComponentRegistry => {
  const components: Record<string, string> = {};
  const metas: Record<string, WsComponentMeta> = {};

  for (const library of componentMetaLibraries) {
    for (const [exportName, meta] of Object.entries(library.metas)) {
      const componentName = getComponentName(library, exportName);
      components[componentName] = `${library.importSource}:${exportName}`;
      metas[componentName] = meta;
    }
  }

  if (routerComponentPackage !== undefined) {
    for (const name of routerComponentNames) {
      components[name] = `${routerComponentPackage}:${name}`;
    }
  }

  return { components, metas };
};

export { baseComponentImportSource };
