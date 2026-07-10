import { coreMetas } from "@webstudio-is/sdk";
import { coreTemplates } from "@webstudio-is/sdk/core-templates";
import * as baseComponents from "@webstudio-is/sdk-components-react/components";
import { hooks as baseHooks } from "@webstudio-is/sdk-components-react/hooks";
import * as baseTemplates from "@webstudio-is/sdk-components-react/templates";
import * as animationComponents from "@webstudio-is/sdk-components-animation";
import { hooks as animationHooks } from "@webstudio-is/sdk-components-animation/hooks";
import * as animationTemplates from "@webstudio-is/sdk-components-animation/templates";
import * as radixComponents from "@webstudio-is/sdk-components-react-radix";
import { hooks as radixHooks } from "@webstudio-is/sdk-components-react-radix/hooks";
import * as radixTemplates from "@webstudio-is/sdk-components-react-radix/templates";
import {
  animationComponentNamespace,
  componentMetaLibraries,
  radixComponentNamespace,
} from "./shared";

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
    metas: coreMetas,
    templates: coreTemplates,
  },
  {
    components: baseComponents,
    metas: getLibraryMetas(),
    hooks: baseHooks,
    templates: baseTemplates,
  },
  {
    namespace: radixComponentNamespace,
    components: radixComponents,
    metas: getLibraryMetas(radixComponentNamespace),
    hooks: radixHooks,
    templates: radixTemplates,
  },
  {
    namespace: animationComponentNamespace,
    components: animationComponents,
    metas: getLibraryMetas(animationComponentNamespace),
    hooks: animationHooks,
    templates: animationTemplates,
  },
] as const;
