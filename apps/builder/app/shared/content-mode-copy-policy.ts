import {
  getContentModeCapabilities,
  isContentModeCopyableProp,
} from "@webstudio-is/project/content-mode-permissions";
import type {
  Instance,
  Prop,
  WebstudioData,
  WebstudioFragment,
  WsComponentMeta,
} from "@webstudio-is/sdk";

export const isFragmentContentModeCopyableProp = ({
  prop,
  fragment,
  fragmentInstances,
  styleSources,
  metas,
}: {
  prop: Prop;
  fragment: WebstudioFragment;
  fragmentInstances: Map<Instance["id"], Instance>;
  styleSources: WebstudioData["styleSources"];
  metas: Map<string, WsComponentMeta>;
}) => {
  const capabilities = getContentModeCapabilities({
    instances: fragmentInstances,
    metas,
    props: new Map(fragment.props.map((prop) => [prop.id, prop])),
    styleSources,
    contentRootIds: new Set(
      fragment.children
        .filter((child) => child.type === "id")
        .map((child) => child.value)
    ),
  });
  return isContentModeCopyableProp({ capabilities, prop });
};
