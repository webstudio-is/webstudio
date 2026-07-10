import type { WsComponentMeta } from "@webstudio-is/sdk";
import * as baseMetas from "@webstudio-is/sdk-components-react/metas";
import * as animationMetas from "@webstudio-is/sdk-components-animation/metas";
import * as radixMetas from "@webstudio-is/sdk-components-react-radix/metas";

export const baseComponentImportSource =
  "@webstudio-is/sdk-components-react/components";
export const radixComponentNamespace =
  "@webstudio-is/sdk-components-react-radix";
export const animationComponentNamespace =
  "@webstudio-is/sdk-components-animation";

export type ComponentMetaLibrary = {
  namespace?: string;
  importSource: string;
  metas: Record<string, WsComponentMeta>;
};

export const componentMetaLibraries: readonly ComponentMetaLibrary[] = [
  {
    importSource: baseComponentImportSource,
    metas: baseMetas,
  },
  {
    namespace: radixComponentNamespace,
    importSource: radixComponentNamespace,
    metas: radixMetas,
  },
  {
    namespace: animationComponentNamespace,
    importSource: animationComponentNamespace,
    metas: animationMetas,
  },
];

export const getComponentName = (
  library: ComponentMetaLibrary,
  exportName: string
) =>
  library.namespace === undefined
    ? exportName
    : `${library.namespace}:${exportName}`;
