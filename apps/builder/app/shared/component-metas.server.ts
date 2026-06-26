import {
  coreMetas,
  type Instance,
  type WsComponentMeta,
} from "@webstudio-is/sdk";
import * as baseComponentMetas from "@webstudio-is/sdk-components-react/metas";
import * as animationComponentMetas from "@webstudio-is/sdk-components-animation/metas";
import * as radixComponentMetas from "@webstudio-is/sdk-components-react-radix/metas";

export const componentMetas = new Map<Instance["component"], WsComponentMeta>(
  Object.entries({
    ...coreMetas,
    ...baseComponentMetas,
    ...animationComponentMetas,
    ...radixComponentMetas,
  })
);
