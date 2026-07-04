import {
  coreMetas,
  type Instance,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import { componentMetaLibraries, getComponentName } from "./shared";

export const componentMetas = new Map<Instance["component"], WsComponentMeta>(
  Object.entries(coreMetas)
);

for (const library of componentMetaLibraries) {
  for (const [exportName, meta] of Object.entries(library.metas)) {
    componentMetas.set(getComponentName(library, exportName), meta);
  }
}
