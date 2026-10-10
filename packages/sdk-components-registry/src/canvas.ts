/** Composes registered components with their canvas metadata and templates. */
import { coreMetas } from "@webstudio-is/sdk";
import { coreTemplates } from "./core-templates";
import { hooks as baseHooks } from "@webstudio-is/sdk-components-react/hooks";
import * as baseTemplates from "@webstudio-is/sdk-components-react/templates";
import { hooks as animationHooks } from "@webstudio-is/sdk-components-animation/hooks";
import * as animationTemplates from "@webstudio-is/sdk-components-animation/templates";
import { hooks as radixHooks } from "@webstudio-is/sdk-components-react-radix/hooks";
import * as radixTemplates from "@webstudio-is/sdk-components-react-radix/templates";
import {
  animationComponentNamespace,
  componentMetaLibraries,
  radixComponentNamespace,
} from "./shared";
import {
  animationComponentLibrary,
  baseComponentLibrary,
  componentIds,
  radixComponentLibrary,
} from "./components";

const getLibraryMetas = (namespace?: string) => {
  const library = componentMetaLibraries.find(
    (library) => library.namespace === namespace
  );
  if (library === undefined) {
    throw new Error(
      `Component meta library "${namespace ?? "base"}" not found`
    );
  }
  return library.metas;
};

export const canvasComponentLibraries = [
  {
    components: {},
    componentIds,
    metas: coreMetas,
    templates: coreTemplates,
  },
  {
    components: baseComponentLibrary.components,
    componentIds,
    metas: getLibraryMetas(),
    hooks: baseHooks,
    templates: baseTemplates,
  },
  {
    namespace: radixComponentNamespace,
    components: radixComponentLibrary.components,
    componentIds,
    metas: getLibraryMetas(radixComponentNamespace),
    hooks: radixHooks,
    templates: radixTemplates,
  },
  {
    namespace: animationComponentNamespace,
    components: animationComponentLibrary.components,
    componentIds,
    metas: getLibraryMetas(animationComponentNamespace),
    hooks: animationHooks,
    templates: animationTemplates,
  },
] as const;
