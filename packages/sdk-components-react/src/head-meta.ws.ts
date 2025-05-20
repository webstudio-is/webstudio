import { WindowInfoIcon } from "@webstudio-is/icons/svg";
import type { WsComponentMeta } from "@webstudio-is/sdk";
import { props } from "./__generated__/head-meta.props";

export const meta: WsComponentMeta = {
  icon: WindowInfoIcon,
  contentModel: {
    category: "none",
    children: [],
  },
  initialProps: ["name", "property", "content"],
  props,
};
