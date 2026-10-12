/** Composes registered components with their canvas metadata and templates. */
import { coreMetas } from "@webstudio-is/sdk";
import { coreTemplates } from "./core-templates";
import * as baseTemplates from "@webstudio-is/sdk-components-react/templates";
import * as animationTemplates from "@webstudio-is/sdk-components-animation/templates";
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
    templates: baseTemplates,
  },
  {
    namespace: radixComponentNamespace,
    components: radixComponentLibrary.components,
    componentIds,
    metas: getLibraryMetas(radixComponentNamespace),
    templates: radixTemplates,
  },
  {
    namespace: animationComponentNamespace,
    components: animationComponentLibrary.components,
    componentIds,
    metas: getLibraryMetas(animationComponentNamespace),
    templates: animationTemplates,
  },
] as const;
